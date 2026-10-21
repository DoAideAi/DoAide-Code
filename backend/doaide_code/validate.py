"""Quick checks on an answer before it is shown as done.

- Completeness: empty or cut-off answers, unbalanced code fences, "I can't see the file"
  replies, and edit requests answered without any code. An incomplete answer is retried once
  with more context on the next executor up (see runner.py).
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
    r"\b(?:i (?:don't|do not|cannot|can't|am unable to) (?:see|access|view|read|find)|"
    r"(?:please|could you) (?:provide|share|paste|send)|without (?:seeing|access to) the (?:code|file)|"
    r"i (?:would )?need (?:to see|more (?:context|information|details))|not (?:provided|included) in the context)",
    re.I,
)
_EDIT_KINDS = {"edit", "test", "debug"}
_LANGS = {"python": ".py", "py": ".py", "json": ".json", "javascript": ".js", "js": ".js", "mjs": ".js"}


def incomplete_reason(answer: str, kind: str) -> str | None:
    """Why the answer looks unfinished, or None when it looks complete."""
    text = answer.strip()
    if not text:
        return "empty answer"
    if text.count("```") % 2:
        return "a code block was left open"
    if text.count("<<<<<<< SEARCH") != text.count(">>>>>>> REPLACE"):
        return "an edit block was cut off"
    if _NEEDS_FILES.search(text[:600]):
        return "the model said it could not see the code it needed"
    if kind in _EDIT_KINDS and "```" not in text and not parse_edits(text) and len(text) < 400:
        return "no code or edit was proposed"
    if kind not in {"math", "question"} and len(text) < 25:
        return "answer too short"
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
