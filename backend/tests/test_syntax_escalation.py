"""A local edit that leaves a file unparseable (python compile / node --check) goes to the next model."""

from __future__ import annotations

import shutil
from pathlib import Path

import pytest

from .test_escalation import Scripted, paid, run

pytestmark = pytest.mark.anyio


def edit(path: str, search: str, replace: str) -> str:
    return f"Done — updated {path}.\n\n{path}\n<<<<<<< SEARCH\n{search}\n=======\n{replace}\n>>>>>>> REPLACE"


async def test_a_python_syntax_error_escalates_after_one_repair(tmp_path: Path, store):
    (tmp_path / "calc.py").write_text("def add(a, b):\n    return a - b\n")
    broken = edit("calc.py", "    return a - b", "    return (a + b")
    good = edit("calc.py", "    return a - b", "    return a + b")
    ollama = Scripted("ollama", 0, [broken, broken], "ollama")
    sonnet = paid("claude-sonnet", 2, [good])
    outcome, _ = await run([ollama, sonnet], "fix add in calc.py, it subtracts", cwd=tmp_path, store=store)
    assert len(ollama.jobs) == 2 and "SyntaxError" in ollama.jobs[1].prompt  # one free repair, with the error
    assert outcome.executor == "claude-sonnet"
    assert "SyntaxError" in outcome.meta()["route"]["escalated_from"]["reason"]


@pytest.mark.skipif(shutil.which("node") is None, reason="node not installed")
async def test_a_javascript_syntax_error_escalates(tmp_path: Path, store):
    (tmp_path / "calc.js").write_text("function add(a, b) {\n  return a - b\n}\n")
    broken = edit("calc.js", "  return a - b", "  return a + b +")
    good = edit("calc.js", "  return a - b", "  return a + b")
    ollama = Scripted("ollama", 0, [broken], "ollama")
    sonnet = paid("claude-sonnet", 2, [good])
    outcome, _ = await run([ollama, sonnet], "fix add in calc.js, it subtracts", cwd=tmp_path, store=store)
    assert outcome.executor == "claude-sonnet"
    assert "calc.js" in outcome.meta()["route"]["escalated_from"]["reason"]


async def test_a_parseable_local_edit_is_kept(tmp_path: Path, store):
    (tmp_path / "calc.py").write_text("def add(a, b):\n    return a - b\n")
    ollama = Scripted("ollama", 0, [edit("calc.py", "    return a - b", "    return a + b")], "ollama")
    sonnet = paid("claude-sonnet", 2)
    outcome, _ = await run([ollama, sonnet], "fix add in calc.py, it subtracts", cwd=tmp_path, store=store)
    assert outcome.executor == "ollama" and sonnet.jobs == []
