"""Chat orchestration: commands, routing, executor fallback, persistence, and fan-out."""

from __future__ import annotations

import asyncio
import contextlib
import json
import uuid
from typing import Any

from .commands import is_command, is_models_command, run_command
from .detect import format_report
from .db import Store
from .executors import Job, Turn
from .router import RouterBrain
from .history import HISTORY_MESSAGES
from .runner import Outcome, run_job
from .sync import SyncHub, draft_event
from .workspace import DEFAULT_WORKSPACE, working_root

# Messages sent with each job; runner.py fits them to each model (history.py).
HISTORY_TURNS = HISTORY_MESSAGES
# Messages a snapshot (page load, session switch) sends: the latest few, not the whole chat.
SNAPSHOT_MESSAGES = 10


def public_message(row: dict[str, Any]) -> dict[str, Any]:
    """Fields the UI needs; model names and tiers stay server-side."""
    message = {k: row[k] for k in ("id", "role", "content", "status", "created_at")}
    if row.get("meta"):
        message["meta"] = json.loads(row["meta"])
    return message


class ChatService:
    def __init__(
        self,
        store: Store,
        router: RouterBrain,
        hub: SyncHub,
        *,
        workspace: str = DEFAULT_WORKSPACE,
    ):
        self.store = store
        self.workspace = workspace
        self.router = router
        self.hub = hub
        self._tasks: dict[str, asyncio.Task] = {}
        self._error: dict[str, bool] = {}

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
            "mode": "local",
            "messages": [public_message(m) for m in self.store.list_messages(session["id"], SNAPSHOT_MESSAGES)],
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

        if is_models_command(text):
            models = await self.router.models(force=True)
            reply = self.store.add_message(session["id"], "system", format_report(models))
            await self.hub.publish(user_email, {"type": "message", "message": public_message(reply)})
            await self.hub.publish(user_email, {"type": "models", "models": models})
            return

        if is_command(text):
            result = run_command(self.store, user_email, text, workspace=self.workspace)
            if result.new_session:
                project = self.store.active_project(user_email)
                self.store.create_session(user_email, project["id"] if project else None)
                await self.hub.publish(user_email, self.snapshot(user_email))
                return
            reply = self.store.add_message(session["id"], "system", result.text)
            await self.hub.publish(user_email, {"type": "message", "message": public_message(reply)})
            if result.changes and result.changes[0]:
                message_id, summary = result.changes
                self.store.update_meta(message_id, {"changes": summary})
                await self.hub.publish(user_email, {"type": "changes", "id": message_id, "changes": summary})
            if result.project_changed:
                project = self.store.active_project(user_email)
                self.store.update_session(session["id"], project_id=project["id"] if project else None)
                await self.hub.publish(user_email, {"type": "project", "project": project["name"] if project else None})
            return

        if session["title"] is None:
            self.store.update_session(session["id"], title=text[:60])
        await self._answer(user_email, session["id"], text, user_msg["id"])

    async def _answer(self, user_email: str, session_id: str, text: str, user_msg_id: str) -> None:
        project = self.store.active_project(user_email)
        cwd, _ = working_root(self.store, user_email, self.workspace)
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

        outcome = Outcome()

        async def on_delta(chunk: str) -> None:
            await self.hub.publish(user_email, {"type": "delta", "id": reply_id, "text": chunk})

        async def on_draft(chunk: str | None) -> None:
            await self.hub.publish(user_email, draft_event(reply_id, chunk))

        try:
            await run_job(
                self.router,
                self.store,
                job,
                outcome,
                on_delta,
                project=project["name"] if project else None,
                on_draft=on_draft,
            )
        except asyncio.CancelledError:
            outcome.status = "stopped"
            raise
        finally:
            self._error[user_email] = outcome.status == "error"
            if outcome.tier is not None:
                self.store.set_message_tier(reply_id, outcome.tier)
            meta = outcome.meta()
            if outcome.changes:
                self.store.link_changeset(outcome.changes["id"], reply_id)
            self.store.finish_message(reply_id, outcome.content, outcome.status, executor=outcome.executor, meta=meta)
            if self._tasks.get(user_email) is asyncio.current_task():
                del self._tasks[user_email]
            done = {"type": "done", "id": reply_id, "status": outcome.status, "content": outcome.content}
            await self.hub.publish(user_email, {**done, "meta": meta} if meta else done)
            await self._status(user_email)

