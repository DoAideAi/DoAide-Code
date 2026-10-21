"""metrics.jsonl lines and the summary shared with GET /api/v1/tasks/history."""

import datetime
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


# --- Structured response time logging tests ---


def test_log_task_writes_all_required_fields(tmp_path):
    """Every JSON line must contain the full set of structured fields."""
    meta = {
        "route": {"executor": "ollama", "model": "llama3", "elapsed_ms": 1500},
        "usage": {"cost_usd": 0.0},
        "checks": {"items": [{"name": "complete", "ok": True}]},
    }
    metrics.log_task("explain closures", meta, status="done", source="chat")
    row = json.loads((tmp_path / "metrics.jsonl").read_text().strip())
    required = {
        "timestamp", "prompt", "executor", "model", "cost_usd",
        "response_time_seconds", "validation_result", "escalated",
        "status", "source",
    }
    assert set(row) == required


def test_log_task_timestamp_is_valid_iso(tmp_path):
    """The timestamp field must be a parseable ISO-8601 datetime in UTC."""
    metrics.log_task("test", {}, status="done", source="chat")
    row = json.loads((tmp_path / "metrics.jsonl").read_text().strip())
    dt = datetime.datetime.fromisoformat(row["timestamp"])
    assert dt.tzinfo is None or dt.tzinfo == datetime.UTC


def test_log_task_truncates_prompt_to_100_chars(tmp_path):
    """Prompts longer than 100 characters are truncated."""
    long_prompt = "a" * 300
    metrics.log_task(long_prompt, {}, status="done", source="chat")
    row = json.loads((tmp_path / "metrics.jsonl").read_text().strip())
    assert len(row["prompt"]) == 100
    assert row["prompt"] == "a" * 100


def test_log_task_short_prompt_kept_intact(tmp_path):
    """Prompts shorter than 100 characters are not padded or altered."""
    metrics.log_task("short prompt", {}, status="done", source="chat")
    row = json.loads((tmp_path / "metrics.jsonl").read_text().strip())
    assert row["prompt"] == "short prompt"


def test_log_task_response_time_from_elapsed_ms(tmp_path):
    """response_time_seconds is computed from route.elapsed_ms."""
    meta = {"route": {"executor": "ollama", "model": "llama3", "elapsed_ms": 3456}}
    metrics.log_task("q", meta, status="done", source="chat")
    row = json.loads((tmp_path / "metrics.jsonl").read_text().strip())
    assert row["response_time_seconds"] == 3.46


def test_log_task_response_time_none_without_elapsed(tmp_path):
    """response_time_seconds is None when elapsed_ms is absent."""
    metrics.log_task("q", {}, status="done", source="chat")
    row = json.loads((tmp_path / "metrics.jsonl").read_text().strip())
    assert row["response_time_seconds"] is None


def test_log_task_escalated_true(tmp_path):
    """escalated is True when route has an escalated_from entry."""
    meta = {"route": {"executor": "sonnet", "model": "sonnet", "escalated_from": {"executor": "ollama", "reason": "incomplete"}}}
    metrics.log_task("q", meta, status="done", source="chat")
    row = json.loads((tmp_path / "metrics.jsonl").read_text().strip())
    assert row["escalated"] is True


def test_log_task_escalated_false_by_default(tmp_path):
    """escalated is False when no escalation occurred."""
    meta = {"route": {"executor": "ollama", "model": "llama3"}}
    metrics.log_task("q", meta, status="done", source="chat")
    row = json.loads((tmp_path / "metrics.jsonl").read_text().strip())
    assert row["escalated"] is False


def test_log_task_validation_result_passed(tmp_path):
    """validation_result is 'passed' when all checks pass."""
    meta = {"checks": {"items": [{"name": "complete", "ok": True}, {"name": "edits", "ok": True}]}}
    metrics.log_task("q", meta, status="done", source="chat")
    row = json.loads((tmp_path / "metrics.jsonl").read_text().strip())
    assert row["validation_result"] == "passed"


def test_log_task_validation_result_failed(tmp_path):
    """validation_result names every failing check."""
    meta = {"checks": {"items": [{"name": "complete", "ok": False}, {"name": "tests", "ok": False}]}}
    metrics.log_task("q", meta, status="done", source="chat")
    row = json.loads((tmp_path / "metrics.jsonl").read_text().strip())
    assert row["validation_result"] == "failed: complete, tests"


def test_log_task_cost_usd_rounds_to_six_decimals(tmp_path):
    """cost_usd is rounded to 6 decimal places."""
    meta = {"usage": {"cost_usd": 0.1234567890123}}
    metrics.log_task("q", meta, status="done", source="chat")
    row = json.loads((tmp_path / "metrics.jsonl").read_text().strip())
    assert row["cost_usd"] == 0.123457


def test_log_task_appends_multiple_lines(tmp_path):
    """Successive calls append lines, not overwrite."""
    for i in range(3):
        metrics.log_task(f"task {i}", {}, status="done", source="chat")
    lines = (tmp_path / "metrics.jsonl").read_text().strip().splitlines()
    assert len(lines) == 3
    for i, line in enumerate(lines):
        row = json.loads(line)
        assert row["prompt"] == f"task {i}"


def test_log_task_creates_parent_directory(tmp_path, monkeypatch):
    """log_task creates the parent directory if it does not exist."""
    nested = tmp_path / "deep" / "nested" / "metrics.jsonl"
    monkeypatch.setattr(metrics, "METRICS_FILE", nested)
    metrics.log_task("q", {}, status="done", source="chat")
    assert nested.exists()
    row = json.loads(nested.read_text().strip())
    assert row["prompt"] == "q"


async def test_run_job_writes_response_time(store, tmp_path):
    """A full run_job writes a metrics line with a non-None response_time_seconds."""
    ex = FakeExecutor("ollama", 0, ["done"])
    await run_job(RouterBrain([ex], offline=True), store, Job("hello"), Outcome(), nop)
    row = json.loads((tmp_path / "metrics.jsonl").read_text().strip())
    assert row["response_time_seconds"] is not None
    assert row["response_time_seconds"] >= 0
