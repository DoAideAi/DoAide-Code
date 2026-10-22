"""Gaps found by sending DoAide tasks through its own API."""

from __future__ import annotations

from pathlib import Path

import pytest

from doaide_code.validate import NO_EDIT, incomplete_reason

from .test_escalation import paid, run
from .test_syntax_escalation import Scripted

pytestmark = pytest.mark.anyio


@pytest.mark.parametrize(
    "answer",
    [
        "I found no typos in README.md; the spelling and grammar are clean.",
        "There are no spelling mistakes to fix.",
        "`add` already handles negative numbers, so nothing needs to change.",
    ],
)
def test_nothing_to_change_is_a_complete_answer_to_an_edit(answer):
    assert incomplete_reason(answer, "edit") is None


def test_a_described_but_unwritten_edit_is_still_incomplete():
    assert incomplete_reason("Change line 2 of calc.py to return a + b.", "edit") == NO_EDIT


async def test_local_models_skip_editing_a_named_file_they_cannot_see_whole(tmp_path: Path, store):
    (tmp_path / "README.md").write_text("Some words.\n" * 3000)  # 36k characters
    ollama = Scripted("ollama-coder", 1, ["never asked"], "ollama")
    ollama.context_chars = 14_000
    sonnet = paid("claude-sonnet", 2, ["I found no typos in README.md."])
    outcome, _ = await run([ollama, sonnet], "fix any typos in README.md", cwd=tmp_path, store=store)
    assert ollama.jobs == [] and outcome.executor == "claude-sonnet"
    assert any("README.md (36k characters) is too large" in r for r in outcome.route["reasons"])
    assert outcome.meta()["checks"]["items"][0]["ok"]


async def test_a_named_file_that_fits_still_goes_local_first(tmp_path: Path, store):
    (tmp_path / "README.md").write_text("Some wrods.\n")
    fix = "Done — updated README.md.\n\nREADME.md\n<<<<<<< SEARCH\nSome wrods.\n=======\nSome words.\n>>>>>>> REPLACE"
    ollama = Scripted("ollama-coder", 1, [fix], "ollama")
    ollama.context_chars = 14_000
    sonnet = paid("claude-sonnet", 2)
    outcome, _ = await run([ollama, sonnet], "fix any typos in README.md", cwd=tmp_path, store=store)
    assert outcome.executor == "ollama-coder" and sonnet.jobs == []


def test_a_mention_that_is_a_project_path_names_only_that_file(tmp_path: Path):
    from doaide_code.context import rank_files

    (tmp_path / "legacy").mkdir()
    (tmp_path / "README.md").write_text("root\n")
    (tmp_path / "legacy" / "README.md").write_text("old\n")
    (tmp_path / "legacy" / "notes.md").write_text("old\n")
    explicit = lambda prompt: [c.path for c in rank_files(tmp_path, prompt).candidates if c.explicit]  # noqa: E731
    assert explicit("fix any typos in README.md") == ["README.md"]
    assert explicit("fix any typos in legacy/README.md") == ["legacy/README.md"]
    assert explicit("fix any typos in notes.md") == ["legacy/notes.md"]  # no exact path: by name


def test_edit_summaries_drop_lead_ins_to_hidden_blocks():
    from doaide_code.runner import _edit_summary

    assert _edit_summary("Here are the two edit blocks:") == ""
    assert _edit_summary("Fix the path in the body text:\n\nFix the same typo in the table:") == (
        "Fix the path in the body text.\n\nFix the same typo in the table."
    )
    assert _edit_summary("Added a --version flag.") == "Added a --version flag."


def test_excerpts_of_a_large_file_include_the_definition_asked_about():
    from doaide_code.context import _excerpt

    filler = "\n".join(f"x{i} = edit_summary_like_word_edit({i})  # edit summary" for i in range(400))
    text = f"{filler}\n\ndef _edit_summary(prose):\n    return prose.strip()\n\n{filler}"
    cut = _excerpt(text, {"edit", "summary", "_edit_summary"}, 3000, {"_edit_summary"})
    assert "def _edit_summary(prose):" in cut and len(cut) <= 3000


def test_how_to_code_questions_ask_for_inline_code():
    from doaide_code.prompts import HOWTO_REMINDER, LOCAL_REMINDER, local_reminder

    assert local_reminder("how do I reverse a list in python?") == HOWTO_REMINDER
    assert local_reminder("How can I read a file in JavaScript") == HOWTO_REMINDER
    assert local_reminder("how does the router pick a model?") == LOCAL_REMINDER


def test_a_code_answer_to_a_how_to_question_is_on_topic():
    from doaide_code.validate import off_topic_reason

    assert off_topic_reason("how do I reverse a list in python?", "Use `items[::-1]` or `items.reverse()`.") is None
    assert off_topic_reason("how do I reverse a list in python?", "I like turtles a lot.") is not None


@pytest.mark.parametrize(
    "prompt",
    [
        "what is MAX_RETRIES used for?",
        "why does Ranking.render leave out the tree when a file is named?",
        "which files handle the response cache?",
    ],
)
def test_constants_methods_and_file_lists_are_about_the_project(prompt):
    from doaide_code.classify import classify_task

    assert classify_task(prompt).about_project


def test_general_questions_stay_general():
    from doaide_code.classify import classify_task

    assert not classify_task("what is a REST API?").about_project
    assert not classify_task("why is the sky blue?").about_project


def test_how_to_questions_are_answered_with_steps_not_edits():
    from doaide_code.classify import classify_task

    assert classify_task("how do I add a new executor?").kind == "explain"
    assert classify_task("how can I change the port?").kind == "explain"
    assert classify_task("add a docstring to log_task").kind == "edit"
    assert classify_task("how do I fix the login bug in auth.py?").kind != "explain"


def test_questions_without_project_files_get_no_file_example_or_file_reminders():
    from doaide_code.prompts import LIST_REMINDER, LOCAL_REMINDER, WHY_REMINDER, few_shot, local_reminder

    assert few_shot("local", "question", has_context=False) == []
    assert few_shot("local", "question") != []
    assert few_shot("local", "edit", has_context=False) != []
    assert local_reminder("why is the sky blue?", has_context=False) == LOCAL_REMINDER
    assert local_reminder("why is FOO 3?") == WHY_REMINDER
    assert local_reminder("which files handle login?") == LIST_REMINDER


def test_not_defined_in_the_provided_code_means_files_were_missing():
    from doaide_code.validate import NEEDS_FILES_REASON

    answer = "The `MAX_RETRIES` variable isn't defined in the provided code. It's unclear what it's used for without more context."
    assert incomplete_reason(answer, "question") == NEEDS_FILES_REASON


def test_an_answer_naming_a_file_that_is_not_in_the_project_is_caught():
    from doaide_code.validate import invented_paths

    known = {"backend/doaide_code/db.py", "backend/doaide_code/runner.py", "README.md"}
    answer = "- `backend/doaide_code/cache.py`\n- `backend/doaide_code/db.py`\n- `doaide_code/runner.py`"
    assert invented_paths("which files handle the cache?", answer, known) == ["backend/doaide_code/cache.py"]
    # How-to answers may name files to create; code blocks and URLs are not claims about the project.
    assert invented_paths("how do I add a cache?", answer, known) == []
    assert invented_paths("which files?", "See https://x.dev/a/b.py and\n```\nnew/thing.py\n```", known) == []
    assert invented_paths("which files?", answer, set()) == []


async def test_a_local_answer_naming_a_missing_file_gets_one_free_retry(tmp_path):
    from doaide_code.runner import _vet
    from doaide_code.executors import Job

    (tmp_path / "app").mkdir()
    (tmp_path / "app" / "db.py").write_text("x = 1\n")
    job = Job("which files handle the cache?", cwd=tmp_path)
    problem, _, fix = await _vet(job, "- `app/cache.py` stores answers.", "question", {"app/db.py"})
    assert problem and "app/cache.py" in problem and "not a file in this project" in fix
    assert (await _vet(job, "- `app/db.py` stores the cached answers.", "question", {"app/db.py"}))[0] is None


def test_files_defining_a_term_outrank_files_that_only_mention_it(tmp_path):
    from doaide_code.context import rank_files

    (tmp_path / "notes.py").write_text("# the response cache is keyed by prompt\nx = 1\n")
    (tmp_path / "store.py").write_text("def cache_get(key):\n    return response\n")
    ranking = rank_files(tmp_path, "which files handle the response cache?")
    assert [c.path for c in ranking.candidates][0] == "store.py"
    assert "handle" not in ranking.terms


@pytest.mark.parametrize(
    "prompt",
    ["what does trim_reply remove?", "where does the runner update the route?", "In app/x.py, what does update() change?"],
)
def test_questions_about_a_change_are_explained_not_edited(prompt):
    from doaide_code.classify import classify_task

    assert classify_task(prompt).kind == "explain"


def test_requests_for_a_change_are_still_edits():
    from doaide_code.classify import classify_task

    assert classify_task("can you add a docstring to log_task?").kind == "edit"
    assert classify_task("In app/x.py, add a FOO flag").kind == "edit"


def test_where_questions_must_name_a_place():
    from doaide_code.prompts import WHERE_REMINDER, local_reminder
    from doaide_code.validate import names_no_place

    assert local_reminder("where is the escalation to Sonnet decided?") == WHERE_REMINDER
    assert names_no_place("where is the escalation decided?", "It happens when an answer fails its checks.")
    assert not names_no_place("where is the escalation decided?", "In `runner.py`, in `_vet()`.")
    assert not names_no_place("where is it decided?", "backend/doaide_code/runner.py decides it.")
    assert not names_no_place("what is escalation?", "When an answer fails its checks.")
