"""Smart context selection, zero-token direct answers, and the response cache."""

from __future__ import annotations

import os
import time
from pathlib import Path

import pytest

from doaide_code.context import rank_files
from doaide_code.executors import Job, Turn
from doaide_code.fastpath import direct_answer
from doaide_code.router import RouterBrain
from doaide_code.runner import Outcome, run_job

from .conftest import FakeExecutor

pytestmark = pytest.mark.anyio


@pytest.fixture
def repo(tmp_path) -> Path:
    root = tmp_path / "repo"
    (root / "app" / "auth").mkdir(parents=True)
    (root / "app" / "auth" / "session.py").write_text("def refresh_session(token):\n    return token\n")
    (root / "app" / "billing.py").write_text("def charge(amount):\n    return amount * 100\n")
    (root / "README.md").write_text("# Repo\n")
    (root / "node_modules" / "lib").mkdir(parents=True)
    (root / "node_modules" / "lib" / "session.js").write_text("refresh_session")
    (root / "package-lock.json").write_text('{"refresh_session": 1}')
    return root


class ContextExecutor(FakeExecutor):
    context_mode = "files"
    cacheable = True
    context_chars = 60_000


def collector():
    chunks: list[str] = []

    async def on_delta(text):
        chunks.append(text)

    return chunks, on_delta


# Context selection


def test_ranking_prefers_named_then_relevant_files(repo):
    ranking = rank_files(repo, "Why does refresh_session return the raw token? see README.md")
    paths = [c.path for c in ranking.candidates]
    assert paths[0] == "README.md" and ranking.candidates[0].explicit  # named in the request
    assert paths[1] == "app/auth/session.py"  # identifier match
    assert "app/billing.py" not in paths  # irrelevant
    assert not any("node_modules" in p or "lock" in p for p in ranking.tree)


def test_render_respects_budget_and_truncates_named_files(repo):
    (repo / "big.py").write_text("x = 1\n" * 20_000)
    ranking = rank_files(repo, "explain big.py and refresh_session")
    text, included = ranking.render(5_000)
    assert len(text) <= 5_000 and "## File: big.py" in text and "[truncated]" in text
    full, included_full = ranking.render(500_000)
    assert "app/auth/session.py" in included_full and "def refresh_session" in full
    assert ranking.render(0) == ("", [])


def test_fingerprint_changes_when_a_selected_file_changes(repo):
    before = rank_files(repo, "refresh_session").fingerprint
    assert rank_files(repo, "refresh_session").fingerprint == before
    target = repo / "app" / "auth" / "session.py"
    target.write_text("def refresh_session(token):\n    return None\n")
    os.utime(target, ns=(time.time_ns(), time.time_ns() + 1_000_000))
    assert rank_files(repo, "refresh_session").fingerprint != before


async def test_local_models_get_files_and_cli_agents_get_a_map(repo, store):
    api, cli = ContextExecutor("gemini-lite", 0, ["ok"]), FakeExecutor("codex", 0, ["ok"])
    _, on_delta = collector()
    await run_job(RouterBrain([api], offline=True), store, Job("fix refresh_session", cwd=repo), Outcome(), on_delta)
    assert "def refresh_session" in api.jobs[0].context
    await run_job(RouterBrain([cli], offline=True), store, Job("fix refresh_session", cwd=repo), Outcome(), on_delta)
    # CLI agents read files themselves: they get paths and the tree, not contents.
    assert "- app/auth/session.py" in cli.jobs[0].context and "def refresh_session" not in cli.jobs[0].context


# Direct answers


def test_direct_answers_for_reads_and_listings(repo):
    read = direct_answer(repo, "show me app/billing.py")
    assert read.startswith("`app/billing.py` (2 lines)") and "```python\ndef charge" in read
    assert "def charge" in direct_answer(repo, "cat ./app/billing.py")
    listing = direct_answer(repo, "list files")
    assert "app/" in listing and "README.md" in listing and "node_modules" not in listing
    assert "app/auth/" in direct_answer(repo, "ls in app")


@pytest.mark.parametrize(
    "prompt",
    [
        "show me how closures work",
        "read app/missing.py",
        "open ../secret.txt",
        "explain app/billing.py",
        "show me app/billing.py and fix the bug",
    ],
)
def test_direct_answer_leaves_real_requests_to_models(repo, prompt):
    assert direct_answer(repo, prompt) is None


async def test_direct_answer_spends_nothing(repo, store):
    ex = FakeExecutor("gemini-lite", 0)
    chunks, on_delta = collector()
    outcome = await run_job(RouterBrain([ex], offline=True), store, Job("read README.md", cwd=repo), Outcome(), on_delta)
    assert outcome.status == "done" and "# Repo" in "".join(chunks)
    assert ex.jobs == [] and outcome.meta()["usage"]["cost_usd"] == 0
    assert store.usage_summary()[0]["executor"] == "direct"


# Response cache


async def test_repeated_request_is_served_from_cache(repo, store):
    ex = ContextExecutor("gemini-lite", 0, ["refresh_session returns the token unchanged; it is called when the session expires."])
    brain = RouterBrain([ex], offline=True, cache_ttl=3600)
    _, on_delta = collector()
    first = await run_job(brain, store, Job("explain refresh_session", cwd=repo), Outcome(), on_delta)
    chunks, on_delta = collector()
    second = await run_job(brain, store, Job("explain   refresh_session ", cwd=repo), Outcome(), on_delta)
    assert len(ex.jobs) == 1 and not first.cached
    assert second.cached and second.content == "refresh_session returns the token unchanged; it is called when the session expires." and chunks == ["refresh_session returns the token unchanged; it is called when the session expires."]
    assert second.meta()["usage"] == {"tokens_in": 0, "tokens_out": 0, "cost_usd": 0, "cached": True}
    assert second.meta()["route"]["free"] is True
    assert any(r["cached"] for r in store.usage_summary())


async def test_cache_misses_after_edits_new_history_or_expiry(repo, store):
    ex = ContextExecutor("gemini-lite", 0, ["refresh_session returns the token unchanged; it is called when the session expires."])
    brain = RouterBrain([ex], offline=True, cache_ttl=3600)
    _, on_delta = collector()
    job = Job("explain refresh_session", cwd=repo)
    await run_job(brain, store, job, Outcome(), on_delta)

    target = repo / "app" / "auth" / "session.py"
    target.write_text("def refresh_session(token):\n    return 1\n")
    os.utime(target, ns=(time.time_ns(), time.time_ns() + 1_000_000))
    await run_job(brain, store, job, Outcome(), on_delta)
    assert len(ex.jobs) == 2  # the selected file changed

    await run_job(brain, store, Job(job.prompt, history=[Turn("user", "earlier")], cwd=repo), Outcome(), on_delta)
    assert len(ex.jobs) == 3  # different conversation

    store._exec("UPDATE response_cache SET created_at = 0")
    await run_job(brain, store, job, Outcome(), on_delta)
    assert len(ex.jobs) == 4  # expired


async def test_agentic_cli_answers_and_disabled_cache_are_not_reused(repo, store):
    cli = FakeExecutor("codex", 0, ["did things"])  # not cacheable
    _, on_delta = collector()
    brain = RouterBrain([cli], offline=True, cache_ttl=3600)
    for _ in range(2):
        await run_job(brain, store, Job("explain refresh_session", cwd=repo), Outcome(), on_delta)
    assert len(cli.jobs) == 2

    api = ContextExecutor("gemini-lite", 0, ["a"])
    off = RouterBrain([api], offline=True, cache_ttl=0)
    for _ in range(2):
        await run_job(off, store, Job("explain refresh_session", cwd=repo), Outcome(), on_delta)
    assert len(api.jobs) == 2
