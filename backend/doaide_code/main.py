"""FastAPI harness server: REST, chat WebSocket (/ws), sync relay (/sync), and the built UI."""

from __future__ import annotations

import contextlib
import logging
from contextlib import asynccontextmanager
from pathlib import Path

from fastapi import Depends, FastAPI, HTTPException, Request, WebSocket, WebSocketDisconnect, status
from fastapi.responses import FileResponse
from fastapi.staticfiles import StaticFiles
from pydantic import BaseModel

from .auth import AuthError, User, bearer, is_loopback, issue_token, verify_google_credential, verify_token
from .chat import ChatService
from .config import Settings
from .db import Store
from .executors import Executor, JevExecutor, build_executors
from .gemini import GeminiClient
from .router import RouterBrain
from .sync import SyncHub

log = logging.getLogger("doaide_code")

WS_UNAUTHORIZED = 4401


class GoogleLogin(BaseModel):
    credential: str


class SendMessage(BaseModel):
    text: str


def create_app(settings: Settings | None = None, *, executors: list[Executor] | None = None) -> FastAPI:
    settings = settings or Settings()
    store = Store(settings.db_path)
    hub = SyncHub()
    gemini = GeminiClient(settings.gemini_api_key, settings.gemini_model)
    jev = JevExecutor(settings.typesafe_api_key)
    router = RouterBrain(
        executors if executors is not None else build_executors(settings),
        jev=jev,
        gemini=gemini,
        offline=settings.offline_router,
    )
    chat = ChatService(store, router, hub, gemini=None if settings.offline_router else gemini)

    @asynccontextmanager
    async def lifespan(_: FastAPI):
        yield
        with contextlib.suppress(Exception):
            await jev.aclose()
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

    # Health and auth

    @app.get("/api/health")
    async def health() -> dict:
        available = [e.name for e in router.executors if await e.available()]
        return {"ok": True, "executors": available}

    @app.get("/api/config")
    async def public_config() -> dict:
        return {"google_client_id": settings.google_client_id, "local_login": not settings.require_sso}

    @app.post("/api/auth/local")
    async def local_login(request: Request) -> dict:
        # Proxied requests arrive from loopback too, so any forwarding header disqualifies them.
        proxied = any(h in request.headers for h in ("x-forwarded-for", "x-real-ip", "forwarded"))
        host = request.client.host if request.client else None
        if settings.require_sso or proxied or not is_loopback(host):
            raise HTTPException(status.HTTP_403_FORBIDDEN, "Sign in with Google")
        user = User(email=settings.owner_email, name="Local")
        return {"token": issue_token(settings, user), "email": user.email}

    @app.post("/api/auth/google")
    async def google_login(body: GoogleLogin) -> dict:
        try:
            user = await verify_google_credential(settings, body.credential)
        except AuthError as exc:
            raise HTTPException(status.HTTP_401_UNAUTHORIZED, str(exc)) from exc
        return {"token": issue_token(settings, user), "email": user.email}

    @app.get("/api/me")
    async def me(user: User = Depends(current_user)) -> dict:
        return {"email": user.email, "name": user.name}

    # Data

    @app.get("/api/projects")
    async def projects(user: User = Depends(current_user)) -> dict:
        active = store.active_project(user.email)
        return {"projects": store.list_projects(), "active": active["name"] if active else None}

    @app.get("/api/session")
    async def session(user: User = Depends(current_user)) -> dict:
        return chat.snapshot(user.email)

    @app.post("/api/messages", status_code=status.HTTP_202_ACCEPTED)
    async def post_message(body: SendMessage, user: User = Depends(current_user)) -> dict:
        task = await chat.submit(user.email, body.text)
        return {"accepted": task is not None}

    @app.get("/api/stats")
    async def stats(user: User = Depends(current_user)) -> dict:
        return {"executors": store.executor_stats()}

    # WebSockets

    async def accept(ws: WebSocket) -> User | None:
        try:
            user = verify_token(settings, ws.query_params.get("token"))
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
        if path.startswith(("api/", "ws", "sync")):
            raise HTTPException(status.HTTP_404_NOT_FOUND)
        candidate = (dist / path).resolve()
        if path and candidate.is_file() and candidate.is_relative_to(dist.resolve()):
            return FileResponse(candidate)
        return FileResponse(index)


def run() -> None:
    import uvicorn

    logging.basicConfig(level=logging.INFO)
    settings = Settings()
    uvicorn.run(create_app(settings), host=settings.host, port=settings.port)


if __name__ == "__main__":
    run()
