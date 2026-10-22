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
