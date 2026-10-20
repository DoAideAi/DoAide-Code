"""Laptop agent: connects out to the hub and runs relayed prompts on this machine.

The hub (code.doaide.com) never runs a model. This process keeps one WebSocket open to
the hub's `/agent` endpoint, receives one job at a time, runs it through the local
executors (Ollama, Claude CLI, Codex CLI) against the laptop's project registry, and
streams the answer back. Run it with `doaide-code agent` after copying the token from
"Connect laptop" on the hosted UI into DOAIDE_HUB_TOKEN.
"""

from __future__ import annotations

import asyncio
import contextlib
import json
import logging
from collections.abc import Awaitable, Callable
from typing import Any

from .commands import is_command, run_command
from .config import Settings
from .db import Store
from .executors import Job, Turn
from .files import FileAccessError, list_dir, read_file
from .mcp_server import LaptopTools, handle_relayed
from .router import RouterBrain
from .runner import Outcome, build_router, run_job
from .workspace import DEFAULT_WORKSPACE, working_root

log = logging.getLogger(__name__)

Send = Callable[[dict[str, Any]], Awaitable[None]]


class LaptopAgent:
    def __init__(self, store: Store, router: RouterBrain, owner_email: str, *, workspace: str = DEFAULT_WORKSPACE):
        self.store = store
        self.router = router
        self.workspace = workspace
        # Projects and the active project are kept per laptop owner in the local database.
        self.owner = owner_email
        self._task: asyncio.Task | None = None
        self._task_id: str | None = None
        # MCP tool calls relayed from the hub; they can run for minutes, so each gets a task.
        self.tools = LaptopTools(store, router, owner_email, workspace=workspace)
        self._mcp_tasks: set[asyncio.Task] = set()

    def project_name(self) -> str | None:
        project = self.store.active_project(self.owner)
        return project["name"] if project else None

    async def hello(self) -> dict[str, Any]:
        executors = [e.name for e in self.router.executors if await e.available()]
        return {"type": "hello", "project": self.project_name(), "executors": executors}

    async def on_message(self, message: dict[str, Any], send: Send) -> None:
        kind = message.get("type")
        if kind == "job" and isinstance(message.get("id"), str) and isinstance(message.get("text"), str):
            await self.cancel()
            self._task_id = message["id"]
            self._task = asyncio.create_task(self.run(message, send))
        elif kind == "stop" and message.get("id") == self._task_id:
            await self.cancel()
        elif kind == "rpc" and isinstance(message.get("id"), str) and message.get("method") == "mcp":
            task = asyncio.create_task(self.mcp(message, send))
            self._mcp_tasks.add(task)
            task.add_done_callback(self._mcp_tasks.discard)
        elif kind == "rpc" and isinstance(message.get("id"), str):
            await send({"type": "rpc_result", "id": message["id"], **await self.rpc(message)})

    async def rpc(self, message: dict[str, Any]) -> dict[str, Any]:
        """File browsing requests from the hub UI, answered from the laptop's disk."""
        params = message.get("params") if isinstance(message.get("params"), dict) else {}
        rel = str(params.get("path") or "")
        root, label = working_root(self.store, self.owner, self.workspace)
        try:
            if message.get("method") == "list_files":
                result = await asyncio.to_thread(list_dir, root, rel)
            elif message.get("method") == "read_file":
                result = await asyncio.to_thread(read_file, root, rel)
            else:
                return {"error": "Unknown request", "status": 400}
        except FileAccessError as exc:
            return {"error": str(exc), "status": exc.status}
        except OSError as exc:
            return {"error": exc.strerror or "Cannot read", "status": 400}
        return {"result": {**result, "root": label}}

    async def mcp(self, message: dict[str, Any], send: Send) -> None:
        params = message.get("params") if isinstance(message.get("params"), dict) else {}
        request = params.get("message")
        if not isinstance(request, dict):
            await send({"type": "rpc_result", "id": message["id"], "error": "Missing MCP message", "status": 400})
            return
        response = await handle_relayed(self.tools, request)
        with contextlib.suppress(Exception):
            await send({"type": "rpc_result", "id": message["id"], "result": response})

    async def disconnect(self) -> None:
        """The hub link dropped: stop the running job and any relayed MCP calls."""
        await self.cancel()
        tasks = list(self._mcp_tasks)
        for task in tasks:
            task.cancel()
        await asyncio.gather(*tasks, return_exceptions=True)

    async def cancel(self) -> None:
        task, self._task, self._task_id = self._task, None, None
        if task is not None and not task.done():
            task.cancel()
            with contextlib.suppress(asyncio.CancelledError):
                await task

    async def run(self, message: dict[str, Any], send: Send) -> None:
        job_id, text = message["id"], message["text"]
        if is_command(text):
            result = run_command(self.store, self.owner, text, workspace=self.workspace)
            await send({"type": "done", "id": job_id, "role": "system", "status": "done", "content": result.text})
            if result.project_changed:
                await send({"type": "project", "project": self.project_name()})
            return

        project = self.store.active_project(self.owner)
        cwd, _ = working_root(self.store, self.owner, self.workspace)
        history = [
            Turn("assistant" if t.get("role") == "assistant" else "user", str(t.get("content", "")))
            for t in message.get("history") or []
            if isinstance(t, dict)
        ]
        outcome = Outcome()

        async def on_delta(chunk: str) -> None:
            await send({"type": "delta", "id": job_id, "text": chunk})

        try:
            await run_job(
                self.router,
                self.store,
                Job(prompt=text, history=history, cwd=cwd),
                outcome,
                on_delta,
                project=project["name"] if project else None,
            )
        except asyncio.CancelledError:
            outcome.status = "stopped"
            # Report the partial answer before the cancellation finishes unwinding.
            with contextlib.suppress(Exception):
                await send({"type": "done", "id": job_id, "status": "stopped", "content": outcome.content})
            raise
        except Exception as exc:  # never leave the hub waiting on a crashed job
            log.exception("job %s failed", job_id)
            outcome.content = outcome.content or f"Laptop agent error: {exc}"
            outcome.status = "error"
        await send({"type": "done", "id": job_id, "status": outcome.status, "content": outcome.content})


async def serve(agent: LaptopAgent, url: str, token: str, *, max_backoff: float = 30.0) -> None:
    """Stay connected to the hub, reconnecting with backoff; jobs stop if the link drops."""
    from websockets.asyncio.client import connect
    from websockets.exceptions import ConnectionClosed, InvalidStatus

    backoff = 1.0
    while True:
        try:
            async with connect(f"{url}?token={token}", ping_interval=20, max_size=2**22) as ws:
                log.info("connected to %s", url)
                backoff = 1.0

                async def send(data: dict[str, Any]) -> None:
                    await ws.send(json.dumps(data))

                await send(await agent.hello())
                async for raw in ws:
                    try:
                        message = json.loads(raw)
                    except ValueError:
                        continue
                    if isinstance(message, dict):
                        await agent.on_message(message, send)
        except ConnectionClosed as exc:
            if exc.rcvd is not None and exc.rcvd.code == 4401:
                raise SystemExit("The hub rejected this agent token. Create a new one with 'Connect laptop'.")
            log.warning("hub connection closed: %s", exc)
        except InvalidStatus as exc:
            log.warning("hub refused connection: %s", exc)
        except OSError as exc:
            log.warning("cannot reach hub: %s", exc)
        finally:
            await agent.disconnect()
        await asyncio.sleep(backoff)
        backoff = min(backoff * 2, max_backoff)


def run_agent(settings: Settings) -> None:
    if not settings.hub_token:
        raise SystemExit(
            "Set DOAIDE_HUB_TOKEN to the token from 'Connect laptop' on the hosted UI, then run `doaide-code agent`."
        )
    store = Store(settings.db_path)
    router = build_router(settings)
    agent = LaptopAgent(store, router, settings.owner_email, workspace=settings.workspace)
    try:
        asyncio.run(serve(agent, settings.hub_url, settings.hub_token))
    except KeyboardInterrupt:
        pass
    finally:
        store.close()
