"""From replaying a slow live task: local edits that land (so they stay free), no agent narration,
no stuck Stop after restarts, and models that stay loaded."""

from __future__ import annotations

import asyncio
import json
import sys

import httpx
import pytest

from doaide_code.agent import LaptopAgent
from doaide_code.changes import build_changeset, parse_edits, propose, ruff_binary, strip_edits
from doaide_code.context import rank_files
from doaide_code.executors import Job, OllamaExecutor
from doaide_code.executors.ollama import FIXED_CTX, choose_model
from doaide_code.relay import RelayService
from doaide_code.router import RouterBrain
from doaide_code.runner import Outcome, _without_narration, run_job
from doaide_code.sync import SyncHub
from doaide_code.usage import Usage
from doaide_code.verify import failing_tests

from .conftest import FakeExecutor

pytestmark = pytest.mark.anyio
OWNER = "owner@example.com"


async def nop(_chunk: str) -> None:
    pass


# Local edits that land


# What qwen2.5-coder:32b wrote live: no ======= divider, the block repeated, and the next path
# glued to the REPLACE marker.
MALFORMED = """Added the helper.

app.py
<<<<<<< SEARCH
def f():
    return 1
>>>>>>> REPLACE
def f():
    return 2

util.py
<<<<<<< SEARCH
x = 1
=======
x = 2
>>>>>>> REPLACEapp.py
<<<<<<< SEARCH
def f():
    return 1
>>>>>>> REPLACE
def f():
    return 2
"""


def test_malformed_and_repeated_edit_blocks_are_read_once():
    edits = parse_edits(MALFORMED)
    assert [(e.path, e.search, e.replace) for e in edits] == [
        ("app.py", "def f():\n    return 1\n", "def f():\n    return 2\n"),
        ("util.py", "x = 1\n", "x = 2\n"),
    ]
    assert strip_edits(MALFORMED) == "Added the helper."


def test_wrong_indentation_is_repaired_and_still_checked(tmp_path):
    (tmp_path / "m.py").write_text("class A:\n    def f(self):\n        if x:\n            return 1\n        return 2\n")
    # SEARCH at the wrong depth: matched, and the replacement moved by the same amount.
    shifted = "m.py\n<<<<<<< SEARCH\nif x:\n    return 1\n=======\nif x:\n    return 10\n>>>>>>> REPLACE"
    change = build_changeset(tmp_path, parse_edits(shifted)).files["m.py"]
    assert "            return 10\n" in change.new and change.problems == []
    # SEARCH right, replacement at the wrong depth (a syntax error as written): aligned.
    misaligned = "m.py\n<<<<<<< SEARCH\n        if x:\n            return 1\n=======\nif x:\n    return 20\n>>>>>>> REPLACE"
    change = build_changeset(tmp_path, parse_edits(misaligned)).files["m.py"]
    assert "        if x:\n            return 20\n" in change.new and change.problems == []
    # A deliberate dedent that compiles is left alone.
    (tmp_path / "n.py").write_text("def g():\n    return 1\n")
    dedent = "n.py\n<<<<<<< SEARCH\n    return 1\n=======\n    return 3\n>>>>>>> REPLACE"
    assert build_changeset(tmp_path, parse_edits(dedent)).files["n.py"].new == "def g():\n    return 3\n"


async def test_a_local_edit_with_a_format_slip_is_written_free_instead_of_escalated(tmp_path, store):
    (tmp_path / "calc.py").write_text("def add(a, b):\n    return a - b\n")
    slip = "Fixed add.\n\ncalc.py\n<<<<<<< SEARCH\n    return a - b\n>>>>>>> REPLACE\n    return a + b\n"
    coder = FakeExecutor("ollama-coder", 1, [slip])
    coder.tool, coder.context_mode = "ollama", "files"
    sonnet = FakeExecutor("claude-sonnet", 2, ["sonnet"])
    sonnet.tool = "claude"
    outcome = await run_job(RouterBrain([coder, sonnet], offline=True), store, Job("fix add in calc.py", cwd=tmp_path), Outcome(), nop)
    assert sonnet.jobs == [] and outcome.executor == "ollama-coder"
    assert (tmp_path / "calc.py").read_text() == "def add(a, b):\n    return a + b\n"


# No narration


def test_only_the_agents_last_message_is_the_reply():
    full = "Let me read runner.py first.\n\nFound it.\n\nAdded the helper.\n\na.py\n<<<<<<< SEARCH\nx\n=======\ny\n>>>>>>> REPLACE"
    last = "Added the helper.\n\na.py\n<<<<<<< SEARCH\nx\n=======\ny\n>>>>>>> REPLACE"
    assert _without_narration(full, Usage(final_text=last)) == last
    # If edits were made in an earlier message, keep everything.
    assert _without_narration(full, Usage(final_text="Done.")) == full
    assert _without_narration(full, None) == full


# No stuck Stop


async def test_a_job_re_sent_after_a_reconnect_keeps_running_and_reports_on_the_new_link(store):
    gate = asyncio.Event()

    class Slow(FakeExecutor):
        async def stream(self, job):
            self.jobs.append(job)
            await gate.wait()
            yield "The answer, after a reconnect."

    slow = Slow("ollama", 0)
    agent = LaptopAgent(store, RouterBrain([slow], offline=True), OWNER)
    old, new = [], []

    async def old_send(event):
        old.append(event)

    async def new_send(event):
        new.append(event)

    agent.connected(old_send)
    await agent.on_message({"type": "job", "id": "j1", "text": "explain the pager"}, old_send)
    await asyncio.sleep(0)
    await agent.disconnect()  # the hub restarted
    agent.connected(new_send)
    assert (await agent.hello())["running"] == "j1"
    await agent.on_message({"type": "job", "id": "j1", "text": "explain the pager"}, new_send)  # re-sent
    gate.set()
    await agent._task
    assert len(slow.jobs) == 1 and new[-1]["type"] == "done" and new[-1]["content"] == "The answer, after a reconnect."
    assert not any(e["type"] == "done" for e in old)


class AgentSocket:
    def __init__(self) -> None:
        self.sent: list[dict] = []

    async def send_json(self, data) -> None:
        self.sent.append(data)

    async def close(self, code: int = 1000) -> None:
        pass


async def test_the_hub_adopts_a_job_still_running_after_its_restart_or_stops_one_it_gave_up(store):
    relay, laptop = RelayService(store, SyncHub()), AgentSocket()
    session = store.create_session(OWNER)
    store.add_message(session["id"], "assistant", "", status="streaming", message_id="j1")
    store.add_job("j1", OWNER, session["id"], "explain the pager")
    relay._agents[OWNER] = laptop
    await relay.on_agent_event(OWNER, {"type": "hello", "running": "j1"})
    assert relay._running[OWNER] == "j1"
    await relay.on_agent_event(OWNER, {"type": "done", "id": "j1", "status": "done", "content": "Done."})
    assert relay.status(OWNER) == "idle" and store.get_message("j1")["status"] == "done"
    # A job the hub already finished (as disconnected) is stopped on the laptop.
    await relay.on_agent_event(OWNER, {"type": "hello", "running": "gone"})
    assert laptop.sent[-1] == {"type": "stop", "id": "gone"}


def test_replies_left_streaming_by_a_restart_are_marked_interrupted(store):
    session = store.create_session(OWNER)
    store.add_message(session["id"], "assistant", "half an ans", status="streaming", message_id="orphan")
    store.add_message(session["id"], "assistant", "", status="streaming", message_id="queued")
    store.add_job("queued", OWNER, session["id"], "next")
    assert store.fail_interrupted() == 1
    assert store.get_message("orphan")["status"] == "error" and "interrupted" in store.get_message("orphan")["content"]
    assert store.get_message("queued")["status"] == "streaming"  # re-sent when the laptop connects


# Models that stay loaded, and the fast one when installed


async def test_warming_loads_the_model_with_the_fixed_window():
    seen: list[dict] = []

    def handler(request: httpx.Request) -> httpx.Response:
        if request.url.path == "/api/tags":
            return httpx.Response(200, json={"models": [{"name": "qwen2.5-coder:7b", "size": 1}]})
        seen.append(json.loads(request.content))
        return httpx.Response(200, json={"done": True})

    ex = OllamaExecutor("http://x", "qwen2.5-coder:7b", transport=httpx.MockTransport(handler))
    assert await ex.warm()
    assert seen == [{"model": "qwen2.5-coder:7b", "keep_alive": "2h", "options": {"num_ctx": FIXED_CTX}}]


def test_the_coder_tier_prefers_a_fast_moe_coder_when_installed():
    names = ["qwen2.5-coder:7b", "qwen3-coder:30b", "qwen2.5-coder:32b"]
    sizes = {"qwen2.5-coder:7b": 4, "qwen3-coder:30b": 19, "qwen2.5-coder:32b": 20}
    assert choose_model("", names, sizes, largest_under=40) == "qwen3-coder:30b"
    assert choose_model("", ["qwen2.5-coder:7b", "qwen2.5-coder:32b"], sizes, largest_under=40) == "qwen2.5-coder:32b"


# Edits that pass the checks but break the project's tests are not kept


@pytest.fixture
def project(tmp_path):
    """A tiny Python package with tests and a virtualenv (this interpreter, which has pytest)."""
    (tmp_path / "pyproject.toml").write_text("[project]\nname = 'calc'\nversion = '0'\n")
    (tmp_path / "calc.py").write_text("def add(a, b):\n    return a - b\n")
    (tmp_path / "tests").mkdir()
    (tmp_path / "tests" / "test_calc.py").write_text(
        "import sys, pathlib\nsys.path.insert(0, str(pathlib.Path(__file__).parents[1]))\nfrom calc import add\n\n\n"
        "def test_add():\n    assert add(2, 3) == 5\n"
    )
    (tmp_path / ".venv" / "bin").mkdir(parents=True)
    (tmp_path / ".venv" / "bin" / "python").symlink_to(sys.executable)
    return tmp_path


async def test_the_projects_tests_tell_a_good_edit_from_a_bad_one(project):
    assert await failing_tests(project, ["calc.py"]) == "tests fail (tests/test_calc.py::test_add)"
    (project / "calc.py").write_text("def add(a, b):\n    return a + b\n")
    assert await failing_tests(project, ["calc.py"]) is None
    assert await failing_tests(project, ["README.md"]) is None  # not Python: nothing to run


WRONG = "Fixed add.\n\ncalc.py\n<<<<<<< SEARCH\n    return a - b\n=======\n    return a * b\n>>>>>>> REPLACE"
RIGHT = "Fixed add.\n\ncalc.py\n<<<<<<< SEARCH\n    return a - b\n=======\n    return a + b\n>>>>>>> REPLACE"


async def test_a_free_edit_that_breaks_the_tests_escalates_and_the_paid_fix_is_kept(project, store):
    coder = FakeExecutor("ollama-coder", 1, [WRONG])
    coder.tool, coder.context_mode = "ollama", "files"
    sonnet = FakeExecutor("claude-sonnet", 2, [RIGHT])
    sonnet.tool = "claude"
    outcome = await run_job(RouterBrain([coder, sonnet], offline=True), store, Job("fix add in calc.py", cwd=project), Outcome(), nop)
    assert outcome.executor == "claude-sonnet"
    assert outcome.meta()["route"]["escalated_from"]["reason"] == "tests fail (tests/test_calc.py::test_add)"
    assert (project / "calc.py").read_text() == "def add(a, b):\n    return a + b\n"


async def test_an_edit_that_breaks_the_tests_is_kept_with_a_warning_and_undo(project, store):
    sonnet = FakeExecutor("claude-sonnet", 2, [WRONG])
    outcome = await run_job(RouterBrain([sonnet], offline=True), store, Job("fix add in calc.py", cwd=project), Outcome(), nop)
    # Written without asking; the reply warns, and /undo reverts it.
    assert (project / "calc.py").read_text() == "def add(a, b):\n    return a * b\n"
    assert "Warning: tests fail (tests/test_calc.py::test_add) after this edit; /undo reverts it." in outcome.content
    assert outcome.meta()["changes"]["status"] == "applied"
    tests = next(c for c in outcome.meta()["checks"]["items"] if c["name"] == "tests")
    assert tests["ok"] is False


# The file the request names comes whole


def test_a_named_file_is_sent_whole_without_the_tree_or_unrelated_files(tmp_path):
    body = "".join(f"def helper_{i}(x):\n    return x + {i}\n\n" for i in range(330))  # ~10k chars
    (tmp_path / "pkg").mkdir()
    (tmp_path / "pkg" / "target.py").write_text(f"PATTERN = 'heading'\n\n{body}")
    (tmp_path / "pkg" / "other.py").write_text(f"# mentions heading too\n{body}")
    ctx, files = rank_files(tmp_path, "In pkg/target.py, change PATTERN to match the heading").render(14_000, max_files=3)
    assert files == ["pkg/target.py"] and "(excerpts)" not in ctx and "## Tree" not in ctx
    assert "def helper_329(x)" in ctx  # the whole file, not the parts near the terms
    ctx, files = rank_files(tmp_path, "where is the heading pattern defined").render(14_000, max_files=3)
    assert "## Tree" in ctx and len(files) >= 1


# Without ruff these checks cannot run; failing here would make every related edit look broken
# (live: the agent's PATH had no ruff, and this test failed after every edit to changes.py).
@pytest.mark.skipif(ruff_binary() is None, reason="ruff is not installed")
async def test_an_edit_that_pastes_imports_and_constants_mid_file_fails_its_checks(tmp_path):
    (tmp_path / "m.py").write_text("import os\n\nLIMIT = 3\n\n\ndef f():\n    return os.sep * LIMIT\n")
    pasted = "m.py\n<<<<<<< SEARCH\ndef f():\n=======\nimport os\n\nLIMIT = 3\n\n\ndef f():\n>>>>>>> REPLACE"
    changeset = await propose(tmp_path, pasted)
    assert any("F811" in p for p in changeset.all_problems)
    # A file that already has such a problem can still be edited.
    (tmp_path / "n.py").write_text("x = 1\nimport os\n\n\ndef g():\n    return os.sep\n")
    fine = "n.py\n<<<<<<< SEARCH\n    return os.sep\n=======\n    return os.sep * 2\n>>>>>>> REPLACE"
    assert (await propose(tmp_path, fine)).all_problems == []
