"""Hub mode: the server stores the conversation and relays prompts to the user's laptop agent.

No model runs here. A prompt from any device becomes a queued assistant reply plus a row
in `pending_jobs`; when the laptop agent is connected it receives one job at a time over
`/agent` and streams `delta` / `done` events back, which fan out to every device.

MCP tool calls relayed for a remote client (Claude Code, Dispatch) are recorded too: each
call becomes an instruction plus a reply in a "Claude Code" conversation, and the laptop
streams execute_code progress into that reply, so every device sees what was asked and done.
"""

from __future__ import annotations

import asyncio
import contextlib
import json
import logging
import uuid
from typing import Any, Protocol

from .chat import HISTORY_TURNS, public_message
from .commands import is_command, is_models_command
from .db import Store
from .sync import SyncHub

log = logging.getLogger(__name__)

FINAL_STATUSES = {"done", "error", "stopped"}
# Reply extras the laptop may attach (token usage, proposed changes), and a size cap for them.
META_KEYS = {"usage", "changes", "route", "checks"}
MAX_META_BYTES = 512_000


def clean_meta(value: Any) -> dict[str, Any]:
    """Keep only known, dict-valued meta keys from the laptop, within the size cap."""
    if not isinstance(value, dict):
        return {}
    meta = {k: v for k, v in value.items() if k in META_KEYS and isinstance(v, dict)}
    return meta if len(json.dumps(meta)) <= MAX_META_BYTES else {}
DISCONNECTED = "[laptop disconnected before finishing]"
# The laptop's model report (a few tools and their model names) is small; cap what is kept.
MAX_MODELS_BYTES = 64_000
LAPTOP_OFFLINE_MODELS = (
    "Your laptop is offline, so its models cannot be detected. Models run on the laptop: start the "
    "DoAide agent there (Set up laptop), then type /models again."
)
# Characters of a tool's output kept in the conversation.
MAX_TOOL_OUTPUT = 20_000


def describe_call(name: str, arguments: dict[str, Any]) -> str:
    """The instruction an MCP client gave, as shown in the conversation."""
    def arg(key: str) -> str:
        return str(arguments.get(key) or "")

    project = f" (project {arg('project')})" if arguments.get("project") else ""
    if name == "execute_code":
        return arg("prompt") + project
    if name == "run_command":
        cwd = f" in {arg('cwd')}" if arguments.get("cwd") else ""
        return f"$ {arg('command')}{cwd}{project}"
    if name in {"read_file", "write_file", "edit_file"}:
        verb = {"read_file": "Read", "write_file": "Write", "edit_file": "Edit"}[name]
        return f"{verb} {arg('path')}{project}"
    if name == "list_files":
        return f"List {arg('path') or '.'}{project}"
    if name == "search_code":
        return f"Search for {arg('pattern')!r}{project}"
    if name in {"apply_changes", "discard_changes"}:
        verb = "Apply" if name == "apply_changes" else "Discard"
        return f"{verb} changes {arg('changeset_id') or '(latest)'}"
    return name.replace("_", " ").capitalize()


def tool_reply(response: dict[str, Any]) -> tuple[str, str, dict[str, Any]]:
    """(content, status, meta) for the reply to one relayed tools/call response."""
    if not isinstance(response.get("result"), dict):
        error = response.get("error") if isinstance(response.get("error"), dict) else {}
        return str(error.get("message") or "Laptop gave no answer"), "error", {}
    result = response["result"]
    structured = result.get("structuredContent") if isinstance(result.get("structuredContent"), dict) else {}
    texts = [b.get("text", "") for b in result.get("content") or [] if isinstance(b, dict) and b.get("type") == "text"]
    content = structured["answer"] if isinstance(structured.get("answer"), str) else "\n".join(texts)
    if len(content) > MAX_TOOL_OUTPUT:
        content = content[:MAX_TOOL_OUTPUT] + "\n[output truncated]"
    return content, "error" if result.get("isError") else "done", clean_meta(structured)


class LaptopOffline(Exception):
    pass


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
        # Each connected laptop's detected models (see detect.py); never produced by a model.
        self._models: dict[str, dict[str, Any]] = {}
        self._running: dict[str, str] = {}
        self._partial: dict[str, str] = {}
        self._error: dict[str, bool] = {}
        self._rpc: dict[str, tuple[str, asyncio.Future]] = {}
        # MCP tool-call replies being streamed: reply id -> owner.
        self._mcp_replies: dict[str, str] = {}

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
            "models": self._models.get(user_email),
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

        # Model detection runs on the laptop; while it is offline there is nothing to detect.
        if is_models_command(text) and not self.agent_online(user_email):
            reply = self.store.add_message(session["id"], "system", LAPTOP_OFFLINE_MODELS)
            await self.hub.publish(user_email, {"type": "message", "message": public_message(reply)})
            return None
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

    async def rpc(self, user_email: str, method: str, params: dict[str, Any], timeout: float = 10) -> dict[str, Any]:
        """Ask the laptop a question (file listing, file contents) and wait for its answer."""
        agent = self._agents.get(user_email)
        if agent is None:
            raise LaptopOffline
        request_id = uuid.uuid4().hex
        future: asyncio.Future = asyncio.get_running_loop().create_future()
        self._rpc[request_id] = (user_email, future)
        try:
            await agent.send_json({"type": "rpc", "id": request_id, "method": method, "params": params})
            return await asyncio.wait_for(future, timeout)
        except (asyncio.TimeoutError, ConnectionError, RuntimeError) as exc:
            raise LaptopOffline from exc
        finally:
            self._rpc.pop(request_id, None)

    # MCP tool calls from remote clients

    async def begin_mcp_call(self, user_email: str, name: str, arguments: dict[str, Any]) -> str:
        """Record a relayed tool call as instruction + reply in the user's one conversation
        (labelled as from Claude Code); returns the reply id to stream into."""
        session = self.current_session(user_email)
        meta = {"via": "mcp", "tool": name}
        user_msg = self.store.add_message(session["id"], "user", describe_call(name, arguments), meta=meta)
        reply = self.store.add_message(session["id"], "assistant", "", status="streaming", meta=meta)
        self._mcp_replies[reply["id"]] = user_email
        for message in (user_msg, reply):
            await self.hub.publish(user_email, {"type": "message", "message": public_message(message)})
        return reply["id"]

    async def end_mcp_call(self, user_email: str, reply_id: str, response: dict[str, Any] | None) -> None:
        self._mcp_replies.pop(reply_id, None)
        content, status, meta = tool_reply(response) if response is not None else ("Your laptop is offline", "error", {})
        self.store.finish_message(reply_id, content, status, meta=meta)
        done = {"type": "done", "id": reply_id, "status": status, "content": content}
        await self.hub.publish(user_email, {**done, "meta": self.store.update_meta(reply_id, {})})

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
        self._models.pop(user_email, None)
        for owner, future in list(self._rpc.values()):
            if owner == user_email and not future.done():
                future.set_exception(LaptopOffline())
        running = self._running.pop(user_email, None)
        if running is not None:
            partial = self._partial.pop(user_email, "")
            content = f"{partial}\n\n{DISCONNECTED}" if partial else DISCONNECTED
            await self._finish(user_email, running, content, "error", "assistant")
        await self.hub.publish(user_email, {"type": "agent", "online": False})
        await self._publish_status(user_email)

    async def _set_models(self, user_email: str, models: Any) -> None:
        if not isinstance(models, dict) or not isinstance(models.get("tools"), list):
            return
        if len(json.dumps(models)) > MAX_MODELS_BYTES:
            return
        self._models[user_email] = models
        await self.hub.publish(user_email, {"type": "models", "models": models})

    async def on_agent_event(self, user_email: str, event: dict[str, Any]) -> None:
        kind = event.get("type")
        if kind == "hello":
            project = event.get("project")
            self._executors[user_email] = [str(e) for e in event.get("executors") or []]
            await self._set_models(user_email, event.get("models"))
            await self._set_project(user_email, project if isinstance(project, str) else None)
            return
        if kind == "models":
            await self._set_models(user_email, event.get("models"))
            return
        if kind == "project":
            project = event.get("project")
            await self._set_project(user_email, project if isinstance(project, str) else None)
            return
        if kind == "changes":
            await self._update_changes(user_email, event)
            return
        if kind == "mcp_delta":
            reply_id = str(event.get("id"))
            if self._mcp_replies.get(reply_id) == user_email and isinstance(event.get("text"), str):
                await self.hub.publish(user_email, {"type": "delta", "id": reply_id, "text": event["text"]})
            return
        if kind == "rpc_result":
            entry = self._rpc.get(str(event.get("id")))
            if entry is not None and entry[0] == user_email and not entry[1].done():
                entry[1].set_result(event)
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
            await self._finish(user_email, job_id, content, status, role, clean_meta(event.get("meta")))
            await self._dispatch(user_email)
            await self._publish_status(user_email)

    # Internals

    async def _update_changes(self, user_email: str, event: dict[str, Any]) -> None:
        """The laptop applied or discarded a changeset: update that reply on every device."""
        message = self.store.get_message(str(event.get("id")))
        session = self.store.get_session(message["session_id"]) if message else None
        meta = clean_meta({"changes": event.get("changes")})
        if not session or session["user_email"] != user_email or not meta:
            return
        self.store.update_meta(message["id"], meta)
        await self.hub.publish(user_email, {"type": "changes", "id": message["id"], "changes": meta["changes"]})

    async def _set_project(self, user_email: str, project: str | None) -> None:
        self.store.set_remote_project(user_email, project)
        await self.hub.publish(user_email, {"type": "project", "project": project})

    async def _finish(
        self, user_email: str, job_id: str, content: str, status: str, role: str, meta: dict[str, Any] | None = None
    ) -> None:
        self.store.delete_job(job_id)
        self.store.finish_message(job_id, content, status, meta=meta)
        if role != "assistant":
            self.store.set_message_role(job_id, role)
        self._error[user_email] = status == "error"
        done = {"type": "done", "id": job_id, "status": status, "content": content, "role": role}
        await self.hub.publish(user_email, {**done, "meta": meta} if meta else done)

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
                {
                    "type": "job",
                    "id": job["id"],
                    "text": job["text"],
                    "history": history[-HISTORY_TURNS:],
                }
            )
        except Exception:
            log.warning("could not reach laptop agent for %s", user_email)
            await self.detach_agent(user_email, agent)
