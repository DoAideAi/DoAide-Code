"""Models are view-only: a cost/quality comparison from real tasks, and no code in the chat."""

from __future__ import annotations

import json
from pathlib import Path

import pytest

from doaide_code.dashboard import model_comparison
from doaide_code.executors import Job
from doaide_code.prompts import system_prompt
from doaide_code.router import RouterBrain
from doaide_code.runner import Outcome, run_job

from .conftest import FakeExecutor
from .test_api import auth

pytestmark = pytest.mark.anyio

NOW = 1_800_000_000.0
LOCAL = {"executor": "ollama-coder", "model": "qwen2.5-coder:32b", "free": True}
SONNET = {"executor": "claude-sonnet", "model": "sonnet", "free": False}
OPUS = {"executor": "claude-opus", "model": "opus", "free": False}


async def nop(_chunk: str) -> None:
    pass


def reply(store, session, n, route, *, cost=0.0, ok=True, elapsed=1000, cached=False, would=0.0):
    meta = {
        "usage": {"tokens_in": 1000, "tokens_out": 100, "cost_usd": cost, **({"cached": True} if cached else {})},
        "route": {**route, "elapsed_ms": elapsed, **({"would_cost_usd": would} if would else {})},
        "checks": {"items": [{"name": "complete", "ok": ok}]},
    }
    store._exec(
        "INSERT INTO messages (id, session_id, role, content, status, created_at, meta) VALUES (?, ?, 'assistant', 'a', 'done', ?, ?)",
        (f"m{n}", session, NOW - 100 - n, json.dumps(meta)),
    )


def test_comparison_measures_cost_quality_and_speed_per_model(store):
    session = store.create_session("me@x.com")["id"]
    n = 0
    for i in range(8):  # 8 local answers, 2 of its tries escalated to Sonnet
        reply(store, session, n := n + 1, LOCAL, elapsed=20_000 + i, would=0.01)
    for _ in range(2):
        reply(store, session, n := n + 1, {**SONNET, "escalated_from": {"executor": "ollama-coder", "model": "qwen2.5-coder:32b"}},
              cost=0.40, elapsed=30_000)
    for ok in (True, True, False):
        reply(store, session, n := n + 1, SONNET, cost=0.40, ok=ok, elapsed=30_000)
    reply(store, session, n := n + 1, OPUS, cost=1.20, elapsed=60_000)
    reply(store, session, n := n + 1, SONNET, cost=9, cached=True)  # cache hits are not model runs
    reply(store, session, n := n + 1, {"executor": "direct", "free": True})

    report = model_comparison(store, "me@x.com", days=30, now=NOW)
    rows = {m["model"]: m for m in report["models"]}
    assert list(rows) == ["ollama-coder · qwen2.5-coder:32b", "claude-sonnet", "claude-opus"]
    local, sonnet, opus = rows.values()
    # Local quality: first tries good enough to show (8 of 10).
    assert (local["tasks"], local["escalated"], local["quality"]) == (8, 2, 0.8)
    assert local["cost_per_task"] == 0 and local["cost_vs_sonnet"] == 0 and local["saved_usd"] == 0.08
    assert local["median_seconds"] == 20.0 and local["enough_data"]
    # Paid quality: answers that passed every check (4 of 5).
    assert (sonnet["tasks"], sonnet["quality"], sonnet["cost_per_task"]) == (5, 0.8, 0.4)
    assert report["baseline"] == "claude-sonnet" and opus["cost_vs_sonnet"] == 3.0 and not opus["enough_data"]


def test_the_comparison_endpoint(client, token):
    body = client.get("/api/models/compare?days=7", headers=auth(token)).json()
    assert body == {"days": 7, "baseline": None, "models": []}
    assert client.get("/api/models/compare").status_code == 401


# No code in the chat: passing edits go to the files, failing ones are held back.


@pytest.fixture
def repo(tmp_path) -> Path:
    root = tmp_path / "repo"
    root.mkdir()
    (root / "util.py").write_text("def add(a, b):\n    return a - b\n")
    return root


async def test_an_edit_that_fails_its_checks_is_not_written(repo, store):
    bad = "Fix add.\n\nutil.py\n<<<<<<< SEARCH\n    return a - b\n=======\n    return a +\n>>>>>>> REPLACE"
    outcome = Outcome()
    await run_job(RouterBrain([FakeExecutor("claude-sonnet", 2, [bad])]), store, Job("fix add in util.py", cwd=repo), outcome, nop)
    assert (repo / "util.py").read_text() == "def add(a, b):\n    return a - b\n"
    # Nothing to apply or discard: the broken file is left out and the reply says why.
    assert outcome.meta().get("changes") is None
    assert outcome.content.startswith("Fix add.\n\nNothing written: util.py") and "/apply" not in outcome.content


async def test_chat_edits_are_written_without_asking_minus_the_files_that_fail(repo, store):
    (repo / "other.py").write_text("X = 1\n")
    answer = (
        "Fix add and X.\n\nutil.py\n<<<<<<< SEARCH\n    return a - b\n=======\n    return a + b\n>>>>>>> REPLACE\n\n"
        "other.py\n<<<<<<< SEARCH\nX = 1\n=======\nX = (\n>>>>>>> REPLACE"
    )
    outcome = Outcome()
    await run_job(RouterBrain([FakeExecutor("claude-sonnet", 2, [answer])]), store, Job("fix add and X", cwd=repo), outcome, nop)
    assert (repo / "util.py").read_text() == "def add(a, b):\n    return a + b\n"
    assert (repo / "other.py").read_text() == "X = 1\n"
    changes = outcome.meta()["changes"]
    assert changes["status"] == "applied" and [f["path"] for f in changes["files"]] == ["util.py"]
    assert outcome.content.startswith("Fix add and X.\n\nNot written: other.py")


@pytest.mark.parametrize("style", ["local", "claude", "codex"])
def test_prompts_keep_code_out_of_the_reply(style):
    prompt = system_prompt(style, "edit")
    assert "Do not print code blocks in your reply" in prompt and "fenced" not in prompt


def test_a_paid_model_with_no_reported_cost_is_not_shown_as_free(store):
    session = store.create_session("me@x.com")["id"]
    reply(store, session, 1, {"executor": "codex", "model": "gpt-6-astra", "free": False}, cost=0.0)
    row = model_comparison(store, "me@x.com", days=30, now=NOW)["models"][0]
    assert row["kind"] == "paid" and row["cost_per_task"] is None and row["cost_vs_sonnet"] is None
