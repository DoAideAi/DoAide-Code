"""History management: sliding window, per-model token budgets, importance order, summaries."""

from __future__ import annotations

import json

import httpx
import pytest

from doaide_code.executors import ClaudeCliExecutor, CodexCliExecutor, Job, OllamaExecutor, Turn
from doaide_code.executors.base import transcript_prompt
from doaide_code.history import KEEP_USER_TURNS, brief, digest, fit_history, render_summary
from doaide_code.router import RouterBrain
from doaide_code.runner import Outcome, run_job
from doaide_code.usage import estimate_tokens

from .conftest import FakeExecutor

pytestmark = pytest.mark.anyio

CODE = "```python\n" + "value = compute(1, 2)\n" * 400 + "```"


async def nop(_chunk: str) -> None:
    pass


def chat(n: int, answer: str = "Short answer.") -> list[Turn]:
    """n exchanges: user "request i", assistant `answer` (numbered)."""
    turns: list[Turn] = []
    for i in range(n):
        turns += [Turn("user", f"request {i}"), Turn("assistant", f"{answer} ({i})")]
    return turns


# Sliding window


def test_short_histories_are_sent_unchanged():
    turns = chat(3)
    fitted = fit_history(turns, 4_000, max_turns=20)
    assert fitted.turns == tuple(turns) and fitted.summary == "" and fitted.note() is None


def test_turns_past_the_window_are_summarized_not_dropped():
    fitted = fit_history(chat(10), 32_000, max_turns=4)
    assert [t.content for t in fitted.turns] == ["request 8", "Short answer. (8)", "request 9", "Short answer. (9)"]
    assert fitted.summarized == 16
    assert fitted.summary.startswith("Earlier in this conversation (summary):")
    assert "- User: request 0" in fitted.summary and "- DoAide: Short answer." in fitted.summary


# Token budget and importance


def test_old_verbose_replies_are_shortened_first_and_recent_instructions_never():
    turns = [
        Turn("user", "write the parser"), Turn("assistant", f"Here it is:\n{CODE}"),
        Turn("user", "now add tests"), Turn("assistant", f"Tests:\n{CODE}"),
        Turn("user", "rename parse to parse_line"),
    ]
    fitted = fit_history(turns, 4_000, max_turns=20)
    assert fitted.tokens <= 4_000 and fitted.summarized == 0
    old, latest = fitted.turns[1].content, fitted.turns[3].content
    assert old == "Here it is:\n[python block, 400 lines, omitted]"
    # The latest reply fits once the older one is short, so it stays whole.
    assert latest == turns[3].content
    assert [t.content for t in fitted.turns if t.role == "user"] == ["write the parser", "now add tests", "rename parse to parse_line"]


def test_when_shortening_is_not_enough_the_oldest_turns_move_into_the_summary():
    turns = chat(30, answer="A fairly long explanation. " + "More detail here. " * 60)
    fitted = fit_history(turns, 4_000, max_turns=60)
    assert fitted.tokens <= 4_000 and fitted.summarized > 0
    # Newest turns are the ones kept, and the summary leads with what fell out of the window.
    assert fitted.turns[-1].content.startswith("A fairly long explanation.") and "(29)" in fitted.turns[-1].content
    assert "- User: request 0" in fitted.summary or "earlier messages not shown" in fitted.summary


def test_the_latest_user_instructions_survive_any_budget():
    huge = "Traceback (most recent call last):\n" + "  File \"x.py\", line 1\n" * 3_000
    turns = [*chat(5), Turn("user", huge), Turn("assistant", "Looking."), Turn("user", "fix it")]
    fitted = fit_history(turns, 1_000, max_turns=20)
    users = [t.content for t in fitted.turns if t.role == "user"]
    assert users[-KEEP_USER_TURNS:] == [huge, "fix it"]


def test_the_summary_stays_within_its_share_and_keeps_the_newest_exchanges():
    lines = [f"User: request {i}" for i in range(500)]
    summary = render_summary(lines, 200)
    assert estimate_tokens(summary) <= 200
    assert "request 499" in summary and "request 0\n" not in summary and "earlier messages not shown" in summary


def test_digest_lines_are_one_short_line():
    reply = Turn("assistant", "Renamed the helper. It now lives in util.py.\n\nutil.py\n<<<<<<< SEARCH\na\n=======\nb\n>>>>>>> REPLACE")
    assert digest(reply) == "DoAide: Renamed the helper. (edits: util.py)"
    assert digest(Turn("user", "x " * 200)).endswith("…") and len(digest(Turn("user", "x " * 200))) <= 147
    assert brief("Intro\n```js\nlet a = 1\nlet b = 2\n```") == "Intro\n[js block, 2 lines, omitted]"


# Per-model limits


def test_each_model_has_its_own_window():
    small = OllamaExecutor("http://x", "qwen2.5-coder:7b")
    large = OllamaExecutor("http://x", "qwen2.5-coder:32b", name="ollama-coder", tier=1, prefer_large=True)
    claude = ClaudeCliExecutor("claude", "sonnet", name="claude-sonnet", tier=2)
    codex = CodexCliExecutor("codex", "gpt-5")
    assert (small.history_tokens, small.history_turns) == (4_000, 8)
    assert (large.history_tokens, large.history_turns) == (8_000, 12)
    assert claude.history_tokens == codex.history_tokens == 32_000 and claude.history_turns == 20


async def test_the_runner_fits_history_per_executor(store):
    ollama = FakeExecutor("ollama", 0, [""])
    ollama.tool, ollama.context_mode = "ollama", "files"
    ollama.history_tokens, ollama.history_turns = 1_000, 4
    sonnet = FakeExecutor("claude-sonnet", 2, ["The parser splits on commas, in parser.py."])
    sonnet.tool = "claude"
    history = chat(12, answer=f"Done.\n{CODE}")
    outcome = await run_job(RouterBrain([ollama, sonnet], offline=True), store, Job("explain the parser", history=history), Outcome(), nop)
    local, paid = ollama.jobs[0], sonnet.jobs[0]
    # The small model got a short window and a summary; Sonnet a longer one, within its budget.
    assert len(local.history) <= 4 and local.summary.startswith("Earlier in this conversation")
    assert len(paid.history) == 20 and sum(estimate_tokens(t.content) for t in paid.history) <= 32_000
    assert any(r.startswith("history:") for r in outcome.meta()["route"]["reasons"])


def test_cli_transcripts_lead_with_the_summary():
    job = Job("next", history=[Turn("user", "a"), Turn("assistant", "b")], summary="Earlier in this conversation (summary):\n- User: x")
    prompt = transcript_prompt(job)
    assert prompt.index("Earlier in this conversation") < prompt.index("Conversation so far:") < prompt.index("Current request:\nnext")
    assert transcript_prompt(Job("only")) == "only"


async def test_ollama_gets_the_summary_as_a_system_message():
    seen: list[dict] = []

    def handler(request: httpx.Request) -> httpx.Response:
        if request.url.path == "/api/tags":
            return httpx.Response(200, json={"models": [{"name": "qwen2.5-coder:7b", "size": 1}]})
        seen.append(json.loads(request.content))
        return httpx.Response(200, text='{"message": {"content": "ok"}, "done": true}\n')

    ex = OllamaExecutor("http://x", "qwen2.5-coder:7b", transport=httpx.MockTransport(handler))
    job = Job("now", history=[Turn("user", "a"), Turn("assistant", "b")], summary="Earlier in this conversation (summary):\n- User: x")
    [_ async for _ in ex.stream(job)]
    roles = [(m["role"], m["content"][:12]) for m in seen[0]["messages"]]
    assert roles[1] == ("system", "Earlier in t") and roles[-1] == ("user", "now")
