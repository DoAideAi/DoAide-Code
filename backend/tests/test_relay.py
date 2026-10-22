"""Hub mode: the server only stores and relays; the laptop agent on /agent does the work."""

from __future__ import annotations

from collections.abc import Iterator

import pytest
from fastapi.testclient import TestClient
from starlette.websockets import WebSocketDisconnect

from doaide_code.auth import new_refresh_token
from doaide_code.main import create_app
from doaide_code.runner import NO_EXECUTOR

from .test_api import auth, drain_until


@pytest.fixture
def hub(settings) -> Iterator[TestClient]:
    settings.mode = "hub"
    with TestClient(create_app(settings), client=("172.18.0.2", 40000)) as c:
        yield c


@pytest.fixture
def agent_token(hub) -> str:
    raw, digest = new_refresh_token()
    hub.app.state.store.add_refresh_token(digest, "owner@example.com", "agent", name="laptop")
    return raw


def test_hub_runs_no_executors(hub):
    assert hub.get("/api/health").json() == {"ok": True, "mode": "hub"}
    assert hub.get("/api/config").json()["mode"] == "hub"
    assert hub.app.state.router is None


def test_prompt_is_queued_while_laptop_is_offline(hub, token):
    with hub.websocket_connect(f"/ws?token={token}") as ws:
        snapshot = ws.receive_json()
        assert snapshot["mode"] == "hub" and snapshot["agent_online"] is False
        ws.send_json({"type": "send", "text": "explain this repo"})
        events = drain_until(ws, "status")
    messages = [e["message"] for e in events if e["type"] == "message"]
    assert [(m["role"], m["status"]) for m in messages] == [("user", "done"), ("assistant", "queued")]
    assert events[-1] == {"type": "status", "state": "busy"}
    # The desktop-only executor check never runs on the hub.
    assert all(NO_EXECUTOR not in str(e) for e in events)

    body = hub.get("/api/session", headers=auth(token)).json()
    assert body["status"] == "busy" and body["messages"][-1]["status"] == "queued"


def test_queued_prompt_runs_when_laptop_connects(hub, token, agent_token):
    with hub.websocket_connect(f"/ws?token={token}") as browser:
        browser.receive_json()
        browser.send_json({"type": "send", "text": "first question"})
        drain_until(browser, "status")

        with hub.websocket_connect(f"/agent?token={agent_token}") as laptop:
            job = laptop.receive_json()
            assert job["type"] == "job" and job["text"] == "first question" and job["history"] == []
            assert drain_until(browser, "agent")[-1] == {"type": "agent", "online": True}

            laptop.send_json({"type": "hello", "project": "alpha", "executors": ["ollama"]})
            assert drain_until(browser, "project")[-1]["project"] == "alpha"

            laptop.send_json({"type": "delta", "id": job["id"], "text": "Hel"})
            laptop.send_json({"type": "delta", "id": job["id"], "text": "lo"})
            laptop.send_json({"type": "done", "id": job["id"], "status": "done", "content": "Hello"})
            events = drain_until(browser, "done")
            assert "".join(e["text"] for e in events if e["type"] == "delta") == "Hello"
            assert events[-1]["content"] == "Hello" and events[-1]["status"] == "done"
            assert drain_until(browser, "status")[-1]["state"] == "idle"

            # The follow-up carries the finished exchange as history.
            browser.send_json({"type": "send", "text": "and then?"})
            follow_up = laptop.receive_json()
            assert follow_up["text"] == "and then?"
            assert follow_up["history"] == [
                {"role": "user", "content": "first question"},
                {"role": "assistant", "content": "Hello"},
            ]

    snapshot = hub.get("/api/session", headers=auth(token)).json()
    assert snapshot["project"] == "alpha"
    assert [m["content"] for m in snapshot["messages"]][:2] == ["first question", "Hello"]


def test_laptop_disconnect_fails_the_running_prompt(hub, token, agent_token):
    with hub.websocket_connect(f"/ws?token={token}") as browser:
        browser.receive_json()
        with hub.websocket_connect(f"/agent?token={agent_token}") as laptop:
            drain_until(browser, "agent")
            browser.send_json({"type": "send", "text": "long task"})
            job = laptop.receive_json()
            laptop.send_json({"type": "delta", "id": job["id"], "text": "partial"})
            drain_until(browser, "delta")
        events = drain_until(browser, "agent")
    done = next(e for e in events if e["type"] == "done")
    assert done["status"] == "error" and done["content"].startswith("partial") and "disconnected" in done["content"]
    assert events[-1] == {"type": "agent", "online": False}


def test_stop_cancels_queued_prompt(hub, token):
    with hub.websocket_connect(f"/ws?token={token}") as ws:
        ws.receive_json()
        ws.send_json({"type": "send", "text": "do something"})
        reply = next(e for e in drain_until(ws, "status") if e["type"] == "message" and e["message"]["role"] == "assistant")
        ws.send_json({"type": "stop"})
        events = drain_until(ws, "status")
    assert events[0] == {"type": "done", "id": reply["message"]["id"], "status": "stopped", "content": ""}
    assert events[-1]["state"] == "idle"
    assert hub.app.state.store.list_jobs("owner@example.com") == []


def test_stop_is_forwarded_to_running_laptop(hub, token, agent_token):
    with hub.websocket_connect(f"/ws?token={token}") as browser, hub.websocket_connect(
        f"/agent?token={agent_token}"
    ) as laptop:
        browser.receive_json()
        browser.send_json({"type": "send", "text": "slow"})
        job = laptop.receive_json()
        browser.send_json({"type": "stop"})
        assert laptop.receive_json() == {"type": "stop", "id": job["id"]}
        laptop.send_json({"type": "done", "id": job["id"], "status": "stopped", "content": "half"})
        assert drain_until(browser, "done")[-1]["status"] == "stopped"


def test_commands_run_on_laptop_and_reply_as_system(hub, token, agent_token):
    with hub.websocket_connect(f"/ws?token={token}") as browser, hub.websocket_connect(
        f"/agent?token={agent_token}"
    ) as laptop:
        browser.receive_json()
        browser.send_json({"type": "send", "text": "/projects"})
        job = laptop.receive_json()
        assert job["text"] == "/projects"
        laptop.send_json({"type": "done", "id": job["id"], "role": "system", "status": "done", "content": "* alpha"})
        assert drain_until(browser, "done")[-1]["role"] == "system"
    roles = [m["role"] for m in hub.get("/api/session", headers=auth(token)).json()["messages"]]
    assert roles == ["user", "system"]


def test_new_session_is_handled_on_hub(hub, token):
    with hub.websocket_connect(f"/ws?token={token}") as ws:
        first = ws.receive_json()["session_id"]
        ws.send_json({"type": "send", "text": "/new"})
        snapshot = drain_until(ws, "snapshot")[-1]
    assert snapshot["session_id"] != first and snapshot["messages"] == []
    assert hub.app.state.store.list_jobs("owner@example.com") == []


def test_stale_agent_events_are_ignored(hub, token, agent_token):
    with hub.websocket_connect(f"/ws?token={token}") as browser, hub.websocket_connect(
        f"/agent?token={agent_token}"
    ) as laptop:
        browser.receive_json()
        laptop.send_json({"type": "done", "id": "not-a-job", "status": "done", "content": "spoof"})
        laptop.send_json({"type": "ping"})
        assert laptop.receive_json() == {"type": "pong"}
    assert hub.get("/api/session", headers=auth(token)).json()["messages"] == []


def test_agent_socket_needs_agent_token(hub, token, agent_token):
    with pytest.raises(WebSocketDisconnect) as info:
        with hub.websocket_connect(f"/agent?token={token}") as ws:
            ws.receive_json()
    assert info.value.code == 4401
    # And an agent token cannot be used as a browser session.
    assert hub.get("/api/me", headers=auth(agent_token)).status_code == 401


def test_agent_token_endpoint(hub, token, settings):
    assert hub.post("/api/agent-token").status_code == 401
    body = hub.post(
        "/api/agent-token", headers={**auth(token), "X-Forwarded-Proto": "https", "Host": "code.doaide.com"}
    ).json()
    assert body["hub_url"] == "wss://code.doaide.com/agent"
    from doaide_code.auth import hash_token

    row = hub.app.state.store.use_refresh_token(hash_token(body["token"]), "agent")
    assert row["user_email"] == "owner@example.com"
    # The token is what the laptop uses on /agent.
    with hub.websocket_connect(f"/agent?token={body['token']}") as laptop:
        laptop.send_json({"type": "ping"})
        assert laptop.receive_json() == {"type": "pong"}


def test_agent_endpoints_absent_in_local_mode(client, token):
    assert client.post("/api/agent-token", headers=auth(token)).status_code == 404
    with pytest.raises(WebSocketDisconnect):
        with client.websocket_connect(f"/agent?token={token}") as ws:
            ws.receive_json()


def test_drafts_from_the_laptop_reach_the_browser(hub, token, agent_token):
    with hub.websocket_connect(f"/ws?token={token}") as browser:
        browser.receive_json()
        browser.send_json({"type": "send", "text": "a question"})
        drain_until(browser, "status")
        with hub.websocket_connect(f"/agent?token={agent_token}") as laptop:
            job = laptop.receive_json()
            laptop.send_json({"type": "draft", "id": job["id"], "text": "Thinking"})
            laptop.send_json({"type": "draft", "id": job["id"], "text": "", "clear": True})
            laptop.send_json({"type": "done", "id": job["id"], "status": "done", "content": "Answer"})
            drafts = [e for e in drain_until(browser, "done") if e["type"] == "draft"]
    assert drafts == [
        {"type": "draft", "id": job["id"], "text": "Thinking"},
        {"type": "draft", "id": job["id"], "text": "", "clear": True},
    ]


def test_the_hub_lists_the_projects_the_laptop_reported(hub, token, agent_token):
    assert hub.get("/api/projects", headers=auth(token)).json() == {"projects": [], "active": None}
    with hub.websocket_connect(f"/ws?token={token}") as browser:
        browser.receive_json()
        with hub.websocket_connect(f"/agent?token={agent_token}") as laptop:
            laptop.send_json({"type": "hello", "project": "alpha", "projects": ["alpha", "beta"], "executors": []})
            drain_until(browser, "project")
            body = hub.get("/api/projects", headers=auth(token)).json()
            assert body == {"projects": [{"name": "alpha"}, {"name": "beta"}], "active": "alpha"}
            laptop.send_json({"type": "project", "project": "gamma", "projects": ["alpha", "beta", "gamma"]})
            drain_until(browser, "project")
            assert [p["name"] for p in hub.get("/api/projects", headers=auth(token)).json()["projects"]][-1] == "gamma"
