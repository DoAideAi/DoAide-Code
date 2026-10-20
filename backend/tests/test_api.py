from __future__ import annotations

import pytest
from fastapi.testclient import TestClient
from starlette.websockets import WebSocketDisconnect

from doaide_code.main import create_app


def drain_until(ws, kind: str, limit: int = 50) -> list[dict]:
    events = []
    for _ in range(limit):
        event = ws.receive_json()
        events.append(event)
        if event["type"] == kind:
            return events
    raise AssertionError(f"no {kind} event in {events}")


def auth(token: str) -> dict:
    return {"Authorization": f"Bearer {token}"}


def test_health_and_config(client):
    body = client.get("/api/health").json()
    assert body["ok"] and body["executors"] == ["ollama", "codex", "claude-sonnet", "claude-opus"]
    assert client.get("/api/config").json() == {"google_client_id": "", "local_login": True}


def test_local_login_only_for_direct_loopback(client, settings, executors):
    resp = client.post("/api/auth/local")
    assert resp.status_code == 200 and resp.json()["email"] == "owner@example.com"
    assert client.post("/api/auth/local", headers={"X-Forwarded-For": "1.2.3.4"}).status_code == 403
    with TestClient(create_app(settings, executors=executors), client=("10.0.0.5", 1)) as remote:
        assert remote.post("/api/auth/local").status_code == 403


def test_local_login_disabled_when_sso_required(settings, executors):
    settings.require_sso = True
    with TestClient(create_app(settings, executors=executors), client=("127.0.0.1", 1)) as c:
        assert c.post("/api/auth/local").status_code == 403


def test_api_requires_auth(client, token):
    assert client.get("/api/projects").status_code == 401
    assert client.get("/api/projects", headers=auth("garbage")).status_code == 401
    assert client.get("/api/me", headers=auth(token)).json()["email"] == "owner@example.com"


def test_websocket_rejects_bad_token(client):
    for path in ("/ws", "/sync"):
        with pytest.raises(WebSocketDisconnect) as info:
            with client.websocket_connect(f"{path}?token=nope") as ws:
                ws.receive_json()
        assert info.value.code == 4401


def test_chat_streams_through_cheapest_executor(client, token, executors):
    with client.websocket_connect(f"/ws?token={token}") as ws:
        snapshot = ws.receive_json()
        assert snapshot["type"] == "snapshot" and snapshot["messages"] == []
        ws.send_json({"type": "send", "text": "what is a closure?"})
        events = drain_until(ws, "done")
    deltas = "".join(e["text"] for e in events if e["type"] == "delta")
    done = events[-1]
    assert deltas == "Hello world" and done["status"] == "done" and done["content"] == "Hello world"
    assert executors[0].jobs and not executors[1].jobs
    # Model identity never reaches the client.
    assert all("executor" not in e.get("message", {}) for e in events)

    stats = client.get("/api/stats", headers=auth(token)).json()["executors"]
    assert stats[0]["executor"] == "ollama" and stats[0]["calls"] == 1

    history = client.get("/api/session", headers=auth(token)).json()["messages"]
    assert [m["role"] for m in history] == ["user", "assistant"]


def test_harder_requests_go_to_higher_tiers(client, token, executors):
    with client.websocket_connect(f"/ws?token={token}") as ws:
        ws.receive_json()
        ws.send_json({"type": "send", "text": "do a security audit of the login flow"})
        events = drain_until(ws, "done")
    assert events[-1]["content"] == "opus answer"
    assert not executors[0].jobs


def test_fallback_when_executor_fails_before_output(client, token, executors):
    executors[0].fail = "ollama down"
    with client.websocket_connect(f"/ws?token={token}") as ws:
        ws.receive_json()
        ws.send_json({"type": "send", "text": "explain decorators"})
        events = drain_until(ws, "done")
    assert events[-1]["content"] == "codex says hi" and events[-1]["status"] == "done"
    failures = {s["executor"]: s["failures"] for s in client.get("/api/stats", headers=auth(token)).json()["executors"]}
    assert failures == {"ollama": 1, "codex": 0}


def test_all_executors_failing_reports_error(client, token, executors):
    for ex in executors:
        ex.fail = f"{ex.name} broke"
    with client.websocket_connect(f"/ws?token={token}") as ws:
        ws.receive_json()
        ws.send_json({"type": "send", "text": "hello"})
        events = drain_until(ws, "done")
        status = ws.receive_json()
    assert events[-1]["status"] == "error" and "All executors failed" in events[-1]["content"]
    assert status == {"type": "status", "state": "error"}


def test_project_commands_over_websocket(client, token, tmp_path, executors):
    with client.websocket_connect(f"/ws?token={token}") as ws:
        ws.receive_json()
        ws.send_json({"type": "send", "text": f"/add-project demo {tmp_path}"})
        events = drain_until(ws, "project")
        assert events[-1]["project"] == "demo"
        assert any(e["type"] == "message" and e["message"]["role"] == "system" for e in events)

        ws.send_json({"type": "send", "text": "hi"})
        drain_until(ws, "done")
    assert executors[0].jobs[-1].cwd == tmp_path.resolve()
    body = client.get("/api/projects", headers=auth(token)).json()
    assert body["active"] == "demo" and body["projects"][0]["path"] == str(tmp_path.resolve())


def test_new_session_command(client, token):
    with client.websocket_connect(f"/ws?token={token}") as ws:
        first = ws.receive_json()["session_id"]
        ws.send_json({"type": "send", "text": "hi"})
        drain_until(ws, "done")
        ws.send_json({"type": "send", "text": "/new"})
        snap = drain_until(ws, "snapshot")[-1]
    assert snap["session_id"] != first and snap["messages"] == []


def test_sync_relay_mirrors_chat_and_is_read_only(client, token, executors):
    with client.websocket_connect(f"/sync?token={token}") as phone:
        assert phone.receive_json()["type"] == "snapshot"
        # A phone cannot send chat messages over the relay.
        phone.send_json({"type": "send", "text": "should be ignored"})
        phone.send_json({"type": "ping"})
        assert phone.receive_json() == {"type": "pong"}

        with client.websocket_connect(f"/ws?token={token}") as desk:
            desk.receive_json()
            desk.send_json({"type": "send", "text": "what is a closure?"})
            drain_until(desk, "done")
        mirrored = drain_until(phone, "done")

    assert mirrored[0]["type"] == "message" and mirrored[0]["message"]["content"] == "what is a closure?"
    assert "".join(e["text"] for e in mirrored if e["type"] == "delta") == "Hello world"
    assert len(executors[0].jobs) == 1


def test_rest_message_endpoint(client, token):
    with client.websocket_connect(f"/sync?token={token}") as phone:
        phone.receive_json()
        assert client.post("/api/messages", json={"text": "hi"}, headers=auth(token)).json() == {"accepted": True}
        assert drain_until(phone, "done")[-1]["content"] == "Hello world"


def test_stop_cancels_generation(client, token, executors):
    import asyncio

    class Slow(type(executors[0])):
        async def stream(self, job):
            yield "partial"
            await asyncio.sleep(30)
            yield "never"

    executors[0].__class__ = Slow
    with client.websocket_connect(f"/ws?token={token}") as ws:
        ws.receive_json()
        ws.send_json({"type": "send", "text": "explain generators"})
        drain_until(ws, "delta")
        ws.send_json({"type": "stop"})
        done = drain_until(ws, "done")[-1]
    assert done["status"] == "stopped" and done["content"] == "partial"


def test_serves_built_frontend_with_spa_fallback(settings, executors, tmp_path):
    dist = tmp_path / "dist"
    (dist / "assets").mkdir(parents=True)
    (dist / "index.html").write_text("<html>app</html>")
    (dist / "assets" / "app.js").write_text("console.log(1)")
    settings.frontend_dist = dist
    with TestClient(create_app(settings, executors=executors)) as c:
        assert c.get("/").text == "<html>app</html>"
        assert c.get("/some/route").text == "<html>app</html>"
        assert c.get("/assets/app.js").text == "console.log(1)"
        assert c.get("/api/nope").status_code == 404
        assert c.get("/api/health").json()["ok"]
