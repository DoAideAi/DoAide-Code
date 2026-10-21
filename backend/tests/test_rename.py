"""From a live rename: qwen2.5-coder:32b renamed MAX_HITS at its definition only, its repair
did the same, and Sonnet was paid ($0.05) to finish. A rename is a search; no model needed."""

from __future__ import annotations

import pytest

from doaide_code.executors import Job
from doaide_code.fastpath import rename_answer
from doaide_code.router import RouterBrain
from doaide_code.runner import Outcome, run_job

from .conftest import FakeExecutor

pytestmark = pytest.mark.anyio


@pytest.fixture
def repo(tmp_path):
    (tmp_path / "app").mkdir()
    (tmp_path / "app" / "search.py").write_text("MAX_HITS = 40\n\n\ndef top(hits):\n    return hits[:MAX_HITS]\n")
    (tmp_path / "app" / "api.py").write_text("from app.search import MAX_HITS\n\nLIMIT = MAX_HITS * 2\n")
    (tmp_path / "app" / "jobs.py").write_text("from app import search\n\nCAP = search.MAX_HITS\n")
    # Same name, another thing (live: the rename's own test fixtures): left alone.
    (tmp_path / "app" / "other.py").write_text("MAX_HITS = 3\n")
    return tmp_path


async def test_a_rename_is_applied_to_its_file_and_importers_without_a_model(repo, store):
    model = FakeExecutor("ollama-coder", 1, ["should not run"])
    sent: list[str] = []

    async def on_delta(chunk: str) -> None:
        sent.append(chunk)

    job = Job("Rename the constant MAX_HITS in app/search.py to MAX_USAGE_HITS.", cwd=repo)
    outcome = await run_job(RouterBrain([model], offline=True), store, job, Outcome(), on_delta)
    assert model.jobs == [] and outcome.meta()["usage"]["cost_usd"] == 0
    assert (repo / "app" / "search.py").read_text() == (
        "MAX_USAGE_HITS = 40\n\n\ndef top(hits):\n    return hits[:MAX_USAGE_HITS]\n"
    )
    assert (repo / "app" / "api.py").read_text() == "from app.search import MAX_USAGE_HITS\n\nLIMIT = MAX_USAGE_HITS * 2\n"
    assert (repo / "app" / "jobs.py").read_text() == "from app import search\n\nCAP = search.MAX_USAGE_HITS\n"
    assert (repo / "app" / "other.py").read_text() == "MAX_HITS = 3\n"
    assert outcome.content == "Renamed `MAX_HITS` to `MAX_USAGE_HITS`: 5 occurrences in 3 files."
    assert outcome.changes["status"] == "applied" and "<<<<<<<" not in "".join(sent)


@pytest.mark.parametrize(
    "prompt",
    [
        "rename MAX_HITS to LIMIT",  # defined twice, and LIMIT is taken: a model decides
        "rename MAX_HITS in app/search.py to top",  # top is taken in that file
        "rename MAX_HITS in app/jobs.py to X_HITS",  # used there, defined elsewhere: not a plain case
        "rename MAX_HITS to X_HITS and update the docs",  # more than a rename
        "rename the search module to finder",  # not in the project as a word
    ],
)
def test_requests_that_are_not_a_plain_rename_go_to_a_model(repo, prompt):
    assert rename_answer(repo, prompt) is None


def test_without_a_named_file_the_only_definition_is_the_home(repo):
    (repo / "app" / "other.py").unlink()
    answer = rename_answer(repo, "rename MAX_HITS to MAX_USAGE_HITS")
    assert answer.startswith("Renamed `MAX_HITS` to `MAX_USAGE_HITS`: 5 occurrences in 3 files.")
    (repo / "app" / "multi.py").write_text("from app.search import (\n    top,\n    MAX_HITS,\n)\n")
    assert "app/multi.py" in rename_answer(repo, "rename MAX_HITS to MAX_USAGE_HITS")
