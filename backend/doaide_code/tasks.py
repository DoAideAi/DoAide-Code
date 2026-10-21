"""Tasks API: lets another agent (Dispatch in the Claude desktop app) hand DoAide a coding task.

POST /api/v1/tasks runs it through the chat's own pipeline (a free local model first, Claude
Sonnet when that answer fails its checks, Opus or Codex for complex work) in a registered project,
and returns the answer, the model behind it, what it cost and the files it changed. Edits are
written like chat edits: `/undo <changes.id>` in DoAide reverts them. With "stream": true the
reply is server-sent events: `delta` events with the answer's text as it is shown, then one
`done` event carrying the same result as the JSON reply.

Each task is also part of the user's one conversation, as relayed MCP calls are: the prompt
(labelled Dispatch) and the reply, streaming, published on the chat's sync hub. On the laptop
that is the agent's MirrorHub, so the local UI sees it at once and the hub (the phone) gets it
through the usual mirror. Usage is recorded with source "dispatch".
"""

from __future__ import annotations

import asyncio
import datetime
import json
import time
from collections.abc import AsyncIterator
from pathlib import Path
from typing import Any

from pydantic import BaseModel

from .chat import ChatService, public_message
from .db import Store
from .executors import Job
from .router import RouterBrain
from .runner import Outcome, run_job
from .workspace import working_root

SOURCE = "dispatch"
# On the task's messages: the UI labels them, and the hub keeps it when they are mirrored.
VIA = {"via": "dispatch"}


class TaskRequest(BaseModel):
    prompt: str
    # Either names a registered project; neither means the active project (else the workspace).
    project_path: str | None = None
    project: str | None = None
    stream: bool = False


class TaskError(ValueError):
    """A request DoAide cannot run (empty prompt, unknown project); reported as HTTP 400."""


def resolve_root(store: Store, owner: str, workspace: str, req: TaskRequest) -> tuple[Path, str]:
    """The folder the task runs in and its label. Only registered projects (or a folder inside
    one) are accepted: a caller cannot point DoAide's writes at an arbitrary path."""
    projects = store.list_projects()
    names = ", ".join(f"{p['name']} ({p['path']})" for p in projects) or "none"
    if req.project:
        row = store.get_project(req.project)
        if row is None:
            raise TaskError(f"No project named '{req.project}'. Registered projects: {names}")
        req = req.model_copy(update={"project_path": row["path"]})
    if not req.project_path:
        return working_root(store, owner, workspace)
    target = Path(req.project_path).expanduser().resolve()
    for p in projects:
        root = Path(p["path"]).resolve()
        if target == root or root in target.parents:
            if not target.is_dir():
                raise TaskError(f"Project folder is missing: {target}")
            return target, p["name"]
    raise TaskError(f"{target} is not in a registered project. Registered projects: {names}")


def result(outcome: Outcome, root: Path, label: str, seconds: float) -> dict[str, Any]:
    meta = outcome.meta()
    route = meta.get("route") or {}
    return {
        "status": outcome.status,
        "answer": outcome.content,
        "executor": outcome.executor,
        "model": route.get("model"),
        "free": bool(route.get("free")),
        # Set when the free local answer failed a check and the task went to a paid model.
        "escalated_from": route.get("escalated_from"),
        "cost_usd": (meta.get("usage") or {}).get("cost_usd", 0.0),
        "seconds": round(seconds, 2),
        "project": label,
        "root": str(root),
        "usage": meta.get("usage"),
        "route": route or None,
        "checks": (meta.get("checks") or {}).get("items", []),
        "changes": meta.get("changes"),
    }


_METRICS_FILE = Path.home() / ".doaide-code" / "metrics.jsonl"


def _log_metric(res: dict) -> None:
    _METRICS_FILE.parent.mkdir(parents=True, exist_ok=True)
    row = {
        "ts": datetime.datetime.now(datetime.timezone.utc).isoformat(),
        "model": res.get("model"),
        "executor": res.get("executor"),
        "cost_usd": res.get("cost_usd"),
        "seconds": res.get("seconds"),
        "pass": res.get("status") == "done",
        "project": res.get("project"),
    }
    with _METRICS_FILE.open("a") as fh:
        fh.write(json.dumps(row) + "\n")


async def run_task(
    router: RouterBrain,
    store: Store,
    root: Path,
    label: str,
    prompt: str,
    on_delta=None,
    *,
    chat: ChatService | None = None,
    user_email: str = "",
) -> dict:
    """Run the task; with `chat`, also show it in `user_email`'s conversation on every device."""
    reply_id: str | None = None
    if chat is not None:
        session = chat.current_session(user_email)
        for role, content, status in (("user", prompt, "done"), ("assistant", "", "streaming")):
            message = store.add_message(session["id"], role, content, status=status, meta=VIA)
            await chat.hub.publish(user_email, {"type": "message", "message": public_message(message)})
        reply_id = message["id"]

    async def delta(chunk: str) -> None:
        if chat is not None:
            await chat.hub.publish(user_email, {"type": "delta", "id": reply_id, "text": chunk})
        if on_delta is not None:
            await on_delta(chunk)

    outcome = Outcome()
    started = time.monotonic()
    project = None if label == "workspace" else label
    try:
        await run_job(router, store, Job(prompt=prompt, cwd=root), outcome, delta, project=project, source=SOURCE)
    except asyncio.CancelledError:
        outcome.status = "stopped"
        raise
    finally:
        if chat is not None and reply_id is not None:
            await _finish(chat, store, user_email, reply_id, outcome)
    res = {**result(outcome, root, label, time.monotonic() - started), "message_id": reply_id}
    _log_metric(res)
    return res


async def _finish(chat: ChatService, store: Store, user_email: str, reply_id: str, outcome: Outcome) -> None:
    """The reply as the chat finishes its own: stored with its meta, then `done` to every device."""
    meta = {**outcome.meta(), **VIA}
    if outcome.tier is not None:
        store.set_message_tier(reply_id, outcome.tier)
    if outcome.changes:
        store.link_changeset(outcome.changes["id"], reply_id)
    store.finish_message(reply_id, outcome.content, outcome.status, executor=outcome.executor, meta=meta)
    done = {"type": "done", "id": reply_id, "status": outcome.status, "content": outcome.content, "meta": meta}
    await chat.hub.publish(user_email, done)


def sse(event: str, data: dict) -> str:
    return f"event: {event}\ndata: {json.dumps(data)}\n\n"


async def stream_task(
    router: RouterBrain, store: Store, root: Path, label: str, prompt: str, **shown: Any
) -> AsyncIterator[str]:
    """Server-sent events for one task: `delta`s, then `done` with the result (or `error`)."""
    queue: asyncio.Queue[str | None] = asyncio.Queue()

    async def on_delta(chunk: str) -> None:
        await queue.put(sse("delta", {"text": chunk}))

    async def work() -> None:
        try:
            await queue.put(sse("done", await run_task(router, store, root, label, prompt, on_delta, **shown)))
        except Exception as exc:  # reported to the caller instead of a dropped stream
            await queue.put(sse("error", {"error": str(exc)}))
        finally:
            await queue.put(None)

    task = asyncio.create_task(work())
    try:
        while (item := await queue.get()) is not None:
            yield item
    finally:
        # The caller hung up: stop the models too.
        if not task.done():
            task.cancel()
