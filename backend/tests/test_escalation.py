"""Try, then escalate: a free local answer first, out of sight; Sonnet only when it fails checks."""

from __future__ import annotations

import json
from pathlib import Path

import pytest

from doaide_code.dashboard import usage_report
from doaide_code.executors import Job
from doaide_code.router import RouterBrain, heuristic_tier
from doaide_code.runner import Outcome, run_job
from doaide_code.usage import Usage
from doaide_code.validate import off_topic_reason

from .conftest import FakeExecutor

pytestmark = pytest.mark.anyio


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
    # What Sonnet would have charged: (1000 * 3 + 200 * 15) / 1M.
    assert route["would_cost_usd"] == pytest.approx(0.006)


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
