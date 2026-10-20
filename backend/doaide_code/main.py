"""FastAPI harness server: REST, chat WebSocket (/ws), sync relay (/sync), and the built UI.

In local mode (the laptop) it runs the executors itself. In hub mode (code.doaide.com) it
only stores and syncs the conversation and relays prompts to the laptop agent on /agent.
"""

from __future__ import annotations

import asyncio
import json
import logging
from contextlib import asynccontextmanager
from pathlib import Path

from fastapi import Depends, FastAPI, HTTPException, Request, WebSocket, WebSocketDisconnect, status
from fastapi.responses import FileResponse, JSONResponse, Response
from fastapi.staticfiles import StaticFiles
from pydantic import BaseModel

from .auth import (
    AuthError,
    User,
    bearer,
    hash_token,
    is_loopback,
    issue_token,
    new_refresh_token,
    verify_google_credential,
    verify_token,
)
from .chat import ChatService
from .files import FileAccessError, list_dir, read_file
from .relay import LaptopOffline, RelayService
from .config import Settings
from .db import Store
from .executors import Executor, build_executors
from .router import RouterBrain
from .sync import SyncHub
from .workspace import set_workspace, working_root, workspace_path

log = logging.getLogger("doaide_code")

WS_UNAUTHORIZED = 4401
# Relayed MCP calls wait for the laptop: execute_code and run_command (max 1800 s) can be slow.
MCP_RELAY_TIMEOUT = 1900
# Keeps relayed requests well under the agent socket's 4 MiB frame limit.
MCP_RELAY_MAX_BYTES = 2_000_000


class GoogleLogin(BaseModel):
    credential: str


class SendMessage(BaseModel):
    text: str


class RefreshRequest(BaseModel):
    refresh_token: str


class SettingsUpdate(BaseModel):
    # None restores the default (~/doaide-code-workspace).
    workspace: str | None = None


def create_app(settings: Settings | None = None, *, executors: list[Executor] | None = None) -> FastAPI:
    settings = settings or Settings()
    store = Store(settings.db_path)
    hub = SyncHub()
    router: RouterBrain | None = None
    chat: ChatService | RelayService
    if settings.is_hub:
        # No model, router or LLM key is used on the hub; the laptop agent does all of that.
        chat = RelayService(store, hub)
    else:
        # Local executors only (Ollama, Codex CLI, Claude CLI); routing is local heuristics.
        router = RouterBrain(executors if executors is not None else build_executors(settings), offline=True)
        chat = ChatService(store, router, hub, workspace=settings.workspace)

    @asynccontextmanager
    async def lifespan(_: FastAPI):
        yield
        store.close()

    app = FastAPI(title="Doaide Code", version="0.1.0", lifespan=lifespan)
    app.state.settings, app.state.store, app.state.hub, app.state.chat, app.state.router = (
        settings,
        store,
        hub,
        chat,
        router,
    )

    def current_user(request: Request) -> User:
        try:
            return verify_token(settings, bearer(request.headers.get("authorization")))
        except AuthError as exc:
            raise HTTPException(status.HTTP_401_UNAUTHORIZED, str(exc)) from exc

    def start_session(user: User) -> dict:
        """Access token plus a refresh token that never expires (revoked by /api/auth/logout)."""
        raw, digest = new_refresh_token()
        store.add_refresh_token(digest, user.email, "user", name=user.name)
        return {"token": issue_token(settings, user), "refresh_token": raw, "email": user.email}

    # Health and auth

    @app.get("/api/health")
    async def health() -> dict:
        if router is None:
            return {"ok": True, "mode": "hub"}
        available = [e.name for e in router.executors if await e.available()]
        return {"ok": True, "mode": "local", "executors": available}

    @app.get("/api/config")
    async def public_config() -> dict:
        return {
            "google_client_id": settings.google_client_id,
            "local_login": not settings.require_sso,
            "mode": settings.mode,
        }

    @app.post("/api/auth/local")
    async def local_login(request: Request) -> dict:
        # Proxied requests arrive from loopback too, so any forwarding header disqualifies them.
        proxied = any(h in request.headers for h in ("x-forwarded-for", "x-real-ip", "forwarded"))
        host = request.client.host if request.client else None
        if settings.require_sso or proxied or not is_loopback(host):
            raise HTTPException(status.HTTP_403_FORBIDDEN, "Sign in with Google")
        return start_session(User(email=settings.owner_email, name="Local"))

    @app.post("/api/auth/google")
    async def google_login(body: GoogleLogin) -> dict:
        try:
            user = await verify_google_credential(settings, body.credential)
        except AuthError as exc:
            raise HTTPException(status.HTTP_401_UNAUTHORIZED, str(exc)) from exc
        return start_session(user)

    @app.post("/api/auth/refresh")
    async def refresh(body: RefreshRequest) -> dict:
        row = store.use_refresh_token(hash_token(body.refresh_token), "user")
        if row is None:
            raise HTTPException(status.HTTP_401_UNAUTHORIZED, "Sign in again")
        email = row["user_email"]
        if settings.allowed_emails and email not in settings.allowed_emails and email != settings.owner_email:
            store.delete_refresh_token(row["token_hash"])
            raise HTTPException(status.HTTP_401_UNAUTHORIZED, "This account is no longer allowed")
        return {"token": issue_token(settings, User(email=email, name=row["name"])), "email": email}

    @app.post("/api/auth/logout")
    async def logout(body: RefreshRequest) -> dict:
        return {"revoked": store.delete_refresh_token(hash_token(body.refresh_token))}

    @app.get("/api/me")
    async def me(user: User = Depends(current_user)) -> dict:
        return {"email": user.email, "name": user.name}

    # Data

    @app.get("/api/projects")
    async def projects(user: User = Depends(current_user)) -> dict:
        if isinstance(chat, RelayService):
            # Project folders live on the laptop; the hub only knows the active one's name.
            return {"projects": [], "active": store.remote_project(user.email)}
        active = store.active_project(user.email)
        return {"projects": store.list_projects(), "active": active["name"] if active else None}

    @app.get("/api/session")
    async def session(user: User = Depends(current_user)) -> dict:
        return chat.snapshot(user.email)

    @app.get("/api/sessions")
    async def sessions(user: User = Depends(current_user)) -> dict:
        """Recent conversations for the switcher; source 'mcp' marks ones Claude Code started."""
        return {"sessions": store.list_sessions(user.email)}

    @app.post("/api/messages", status_code=status.HTTP_202_ACCEPTED)
    async def post_message(body: SendMessage, user: User = Depends(current_user)) -> dict:
        task = await chat.submit(user.email, body.text)
        return {"accepted": task is not None}

    @app.get("/api/stats")
    async def stats(user: User = Depends(current_user)) -> dict:
        return {"executors": store.executor_stats()}

    @app.post("/api/agent-token")
    async def agent_token(request: Request, user: User = Depends(current_user)) -> dict:
        """Long-lived token that lets the user's laptop agent connect to this hub."""
        if not settings.is_hub:
            raise HTTPException(status.HTTP_404_NOT_FOUND, "Only the hub accepts laptop agents")
        proto = request.headers.get("x-forwarded-proto", request.url.scheme)
        host = request.headers.get("host", request.url.netloc)
        raw, digest = new_refresh_token()
        store.add_refresh_token(digest, user.email, "agent", name="laptop")
        return {
            "token": raw,
            "hub_url": f"{'wss' if proto == 'https' else 'ws'}://{host}/agent",
        }

    @app.post("/api/mcp-token")
    async def mcp_token(user: User = Depends(current_user)) -> dict:
        """Long-lived bearer token for remote MCP clients (Dispatch, cloud sessions)."""
        if not settings.is_hub:
            raise HTTPException(status.HTTP_404_NOT_FOUND, "Only the hub relays MCP; use `doaide-code mcp` locally")
        raw, digest = new_refresh_token()
        store.add_refresh_token(digest, user.email, "mcp", name="mcp")
        return {"token": raw, "endpoint": "/api/v1/mcp/relay"}

    # Files (read-only) and laptop settings

    async def browse(user: User, method: str, rel: str) -> dict:
        if isinstance(chat, RelayService):
            try:
                answer = await chat.rpc(user.email, method, {"path": rel})
            except LaptopOffline as exc:
                raise HTTPException(status.HTTP_503_SERVICE_UNAVAILABLE, "Your laptop is offline") from exc
            if "error" in answer:
                raise HTTPException(int(answer.get("status") or 400), str(answer["error"]))
            return answer.get("result") or {}
        root, label = working_root(store, user.email, settings.workspace)
        try:
            result = (list_dir if method == "list_files" else read_file)(root, rel)
        except FileAccessError as exc:
            raise HTTPException(exc.status, str(exc)) from exc
        return {**result, "root": label}

    @app.get("/api/files")
    async def files(path: str = "", user: User = Depends(current_user)) -> dict:
        return await browse(user, "list_files", path)

    @app.get("/api/file")
    async def file(path: str, user: User = Depends(current_user)) -> dict:
        return await browse(user, "read_file", path)

    @app.get("/api/settings")
    async def get_settings(user: User = Depends(current_user)) -> dict:
        if settings.is_hub:
            raise HTTPException(status.HTTP_404_NOT_FOUND, "Settings live on the laptop; use /workspace in chat")
        return {"workspace": str(workspace_path(store, settings.workspace)), "default_workspace": settings.workspace}

    @app.put("/api/settings")
    async def put_settings(body: SettingsUpdate, user: User = Depends(current_user)) -> dict:
        if settings.is_hub:
            raise HTTPException(status.HTTP_404_NOT_FOUND, "Settings live on the laptop; use /workspace in chat")
        try:
            set_workspace(store, body.workspace)
        except ValueError as exc:
            raise HTTPException(status.HTTP_400_BAD_REQUEST, str(exc)) from exc
        return {"workspace": str(workspace_path(store, settings.workspace)), "default_workspace": settings.workspace}

    # WebSockets

    async def accept(ws: WebSocket, scope: str = "user") -> User | None:
        try:
            user = verify_token(settings, ws.query_params.get("token"), scope)
        except AuthError:
            await ws.close(code=WS_UNAUTHORIZED)
            return None
        await ws.accept()
        return user

    @app.websocket("/ws")
    async def chat_socket(ws: WebSocket) -> None:
        """Full chat: send messages, stop generation, and receive every event."""
        user = await accept(ws)
        if user is None:
            return
        await hub.join(user.email, ws)
        try:
            await ws.send_json(chat.snapshot(user.email))
            while True:
                data = await ws.receive_json()
                kind = data.get("type") if isinstance(data, dict) else None
                if kind == "send" and isinstance(data.get("text"), str):
                    await chat.submit(user.email, data["text"][:100_000])
                elif kind == "stop":
                    await chat.stop(user.email)
                elif kind == "open" and isinstance(data.get("session_id"), str):
                    await chat.open_session(user.email, data["session_id"])
                elif kind == "ping":
                    await ws.send_json({"type": "pong"})
        except (WebSocketDisconnect, RuntimeError, ValueError):
            pass
        finally:
            await hub.leave(user.email, ws)

    @app.websocket("/sync")
    async def sync_socket(ws: WebSocket) -> None:
        """Read-only relay for other devices: snapshot on connect, then live events."""
        user = await accept(ws)
        if user is None:
            return
        await hub.join(user.email, ws)
        try:
            await ws.send_json(chat.snapshot(user.email))
            while True:
                data = await ws.receive_json()
                if isinstance(data, dict) and data.get("type") == "ping":
                    await ws.send_json({"type": "pong"})
        except (WebSocketDisconnect, RuntimeError, ValueError):
            pass
        finally:
            await hub.leave(user.email, ws)

    if isinstance(chat, RelayService):
        relay = chat

        @app.websocket("/agent")
        async def agent_socket(ws: WebSocket) -> None:
            """The user's laptop: receives queued jobs and streams results back."""
            # Laptop tokens are never-expiring refresh tokens with the agent scope.
            row = store.use_refresh_token(hash_token(ws.query_params.get("token") or ""), "agent")
            if row is None:
                await ws.close(code=WS_UNAUTHORIZED)
                return
            await ws.accept()
            user = User(email=row["user_email"], scope="agent")
            await relay.attach_agent(user.email, ws)
            try:
                while True:
                    data = await ws.receive_json()
                    if isinstance(data, dict):
                        if data.get("type") == "ping":
                            await ws.send_json({"type": "pong"})
                        else:
                            await relay.on_agent_event(user.email, data)
            except (WebSocketDisconnect, RuntimeError, ValueError):
                pass
            finally:
                # Shielded so the running prompt is failed and devices told even if this
                # handler is being cancelled (server shutdown, client teardown).
                await asyncio.shield(relay.detach_agent(user.email, ws))

        def mcp_user(request: Request) -> User:
            """A browser access token, or a never-expiring token from /api/mcp-token."""
            raw = bearer(request.headers.get("authorization"))
            try:
                return verify_token(settings, raw)
            except AuthError:
                pass
            row = store.use_refresh_token(hash_token(raw), "mcp") if raw else None
            if row is None:
                raise HTTPException(
                    status.HTTP_401_UNAUTHORIZED, "Invalid MCP token", headers={"WWW-Authenticate": "Bearer"}
                )
            return User(email=row["user_email"], scope="mcp")

        @app.post("/api/v1/mcp/relay")
        async def mcp_relay(request: Request, user: User = Depends(mcp_user)) -> Response:
            """Stateless MCP (Streamable HTTP, JSON responses) relayed to the user's laptop agent."""

            def rpc_error(code: int, text: str, http: int = 200, request_id=None) -> JSONResponse:
                body = {"jsonrpc": "2.0", "id": request_id, "error": {"code": code, "message": text}}
                return JSONResponse(body, status_code=http)

            raw = await request.body()
            if len(raw) > MCP_RELAY_MAX_BYTES:
                return rpc_error(-32600, "Request too large", status.HTTP_413_CONTENT_TOO_LARGE)
            try:
                message = json.loads(raw)
            except ValueError:
                return rpc_error(-32700, "Parse error", status.HTTP_400_BAD_REQUEST)
            valid = isinstance(message, dict) and message.get("jsonrpc") == "2.0"
            if not valid or not isinstance(message.get("method"), str):
                return rpc_error(-32600, "Invalid JSON-RPC request", status.HTTP_400_BAD_REQUEST)
            if "id" not in message:
                # Notifications (initialized, cancelled) need no answer from the laptop.
                return Response(status_code=status.HTTP_202_ACCEPTED)
            params = message.get("params") if isinstance(message.get("params"), dict) else {}
            reply_id = None
            if message["method"] == "tools/call" and isinstance(params.get("name"), str) and relay.agent_online(user.email):
                # Shown live on every device: what the client asked for and what the laptop did.
                arguments = params.get("arguments") if isinstance(params.get("arguments"), dict) else {}
                reply_id = await relay.begin_mcp_call(user.email, params["name"], arguments)
            try:
                answer = await relay.rpc(
                    user.email, "mcp", {"message": message, "reply_id": reply_id}, timeout=MCP_RELAY_TIMEOUT
                )
            except LaptopOffline:
                if reply_id is not None:
                    await relay.end_mcp_call(user.email, reply_id, None)
                return rpc_error(-32000, "Your laptop is offline", status.HTTP_503_SERVICE_UNAVAILABLE, message["id"])
            if reply_id is not None:
                result = answer.get("result")
                response = result if isinstance(result, dict) else {"error": {"message": answer.get("error")}}
                await relay.end_mcp_call(user.email, reply_id, response)
            if not isinstance(answer.get("result"), dict):
                return rpc_error(-32603, str(answer.get("error") or "Laptop gave no answer"), request_id=message["id"])
            return JSONResponse(answer["result"])

    mount_frontend(app, settings.frontend_dist)
    return app


def mount_frontend(app: FastAPI, dist: Path) -> None:
    index = dist / "index.html"
    if not index.is_file():
        log.warning("Frontend build not found at %s; run `npm run build` in frontend/", dist)
        return
    if (dist / "assets").is_dir():
        app.mount("/assets", StaticFiles(directory=dist / "assets"), name="assets")

    @app.get("/{path:path}", include_in_schema=False)
    async def spa(path: str) -> FileResponse:
        if path.startswith(("api/", "ws", "sync", "agent")):
            raise HTTPException(status.HTTP_404_NOT_FOUND)
        candidate = (dist / path).resolve()
        if path and candidate.is_file() and candidate.is_relative_to(dist.resolve()):
            return FileResponse(candidate)
        return FileResponse(index)


def run() -> None:
    import sys

    import uvicorn

    # Logs go to stderr; in `mcp` mode stdout carries the MCP protocol.
    logging.basicConfig(level=logging.INFO, stream=sys.stderr)
    settings = Settings()
    if sys.argv[1:2] == ["mcp"]:
        from .mcp_server import run_mcp

        run_mcp(settings)
        return
    if sys.argv[1:2] == ["agent"]:
        from .agent import run_agent

        run_agent(settings)
        return
    uvicorn.run(create_app(settings), host=settings.host, port=settings.port)


if __name__ == "__main__":
    run()
