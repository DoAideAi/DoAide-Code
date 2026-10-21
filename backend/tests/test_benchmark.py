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
