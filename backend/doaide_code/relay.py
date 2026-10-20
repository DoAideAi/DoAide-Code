"""Hub mode: the server stores the conversation and relays prompts to the user's laptop agent.

No model runs here. A prompt from any device becomes a queued assistant reply plus a row
in `pending_jobs`; when the laptop agent is connected it receives one job at a time over
`/agent` and streams `delta` / `done` events back, which fan out to every device.
"""

from __future__ import annotations

import contextlib
import logging
import uuid
from typing import Any, Protocol

from .chat import HISTORY_TURNS, public_message
from .commands import is_command
from .db import Store
from .sync import SyncHub

log = logging.getLogger(__name__)

FINAL_STATUSES = {"done", "error", "stopped"}
DISCONNECTED = "[laptop disconnected before finishing]"


class AgentSocket(Protocol):
    async def send_json(self, data: Any) -> None: ...

    async def close(self, code: int = 1000) -> None: ...


class RelayService:
    """Same entry points as ChatService (snapshot, submit, stop, status), backed by a laptop."""

    def __init__(self, store: Store, hub: SyncHub):
        self.store = store
        self.hub = hub
        self._agents: dict[str, AgentSocket] = {}
        self._executors: dict[str, list[str]] = {}
        self._running: dict[str, str] = {}
        self._partial: dict[str, str] = {}
        self._error: dict[str, bool] = {}

    # Session and snapshot

    def current_session(self, user_email: str) -> dict[str, Any]:
        return self.store.latest_session(user_email) or self.store.create_session(user_email)

    def agent_online(self, user_email: str) -> bool:
        return user_email in self._agents

    def status(self, user_email: str) -> str:
        if user_email in self._running or self.store.next_job(user_email):
            return "busy"
        return "error" if self._error.get(user_email) else "idle"

    def snapshot(self, user_email: str) -> dict[str, Any]:
        session = self.current_session(user_email)
        return {
            "type": "snapshot",
            "session_id": session["id"],
            "project": self.store.remote_project(user_email),
            "status": self.status(user_email),
            "mode": "hub",
            "agent_online": self.agent_online(user_email),
            "messages": [public_message(m) for m in self.store.list_messages(session["id"])],
        }

    async def _publish_status(self, user_email: str) -> None:
        await self.hub.publish(user_email, {"type": "status", "state": self.status(user_email)})

    async def _publish_message(self, user_email: str, message_id: str) -> None:
        message = self.store.get_message(message_id)
        if message is not None:
            await self.hub.publish(user_email, {"type": "message", "message": public_message(message)})

    # Browser entry points

    async def submit(self, user_email: str, text: str) -> str | None:
        """Queue a prompt for the laptop. Returns the id of the reply that will hold the answer."""
        text = text.strip()
        if not text:
            return None
        if self.status(user_email) == "busy":
            await self.hub.publish(user_email, {"type": "notice", "text": "Still working on the previous message."})
            return None
        session = self.current_session(user_email)
        user_msg = self.store.add_message(session["id"], "user", text)
        await self.hub.publish(user_email, {"type": "message", "message": public_message(user_msg)})

        # Sessions live on the hub, so /new is handled here rather than on the laptop.
        if is_command(text) and text.split()[0].lower() == "/new":
            self.store.create_session(user_email)
            await self.hub.publish(user_email, self.snapshot(user_email))
            return None
        if session["title"] is None and not is_command(text):
            self.store.update_session(session["id"], title=text[:60])

        reply_id = uuid.uuid4().hex
        self.store.add_message(session["id"], "assistant", "", status="queued", message_id=reply_id)
        self.store.add_job(reply_id, user_email, session["id"], text)
        await self._publish_message(user_email, reply_id)
        self._error[user_email] = False
        await self._dispatch(user_email)
        await self._publish_status(user_email)
        return reply_id

    async def stop(self, user_email: str) -> None:
        """Cancel queued prompts here; ask the laptop to stop the one it is running."""
        running = self._running.get(user_email)
        for job in self.store.list_jobs(user_email):
            if job["id"] == running:
                continue
            self.store.delete_job(job["id"])
            self.store.finish_message(job["id"], "", "stopped")
            await self.hub.publish(user_email, {"type": "done", "id": job["id"], "status": "stopped", "content": ""})
        agent = self._agents.get(user_email)
        if running and agent is not None:
            with contextlib.suppress(Exception):
                await agent.send_json({"type": "stop", "id": running})
        await self._publish_status(user_email)

    # Laptop agent

    async def attach_agent(self, user_email: str, socket: AgentSocket) -> None:
        previous = self._agents.get(user_email)
        self._agents[user_email] = socket
        if previous is not None and previous is not socket:
            # Newest laptop wins; whatever the old one was running is re-sent below.
            self._running.pop(user_email, None)
            self._partial.pop(user_email, None)
            with contextlib.suppress(Exception):
                await previous.close(code=4000)
        await self.hub.publish(user_email, {"type": "agent", "online": True})
        await self._dispatch(user_email)
        await self._publish_status(user_email)

    async def detach_agent(self, user_email: str, socket: AgentSocket) -> None:
        if self._agents.get(user_email) is not socket:
            return
        del self._agents[user_email]
        self._executors.pop(user_email, None)
        running = self._running.pop(user_email, None)
        if running is not None:
            partial = self._partial.pop(user_email, "")
            content = f"{partial}\n\n{DISCONNECTED}" if partial else DISCONNECTED
            await self._finish(user_email, running, content, "error", "assistant")
        await self.hub.publish(user_email, {"type": "agent", "online": False})
        await self._publish_status(user_email)

    async def on_agent_event(self, user_email: str, event: dict[str, Any]) -> None:
        kind = event.get("type")
        if kind == "hello":
            project = event.get("project")
            self._executors[user_email] = [str(e) for e in event.get("executors") or []]
            await self._set_project(user_email, project if isinstance(project, str) else None)
            return
        if kind == "project":
            project = event.get("project")
            await self._set_project(user_email, project if isinstance(project, str) else None)
            return
        job_id = event.get("id")
        if not job_id or self._running.get(user_email) != job_id:
            return  # stale event for a job this hub no longer considers running
        if kind == "delta" and isinstance(event.get("text"), str):
            self._partial[user_email] = self._partial.get(user_email, "") + event["text"]
            await self.hub.publish(user_email, {"type": "delta", "id": job_id, "text": event["text"]})
        elif kind == "done":
            status = str(event["status"]) if event.get("status") in FINAL_STATUSES else "error"
            content = event["content"] if isinstance(event.get("content"), str) else ""
            role = "system" if event.get("role") == "system" else "assistant"
            self._running.pop(user_email, None)
            self._partial.pop(user_email, None)
            await self._finish(user_email, job_id, content, status, role)
            await self._dispatch(user_email)
            await self._publish_status(user_email)

    # Internals

    async def _set_project(self, user_email: str, project: str | None) -> None:
        self.store.set_remote_project(user_email, project)
        await self.hub.publish(user_email, {"type": "project", "project": project})

    async def _finish(self, user_email: str, job_id: str, content: str, status: str, role: str) -> None:
        self.store.delete_job(job_id)
        self.store.finish_message(job_id, content, status)
        if role != "assistant":
            self.store.set_message_role(job_id, role)
        self._error[user_email] = status == "error"
        await self.hub.publish(
            user_email, {"type": "done", "id": job_id, "status": status, "content": content, "role": role}
        )

    async def _dispatch(self, user_email: str) -> None:
        """Send the oldest queued prompt to the laptop if it is connected and idle."""
        agent = self._agents.get(user_email)
        if agent is None or user_email in self._running:
            return
        job = self.store.next_job(user_email)
        if job is None:
            return
        history = [
            {"role": m["role"], "content": m["content"]}
            for m in self.store.list_messages(job["session_id"], HISTORY_TURNS * 2 + 2)
            if m["role"] in {"user", "assistant"} and m["status"] == "done" and m["id"] != job["id"]
        ]
        # The prompt itself is the newest user message; the laptop receives it separately.
        if history and history[-1]["role"] == "user" and history[-1]["content"] == job["text"]:
            history.pop()
        self._running[user_email] = job["id"]
        self._partial[user_email] = ""
        self.store.finish_message(job["id"], "", "streaming")
        await self._publish_message(user_email, job["id"])
        try:
            await agent.send_json(
                {"type": "job", "id": job["id"], "text": job["text"], "history": history[-HISTORY_TURNS:]}
            )
        except Exception:
            log.warning("could not reach laptop agent for %s", user_email)
            await self.detach_agent(user_email, agent)
