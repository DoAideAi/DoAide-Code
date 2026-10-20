"""Proposed changes: edit blocks become a previewed, validated changeset applied by /apply."""

from __future__ import annotations

import json
from pathlib import Path

import pytest

from doaide_code.changes import apply_record, build_changeset, parse_edits, propose, strip_edits
from doaide_code.commands import run_command
from doaide_code.executors import Job
from doaide_code.router import RouterBrain
from doaide_code.runner import Outcome, run_job

from .conftest import FakeExecutor

pytestmark = pytest.mark.anyio

ANSWER = """Rename the helper.

app.py
```python
<<<<<<< SEARCH
def old():
    return 1
=======
def new():
    return 1
>>>>>>> REPLACE
```

notes.txt
<<<<<<< SEARCH
=======
hello
>>>>>>> REPLACE
"""


@pytest.fixture
def repo(tmp_path) -> Path:
    root = tmp_path / "repo"
    root.mkdir()
    (root / "app.py").write_text("import os\n\n\ndef old():\n    return 1\n")
    return root


def test_parse_and_strip_edit_blocks():
    edits = parse_edits(ANSWER)
    assert [(e.path, e.search) for e in edits] == [("app.py", "def old():\n    return 1\n"), ("notes.txt", "")]
    assert edits[1].replace == "hello\n"
    assert strip_edits(ANSWER) == "Rename the helper."


def test_changeset_previews_diffs_without_writing(repo):
    changeset = build_changeset(repo, parse_edits(ANSWER))
    summary = changeset.summary()
    files = {f["path"]: f for f in summary["files"]}
    assert files["app.py"]["additions"] == 1 and files["app.py"]["deletions"] == 1
    assert "+def new():" in files["app.py"]["diff"]
    assert files["notes.txt"]["new_file"]
    assert not (repo / "notes.txt").exists()
    assert "def old" in (repo / "app.py").read_text()


def test_missing_search_text_and_escapes_are_problems(repo):
    text = "app.py\n<<<<<<< SEARCH\nnope\n=======\nx\n>>>>>>> REPLACE\n../evil.py\n<<<<<<< SEARCH\n=======\nx\n>>>>>>> REPLACE\n"
    changeset = build_changeset(repo, parse_edits(text))
    assert any("not found" in p for p in changeset.all_problems)
    assert any("outside the project" in p for p in changeset.all_problems)
    assert not changeset.changed


async def test_syntax_errors_introduced_by_a_change_are_reported(repo):
    bad = "app.py\n<<<<<<< SEARCH\n    return 1\n=======\n    return (\n>>>>>>> REPLACE\n"
    changeset = await propose(repo, bad)
    assert any("SyntaxError" in p for p in changeset.all_problems)


def test_apply_refuses_when_the_file_changed_since_preview(repo):
    record = build_changeset(repo, parse_edits(ANSWER)).record()
    (repo / "app.py").write_text("changed\n")
    with pytest.raises(ValueError, match="changed since the preview"):
        apply_record(record)
    assert not (repo / "notes.txt").exists()  # nothing written


async def test_run_job_proposes_then_apply_writes(repo, store):
    router = RouterBrain([FakeExecutor("ollama", 0, [ANSWER])])
    outcome = Outcome()

    async def on_delta(_):
        pass

    await run_job(router, store, Job(prompt="rename old to new", cwd=repo), outcome, on_delta)
    assert outcome.content == "Rename the helper."
    changes = outcome.meta()["changes"]
    assert changes["status"] == "pending" and len(changes["files"]) == 2
    assert "def old" in (repo / "app.py").read_text()

    store.link_changeset(changes["id"], "reply-1")
    result = run_command(store, "owner@example.com", "/apply")
    assert result.text.startswith("Applied 2 file(s)")
    assert result.changes[0] == "reply-1" and result.changes[1]["status"] == "applied"
    assert "def new" in (repo / "app.py").read_text() and (repo / "notes.txt").read_text() == "hello\n"
    assert "already applied" in run_command(store, "owner@example.com", f"/apply {changes['id']}").text


async def test_discard_keeps_files(repo, store):
    changeset = build_changeset(repo, parse_edits(ANSWER))
    store.add_changeset(changeset.id, changeset.record(), changeset.summary())
    result = run_command(store, "owner@example.com", "/discard")
    assert result.changes[1]["status"] == "discarded"
    assert json.loads(store.get_changeset(changeset.id)["summary"])["status"] == "discarded"
    assert "No pending changes" in run_command(store, "owner@example.com", "/apply").text
    assert not (repo / "notes.txt").exists()
