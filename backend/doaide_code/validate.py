"""Quick checks on an answer before it is shown as done.

- Completeness: empty or cut-off answers, unbalanced code fences, "I can't see the file"
  replies, and edit requests answered without any code. An incomplete answer is retried once
  with more context on the next executor up (see runner.py).
- Capability claims: DoAide runs on the user's laptop and reads their files, so an answer saying
  it cannot access the user's files, folders or code is wrong however fluent it is.
- Relevance: the answer must mention what the request names (files, functions, backticked
  identifiers) and share some of its words; canned refusals count as off topic. Used to decide
  whether a free local answer is good enough or the task goes to Claude (runner.py).
- Code: fenced Python / JSON / JavaScript blocks must parse (syntax only: snippets often use
  names defined elsewhere). Proposed edits are checked separately by changes.py: the file must
  exist, the SEARCH text must match, and the result must pass syntax and ruff checks.

Results go into the reply's meta as `checks` and show under the answer in the UI.
"""

from __future__ import annotations

import json
import re
import shutil
import tempfile
from pathlib import Path
from typing import Any

from .changes import _run, parse_edits

_FENCE = re.compile(r"^```([\w+-]*)[^\n]*\n(.*?)^```", re.M | re.S)
_NEEDS_FILES = re.compile(
    r"\b(?:i (?:don't|do not|cannot|can't|am unable to) (?:see|access|view|read|find) (?:the|your|this|that) "
    r"(?:file|code|project|repo|source|function|implementation)|"
    r"(?:please|could you) (?:provide|share|paste|send) (?:the|your|me|more)|without (?:seeing|access to) the (?:code|file)|"
    r"i (?:would )?need (?:to see|more (?:context|information|details))|not (?:provided|included) in the context)",
    re.I,
)
# What a request names: a file, a call, a backticked identifier, a snake_case or camelCase name.
_NAMED = re.compile(r"`([^`\s]{2,60})`|\b([\w-]+\.[a-z]{1,5})\b|\b(\w{2,})\(\)|\b([a-z]+_[a-z0-9_]+|[a-z]+[A-Z]\w*|[A-Z][a-z0-9]+[A-Z]\w*)\b")
_WORD = re.compile(r"[A-Za-z][A-Za-z']{3,}")
_STOPWORDS = frozenset(
    "about above after again also another back been before being below between both cannot could does doing down "
    "during each even ever every from have having here how into just know like make many more most much must need "
    "only other over please same should show some such tell than that their them then there these they thing this "
    "those through under until upon very want were what when where which while will with within without would your "
    "code file files using use used help write give find".split()
)
_REFUSAL = re.compile(r"\b(?:as an ai(?: language model)?|i'?m (?:sorry|afraid),? (?:but )?i (?:can'?t|cannot))\b", re.I)
_NO_ACCESS = re.compile(
    r"\b(?:i|we)\s+(?:can(?:no|['’])?t|cannot|am\s+(?:not\s+able|unable)\s+to|(?:do|does)(?:n['’]t|\s+not)\s+have"
    r"\s+(?:the\s+ability\s+to|(?:direct\s+)?access\s+to))\s+(?:directly\s+)?(?:(?:access|read|see|view|browse|open)\s+)?"
    r"(?:to\s+)?(?:any\s+of\s+)?(?:your|the\s+user['’]?s|local)\s+(?:local\s+)?(?:files?|folders?|director(?:y|ies)|code(?:base)?"
    r"|projects?|computer|machine|file\s*system|disk)\b"
    r"|\b(?:can(?:no|['’])?t|cannot|unable\s+to)\s+(?:access|read|open|see)\s+(?:any\s+)?files\s+(?:on|in|from)\s+your\b",
    re.I,
)
NO_ACCESS_REASON = "the answer says DoAide cannot access your files, but it can"
NEEDS_FILES_REASON = "the model said it could not see the code it needed"
_EDIT_KINDS = {"edit", "test", "debug"}
_LANGS = {"python": ".py", "py": ".py", "json": ".json", "javascript": ".js", "js": ".js", "mjs": ".js"}


def capability_claim(answer: str) -> str | None:
    """Why the answer misstates what DoAide can do, or None."""
    return NO_ACCESS_REASON if _NO_ACCESS.search(answer[:1500]) else None


def incomplete_reason(answer: str, kind: str, *, reads_files: bool = False) -> str | None:
    """Why the answer looks unfinished, or None when it looks complete.

    `reads_files`: the model searched the project itself (Claude, Codex). "I can't find X" from
    it is a finding (X is not there), not missing context, and another model would find the same."""
    text = answer.strip()
    if not text:
        return "empty answer"
    if text.count("```") % 2:
        return "a code block was left open"
    if text.count("<<<<<<< SEARCH") != text.count(">>>>>>> REPLACE"):
        return "an edit block was cut off"
    if not reads_files and _NEEDS_FILES.search(text[:600]):
        return NEEDS_FILES_REASON
    if kind in _EDIT_KINDS and "```" not in text and not parse_edits(text) and len(text) < 400:
        return "no code or edit was proposed"
    if kind not in {"math", "question"} and len(text) < 25:
        return "answer too short"
    return None


def early_problem(partial: str) -> str | None:
    """A problem visible while a local answer is still streaming that no retry of the same model
    would fix (a refusal, or a request for files it was not shown): stop it and escalate now."""
    head = partial[:600]
    if _REFUSAL.search(head[:300]):
        return "the model declined to answer"
    if _NEEDS_FILES.search(head):
        return NEEDS_FILES_REASON
    return capability_claim(head)


def off_topic_reason(prompt: str, answer: str) -> str | None:
    """Why the answer does not seem to address the request, or None when it does."""
    text = answer.lower()
    if _REFUSAL.search(answer[:300]):
        return "the model declined to answer"
    words = {w.lower() for w in _WORD.findall(prompt)} - _STOPWORDS
    # Prefix match, so "sorting" in the request meets "sorted" in the answer.
    shared = sum(w[:5] in text for w in words)
    named = {next(g for g in m.groups() if g) for m in _NAMED.finditer(prompt)}
    stems = {n.rsplit("/", 1)[-1].lower() for n in named}
    if stems and shared < 2 and not any(s in text or s.rsplit(".", 1)[0] in text for s in stems):
        return f"the answer never mentions {sorted(named)[0]}"
    if len(words) >= 3 and not shared:
        return "the answer shares no words with the request"
    return None


async def check_code_blocks(answer: str) -> list[dict[str, Any]]:
    """Syntax checks on fenced code in the answer (edit blocks excluded)."""
    results: list[dict[str, Any]] = []
    blocks = [(lang.lower(), body) for lang, body in _FENCE.findall(answer) if lang.lower() in _LANGS]
    for n, (lang, body) in enumerate(blocks, 1):
        if "<<<<<<< SEARCH" in body or body.lstrip().startswith((">>>", "$ ")):
            continue
        problem = await _syntax(_LANGS[lang], body)
        label = f"{lang} block {n}" if len(blocks) > 1 else f"{lang} block"
        results.append({"name": label, "ok": problem is None, "detail": problem or "parses"})
    return results


async def _syntax(suffix: str, code: str) -> str | None:
    if suffix == ".py":
        try:
            compile(code, "snippet.py", "exec")
        except SyntaxError as exc:
            return f"line {exc.lineno}: {exc.msg}"
        return None
    if suffix == ".json":
        try:
            json.loads(code)
        except json.JSONDecodeError as exc:
            return f"line {exc.lineno}: {exc.msg}"
        return None
    if (node := shutil.which("node")) is None:
        return None
    with tempfile.NamedTemporaryFile("w", suffix=".mjs", delete=False) as fh:
        fh.write(code)
    try:
        code_, out = await _run([node, "--check", fh.name])
    finally:
        Path(fh.name).unlink(missing_ok=True)
    if not code_:
        return None
    return next((line.strip() for line in out.splitlines() if "Error" in line), "syntax error")


def edit_checks(summary: dict[str, Any] | None) -> list[dict[str, Any]]:
    """One check line for a proposed changeset: targets found, and the files' own checks."""
    if not summary:
        return []
    files = summary.get("files") or []
    problems = list(summary.get("problems") or []) + [p for f in files for p in f.get("problems") or []]
    count = f"{len(files)} file{'s' if len(files) != 1 else ''}"
    if problems:
        return [{"name": "edits", "ok": False, "detail": f"{count}; {len(problems)} problem(s): {problems[0]}"}]
    return [{"name": "edits", "ok": True, "detail": f"{count}; every target found, syntax and lint clean"}]
