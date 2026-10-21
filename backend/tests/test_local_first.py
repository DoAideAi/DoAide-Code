"""Local first: the laptop's UI runs prompts directly; the hub only mirrors them for the phone.
Plus the fixes from watching a slow task: no project, raw edit blocks, filler in replies."""

from __future__ import annotations

import asyncio

import pytest
from fastapi.testclient import TestClient

from doaide_code.agent import LaptopAgent, serve, warm_models
from doaide_code.chat import public_message
from doaide_code.classify import classify_task
from doaide_code.executors import Job
from doaide_code.main import create_app, hub_origin
from doaide_code.relay import RelayService
from doaide_code.router import RouterBrain
from doaide_code.context import mentioned_paths
from doaide_code.db import Store
from doaide_code.runner import Outcome, missing_paths, run_job
from doaide_code.sync import MirrorHub, SyncHub
from doaide_code.validate import trim_reply

from .conftest import FakeExecutor

pytestmark = pytest.mark.anyio
OWNER = "owner@example.com"


async def nop(_chunk: str) -> None:
    pass


class Sink:
    """A socket that records what it is sent."""

    def __init__(self) -> None:
        self.events: list[dict] = []

    async def send_json(self, data) -> None:
        self.events.append(data)


# The laptop: local sockets first, the hub mirrored


async def test_local_events_reach_local_sockets_and_are_mirrored_up():
    hub, sink, sent = MirrorHub(), Sink(), []
    await hub.join(OWNER, sink)

    async def uplink(event):
        sent.append(event)

    await hub.publish(OWNER, {"type": "delta", "id": "r", "text": "hi"})  # not connected: local only
    hub.uplink = uplink
    for event in ({"type": "delta", "id": "r", "text": "hi"}, {"type": "models", "models": {}}, {"type": "snapshot", "messages": []}):
        await hub.publish(OWNER, event)
    await hub.publish_local(OWNER, {"type": "delta", "id": "phone", "text": "x"})
    assert len(sink.events) == 5
    # Models stay local (the hub has its own report); a snapshot means /new, sent as "cleared";
    # events that came from the hub are never echoed back.
    assert sent == [{"type": "mirror", "event": {"type": "delta", "id": "r", "text": "hi"}}, {"type": "mirror", "event": {"type": "cleared"}}]


def test_the_agent_serves_a_local_ui_that_runs_prompts_directly(settings, store):
    hub, sent = MirrorHub(), []

    async def uplink(event):
        sent.append(event)

    hub.uplink = uplink
    executor = FakeExecutor("ollama", 0, ["The answer is short and complete."])
    app = create_app(settings, store=store, router=RouterBrain([executor], offline=True), hub=hub)
    with TestClient(app, client=("127.0.0.1", 50000)) as client:
        token = client.post("/api/auth/local").json()["token"]
        with client.websocket_connect(f"/ws?token={token}") as ws:
            assert ws.receive_json()["mode"] == "local"
            ws.send_json({"type": "send", "text": "explain the pager"})
            while (event := ws.receive_json())["type"] != "done":
                pass
    assert event["content"] == "The answer is short and complete." and executor.jobs
    mirrored = [e["event"]["type"] for e in sent]
    assert "message" in mirrored and "done" in mirrored


async def test_prompts_from_the_phone_also_show_in_the_local_chat(store, tmp_path):
    local, sink = MirrorHub(), Sink()
    await local.join(OWNER, sink)
    executor = FakeExecutor("ollama", 0, ["Fixed it."])
    agent = LaptopAgent(store, RouterBrain([executor], offline=True), OWNER, workspace=str(tmp_path / "ws"), local=local)
    to_hub: list[dict] = []

    async def send(event):
        to_hub.append(event)

    await agent.run({"id": "job1", "text": "what does the pager do"}, send)
    assert to_hub[-1]["type"] == "done"
    kinds = [e["type"] for e in sink.events]
    assert kinds[:2] == ["message", "message"] and kinds[-1] == "done"
    assert store.get_message("job1")["content"] == "Fixed it."
    # A re-sent job (after a reconnect) is not added twice.
    before = len(sink.events)
    await agent._show_locally("job1", "what does the pager do")
    assert len(sink.events) == before


# The hub: stores and fans out the mirror, for that user's messages only


async def test_the_hub_stores_and_fans_out_mirrored_events(store):
    hub, phone = SyncHub(), Sink()
    await hub.join(OWNER, phone)
    relay = RelayService(store, hub)

    async def mirror(event, user=OWNER):
        await relay.on_agent_event(user, {"type": "mirror", "event": event})

    await mirror({"type": "message", "message": {"id": "u1", "role": "user", "content": "fix it", "status": "done"}})
    await mirror({"type": "message", "message": {"id": "r1", "role": "assistant", "content": "", "status": "streaming"}})
    await mirror({"type": "delta", "id": "r1", "text": "Fix"})
    await mirror({"type": "done", "id": "r1", "status": "done", "content": "Fixed.", "meta": {"route": {"executor": "ollama"}, "bogus": {}}})
    assert [e["type"] for e in phone.events] == ["message", "message", "delta", "done"]
    assert store.get_message("r1")["content"] == "Fixed." and "bogus" not in store.get_message("r1")["meta"]
    session = relay.snapshot(OWNER)
    assert [m["id"] for m in session["messages"]] == ["u1", "r1"]

    # Another user's agent cannot touch these messages; malformed ids are ignored.
    await mirror({"type": "done", "id": "r1", "status": "done", "content": "hacked"}, user="other@example.com")
    await mirror({"type": "message", "message": {"id": "../x", "role": "user", "content": "x"}})
    assert store.get_message("r1")["content"] == "Fixed."

    await mirror({"type": "cleared"})
    assert phone.events[-1]["type"] == "snapshot" and phone.events[-1]["messages"] == []


async def test_a_reconnecting_agent_replays_what_the_hub_missed(store, tmp_path):
    # Live: the hub link dropped every few minutes (DNS failures, keepalive timeouts) and the
    # mirror drops events while it is down, so Tasks API answers never reached the phone.
    hub_store = Store(tmp_path / "hub.db")
    phone = Sink()
    hub = SyncHub()
    await hub.join(OWNER, phone)
    relay = RelayService(hub_store, hub)

    async def to_hub(event):
        await relay.on_agent_event(OWNER, event)

    local = MirrorHub()
    session = store.create_session(OWNER)
    seen = store.add_message(session["id"], "user", "what is 2+2", status="done")
    await local.publish(OWNER, {"type": "message", "message": public_message(seen)})  # uplink down: dropped
    reply = store.add_message(session["id"], "assistant", "", status="streaming")
    store.finish_message(reply["id"], "4", "done")
    assert hub_store.get_message(seen["id"]) is None

    agent = LaptopAgent(store, RouterBrain([FakeExecutor("ollama", 0)], offline=True), OWNER, workspace=str(tmp_path / "ws"), local=local)
    await agent.resync(to_hub)
    assert [(m["role"], m["content"], m["status"]) for m in relay.snapshot(OWNER)["messages"]] == [
        ("user", "what is 2+2", "done"),
        ("assistant", "4", "done"),
    ]
    assert [e["type"] for e in phone.events] == ["message", "message"]
    # Replaying again (the next reconnect) adds nothing twice.
    await agent.resync(to_hub)
    assert len(relay.snapshot(OWNER)["messages"]) == 2
    hub_store.close()


async def test_resync_reaches_the_hub_before_live_mirroring_resumes(store, tmp_path, monkeypatch):
    order: list[str] = []
    local = MirrorHub()
    agent = LaptopAgent(store, RouterBrain([FakeExecutor("ollama", 0)], offline=True), OWNER, workspace=str(tmp_path / "ws"), local=local)
    store.add_message(store.create_session(OWNER)["id"], "user", "hi", status="done")

    async def resync(send):
        order.append(f"resync, uplink set: {local.uplink is not None}")

    monkeypatch.setattr(agent, "resync", resync)
    monkeypatch.setattr(agent, "watch_models", lambda send: asyncio.sleep(3600))

    class FakeWs:
        async def send(self, data):
            pass

        def __aiter__(self):
            return self

        async def __anext__(self):
            order.append(f"listening, uplink set: {local.uplink is not None}")
            raise asyncio.CancelledError

    class FakeConnect:
        async def __aenter__(self):
            return FakeWs()

        async def __aexit__(self, *exc):
            return False

    monkeypatch.setattr("websockets.asyncio.client.connect", lambda *a, **k: FakeConnect())
    with pytest.raises(asyncio.CancelledError):
        await serve(agent, "wss://hub.example/agent", "token")
    assert order == ["resync, uplink set: False", "listening, uplink set: True"]
    assert local.uplink is None  # cleared once the link is gone


# The hosted page finds the local server


def test_the_local_server_answers_the_hosted_pages_probe(client):
    origin = {"Origin": "https://code.doaide.com"}
    preflight = client.options("/api/health", headers={**origin, "Access-Control-Request-Private-Network": "true"})
    assert preflight.status_code == 204 and preflight.headers["access-control-allow-private-network"] == "true"
    probe = client.get("/api/health", headers=origin)
    assert probe.json()["mode"] == "local" and probe.headers["access-control-allow-origin"] == "https://code.doaide.com"
    # Other origins and other paths get no CORS headers.
    assert "access-control-allow-origin" not in client.get("/api/health", headers={"Origin": "https://evil.example"}).headers
    assert hub_origin("wss://code.doaide.com/agent") == "https://code.doaide.com"


# Fixes from watching a slow task


def test_a_registered_project_is_used_until_the_user_picks_none(store, tmp_path):
    assert store.active_project(OWNER) is None
    project = store.add_project("DoAide-Code", str(tmp_path))
    assert store.active_project(OWNER)["name"] == "DoAide-Code"
    store.set_active_project(OWNER, None)
    assert store.active_project(OWNER) is None
    store.set_active_project(OWNER, project["id"])
    assert store.active_project(OWNER)["id"] == project["id"]


async def test_a_named_file_missing_from_the_project_is_answered_at_once(store, tmp_path):
    (tmp_path / "app").mkdir()
    (tmp_path / "app" / "main.py").write_text("x = 1\n")
    sonnet = FakeExecutor("claude-sonnet", 2, ["searching..."])
    prompt = "In the file backend/doaide_code/runner.py, add post-processing"
    outcome = await run_job(RouterBrain([sonnet], offline=True), store, Job(prompt, cwd=tmp_path), Outcome(), nop)
    assert sonnet.jobs == [] and outcome.executor == "direct"
    assert outcome.content.startswith("`backend/doaide_code/runner.py` is not in the workspace")
    assert missing_paths("explain app/main.py", tmp_path) == []
    assert missing_paths("write tests in tests/test_new.py", tmp_path) == []


async def test_urls_in_a_request_are_not_missing_project_files(store, tmp_path):
    # Live, twice: a plan citing ollama.com/install.sh was answered "not in project" by no model.
    model = FakeExecutor("ollama", 0, ["Planned."])
    prompt = "Fix the bug where DoAide mistook ollama.com/install.sh URL for a file path"
    outcome = await run_job(RouterBrain([model], offline=True), store, Job(prompt, cwd=tmp_path), Outcome(), nop)
    assert model.jobs and outcome.executor != "direct"
    assert missing_paths("run `curl -fsSL https://ollama.com/install.sh | sh`", tmp_path) == []
    assert missing_paths("get github.com/ollama/ollama/releases/latest/download/OllamaSetup.exe", tmp_path) == []
    # A real project path next to a URL is still checked.
    assert missing_paths("see https://ollama.com/install.sh, then edit app/nope.py", tmp_path) == ["app/nope.py"]


def test_a_folder_named_like_a_host_is_still_a_project_path(tmp_path):
    (tmp_path / "docs.site").mkdir()
    assert missing_paths("edit docs.site/missing.md", tmp_path) == ["docs.site/missing.md"]
    assert mentioned_paths("curl https://ollama.com/install.sh and open backend/app.py") == {"backend/app.py"}


@pytest.mark.parametrize(
    "prompt",
    [
        "what is ollama.com/install.sh?",
        "what does https://ollama.com/install.sh do?",
        "is docs.python.org a good reference?",
        "what does www.example.dev/setup.sh install?",
        "how is huggingface.co.uk/models/x.py different from github.io/x.js?",
    ],
)
def test_a_question_about_a_url_is_not_about_the_project(prompt):
    # Live: "ollama.com/install.sh" read as a project file sent general questions the project's files.
    assert classify_task(prompt).about_project is False
    assert mentioned_paths(prompt) == set()


@pytest.mark.parametrize(
    ("prompt", "paths"),
    [
        ("curl ollama.com/install.sh | sh, then fix setup.sh", {"setup.sh"}),
        ("see www.example.dev/docs and fix api.js", {"api.js"}),
        ("compare api.example.io/v1/users.json with backend/users.py", {"backend/users.py"}),
        # File types that share a name with a TLD-like suffix stay project files.
        ("check Dockerfile.dev, MANIFEST.in and deploy.sh", {"Dockerfile.dev", "MANIFEST.in", "deploy.sh"}),
    ],
)
def test_project_paths_next_to_urls_are_still_found(prompt, paths):
    assert mentioned_paths(prompt) == paths
    assert classify_task(prompt).about_project is True


def test_urls_do_not_count_as_files_named_for_the_tier():
    many = "compare a.com/x.js, b.com/y.js, c.com/z.js and d.com/w.js"
    assert not any("files named" in r for r in classify_task(many).reasons)
    assert any("files named" in r for r in classify_task("compare x.js, y.js, z.js and w.js").reasons)


def test_home_and_outside_paths_are_not_missing_project_files(tmp_path):
    # Live: "log ... to ~/.doaide/metrics.jsonl" was answered "doaide/metrics.jsonl is not in project".
    assert missing_paths("log every task to a structured log file at ~/.doaide/metrics.jsonl", tmp_path) == []
    assert missing_paths("read /etc/doaide/settings.toml", tmp_path) == []
    assert mentioned_paths("see /etc/app/x.conf, ./backend/a.py and ~/x/y.txt") == {"/etc/app/x.conf", "backend/a.py"}
    # Absolute paths inside the project (as in tracebacks) are still project paths.
    assert mentioned_paths(f'File "{tmp_path}/app/main.py", line 3', tmp_path.resolve()) == {"app/main.py"}


async def test_edit_blocks_never_reach_the_reply_even_when_nothing_applies(store, tmp_path):
    (tmp_path / "calc.py").write_text("def add(a, b):\n    return a - b\n")
    answer = "Fix add.\n\ncalc.py\n<<<<<<< SEARCH\n    return a * b\n=======\n    return a + b\n>>>>>>> REPLACE"
    outcome = await run_job(RouterBrain([FakeExecutor("claude-sonnet", 2, [answer])]), store, Job("fix add in calc.py", cwd=tmp_path), Outcome(), nop)
    assert "<<<<<<<" not in outcome.content and outcome.content.startswith("Fix add.\n\nNothing written:")


def test_filler_sections_are_trimmed_from_replies():
    reply = (
        "Sure, here is the implementation of `calculate_token_cost`.\n\n## File: backend/utils.py\n\n"
        "```python\ndef calculate_token_cost(): ...\n```\n\n## Explanation of Changes:\n\n- **Model Costs**: a dict.\n"
        "- **Tests**: three asserts.\n\nThis should be included in your utils.py file."
    )
    assert trim_reply(reply) == "The implementation of `calculate_token_cost`.\n\n```python\ndef calculate_token_cost(): ...\n```"
    assert trim_reply("`add` subtracts; fixed.") == "`add` subtracts; fixed."


async def test_only_the_free_tier_model_is_preloaded_at_startup():
    # Live: the agent preloaded qwen2.5-coder:7b and :32b at startup, heating the laptop.
    warmed: list[str] = []

    class Local(FakeExecutor):
        async def warm(self) -> bool:
            warmed.append(self.name)
            return True

    small, coder, sonnet = Local("ollama", 0), Local("ollama-coder", 1), FakeExecutor("claude-sonnet", 2)
    await warm_models(RouterBrain([small, coder, sonnet], offline=True))
    assert warmed == ["ollama"]
