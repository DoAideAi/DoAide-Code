"""Proposed changes: edit blocks become a previewed, validated changeset applied by /apply."""

from __future__ import annotations

import json
from pathlib import Path

import pytest

from doaide_code.changes import apply_record, build_changeset, parse_edits, propose, strip_edits
from doaide_code.commands import run_command
from doaide_code.executors import Job
from doaide_code.router import RouterBrain
from doaide_code.runner import UNNAMED_EDIT, Outcome, run_job

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


async def test_chat_edits_that_pass_are_written_and_undo_restores_them(repo, store):
    router = RouterBrain([FakeExecutor("ollama", 0, [ANSWER])])
    outcome = Outcome()

    async def on_delta(_):
        pass

    before = (repo / "app.py").read_text()
    await run_job(router, store, Job(prompt="tidy the helper: rename old to new", cwd=repo), outcome, on_delta)
    # Only the summary in the reply: the code went to the files.
    assert outcome.content == "Rename the helper." and "<<<<<<<" not in outcome.content
    changes = outcome.meta()["changes"]
    assert changes["status"] == "applied" and len(changes["files"]) == 2
    assert "def new" in (repo / "app.py").read_text() and (repo / "notes.txt").read_text() == "hello\n"

    store.link_changeset(changes["id"], "reply-1")
    result = run_command(store, "owner@example.com", "/undo")
    assert result.text.startswith("Undid changes to 2 file(s)") and result.changes == ("reply-1", {**changes, "status": "undone"})
    assert (repo / "app.py").read_text() == before and not (repo / "notes.txt").exists()
    assert "No applied changes to undo" in run_command(store, "owner@example.com", "/undo").text


async def test_undo_refuses_files_edited_since(repo, store):
    router = RouterBrain([FakeExecutor("ollama", 0, [ANSWER])])
    outcome = Outcome()

    async def on_delta(_):
        pass

    await run_job(router, store, Job(prompt="tidy the helper: rename old to new", cwd=repo), outcome, on_delta)
    (repo / "app.py").write_text("edited by hand\n")
    assert "changed after DoAide wrote it" in run_command(store, "owner@example.com", "/undo").text
    assert (repo / "app.py").read_text() == "edited by hand\n" and (repo / "notes.txt").exists()


async def test_mcp_edits_are_proposed_then_apply_writes(repo, store):
    router = RouterBrain([FakeExecutor("ollama", 0, [ANSWER])])
    outcome = Outcome()

    async def on_delta(_):
        pass

    await run_job(router, store, Job(prompt="tidy the helper: rename old to new", cwd=repo), outcome, on_delta, source="mcp")
    assert outcome.content == "Rename the helper."
    changes = outcome.meta()["changes"]
    assert changes["status"] == "pending" and "def old" in (repo / "app.py").read_text()
    result = run_command(store, "owner@example.com", "/apply")
    assert result.text.startswith("Applied 2 file(s)") and "def new" in (repo / "app.py").read_text()
    assert "already applied" in run_command(store, "owner@example.com", f"/apply {changes['id']}").text


async def test_discard_keeps_files(repo, store):
    changeset = build_changeset(repo, parse_edits(ANSWER))
    store.add_changeset(changeset.id, changeset.record(), changeset.summary())
    result = run_command(store, "owner@example.com", "/discard")
    assert result.changes[1]["status"] == "discarded"
    assert json.loads(store.get_changeset(changeset.id)["summary"])["status"] == "discarded"
    assert "No pending changes" in run_command(store, "owner@example.com", "/apply").text
    assert not (repo / "notes.txt").exists()


# Live (Sonnet over the Tasks API): the path line went on with prose, so the edit was dropped.
PATH_THEN_PROSE = """Fix: compare the whole answer.

`app.py`, line 1 — `old` is the wrong name.

<<<<<<< SEARCH
def old():
=======
def new():
>>>>>>> REPLACE
"""


def test_a_backticked_path_followed_by_prose_names_the_file():
    assert [(e.path, e.replace) for e in parse_edits(PATH_THEN_PROSE)] == [("app.py", "def new():\n")]
    assert parse_edits("`app.py` and `lib.py` both change.\n<<<<<<< SEARCH\nx\n=======\ny\n>>>>>>> REPLACE\n")[0].path == "app.py"


async def test_an_edit_block_with_no_file_says_nothing_was_written(repo, store):
    # No path, and SEARCH text that is in no file, so the edit cannot be placed.
    unnamed = "Rename it.\n\nThe helper should change like this:\n\n<<<<<<< SEARCH\ndef older():\n=======\ndef new():\n>>>>>>> REPLACE\n"
    outcome = Outcome()

    async def on_delta(_):
        pass

    await run_job(RouterBrain([FakeExecutor("ollama", 0, [unnamed])]), store, Job(prompt="make the helper return 2", cwd=repo), outcome, on_delta)
    assert "def old" in (repo / "app.py").read_text()
    assert outcome.content.endswith("Nothing written: an edit block could not be read (no file path above it, or edit markers inside it).")
    assert {"name": "edits", "ok": False, "detail": UNNAMED_EDIT} in outcome.checks


async def test_a_free_edit_that_cannot_be_read_goes_to_sonnet(repo, store):
    # Live (32b): the edit quoted a prompt holding its own edit markers, so no edit parsed, and
    # the free answer was kept with nothing written.
    garbled = (
        "Trim it.\n\napp.py\n<<<<<<< SEARCH\nPROMPT = '''\n<<<<<<< SEARCH\nold\n=======\nnew\n"
        ">>>>>>> REPLACE\n'''\n=======\nPROMPT = ''\n>>>>>>> REPLACE\n"
    ) + "\nThis keeps the prompt short, so local models read it faster." * 8  # long, as live: not "no edit"
    ollama = FakeExecutor("ollama", 0, [garbled])
    ollama.tool, ollama.context_mode = "ollama", "files"
    sonnet = FakeExecutor("claude-sonnet", 2, [ANSWER])
    outcome = Outcome()

    async def on_delta(_):
        pass

    await run_job(RouterBrain([ollama, sonnet], offline=True), store, Job(prompt="tidy the helper in app.py", cwd=repo), outcome, on_delta)
    assert outcome.executor == "claude-sonnet"
    assert outcome.meta()["route"]["escalated_from"]["reason"] == f"its edit failed checks ({UNNAMED_EDIT})"
    assert "def new" in (repo / "app.py").read_text()


async def test_a_second_docstring_is_reported():
    from doaide_code.changes import check_file

    two = 'def log_task():\n    """New."""\n    """Old."""\n    return 1\n'
    [issue] = await check_file("m.py", two)
    assert "log_task has two docstrings" in issue
    assert await check_file("m.py", 'def log_task():\n    """Only one."""\n    x = "not a docstring"\n') == []
    assert (await check_file("m.py", '"""Module."""\n"""Again."""\n'))[0].startswith("m.py:2: the module")
