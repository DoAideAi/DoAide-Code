"""Chat orchestration: commands, routing, executor fallback, persistence, and fan-out."""

from __future__ import annotations

import asyncio
import contextlib
import logging
import time
import uuid
from pathlib import Path
from typing import Any

from .commands import is_command, run_command
from .db import Store
from .executors import ExecutorError, Job, Turn
from .gemini import GeminiClient, GeminiError
from .router import RouterBrain
from .sync import SyncHub

log = logging.getLogger(__name__)

HISTORY_TURNS = 12


def public_message(row: dict[str, Any]) -> dict[str, Any]:
    """Fields the UI needs; model names and tiers stay server-side."""
    return {k: row[k] for k in ("id", "role", "content", "status", "created_at")}


class ChatService:
    def __init__(self, store: Store, router: RouterBrain, hub: SyncHub, gemini: GeminiClient | None = None):
        self.store = store
        self.router = router
        self.hub = hub
        self.gemini = gemini
        self._tasks: dict[str, asyncio.Task] = {}
        self._error: dict[str, bool] = {}
        self._background: set[asyncio.Task] = set()

    # Session and snapshot

    def current_session(self, user_email: str) -> dict[str, Any]:
        session = self.store.latest_session(user_email)
        if session is None:
            project = self.store.active_project(user_email)
            session = self.store.create_session(user_email, project["id"] if project else None)
        return session

    def status(self, user_email: str) -> str:
        task = self._tasks.get(user_email)
        if task is not None and not task.done():
            return "busy"
        return "error" if self._error.get(user_email) else "idle"

    def snapshot(self, user_email: str) -> dict[str, Any]:
        session = self.current_session(user_email)
        project = self.store.active_project(user_email)
        return {
            "type": "snapshot",
            "session_id": session["id"],
            "project": project["name"] if project else None,
            "status": self.status(user_email),
            "messages": [public_message(m) for m in self.store.list_messages(session["id"])],
        }

    async def _status(self, user_email: str) -> None:
        await self.hub.publish(user_email, {"type": "status", "state": self.status(user_email)})

    # Entry points

    async def submit(self, user_email: str, text: str) -> asyncio.Task | None:
        text = text.strip()
        if not text:
            return None
        running = self._tasks.get(user_email)
        if running is not None and not running.done():
            await self.hub.publish(user_email, {"type": "notice", "text": "Still working on the previous message."})
            return None
        task = asyncio.create_task(self._handle(user_email, text))
        self._tasks[user_email] = task
        return task

    async def stop(self, user_email: str) -> None:
        task = self._tasks.get(user_email)
        if task is not None and not task.done():
            task.cancel()
            with contextlib.suppress(asyncio.CancelledError):
                await task

    # Internals

    async def _handle(self, user_email: str, text: str) -> None:
        session = self.current_session(user_email)
        user_msg = self.store.add_message(session["id"], "user", text)
        await self.hub.publish(user_email, {"type": "message", "message": public_message(user_msg)})

        if is_command(text):
            result = run_command(self.store, user_email, text)
            if result.new_session:
                project = self.store.active_project(user_email)
                self.store.create_session(user_email, project["id"] if project else None)
                await self.hub.publish(user_email, self.snapshot(user_email))
                return
            reply = self.store.add_message(session["id"], "system", result.text)
            await self.hub.publish(user_email, {"type": "message", "message": public_message(reply)})
            if result.project_changed:
                project = self.store.active_project(user_email)
                self.store.update_session(session["id"], project_id=project["id"] if project else None)
                await self.hub.publish(user_email, {"type": "project", "project": project["name"] if project else None})
            return

        if session["title"] is None:
            title_task = asyncio.create_task(self._title_session(session["id"], text))
            self._background.add(title_task)
            title_task.add_done_callback(self._background.discard)
        await self._answer(user_email, session["id"], text, user_msg["id"])

    async def _answer(self, user_email: str, session_id: str, text: str, user_msg_id: str) -> None:
        project = self.store.active_project(user_email)
        cwd = Path(project["path"]) if project and Path(project["path"]).is_dir() else None
        history = [
            Turn("assistant" if m["role"] == "assistant" else "user", m["content"])
            for m in self.store.list_messages(session_id, HISTORY_TURNS + 1)
            if m["id"] != user_msg_id and m["role"] in {"user", "assistant"} and m["status"] == "done"
        ]
        job = Job(prompt=text, history=history[-HISTORY_TURNS:], cwd=cwd)

        reply_id = uuid.uuid4().hex
        reply = self.store.add_message(session_id, "assistant", "", status="streaming", message_id=reply_id)
        await self.hub.publish(user_email, {"type": "message", "message": public_message(reply)})
        await self._status(user_email)

        content, status, used = "", "error", None
        try:
            decision = await self.router.classify(text, project=project["name"] if project else None)
            self.store.set_message_tier(reply_id, decision.tier)
            candidates = await self.router.candidates(decision.tier)
            if not candidates:
                content = "No executor is available. Start Ollama or sign in to the Claude or Codex CLI."
            errors: list[str] = []
            for executor in candidates:
                started = time.monotonic()
                produced = False
                try:
                    async for chunk in executor.stream(job):
                        produced = True
                        content += chunk
                        await self.hub.publish(user_email, {"type": "delta", "id": reply_id, "text": chunk})
                except ExecutorError as exc:
                    self.store.record_executor(executor.name, ok=False, elapsed_ms=_ms(started))
                    log.warning("%s failed: %s", executor.name, exc)
                    errors.append(f"{executor.name}: {exc}")
                    if produced:
                        content += f"\n\n[stopped: {exc}]"
                        used = executor.name
                        break
                    continue
                self.store.record_executor(executor.name, ok=True, elapsed_ms=_ms(started))
                used, status = executor.name, "done"
                break
            if status != "done" and not content and errors:
                content = "All executors failed.\n" + "\n".join(errors)
        except asyncio.CancelledError:
            status = "stopped"
            raise
        finally:
            self._error[user_email] = status == "error"
            self.store.finish_message(reply_id, content, status, executor=used)
            if self._tasks.get(user_email) is asyncio.current_task():
                del self._tasks[user_email]
            await self.hub.publish(user_email, {"type": "done", "id": reply_id, "status": status, "content": content})
            await self._status(user_email)

    async def _title_session(self, session_id: str, text: str) -> None:
        if self.gemini is None or not self.gemini.enabled:
            title = text[:60]
        else:
            try:
                title = (
                    await self.gemini.generate(
                        f"Write a 3-6 word title for a coding chat that starts with this message. "
                        f"Reply with the title only.\n\n{text[:2000]}",
                        timeout=8,
                    )
                ).strip().strip('"')[:80] or text[:60]
            except GeminiError:
                title = text[:60]
        self.store.update_session(session_id, title=title)


def _ms(started: float) -> int:
    return int((time.monotonic() - started) * 1000)
