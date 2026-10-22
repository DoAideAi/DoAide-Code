"""The benchmark's tasks are honest: each stub fails its test and a correct solution passes."""

from __future__ import annotations

from pathlib import Path

import pytest

from doaide_code.benchmark import TASKS, Result, check, markdown, summarize

SOLUTIONS = {
    "fix-bug": {"calc.py": "def add(a, b):\n    return a + b\n"},
    "implement": {"text.py": "def is_palindrome(s):\n    t = [c.lower() for c in s if c.isalnum()]\n    return t == t[::-1]\n"},
    "off-by-one": {"pages.py": "def paginate(items, page, size):\n    start = (page - 1) * size\n    return items[start:start + size]\n"},
    "parse": {
        "duration.py": "import re\n\ndef parse_duration(text):\n"
        "    m = re.fullmatch(r'(?:(\\d+)h)?(?:(\\d+)m)?(?:(\\d+)s)?', text)\n"
        "    if not text or not m:\n        raise ValueError(text)\n"
        "    h, mi, s = (int(g or 0) for g in m.groups())\n    return h * 3600 + mi * 60 + s\n"
    },
    "multi-file": {
        "users.py": "def fetch_user(user_id):\n    return {'id': user_id}\n",
        "app.py": "from users import fetch_user\n\n\ndef handler(user_id):\n    return fetch_user(user_id)['id']\n",
    },
}


def write(root: Path, files: dict[str, str]) -> None:
    for path, content in files.items():
        (root / path).write_text(content)


@pytest.mark.parametrize("task", [t for t in TASKS if t.test], ids=lambda t: t.name)
def test_stubs_fail_and_solutions_pass(tmp_path, task):
    write(tmp_path, task.files)
    assert check(task, tmp_path, "")[0] is False
    write(tmp_path, SOLUTIONS[task.name])
    assert check(task, tmp_path, "") == (True, "")


def test_the_explain_task_is_judged_on_the_answer(tmp_path):
    task = next(t for t in TASKS if t.name == "explain")
    assert check(task, tmp_path, "It returns one sorted list of both inputs.")[0]
    assert not check(task, tmp_path, "It returns a list.")[0]


def test_summary_tracks_cost_quality_and_speed():
    results = [
        Result("auto", "a", True, 0.0, 10, "ollama-coder", free=True), Result("auto", "b", True, 0.2, 30, "claude-sonnet"),
        Result("claude-sonnet", "a", True, 0.2, 20, "claude-sonnet"), Result("claude-sonnet", "b", False, 0.2, 40, "claude-sonnet"),
        Result("codex", "a", True, 0.0, 15, "codex"),
    ]
    rows = {r["model"]: r for r in summarize(results)}
    assert rows["auto"] == {"model": "auto", "quality": 1.0, "cost_per_task": 0.1, "cost_known": True,
                            "median_seconds": 20, "tasks": 2, "escalated": 1}
    table = markdown(list(rows.values()))
    assert "| **auto** (1 of 2 escalated) | 100% | $0.100 | 20.0s |" in table
    assert "| claude-sonnet | 50% | $0.200 | 30.0s |" in table
    # Codex reports tokens but no cost: never shown as free.
    assert "| codex | 100% | not reported | 15.0s |" in table


def test_saved_results_merge_per_model_and_feed_the_report(tmp_path):
    from datetime import datetime, timezone

    from doaide_code.benchmark import BASELINE_SOURCE, report, save

    path = tmp_path / "bench.json"
    assert report(path)["source"] == BASELINE_SOURCE  # nothing measured here yet
    row = {"model": "ollama", "quality": 0.5, "cost_per_task": 0.0, "cost_known": True, "median_seconds": 1.0, "tasks": 6}
    save([row, {**row, "model": "auto", "quality": 0.9}], path, now=datetime(2026, 10, 22, tzinfo=timezone.utc))
    save([{**row, "quality": 0.75}], path)  # an --only ollama run keeps auto's row
    body = report(path)
    assert body["source"] == "measured on this laptop" and "fix-bug" in body["tasks"]
    assert [(r["model"], r["quality"]) for r in body["rows"]] == [("auto", 0.9), ("ollama", 0.75)]
    assert body["rows"][0]["measured_at"].startswith("2026-10-22")
    path.write_text("{broken")
    assert report(path)["source"] == BASELINE_SOURCE


def test_benchmarks_endpoint_serves_the_baseline_locally(client, token):
    from .test_api import auth

    body = client.get("/api/benchmarks", headers=auth(token)).json()
    assert body["rows"] and body["rows"][0]["quality"] >= body["rows"][-1]["quality"]
