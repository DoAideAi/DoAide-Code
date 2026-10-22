"""Default workspace, read-only file browsing (local and via the laptop), and sign-ins that
never expire."""

from __future__ import annotations

import os
import threading
import time
from pathlib import Path

import jwt
import pytest
from fastapi.testclient import TestClient

from doaide_code.agent import LaptopAgent
from doaide_code.auth import hash_token, new_refresh_token
from doaide_code.commands import run_command
from doaide_code.files import MAX_BYTES, FileAccessError, list_dir, read_file
from doaide_code.main import create_app
from doaide_code.router import RouterBrain
from doaide_code.workspace import DEFAULT_WORKSPACE, workspace_path

from .test_api import auth, drain_until

USER = "owner@example.com"


# Workspace


def test_default_workspace_is_in_home(store):
    assert DEFAULT_WORKSPACE == "~/doaide-code-workspace"
    assert workspace_path(store) == Path.home() / "doaide-code-workspace"


def test_workspace_command_show_set_reset(store, tmp_path):
    default = str(tmp_path / "default-ws")
    assert run_command(store, USER, "/workspace", workspace=default).text == f"Workspace: {tmp_path / 'default-ws'}"

    custom = tmp_path / "elsewhere" / "ws"
    assert "Workspace set to" in run_command(store, USER, f"/workspace {custom}", workspace=default).text
    assert custom.is_dir() and workspace_path(store, default) == custom.resolve()

    (tmp_path / "file.txt").write_text("x")
    assert "Not a directory" in run_command(store, USER, f"/workspace {tmp_path / 'file.txt'}", workspace=default).text
    assert workspace_path(store, default) == custom.resolve()

    run_command(store, USER, "/workspace reset", workspace=default)
    assert workspace_path(store, default) == (tmp_path / "default-ws").resolve()


def test_add_project_by_name_creates_folder_in_workspace(store, tmp_path):
    ws = tmp_path / "ws"
    result = run_command(store, USER, "/add-project demo", workspace=str(ws))
    assert result.project_changed and (ws / "demo").is_dir()
    assert store.get_project("demo")["path"] == str((ws / "demo").resolve())

    (ws / "existing").mkdir()
    run_command(store, USER, "/add-project other existing", workspace=str(ws))
    assert store.get_project("other")["path"] == str((ws / "existing").resolve())
    # Explicit paths that do not exist are still refused rather than created.
    assert "Not a directory" in run_command(store, USER, "/add-project x ./missing", workspace=str(ws)).text


def test_prompt_without_project_runs_in_workspace(client, token, settings, executors):
    with client.websocket_connect(f"/ws?token={token}") as ws:
        ws.receive_json()
        ws.send_json({"type": "send", "text": "hello"})
        drain_until(ws, "done")
    workspace = Path(settings.workspace).resolve()
    assert executors[0].jobs[-1].cwd == workspace and workspace.is_dir()


def test_settings_api_local_and_hub(client, token, settings, tmp_path):
    body = client.get("/api/settings", headers=auth(token)).json()
    assert body == {"workspace": str(Path(settings.workspace).resolve()), "default_workspace": settings.workspace}
    target = tmp_path / "picked"
    body = client.put("/api/settings", json={"workspace": str(target)}, headers=auth(token)).json()
    assert body["workspace"] == str(target.resolve()) and target.is_dir()
    assert client.put("/api/settings", json={"workspace": None}, headers=auth(token)).json()["workspace"] == str(
        Path(settings.workspace).resolve()
    )
    assert client.get("/api/settings").status_code == 401

    settings.mode = "hub"
    with TestClient(create_app(settings)) as hub:
        assert hub.get("/api/settings", headers=auth(token)).status_code == 404


# Files


@pytest.fixture
def tree(tmp_path) -> Path:
    root = tmp_path / "proj"
    (root / "src").mkdir(parents=True)
    (root / "src" / "app.py").write_text("print('hi')\n")
    (root / "README.md").write_text("# Demo\n")
    (root / "node_modules" / "pkg").mkdir(parents=True)
    (root / ".git").mkdir()
    (root / "blob.bin").write_bytes(b"\x00\x01\x02")
    return root


def test_list_dir_sorts_dirs_first_and_skips_heavy_folders(tree):
    listing = list_dir(tree)
    assert [(e["name"], e["type"]) for e in listing["entries"]] == [
        ("src", "dir"),
        ("blob.bin", "file"),
        ("README.md", "file"),
    ]
    assert list_dir(tree, "src")["entries"] == [{"name": "app.py", "path": "src/app.py", "type": "file", "size": 12}]


def test_read_file_text_binary_and_truncated(tree):
    assert read_file(tree, "src/app.py")["content"] == "print('hi')\n"
    assert read_file(tree, "blob.bin")["binary"] is True
    (tree / "big.txt").write_text("a" * (MAX_BYTES + 10))
    big = read_file(tree, "big.txt")
    assert big["truncated"] and len(big["content"]) == MAX_BYTES


def test_file_access_cannot_escape_root(tree, tmp_path):
    (tmp_path / "secret.txt").write_text("nope")
    os.symlink(tmp_path / "secret.txt", tree / "link.txt")
    for rel in ("../secret.txt", "link.txt", "/etc/hosts"):
        with pytest.raises(FileAccessError) as info:
            read_file(tree, rel)
        assert info.value.status == 400
    with pytest.raises(FileAccessError) as info:
        list_dir(tree, "missing")
    assert info.value.status == 404


def test_files_api_local_uses_active_project(client, token, tree):
    with client.websocket_connect(f"/ws?token={token}") as ws:
        ws.receive_json()
        ws.send_json({"type": "send", "text": f"/add-project demo {tree}"})
        drain_until(ws, "project")
    listing = client.get("/api/files", headers=auth(token)).json()
    assert listing["root"] == "demo" and listing["entries"][0]["name"] == "src"
    assert client.get("/api/file?path=src/app.py", headers=auth(token)).json()["content"] == "print('hi')\n"
    assert client.get("/api/file?path=../x", headers=auth(token)).status_code == 400
    assert client.get("/api/files").status_code == 401


@pytest.mark.anyio
async def test_agent_answers_file_requests_from_laptop_disk(store, tree):
    store.set_active_project(USER, store.add_project("demo", str(tree))["id"])
    agent = LaptopAgent(store, RouterBrain([], offline=True), USER, workspace=str(tree.parent / "ws"))
    sent = []

    async def send(event):
        sent.append(event)

    await agent.on_message({"type": "rpc", "id": "r1", "method": "read_file", "params": {"path": "README.md"}}, send)
    await agent.on_message({"type": "rpc", "id": "r2", "method": "read_file", "params": {"path": "../x"}}, send)
    await agent.on_message({"type": "rpc", "id": "r3", "method": "rm_rf", "params": {}}, send)
    assert sent[0]["id"] == "r1" and sent[0]["result"]["content"] == "# Demo\n" and sent[0]["result"]["root"] == "demo"
    assert sent[1] == {"type": "rpc_result", "id": "r2", "error": "Path is outside the project", "status": 400}
    assert sent[2]["status"] == 400


@pytest.fixture
def hub(settings):
    settings.mode = "hub"
    with TestClient(create_app(settings)) as c:
        yield c


def laptop_token(hub) -> str:
    raw, digest = new_refresh_token()
    hub.app.state.store.add_refresh_token(digest, USER, "agent")
    return raw


def test_hub_files_are_fetched_from_the_laptop(hub, token):
    assert hub.get("/api/files", headers=auth(token)).status_code == 503  # laptop offline
    with hub.websocket_connect(f"/agent?token={laptop_token(hub)}") as laptop:
        result = {}
        worker = threading.Thread(
            target=lambda: result.update(resp=hub.get("/api/file?path=src/app.py", headers=auth(token)))
        )
        worker.start()
        request = laptop.receive_json()
        assert request["type"] == "rpc" and request["method"] == "read_file" and request["params"] == {"path": "src/app.py"}
        laptop.send_json({"type": "rpc_result", "id": request["id"], "result": {"path": "src/app.py", "content": "x"}})
        worker.join(5)
        assert result["resp"].json() == {"path": "src/app.py", "content": "x"}

        worker = threading.Thread(target=lambda: result.update(resp=hub.get("/api/file?path=../x", headers=auth(token))))
        worker.start()
        request = laptop.receive_json()
        laptop.send_json({"type": "rpc_result", "id": request["id"], "error": "Path is outside the project", "status": 400})
        worker.join(5)
        assert result["resp"].status_code == 400


# Sessions that never expire


def test_login_returns_refresh_token_that_renews_access(client, settings):
    body = client.post("/api/auth/local").json()
    assert body["token"] and body["refresh_token"]
    stored = client.app.state.store.use_refresh_token(hash_token(body["refresh_token"]), "user")
    assert stored["user_email"] == USER

    # Even long after the access token expired, the refresh token still works.
    expired = jwt.encode({"sub": USER, "exp": int(time.time()) - 3600}, settings.jwt_secret, algorithm="HS256")
    assert client.get("/api/me", headers=auth(expired)).status_code == 401
    fresh = client.post("/api/auth/refresh", json={"refresh_token": body["refresh_token"]}).json()
    assert client.get("/api/me", headers=auth(fresh["token"])).json()["email"] == USER


def test_refresh_token_never_expires_but_can_be_revoked(client):
    body = client.post("/api/auth/local").json()
    client.app.state.store._exec("UPDATE refresh_tokens SET created_at = 0")  # issued in 1970
    assert client.post("/api/auth/refresh", json={"refresh_token": body["refresh_token"]}).status_code == 200
    assert client.post("/api/auth/logout", json={"refresh_token": body["refresh_token"]}).json() == {"revoked": True}
    assert client.post("/api/auth/refresh", json={"refresh_token": body["refresh_token"]}).status_code == 401
    assert client.post("/api/auth/refresh", json={"refresh_token": "made-up"}).status_code == 401


def test_refresh_rejects_accounts_removed_from_allow_list(client, settings):
    raw, digest = new_refresh_token()
    client.app.state.store.add_refresh_token(digest, "ex@example.com", "user")
    settings.allowed_emails = frozenset({USER})
    assert client.post("/api/auth/refresh", json={"refresh_token": raw}).status_code == 401
    assert client.app.state.store.use_refresh_token(digest, "user") is None


def test_agent_tokens_are_not_browser_refresh_tokens(hub):
    raw = laptop_token(hub)
    assert hub.post("/api/auth/refresh", json={"refresh_token": raw}).status_code == 401
    hub.app.state.store.delete_refresh_token(hash_token(raw))
    from starlette.websockets import WebSocketDisconnect

    with pytest.raises(WebSocketDisconnect) as info:
        with hub.websocket_connect(f"/agent?token={raw}") as ws:
            ws.receive_json()
    assert info.value.code == 4401


def test_one_conversation_that_new_clears(client, token):
    with client.websocket_connect(f"/ws?token={token}") as ws:
        first = ws.receive_json()
        assert "title" not in first and "source" not in first
        ws.send_json({"type": "send", "text": "first chat"})
        drain_until(ws, "done")
        ws.send_json({"type": "send", "text": "/new"})
        cleared = drain_until(ws, "snapshot")[-1]
        assert cleared["session_id"] != first["session_id"] and cleared["messages"] == []
        # Both conversations are listed (the sidebar), the new one active; "open" over the socket
        # is ignored (the sidebar switches through /api/session?session_id=).
        listed = [s["id"] for s in client.get("/api/sessions", headers=auth(token)).json()["sessions"]]
        assert {first["session_id"], cleared["session_id"]} <= set(listed)
        ws.send_json({"type": "open", "session_id": first["session_id"]})
        ws.send_json({"type": "ping"})
        assert ws.receive_json() == {"type": "pong"}
        assert client.get("/api/session", headers=auth(token)).json()["session_id"] == cleared["session_id"]
