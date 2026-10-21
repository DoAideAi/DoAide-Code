"""Conversation history sized for each model.

Every executor gets the conversation fitted to its own window (`history_turns`, `history_tokens`:
about 4k tokens for a 7B Ollama model, 8k for 32B, 32k for the Claude and Codex CLIs), so long
chats neither overflow small models nor bury the latest request under old answers, and paid runs
do not pay for the whole chat again on every message.

What gives way first, until the history fits:
1. Turns past the sliding window fall into the summary (they are summarized, not dropped).
2. Older assistant replies are shortened, oldest first: code blocks become one-line placeholders
   (the files can be read again) and the prose is cut. Old answers are long and the least useful.
3. The oldest remaining turns move into the summary.
4. Older user messages are shortened; then the latest reply.
The latest user instructions (KEEP_USER_TURNS) are never changed. The system prompt and the
current request are not history and are never touched.

The summary is extractive, one line per exchange (the request, the answer's first sentence, the
files it edited): free, instant, and it cannot invent anything. Capped at SUMMARY_SHARE of the
budget, newest exchanges kept.
"""

from __future__ import annotations

import os
import re
from collections.abc import Sequence
from dataclasses import dataclass

from .executors.base import Turn
from .usage import estimate_tokens

# Messages a job carries from the conversation (DOAIDE_HISTORY_MESSAGES). Each executor then
# keeps its own window of them; the rest feed the summary.
HISTORY_MESSAGES = max(2, int(os.environ.get("DOAIDE_HISTORY_MESSAGES", "40") or 40))
KEEP_USER_TURNS = 2
BRIEF_CHARS = 600
USER_BRIEF_CHARS = 1_200
SUMMARY_SHARE = 0.25
DIGEST_CHARS = 140

_FENCED = re.compile(r"^```(\w*)[^\n]*\n(.*?)^```[^\n]*$", re.M | re.S)
_EDIT_TARGET = re.compile(r"^(\S+\.\w{1,6})\s*\n<<<<<<< SEARCH", re.M)
_SENTENCE = re.compile(r"(.+?[.!?])(?:\s|$)", re.S)


@dataclass(frozen=True)
class FittedHistory:
    turns: tuple[Turn, ...]
    # "Earlier in this conversation" digest of the turns that did not fit; "" when all fit.
    summary: str = ""
    summarized: int = 0
    shortened: int = 0
    tokens: int = 0

    def note(self) -> str | None:
        """For the route meta: what was done to fit, or None when nothing was."""
        parts = []
        if self.summarized:
            parts.append(f"{self.summarized} older message{'s' if self.summarized != 1 else ''} summarized")
        if self.shortened:
            parts.append(f"{self.shortened} shortened")
        return f"history: {', '.join(parts)}" if parts else None


def brief(text: str, limit: int = BRIEF_CHARS) -> str:
    """A message, shortened: code blocks as placeholders, then cut to `limit` characters."""

    def placeholder(m: re.Match[str]) -> str:
        return f"[{m.group(1) or 'code'} block, {m.group(2).count(chr(10))} lines, omitted]"

    short = _FENCED.sub(placeholder, text).strip()
    return short if len(short) <= limit else short[:limit].rstrip() + " [...]"


def digest(turn: Turn) -> str:
    """One line for the summary: the request, or the answer's gist and the files it edited."""
    text = " ".join(_FENCED.sub(" ", turn.content).split())
    if turn.role == "user":
        return f"User: {_cut(text)}"
    first = _SENTENCE.match(text)
    line = f"DoAide: {_cut(first.group(1) if first else text)}"
    if files := list(dict.fromkeys(_EDIT_TARGET.findall(turn.content))):
        line += f" (edits: {', '.join(files[:4])})"
    return line


def _cut(text: str) -> str:
    return text if len(text) <= DIGEST_CHARS else text[: DIGEST_CHARS - 1].rstrip() + "…"


def _tokens(turns: Sequence[Turn]) -> int:
    return sum(estimate_tokens(t.content) for t in turns)


def render_summary(lines: Sequence[str], budget_tokens: int) -> str:
    """The digest lines that fit the budget, newest kept, with a count of any left out."""
    def render(kept: list[str]) -> str:
        head = "Earlier in this conversation (summary):"
        if omitted := len(lines) - len(kept):
            head += f" {omitted} earlier message{'s' if omitted != 1 else ''} not shown."
        return "\n".join([head, *(f"- {line}" for line in kept)])

    kept: list[str] = []
    for line in reversed(lines):
        if estimate_tokens(render([line, *kept])) > budget_tokens:
            break
        kept.insert(0, line)
    return render(kept) if kept else ""


def fit_history(turns: Sequence[Turn], budget_tokens: int, *, max_turns: int) -> FittedHistory:
    """`turns` (oldest first) fitted to `max_turns` and `budget_tokens`; see the module docs."""
    turns = [t for t in turns if t.content.strip()]
    # 1. The sliding window; what falls outside it starts the summary.
    window = turns[-max_turns:] if max_turns > 0 else []
    moved: list[Turn] = turns[: len(turns) - len(window)]
    kept = list(window)
    shortened: set[int] = set()  # ids of the shortened copies in `kept`
    users = [i for i, t in enumerate(kept) if t.role == "user"]
    protected = {id(kept[i]) for i in users[-KEEP_USER_TURNS:]}
    summary_budget = int(budget_tokens * SUMMARY_SHARE)

    def total() -> int:
        summary = render_summary([digest(t) for t in moved], summary_budget) if moved else ""
        return _tokens(kept) + estimate_tokens(summary)

    def shorten(i: int, limit: int) -> None:
        short = Turn(kept[i].role, brief(kept[i].content, limit))
        if len(short.content) < len(kept[i].content):
            kept[i] = short
            shortened.add(id(short))

    # 2. Older assistant replies, oldest first; the latest reply waits until step 4.
    replies = [i for i, t in enumerate(kept) if t.role == "assistant"]
    for i in replies[:-1]:
        if total() <= budget_tokens:
            break
        shorten(i, BRIEF_CHARS)
    # 3. The oldest turns into the summary, never past a protected instruction.
    while total() > budget_tokens and kept and id(kept[0]) not in protected:
        moved.append(kept.pop(0))
    # 4. Older user messages, then the latest reply.
    for i, t in enumerate(kept):
        if total() <= budget_tokens:
            break
        if t.role == "user" and id(t) not in protected:
            shorten(i, USER_BRIEF_CHARS)
    for i in reversed(range(len(kept))):
        if total() <= budget_tokens:
            break
        if kept[i].role == "assistant":
            shorten(i, BRIEF_CHARS)
            break

    summary = render_summary([digest(t) for t in moved], summary_budget) if moved else ""
    return FittedHistory(
        turns=tuple(kept),
        summary=summary,
        summarized=len(moved),
        shortened=sum(1 for t in kept if id(t) in shortened),
        tokens=_tokens(kept) + estimate_tokens(summary),
    )
