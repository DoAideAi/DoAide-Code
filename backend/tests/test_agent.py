"""Laptop agent: runs relayed jobs with the local executors and reports back to the hub."""

from __future__ import annotations

import asyncio
import os
from pathlib import Path

import pytest

from doaide_code.agent import LaptopAgent, frontend_stale, rebuild_frontend
from doaide_code.router import RouterBrain
from doaide_code.runner import NO_EXECUTOR

from .conftest import FakeExecutor

pytestmark = pytest.mark.anyio

OWNER = "owner@example.com"


def make_agent(store, executors, workspace=None) -> LaptopAgent:
    return LaptopAgent(
        store, RouterBrain(executors, offline=True), OWNER, workspace=str(workspace or store_workspace(store))
    )


def store_workspace(store) -> str:
    # Each test's store lives in its own tmp dir; keep the workspace next to it.
    return str(Path(store.path).parent / "workspace")


class Outbox:
    def __init__(self):
        self.events: list[dict] = []

    async def __call__(self, event: dict) -> None:
        self.events.append(event)


async def run(agent: LaptopAgent, job: dict, out: Outbox) -> None:
    await agent.on_message({"type": "job", **job}, out)
    assert agent._task is not None
    await agent._task


async def test_hello_reports_project_and_available_executors(store, executors, tmp_path):
    executors[1].up = False
    agent = make_agent(store, executors)
    store.set_active_project(OWNER, store.add_project("alpha", str(tmp_path))["id"])
    hello = await agent.hello()
    models = hello.pop("models")
    assert hello == {
        "type": "hello",
        "project": "alpha",
        "executors": ["ollama", "claude-sonnet", "claude-opus"],
        "running": None,
    }
    # Without a detector the report comes from executor availability, never from a model.
    assert {t["id"]: t["usable"] for t in models["tools"]} == {
        "ollama": True, "codex": False, "claude-sonnet": True, "claude-opus": True
    }


async def test_job_streams_deltas_then_done(store, executors, tmp_path):
    store.set_active_project(OWNER, store.add_project("alpha", str(tmp_path))["id"])
    agent, out = make_agent(store, executors), Outbox()
    history = [{"role": "user", "content": "hi"}, {"role": "assistant", "content": "hello"}]
    await run(agent, {"id": "j1", "text": "what is a closure?", "history": history}, out)
    assert out.events == [
        {"type": "delta", "id": "j1", "text": "Hello"},
        {"type": "delta", "id": "j1", "text": " world"},
        {"type": "done", "id": "j1", "status": "done", "content": "Hello world", "meta": out.events[2]["meta"]},
    ]
    # Every reply says which model answered and how it checked out.
    assert out.events[2]["meta"]["route"]["executor"] == "ollama"
    assert out.events[2]["meta"]["checks"]["items"][0]["name"] == "complete"
    job = executors[0].jobs[0]
    assert job.cwd == tmp_path.resolve() and [t.content for t in job.history] == ["hi", "hello"]
    assert store.executor_stats()[0]["executor"] == "ollama"


async def test_no_executor_check_happens_on_the_laptop(store, executors):
    for ex in executors:
        ex.up = False
    out = Outbox()
    await run(make_agent(store, executors), {"id": "j1", "text": "hello"}, out)
    assert out.events == [{"type": "done", "id": "j1", "status": "error", "content": NO_EXECUTOR}]


async def test_commands_use_laptop_project_registry(store, executors, tmp_path):
    out = Outbox()
    await run(make_agent(store, executors), {"id": "c1", "text": f"/add-project demo {tmp_path}"}, out)
    assert out.events[0]["role"] == "system" and out.events[0]["status"] == "done"
    assert out.events[1] == {"type": "project", "project": "demo"}
    assert store.active_project(OWNER)["path"] == str(tmp_path.resolve())


async def test_stop_reports_partial_answer(store):
    gate = asyncio.Event()

    class Slow(FakeExecutor):
        async def stream(self, job):
            yield "partial"
            await gate.wait()
            yield "never"

    agent, out = make_agent(store, [Slow("ollama", 0)]), Outbox()
    await agent.on_message({"type": "job", "id": "j1", "text": "hi"}, out)
    while not out.events:
        await asyncio.sleep(0)
    await agent.on_message({"type": "stop", "id": "j1"}, out)
    assert out.events[-1] == {"type": "done", "id": "j1", "status": "stopped", "content": "partial"}
    assert agent._task is None


async def test_stop_for_other_job_is_ignored(store, executors):
    agent, out = make_agent(store, executors), Outbox()
    await agent.on_message({"type": "stop", "id": "nothing"}, out)
    await agent.on_message({"type": "bogus"}, out)
    assert out.events == []


async def test_executor_crash_still_reports_done(store):
    class Broken(FakeExecutor):
        async def stream(self, job):
            raise ValueError("boom")
            yield ""

    out = Outbox()
    await run(make_agent(store, [Broken("ollama", 0)]), {"id": "j1", "text": "hi"}, out)
    assert out.events[-1]["status"] == "error" and "boom" in out.events[-1]["content"]


async def test_serve_end_to_end_against_real_hub(settings, store, executors, tmp_path):
    """The real websockets client in `serve` talks to a hub running under uvicorn."""
    import json
    import socket

    import httpx
    import uvicorn
    from websockets.asyncio.client import connect

    from doaide_code.agent import serve
    from doaide_code.auth import User, issue_token
    from doaide_code.main import create_app

    settings.mode = "hub"
    settings.db_path = tmp_path / "hub.db"
    with socket.socket() as s:
        s.bind(("127.0.0.1", 0))
        port = s.getsockname()[1]
    app = create_app(settings)
    server = uvicorn.Server(uvicorn.Config(app, host="127.0.0.1", port=port, log_level="warning"))
    server_task = asyncio.create_task(server.serve())
    while not server.started:
        await asyncio.sleep(0.01)

    user = issue_token(settings, User(email=OWNER))
    from doaide_code.auth import new_refresh_token

    agent_token, digest = new_refresh_token()
    app.state.store.add_refresh_token(digest, OWNER, "agent")
    agent_task = asyncio.create_task(serve(make_agent(store, executors), f"ws://127.0.0.1:{port}/agent", agent_token))
    try:
        async with connect(f"ws://127.0.0.1:{port}/ws?token={user}") as browser:

            async def until(kind):
                while True:
                    event = json.loads(await asyncio.wait_for(browser.recv(), 10))
                    if event["type"] == kind:
                        return event

            snapshot = json.loads(await browser.recv())
            if not snapshot["agent_online"]:
                assert (await until("agent"))["online"] is True
            await browser.send(json.dumps({"type": "send", "text": "what is a closure?"}))
            done = await until("done")
        assert done["status"] == "done" and done["content"] == "Hello world"
        async with httpx.AsyncClient() as http:
            body = (await http.get(f"http://127.0.0.1:{port}/api/session", headers={"Authorization": f"Bearer {user}"})).json()
        assert [m["content"] for m in body["messages"]] == ["what is a closure?", "Hello world"]
    finally:
        agent_task.cancel()
        server.should_exit = True
        await asyncio.gather(agent_task, server_task, return_exceptions=True)


def ui_checkout(tmp_path: Path, built: float, edited: float) -> Path:
    """frontend/ with a build made at `built` and a source file last changed at `edited`."""
    (tmp_path / "src").mkdir()
    (tmp_path / "dist").mkdir()
    source, index = tmp_path / "src" / "App.jsx", tmp_path / "dist" / "index.html"
    source.write_text("export default 1")
    index.write_text("<html></html>")
    os.utime(source, (edited, edited))
    os.utime(index, (built, built))
    return tmp_path / "dist"


def test_a_build_older_than_the_ui_sources_is_stale(tmp_path):
    # Live: the agent served a build from before the Dispatch label, so tasks looked unlabelled.
    assert frontend_stale(ui_checkout(tmp_path, built=1_000, edited=2_000))


def test_a_build_newer_than_the_ui_sources_is_current(tmp_path):
    assert not frontend_stale(ui_checkout(tmp_path, built=2_000, edited=1_000))


def test_an_installed_agent_without_ui_sources_is_never_rebuilt(tmp_path):
    (tmp_path / "dist").mkdir()
    assert not frontend_stale(tmp_path / "dist")


async def test_a_stale_ui_is_rebuilt_before_it_is_served(tmp_path):
    dist = ui_checkout(tmp_path, built=1_000, edited=2_000)
    build = ("sh", "-c", "echo '<html>new</html>' > dist/index.html")
    assert await rebuild_frontend(dist, build)
    assert "new" in (dist / "index.html").read_text()
    assert not frontend_stale(dist)


async def test_a_current_ui_is_not_rebuilt(tmp_path):
    dist = ui_checkout(tmp_path, built=2_000, edited=1_000)
    assert not await rebuild_frontend(dist, ("sh", "-c", "exit 1"))


async def test_a_failed_rebuild_keeps_serving_the_old_build(tmp_path):
    dist = ui_checkout(tmp_path, built=1_000, edited=2_000)
    assert not await rebuild_frontend(dist, ("sh", "-c", "rm dist/index.html; exit 1"))
    assert (dist / "index.html").read_text() == "<html></html>"
    assert not (tmp_path / "dist.previous").exists()
    assert not await rebuild_frontend(dist, ("no-such-build-tool",))
