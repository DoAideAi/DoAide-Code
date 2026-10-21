"""From a live "add a function" task: qwen2.5-coder:32b wrote a malformed edit block and the
answer went straight to Sonnet ($0.08) when a free second try or a tolerant read would do."""

from __future__ import annotations

import pytest

from doaide_code.changes import build_changeset, parse_edits, strip_edits
from doaide_code.classify import classify_task
from doaide_code.executors import Job
from doaide_code.executors.base import user_message
from doaide_code.router import RouterBrain
from doaide_code.runner import Outcome, run_job
from doaide_code.validate import incomplete_reason, trim_reply

from .conftest import FakeExecutor

pytestmark = pytest.mark.anyio

USAGE = 'def estimate_tokens(text: str) -> int:\n    return len(text) // 4\n'
NEW = 'def format_usd(amount: float) -> str:\n    return f"${amount:.2f}"\n'


def test_an_empty_search_that_adds_code_appends_it(tmp_path):
    (tmp_path / "usage.py").write_text(USAGE)
    # What the model wrote: empty SEARCH, no divider, the new function after the REPLACE marker.
    answer = f"Added it.\n\nusage.py\n<<<<<<< SEARCH\n>>>>>>> REPLACE\n{NEW}"
    change = build_changeset(tmp_path, parse_edits(answer)).files["usage.py"]
    assert change.new == USAGE + "\n\n" + NEW and change.problems == []


def test_an_empty_search_that_rewrites_the_file_is_still_refused(tmp_path):
    (tmp_path / "usage.py").write_text(USAGE)
    rewrite = USAGE.replace("4", "3")
    answer = f"usage.py\n<<<<<<< SEARCH\n=======\n{rewrite}>>>>>>> REPLACE\n"
    change = build_changeset(tmp_path, parse_edits(answer)).files["usage.py"]
    assert change.new == USAGE and "empty SEARCH" in change.problems[0]


class Scripted(FakeExecutor):
    def __init__(self, name, tier, answers):
        super().__init__(name, tier)
        self.answers, self.tool, self.context_mode = answers, "ollama", "files"

    async def stream(self, job):
        self.jobs.append(job)
        yield self.answers[min(len(self.jobs), len(self.answers)) - 1]


async def test_a_cut_off_edit_block_gets_a_free_second_try(tmp_path, store):
    (tmp_path / "usage.py").write_text(USAGE)
    cut = "Added it.\n\nusage.py\n<<<<<<< SEARCH\n" + USAGE
    good = f"Added it.\n\nusage.py\n<<<<<<< SEARCH\n{USAGE}=======\n{USAGE}\n\n{NEW}>>>>>>> REPLACE\n"
    coder = Scripted("ollama-coder", 1, [cut, good])
    sonnet = FakeExecutor("claude-sonnet", 2, ["sonnet"])
    sonnet.tool = "claude"

    async def nop(_chunk: str) -> None:
        pass

    job = Job("In usage.py add a function format_usd", cwd=tmp_path)
    outcome = await run_job(RouterBrain([coder, sonnet], offline=True), store, job, Outcome(), nop)
    assert sonnet.jobs == [] and outcome.executor == "ollama-coder"
    assert "cut off: each block is <<<<<<< SEARCH" in coder.jobs[1].prompt
    assert outcome.meta()["route"]["free"] is True
    # The second try replays the first request word for word (files included): a prompt-cache hit.
    first, second = coder.jobs
    assert first.context and second.context == ""
    assert [t.content for t in second.history] == [user_message(first), cut]


def test_a_why_question_is_answered_not_debugged():
    # Live: classed as debug, the right two-sentence answer was "no code proposed" and went to Sonnet.
    asking = classify_task("In backend/doaide_code/executors/ollama.py, why is FIXED_CTX a constant instead of computed per request? Two sentences.")
    assert asking.kind == "question" and asking.about_project
    # Answered by the 32b model: the 7b one guessed a plausible, wrong reason.
    assert asking.tier == 1 and classify_task("why is the sky blue").tier == 0
    assert classify_task("why does test_charge fail").kind == "debug"
    assert classify_task("why is add in util.py wrong").kind == "debug"


def test_a_short_instruction_naming_code_is_an_edit_and_a_claimed_edit_must_exist():
    # Live: classed as a question, the 7b model replied "Usage RE updated to accept 'what calls X'
    # questions." and changed nothing.
    task = classify_task("In backend/doaide_code/fastpath.py, make USAGE_RE also accept 'what calls X' questions.")
    assert task.kind == "edit" and task.tier == 1
    # Benchmark regression: a question naming code is still a question.
    assert classify_task("In one sentence: what does merge() in lists.py return?").kind == "question"
    assert classify_task("merge() in lists.py returns what?").kind == "question"
    assert incomplete_reason("Usage RE updated to accept 'what calls X' questions.", "question")
    assert incomplete_reason("Updated the handler.", "explain")
    assert incomplete_reason("It returns the updated list.", "question") is None
    assert incomplete_reason("The limit was changed to 5 in 2021 by the config loader.", "question") is None


def test_a_replace_marker_used_as_the_divider_is_read(tmp_path):
    (tmp_path / "usage.py").write_text(USAGE)
    # Live, qwen2.5-coder:32b: SEARCH, a blank line, REPLACE (as the divider), the code, REPLACE.
    answer = f"Add `format_usd`.\n\nusage.py\n<<<<<<< SEARCH\n\n>>>>>>> REPLACE\n{NEW}>>>>>>> REPLACE\n"
    assert incomplete_reason(answer, "edit") is None
    change = build_changeset(tmp_path, parse_edits(answer)).files["usage.py"]
    assert change.new == USAGE + "\n\n" + NEW and change.problems == []
    assert strip_edits(answer) == "Add `format_usd`."


def test_narration_of_next_steps_is_trimmed_from_replies():
    # Live (claude-sonnet): the plan, then the summary of the same change.
    live = (
        "Now I'll modify `failing_tests` to first try running only test files that mention the edited module.\n\n"
        "`failing_tests` now filters test files by module name before falling back to the full suite."
    )
    assert trim_reply(live) == "`failing_tests` now filters test files by module name before falling back to the full suite."
    live = (
        "The `ws:` case maps to `http:`. Line 141 already covers `wss:`. I'll add a dedicated test right after it.\n\n"
        "Add a test for `hub_origin` with a plain `ws:` URL."
    )
    assert trim_reply(live) == "Add a test for `hub_origin` with a plain `ws:` URL."
    # A reply that is only a plan, or a real answer mentioning "let me" mid-sentence, stays.
    assert trim_reply("I'll add the test.") == "I'll add the test."
    assert trim_reply("It caches answers.\n\nThe cache key includes the files.") == "It caches answers.\n\nThe cache key includes the files."


async def test_an_edit_described_but_not_written_by_the_top_model_is_asked_for_once(tmp_path, store):
    (tmp_path / "calc.py").write_text("def add(a, b):\n    return a - b\n")
    described = "Fix `add` to return the sum.\n\n`calc.py`, line 2: change `a - b` to `a + b`."
    written = "Fix `add`.\n\ncalc.py\n<<<<<<< SEARCH\n    return a - b\n=======\n    return a + b\n>>>>>>> REPLACE"
    sonnet = Scripted("claude-sonnet", 2, [described, written])
    sonnet.tool, sonnet.context_mode = "claude", "map"

    async def nop(_chunk: str) -> None:
        pass

    outcome = await run_job(RouterBrain([sonnet], offline=True), store, Job("fix add in calc.py", cwd=tmp_path), Outcome(), nop)
    assert (tmp_path / "calc.py").read_text() == "def add(a, b):\n    return a + b\n"
    assert len(sonnet.jobs) == 2 and "write the change as edit blocks" in sonnet.jobs[1].prompt
    complete = outcome.meta()["checks"]["items"][0]
    assert complete["ok"] and complete["detail"].startswith("edit blocks asked for again")
