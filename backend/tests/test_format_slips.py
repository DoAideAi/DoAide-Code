"""From a live "add a function" task: qwen2.5-coder:32b wrote a malformed edit block and the
answer went straight to Sonnet ($0.08) when a free second try or a tolerant read would do."""

from __future__ import annotations

import pytest

from doaide_code.changes import build_changeset, parse_edits
from doaide_code.classify import classify_task
from doaide_code.executors import Job
from doaide_code.executors.base import user_message
from doaide_code.router import RouterBrain
from doaide_code.runner import Outcome, run_job

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
    assert classify_task("why does test_charge fail").kind == "debug"
    assert classify_task("why is add in util.py wrong").kind == "debug"
