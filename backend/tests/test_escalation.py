"""Try, then escalate: a free local answer first, out of sight; Sonnet only when it fails checks."""

from __future__ import annotations

import json
import os
import time
from pathlib import Path

import pytest

from doaide_code.dashboard import usage_report
from doaide_code.executors import ExecutorError, Job, Turn
from doaide_code.router import RouterBrain, heuristic_tier
from doaide_code.runner import Outcome, answer_anchor, run_job
from doaide_code.usage import Usage
from doaide_code.validate import off_topic_reason

from .conftest import FakeExecutor

pytestmark = pytest.mark.anyio


async def nop(_chunk: str) -> None:
    pass


def local(name: str, tier: int, chunks, **kw) -> FakeExecutor:
    ex = FakeExecutor(name, tier, chunks, **kw)
    ex.tool, ex.model = "ollama", "qwen2.5-coder:32b"
    return ex


def paid(name: str, tier: int, chunks=("ok",), **kw) -> FakeExecutor:
    ex = FakeExecutor(name, tier, chunks, **kw)
    ex.tool = "claude" if name.startswith("claude") else "codex"
    return ex


async def run(executors, prompt: str, cwd: Path | None = None, store=None):
    sent: list[str] = []

    async def on_delta(chunk: str) -> None:
        sent.append(chunk)

    outcome = await run_job(RouterBrain(executors, offline=True), store, Job(prompt, cwd=cwd), Outcome(), on_delta)
    return outcome, "".join(sent)


GOOD = "Use `sorted(items)` for a new sorted list, or `items.sort()` to sort the list in place."


async def test_a_good_local_answer_is_shown_and_sonnet_never_runs(store):
    ollama = local("ollama", 0, [GOOD[:20], GOOD[20:], Usage("qwen2.5-coder:7b", 1000, 200)])
    sonnet = paid("claude-sonnet", 2)
    outcome, sent = await run([ollama, sonnet], "how do I sort a list in python", store=store)
    assert sonnet.jobs == [] and outcome.executor == "ollama" and sent == GOOD
    route = outcome.meta()["route"]
    assert route["free"] is True and "escalated_from" not in route
    # What Sonnet would have charged: (1000 * 2 + 200 * 10) / 1M.
    assert route["would_cost_usd"] == pytest.approx(0.004)


@pytest.mark.parametrize(
    "answer, reason",
    [
        ("Here you go:\n```python\ndef sort_list(xs)\n    return sorted(xs)\n```", "python block does not parse"),
        ("The weather in Paris is lovely in the spring, especially in April.", "shares no words"),
        ("", "empty answer"),
        ("As an AI language model, I cannot help with sorting lists in python.", "declined"),
    ],
)
async def test_a_failed_local_answer_is_silently_escalated_to_sonnet(store, answer, reason):
    ollama = local("ollama", 0, [answer])
    sonnet = paid("claude-sonnet", 2, [GOOD])
    haiku = paid("claude-haiku", 1, ["haiku"])
    outcome, sent = await run([ollama, haiku, sonnet], "how do I sort a list in python", store=store)
    assert outcome.executor == "claude-sonnet" and haiku.jobs == []
    # The user never sees the failed attempt, or a note about retrying.
    assert sent == GOOD and outcome.content == GOOD
    route = outcome.meta()["route"]
    assert route["free"] is False and "would_cost_usd" not in route
    assert route["escalated_from"]["executor"] == "ollama" and reason in route["escalated_from"]["reason"]
    complete = outcome.meta()["checks"]["items"][0]
    assert complete["ok"] is True and complete["detail"].startswith("escalated from ollama:")


async def test_an_edit_that_does_not_apply_escalates_with_more_context(tmp_path, store):
    (tmp_path / "util.py").write_text("def add(a, b):\n    return a - b\n")
    bad = "util.py\n<<<<<<< SEARCH\n    return a * b\n=======\n    return a + b\n>>>>>>> REPLACE"
    good = "util.py\n<<<<<<< SEARCH\n    return a - b\n=======\n    return a + b\n>>>>>>> REPLACE"
    coder = local("ollama-coder", 1, [bad])
    sonnet = paid("claude-sonnet", 2, [good])
    coder.context_mode = sonnet.context_mode = "files"
    coder.context_chars = sonnet.context_chars = 3_000
    outcome, sent = await run([coder, sonnet], "fix the add bug in util.py", cwd=tmp_path, store=store)
    assert outcome.executor == "claude-sonnet" and "a * b" not in sent
    assert "edit failed checks" in outcome.meta()["route"]["escalated_from"]["reason"]
    assert outcome.changes["files"][0]["path"] == "util.py"


async def test_a_broken_local_model_escalates_without_a_trace(store):
    ollama = local("ollama", 0, ["partial"], fail="connection reset", fail_after=True)
    sonnet = paid("claude-sonnet", 2, [GOOD])
    outcome, sent = await run([ollama, sonnet], "how do I sort a list in python", store=store)
    assert sent == GOOD and "stopped" not in outcome.content
    assert outcome.meta()["route"]["escalated_from"]["reason"] == "it failed: connection reset"


async def test_without_a_paid_model_the_local_answer_streams_as_before(store):
    ollama = local("ollama", 0, ["The weather ", "is nice."])
    outcome, sent = await run([ollama], "how do I sort a list in python", store=store)
    assert sent == "The weather is nice." and outcome.executor == "ollama"


async def test_if_every_paid_model_fails_the_local_answer_is_shown_with_its_problem(store):
    ollama = local("ollama", 0, ["The weather in Paris is lovely in the spring."])
    sonnet = paid("claude-sonnet", 2, fail="not signed in")
    outcome, sent = await run([ollama, sonnet], "how do I sort a list in python", store=store)
    assert outcome.status == "done" and outcome.executor == "ollama" and sent == outcome.content
    complete = outcome.meta()["checks"]["items"][0]
    assert complete == {"name": "complete", "ok": False, "detail": "the answer shares no words with the request"}


async def test_obviously_complex_work_skips_the_local_attempt(store):
    coder = local("ollama-coder", 1, ["local"])
    opus = paid("claude-opus", 3, ["A careful design with trade-offs for the distributed architecture."])
    opus.min_task_tier = 2
    outcome, _ = await run([coder, opus], "design a distributed architecture and do a security audit across all services", store=store)
    assert coder.jobs == [] and outcome.executor == "claude-opus"
    assert any(r.startswith("local model skipped: complex task") for r in outcome.meta()["route"]["reasons"])


async def test_plan_tries_the_fitting_local_model_then_sonnet_first():
    ollama, coder = local("ollama", 0, []), local("ollama-coder", 1, [])
    haiku, sonnet, codex = paid("claude-haiku", 1), paid("claude-sonnet", 2), paid("codex", 2)
    codex.min_task_tier = 2
    brain = RouterBrain([ollama, coder, haiku, sonnet, codex], offline=True)
    order, skipped = await brain.plan(heuristic_tier("how do I reverse a list"))
    assert [e.name for e in order] == ["ollama", "claude-sonnet", "claude-haiku", "ollama-coder"] and skipped is None
    order, _ = await brain.plan(heuristic_tier("fix the off-by-one bug in pager.py"))
    assert [e.name for e in order][:2] == ["ollama-coder", "claude-sonnet"]


def test_relevance_check():
    assert off_topic_reason("how do I sort a list in python", GOOD) is None
    assert off_topic_reason("explain add()", "The function adds two numbers.") is None
    assert off_topic_reason("why does `parse_edits` crash", "It is fine.") == "the answer never mentions parse_edits"
    # Naming the file is not required when the answer clearly talks about the request.
    assert off_topic_reason("why does charge in billing.py round amounts", "charge multiplies amounts, which rounds") is None
    assert off_topic_reason("hi", "Hello! How can I help?") is None


def test_dashboard_counts_escalations(store):
    session = store.create_session("me@x.com")["id"]
    now = 1_800_000_000.0
    route = {"executor": "claude-sonnet", "free": False, "escalated_from": {"executor": "ollama", "reason": "empty answer"}}
    store._exec(
        "INSERT INTO messages (id, session_id, role, content, status, created_at, meta) VALUES ('a', ?, 'assistant', 'a', 'done', ?, ?)",
        (session, now - 10, json.dumps({"usage": {"tokens_in": 10, "tokens_out": 10, "cost_usd": 0.01}, "route": route})),
    )
    report = usage_report(store, "me@x.com", days=1, now=now)
    assert report["totals"]["escalated"] == 1 and report["recent"][0]["escalated"] is True


# Fewer paid tokens: a free repair round, early stops, resumed Claude sessions.


class Scripted(FakeExecutor):
    """Answers each run with the next script entry (the last one repeats)."""

    def __init__(self, name, tier, answers, tool):
        super().__init__(name, tier)
        self.answers, self.tool = list(answers), tool

    async def stream(self, job):
        self.jobs.append(job)
        answer = self.answers[min(len(self.jobs), len(self.answers)) - 1]
        for chunk in answer if isinstance(answer, list) else [answer]:
            yield chunk


async def test_a_fixable_local_answer_gets_one_free_repair_before_escalating(store):
    broken = "Here:\n```python\ndef sort_list(xs)\n    return sorted(xs)\n```"
    fixed = "Here:\n```python\ndef sort_list(xs):\n    return sorted(xs)\n```"
    ollama = Scripted("ollama", 0, [broken, fixed], "ollama")
    sonnet = paid("claude-sonnet", 2, [GOOD])
    outcome, sent = await run([ollama, sonnet], "how do I sort a list in python", store=store)
    assert sonnet.jobs == [] and sent == fixed and outcome.executor == "ollama"
    # The second try saw its own answer and the exact error.
    assert ollama.jobs[1].history[-1].content == broken and "does not parse" in ollama.jobs[1].prompt
    complete = outcome.meta()["checks"]["items"][0]
    assert complete["ok"] and complete["detail"].startswith("fixed by ollama on a second try")


async def test_an_unfixable_local_answer_is_stopped_early(store):
    seen: list[str] = []

    class Chatty(FakeExecutor):
        async def stream(self, job):
            for chunk in ["I don't see the file you mean. ", "Please provide the code ", "and more " * 50]:
                seen.append(chunk)
                yield chunk

    ollama = Chatty("ollama", 0)
    ollama.tool = "ollama"
    sonnet = paid("claude-sonnet", 2, [GOOD])
    outcome, sent = await run([ollama, sonnet], "explain how the pager works", store=store)
    assert sent == GOOD and len(seen) == 1
    assert outcome.meta()["route"]["escalated_from"]["reason"] == "the model said it could not see the code it needed"


async def test_follow_ups_resume_the_claude_session(tmp_path, store):

    (tmp_path / "app.py").write_text("def charge():\n    return 1\n")
    sonnet = Scripted("claude-sonnet", 2, [["charge returns one, from app.py.", Usage("sonnet", 10, 5, 0.01, session_id="s-1")]], "claude")
    brain = RouterBrain([sonnet], offline=True)
    first = await run_job(brain, store, Job("explain charge in app.py", cwd=tmp_path), Outcome(), nop)
    assert first.content == "charge returns one, from app.py." and sonnet.jobs[0].resume == ""

    (tmp_path / "app.py").write_text("def charge():\n    return 2\n")
    os.utime(tmp_path / "app.py", (time.time() + 5, time.time() + 5))
    history = [Turn("user", "explain charge in app.py"), Turn("assistant", first.content), Turn("user", "thanks"), Turn("assistant", "You're welcome!")]
    second = await run_job(brain, store, Job("what does charge return now in app.py", history=history, cwd=tmp_path), Outcome(), nop)
    job = sonnet.jobs[1]
    # Only what the session missed: the two later turns and the changed file, no project map.
    assert job.resume == "s-1" and [t.content for t in job.history] == ["thanks", "You're welcome!"]
    assert "Files changed since your last answer" in job.context and "- app.py" in job.context and "## File" not in job.context
    assert any(r.startswith("resumed the Claude session (1 file changed") for r in second.meta()["route"]["reasons"])


async def test_a_failed_resume_starts_a_fresh_session(tmp_path, store):

    class Gone(FakeExecutor):
        async def stream(self, job):
            self.jobs.append(job)
            if job.resume:
                raise ExecutorError("No conversation found with session ID")
            yield "charge returns 2 in app.py now."

    (tmp_path / "app.py").write_text("def charge():\n    return 2\n")
    store.cli_session_put(answer_anchor("old answer"), "gone", str(tmp_path))
    sonnet = Gone("claude-sonnet", 2)
    sonnet.tool = "claude"
    history = [Turn("user", "q"), Turn("assistant", "old answer")]
    outcome = await run_job(RouterBrain([sonnet], offline=True), store, Job("what does charge return in app.py", history=history, cwd=tmp_path), Outcome(), nop)
    assert outcome.content == "charge returns 2 in app.py now." and [j.resume for j in sonnet.jobs] == ["gone", ""]
    assert [t.content for t in sonnet.jobs[1].history] == ["q", "old answer"]


def test_compute_in_a_code_question_is_not_math():
    from doaide_code.classify import classify_task

    assert classify_task("In usage.py, what does sonnet_equivalent compute? One sentence.").kind != "math"
    assert classify_task("compute 17 * 23").kind == "math"
