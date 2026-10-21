"""metrics.jsonl lines and the summary shared with GET /api/v1/tasks/history."""

import json

import pytest

from doaide_code import metrics
from doaide_code.executors import Job
from doaide_code.router import RouterBrain
from doaide_code.runner import Outcome, run_job

from .conftest import FakeExecutor

pytestmark = pytest.mark.anyio


async def nop(_chunk: str) -> None:
    pass


def test_summary_of_a_reply():
    meta = {
        "route": {"executor": "claude-sonnet", "model": "sonnet", "elapsed_ms": 4210, "escalated_from": {"executor": "ollama"}},
        "usage": {"cost_usd": 0.0123456789},
        "checks": {"items": [{"name": "complete", "ok": True}, {"name": "tests", "ok": False}, {"name": "edits", "ok": False}]},
    }
    assert metrics.summary(meta) == {
        "executor": "claude-sonnet",
        "model": "sonnet",
        "cost_usd": 0.012346,
        "response_time_seconds": 4.21,
        "validation_result": "failed: tests, edits",
        "escalated": True,
    }
    assert metrics.summary({}) == {
        "executor": None, "model": None, "cost_usd": 0.0, "response_time_seconds": None,
        "validation_result": "passed", "escalated": False,
    }


async def test_a_chat_prompt_is_logged_too(store, tmp_path):
    ex = FakeExecutor("ollama", 0, ["The pager splits rows into pages."])
    await run_job(RouterBrain([ex], offline=True), store, Job("what does the pager do?"), Outcome(), nop)
    row = json.loads((tmp_path / "metrics.jsonl").read_text())
    assert row["source"] == "chat" and row["executor"] == "ollama" and row["status"] == "done"


def test_an_unwritable_metrics_file_never_breaks_a_task(tmp_path, monkeypatch, caplog):
    (tmp_path / "blocked").write_text("a file, not a folder")
    monkeypatch.setattr(metrics, "METRICS_FILE", tmp_path / "blocked" / "metrics.jsonl")
    metrics.log_task("hi", {}, status="done", source="chat")
    assert "could not write" in caplog.text
