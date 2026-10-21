"""Remote MCP: POST /api/v1/mcp/relay on the hub forwards JSON-RPC to the laptop agent."""

from __future__ import annotations

import asyncio
import json
import socket
from collections.abc import AsyncIterator, Iterator

import httpx
import pytest
import uvicorn
from fastapi.testclient import TestClient

from doaide_code.agent import LaptopAgent, serve
from doaide_code.auth import User, hash_token, issue_token, new_refresh_token
from doaide_code.db import Store
from doaide_code.main import create_app
from doaide_code.mcp_server import LaptopTools, handle_relayed
from doaide_code.relay import describe_call, tool_reply
from doaide_code.router import RouterBrain

from .test_api import auth

OWNER = "owner@example.com"
RELAY = "/api/v1/mcp/relay"


def rpc(method: str, params: dict | None = None, request_id: int = 1) -> dict:
    return {"jsonrpc": "2.0", "id": request_id, "method": method, "params": params or {}}


def text(result: dict) -> str:
    return "\n".join(block["text"] for block in result["content"] if block["type"] == "text")


# Hub endpoint without a laptop (auth, validation, offline)


@pytest.fixture
def hub(settings) -> Iterator[TestClient]:
    settings.mode = "hub"
    with TestClient(create_app(settings), client=("172.18.0.2", 40000)) as c:
        yield c


@pytest.fixture
def mcp_token(hub) -> str:
    raw, digest = new_refresh_token()
    hub.app.state.store.add_refresh_token(digest, OWNER, "mcp", name="mcp")
    return raw


def test_relay_requires_owner_or_mcp_token(hub, token, mcp_token):
    assert hub.post(RELAY, json=rpc("ping")).status_code == 401
    assert hub.post(RELAY, json=rpc("ping"), headers=auth("nope")).status_code == 401
    # An agent token lets a laptop connect; it must not drive the laptop's tools.
    agent_raw, digest = new_refresh_token()
    hub.app.state.store.add_refresh_token(digest, OWNER, "agent")
    assert hub.post(RELAY, json=rpc("ping"), headers=auth(agent_raw)).status_code == 401
    # Both the browser access token and an MCP token get through auth (then find no laptop).
    assert hub.post(RELAY, json=rpc("ping"), headers=auth(token)).status_code == 503
    assert hub.post(RELAY, json=rpc("ping"), headers=auth(mcp_token)).status_code == 503


def test_relay_reports_offline_laptop_as_jsonrpc_error(hub, mcp_token):
    resp = hub.post(RELAY, json=rpc("tools/list", request_id=7), headers=auth(mcp_token))
    assert resp.status_code == 503
    assert resp.json() == {"jsonrpc": "2.0", "id": 7, "error": {"code": -32000, "message": "Your laptop is offline"}}


def test_relay_validates_jsonrpc(hub, mcp_token):
    headers = {**auth(mcp_token), "Content-Type": "application/json"}
    bad = hub.post(RELAY, content=b"{not json", headers=headers)
    assert bad.status_code == 400 and bad.json()["error"]["code"] == -32700
    for body in ([rpc("ping")], {"id": 1, "method": "ping"}, {"jsonrpc": "2.0", "id": 1}):
        resp = hub.post(RELAY, json=body, headers=headers)
        assert resp.status_code == 400 and resp.json()["error"]["code"] == -32600
    huge = hub.post(RELAY, json=rpc("tools/call", {"arguments": {"content": "x" * 2_100_000}}), headers=headers)
    assert huge.status_code == 413


def test_notifications_are_accepted_without_the_laptop(hub, mcp_token):
    resp = hub.post(RELAY, json={"jsonrpc": "2.0", "method": "notifications/initialized"}, headers=auth(mcp_token))
    assert resp.status_code == 202 and resp.content == b""


def test_mcp_token_endpoint(hub, token):
    assert hub.post("/api/mcp-token").status_code == 401
    body = hub.post("/api/mcp-token", headers=auth(token)).json()
    assert body["endpoint"] == RELAY
    row = hub.app.state.store.use_refresh_token(hash_token(body["token"]), "mcp")
    assert row["user_email"] == OWNER
    # The MCP token is not a browser session.
    assert hub.get("/api/me", headers=auth(body["token"])).status_code == 401


def test_relay_absent_in_local_mode(client, token):
    assert client.post("/api/mcp-token", headers=auth(token)).status_code == 404
    assert client.post(RELAY, json=rpc("ping"), headers=auth(token)).status_code in {404, 405}


def test_old_databases_gain_the_mcp_scope(tmp_path):
    import sqlite3

    path = tmp_path / "old.db"
    conn = sqlite3.connect(path)
    conn.execute(
        "CREATE TABLE refresh_tokens (token_hash TEXT PRIMARY KEY, user_email TEXT NOT NULL, name TEXT NOT NULL"
        " DEFAULT '', scope TEXT NOT NULL CHECK (scope IN ('user', 'agent')), created_at REAL NOT NULL, last_used REAL)"
    )
    conn.execute("INSERT INTO refresh_tokens VALUES ('h1', 'a@b.c', 'laptop', 'agent', 1.0, NULL)")
    conn.commit()
    conn.close()
    store = Store(path)
    try:
        assert store.use_refresh_token("h1", "agent")["user_email"] == "a@b.c"
        store.add_refresh_token("h2", "a@b.c", "mcp")
        assert store.use_refresh_token("h2", "mcp") is not None
    finally:
        store.close()


# Laptop side: answering relayed JSON-RPC


@pytest.fixture
def tools(store, executors, tmp_path) -> LaptopTools:
    project = tmp_path / "proj"
    project.mkdir()
    (project / "app.py").write_text("print('hello')\n")
    store.set_active_project(OWNER, store.add_project("demo", str(project))["id"])
    return LaptopTools(store, RouterBrain(executors, offline=True), OWNER, workspace=str(tmp_path / "ws"))


@pytest.mark.anyio
async def test_laptop_answers_initialize_list_and_call(tools):
    init = await handle_relayed(tools, rpc("initialize", {"protocolVersion": "2025-06-18"}))
    assert init["result"]["protocolVersion"] == "2025-06-18"
    assert init["result"]["serverInfo"]["name"] == "doaide-code" and "tools" in init["result"]["capabilities"]

    listed = await handle_relayed(tools, rpc("tools/list", request_id=2))
    assert listed["id"] == 2 and "execute_code" in {t["name"] for t in listed["result"]["tools"]}

    read = await handle_relayed(tools, rpc("tools/call", {"name": "read_file", "arguments": {"path": "app.py"}}))
    assert text(read["result"]) == "print('hello')\n" and not read["result"].get("isError")


@pytest.mark.anyio
async def test_laptop_reports_tool_and_protocol_errors(tools):
    missing = await handle_relayed(tools, rpc("tools/call", {"name": "read_file", "arguments": {"path": "nope.py"}}))
    assert missing["result"]["isError"] is True
    unknown = await handle_relayed(tools, rpc("resources/list"))
    assert unknown["error"]["code"] == -32601
    nameless = await handle_relayed(tools, rpc("tools/call", {"arguments": {}}))
    assert nameless["error"]["code"] == -32602


@pytest.mark.anyio
async def test_execute_code_progress_works_over_the_relay(tools, executors):
    result = await handle_relayed(tools, rpc("tools/call", {"name": "execute_code", "arguments": {"prompt": "hi"}}))
    assert not result["result"].get("isError")
    assert result["result"]["structuredContent"]["answer"] == "Hello world"


@pytest.mark.anyio
async def test_agent_runs_mcp_calls_without_blocking(store, executors, tmp_path):
    agent = LaptopAgent(store, RouterBrain(executors, offline=True), OWNER, workspace=str(tmp_path / "ws"))
    sent: list[dict] = []

    async def send(event: dict) -> None:
        sent.append(event)

    await agent.on_message({"type": "rpc", "id": "r1", "method": "mcp", "params": {"message": rpc("ping")}}, send)
    await asyncio.gather(*agent._mcp_tasks)
    assert sent == [{"type": "rpc_result", "id": "r1", "result": {"jsonrpc": "2.0", "id": 1, "result": {}}}]

    await agent.on_message({"type": "rpc", "id": "r2", "method": "mcp", "params": {}}, send)
    await asyncio.gather(*agent._mcp_tasks)
    assert sent[-1]["error"] == "Missing MCP message"


# End to end: HTTP client -> hub -> websocket -> laptop agent -> tools


@pytest.fixture
async def live_hub(settings, store, executors, tmp_path) -> AsyncIterator[tuple[str, str]]:
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
    agent_raw, digest = new_refresh_token()
    app.state.store.add_refresh_token(digest, OWNER, "agent")
    mcp_raw, digest = new_refresh_token()
    app.state.store.add_refresh_token(digest, OWNER, "mcp")
    project = tmp_path / "proj"
    project.mkdir()
    store.set_active_project(OWNER, store.add_project("demo", str(project))["id"])
    agent = LaptopAgent(store, RouterBrain(executors, offline=True), OWNER, workspace=str(tmp_path / "ws"))
    agent_task = asyncio.create_task(serve(agent, f"ws://127.0.0.1:{port}/agent", agent_raw))
    relay = app.state.chat
    for _ in range(500):
        if relay.agent_online(OWNER):
            break
        await asyncio.sleep(0.01)
    try:
        yield f"http://127.0.0.1:{port}", mcp_raw
    finally:
        agent_task.cancel()
        server.should_exit = True
        await asyncio.gather(agent_task, server_task, return_exceptions=True)


@pytest.mark.anyio
async def test_relay_end_to_end_through_laptop(live_hub, tmp_path):
    base, mcp_token = live_hub
    async with httpx.AsyncClient(base_url=base, headers=auth(mcp_token), timeout=10) as http:
        init = (await http.post(RELAY, json=rpc("initialize", {"protocolVersion": "2025-06-18"}))).json()
        assert init["result"]["serverInfo"]["name"] == "doaide-code"

        listed = (await http.post(RELAY, json=rpc("tools/list", request_id=2))).json()
        assert {"execute_code", "write_file", "run_command"} <= {t["name"] for t in listed["result"]["tools"]}

        write = {"name": "write_file", "arguments": {"path": "notes.txt", "content": "from the cloud"}}
        resp = await http.post(RELAY, json=rpc("tools/call", write, request_id=3))
        assert resp.status_code == 200 and resp.json()["id"] == 3
        assert (tmp_path / "proj" / "notes.txt").read_text() == "from the cloud"

        run = {"name": "execute_code", "arguments": {"prompt": "hello"}}
        answer = (await http.post(RELAY, json=rpc("tools/call", run, request_id=4))).json()
        assert answer["result"]["structuredContent"]["answer"] == "Hello world"


# Relayed calls are visible conversations on every device

EDIT_ANSWER = "Make it louder.\n\napp.py\n<<<<<<< SEARCH\nprint('hello')\n=======\nprint('HELLO')\n>>>>>>> REPLACE\n"


def test_describe_call_and_tool_reply():
    assert describe_call("execute_code", {"prompt": "add tests", "project": "demo"}) == "add tests (project demo)"
    assert describe_call("run_command", {"command": "pytest", "cwd": "backend"}) == "$ pytest in backend"
    assert describe_call("read_file", {"path": "a.py"}) == "Read a.py"
    assert describe_call("apply_changes", {}) == "Apply changes (latest)"
    ok = {"result": {"content": [{"type": "text", "text": "x" * 30_000}], "structuredContent": {"usage": {"tokens_in": 1}}}}
    content, status, meta = tool_reply(ok)
    assert status == "done" and content.endswith("[output truncated]") and meta == {"usage": {"tokens_in": 1}}
    assert tool_reply({"result": {"content": [], "isError": True}})[1] == "error"
    assert tool_reply({"error": {"message": "boom"}}) == ("boom", "error", {})


@pytest.mark.anyio
async def test_relayed_calls_show_in_the_one_conversation(live_hub, executors, settings, tmp_path):
    from websockets.asyncio.client import connect

    base, mcp_token = live_hub
    browser = issue_token(settings, User(email=OWNER))
    (tmp_path / "proj" / "app.py").write_text("print('hello')\n")
    executors[0].chunks = [EDIT_ANSWER[:20], EDIT_ANSWER[20:]]
    async with (
        httpx.AsyncClient(base_url=base, headers=auth(mcp_token), timeout=10) as http,
        connect(f"{base.replace('http', 'ws')}/ws?token={browser}") as ws,
    ):
        snapshot = json.loads(await ws.recv())
        assert snapshot["type"] == "snapshot" and "title" not in snapshot and "source" not in snapshot
        run = {"name": "execute_code", "arguments": {"prompt": "shout the greeting"}}
        answer = (await http.post(RELAY, json=rpc("tools/call", run))).json()["result"]["structuredContent"]
        assert answer["answer"] == "Make it louder." and answer["changes"]["status"] == "pending"
        assert (tmp_path / "proj" / "app.py").read_text() == "print('hello')\n"  # preview only

        events = []
        while not events or events[-1]["type"] != "done":
            events.append(json.loads(await ws.recv()))
        # The call joins the same single conversation (labelled as Claude Code's), then streams in.
        assert [e["type"] for e in events[:2]] == ["message", "message"]
        assert events[0]["message"]["meta"] == {"via": "mcp", "tool": "execute_code"}
        assert any(e["type"] == "delta" for e in events)
        assert events[-1]["meta"]["changes"]["files"][0]["path"] == "app.py"

        applied = (await http.post(RELAY, json=rpc("tools/call", {"name": "apply_changes", "arguments": {}}))).json()
        assert not applied["result"].get("isError")
        assert (tmp_path / "proj" / "app.py").read_text() == "print('HELLO')\n"

        session = (await http.get("/api/session", headers=auth(browser))).json()
        instruction, reply, apply_msg, apply_reply = session["messages"]
        assert (instruction["role"], instruction["content"]) == ("user", "shout the greeting")
        assert instruction["meta"] == {"via": "mcp", "tool": "execute_code"}
        assert reply["meta"]["changes"]["status"] == "applied" and reply["content"] == "Make it louder."
        assert apply_msg["content"] == "Apply changes (latest)" and apply_reply["content"].startswith("Applied 1 file")
        assert session["session_id"] == snapshot["session_id"]
