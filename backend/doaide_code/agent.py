"""Laptop agent: the local UI, plus a connection out to the hub for the phone.

Local first. The executors (Ollama, Claude CLI, Codex CLI) and this process live on the same
laptop, so the laptop's own UI talks to it directly: the agent serves the app at
http://127.0.0.1:3097 (DOAIDE_PORT; DOAIDE_LOCAL_UI=0 turns it off) and runs prompts typed there
at once, with no server round trip. The hub (code.doaide.com) never runs a model; it only keeps
the phone in sync. Every local event is mirrored up this agent's WebSocket (sync.MirrorHub), and
prompts sent from the phone arrive as jobs, run here, and show in the local chat as well.

Run it with `doaide-code agent` after copying the token from "Connect laptop" on the hosted UI
into DOAIDE_HUB_TOKEN.
"""

from __future__ import annotations

import asyncio
import contextlib
import json
import logging
from collections.abc import Awaitable, Callable
from dataclasses import replace
from typing import Any

from .chat import public_message
from .commands import is_command, is_models_command, run_command
from .detect import format_report, same_report
from .config import Settings
from .db import Store
from .executors import Job, Turn
from .files import FileAccessError, list_dir, read_file
from .mcp_server import LaptopTools, handle_relayed
from .router import RouterBrain
from .runner import Outcome, build_router, run_job
from .sync import MirrorHub
from .workspace import DEFAULT_WORKSPACE, working_root

log = logging.getLogger(__name__)

Send = Callable[[dict[str, Any]], Awaitable[None]]


class LaptopAgent:
    def __init__(
        self,
        store: Store,
        router: RouterBrain,
        owner_email: str,
        *,
        workspace: str = DEFAULT_WORKSPACE,
        local: MirrorHub | None = None,
    ):
        self.store = store
        # The local UI's sync hub: jobs from the phone are shown there too (see _show_locally).
        self.local = local
        # The current hub connection's sender. A running job outlives a dropped connection and
        # reports through whichever connection is current when it finishes.
        self._send: Send | None = None
        self.router = router
        self.workspace = workspace
        # Projects and the active project are kept per laptop owner in the local database.
        self.owner = owner_email
        self._task: asyncio.Task | None = None
        self._task_id: str | None = None
        # MCP tool calls relayed from the hub; they can run for minutes, so each gets a task.
        self.tools = LaptopTools(store, router, owner_email, workspace=workspace)
        self._mcp_tasks: set[asyncio.Task] = set()
        # Last model report sent to the hub.
        self._models: dict[str, Any] | None = None

    def project_name(self) -> str | None:
        project = self.store.active_project(self.owner)
        return project["name"] if project else None

    async def hello(self) -> dict[str, Any]:
        executors = [e.name for e in self.router.executors if await e.available()]
        models = await self.router.models(force=True)
        self._models = models
        running = self._task_id if self._task is not None and not self._task.done() else None
        # The job still running from before a reconnect: the hub adopts it or tells us to stop.
        return {"type": "hello", "project": self.project_name(), "executors": executors, "models": models, "running": running}

    def connected(self, send: Send | None) -> None:
        self._send = send

    async def emit(self, event: dict[str, Any], fallback: Send | None = None) -> None:
        """Send to the hub over the current connection (else `fallback`, the one the job came on);
        a dead connection drops the event, and the hub re-sends or fails the job."""
        target = self._send or fallback
        if target is not None:
            with contextlib.suppress(Exception):
                await target(event)

    async def watch_models(self, send: Send, interval: float = 60) -> None:
        """Re-detect models now and then, and tell the hub when something was installed, started,
        signed in or removed, so every device shows what the laptop can really run."""
        while True:
            await asyncio.sleep(interval)
            await self.send_models(send, force=True)

    async def send_models(self, send: Send, *, force: bool = False) -> None:
        models = await self.router.models(force=force)
        if not same_report(models, self._models):
            self._models = models
            await send({"type": "models", "models": models})

    async def on_message(self, message: dict[str, Any], send: Send) -> None:
        kind = message.get("type")
        if kind == "job" and isinstance(message.get("id"), str) and isinstance(message.get("text"), str):
            if message["id"] == self._task_id and self._task is not None and not self._task.done():
                return  # re-sent after a reconnect: it is still running and will report when done
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
        reply_id = params.get("reply_id")
        # Relayed calls the hub shows in a conversation stream their progress into that reply.
        tools = self.tools.for_reply(reply_id, send) if isinstance(reply_id, str) else self.tools
        response = await handle_relayed(tools, request)
        with contextlib.suppress(Exception):
            await send({"type": "rpc_result", "id": message["id"], "result": response})

    async def disconnect(self) -> None:
        """The hub link dropped: stop relayed MCP calls. A running job carries on (a hub restart
        re-sends it, and it reports on the new connection); the hub stops it if it gave up on it."""
        self._send = None
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
        arrived_on = send

        async def send(event: dict[str, Any]) -> None:
            # The connection current at each send, not necessarily the one the job arrived on.
            await self.emit(event, arrived_on)
        job_id, text = message["id"], message["text"]
        if is_models_command(text):
            models = await self.router.models(force=True)
            await send({"type": "done", "id": job_id, "role": "system", "status": "done", "content": format_report(models)})
            await self.send_models(send)
            return
        if is_command(text):
            result = run_command(self.store, self.owner, text, workspace=self.workspace)
            if result.changes and result.changes[0]:
                # The reply that proposed the changes lives on the hub under the same id.
                await send({"type": "changes", "id": result.changes[0], "changes": result.changes[1]})
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
        await self._show_locally(job_id, text)

        async def on_delta(chunk: str) -> None:
            await send({"type": "delta", "id": job_id, "text": chunk})
            if self.local is not None:
                await self.local.publish_local(self.owner, {"type": "delta", "id": job_id, "text": chunk})

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
        if outcome.changes:
            self.store.link_changeset(outcome.changes["id"], job_id)
        done = {"type": "done", "id": job_id, "status": outcome.status, "content": outcome.content}
        meta = outcome.meta()
        await send({**done, "meta": meta} if meta else done)
        if self.local is not None:
            self.store.finish_message(job_id, outcome.content, outcome.status, meta=meta or None)
            await self.local.publish_local(self.owner, {**done, "meta": meta} if meta else done)

    async def _show_locally(self, job_id: str, text: str) -> None:
        """A prompt from the phone joins the local chat too (under the hub's reply id), so the
        laptop and the phone show one conversation."""
        if self.local is None or self.store.get_message(job_id) is not None:
            return  # no local UI, or a job the hub re-sent after a reconnect
        session = self.store.latest_session(self.owner) or self.store.create_session(self.owner)
        prompt = self.store.add_message(session["id"], "user", text)
        reply = self.store.add_message(session["id"], "assistant", "", status="streaming", message_id=job_id)
        for message in (prompt, reply):
            await self.local.publish_local(self.owner, {"type": "message", "message": public_message(message)})


async def serve(agent: LaptopAgent, url: str, token: str, *, max_backoff: float = 30.0) -> None:
    """Stay connected to the hub, reconnecting with backoff; jobs stop if the link drops. While
    connected, the local UI's conversation is mirrored up this socket."""
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

                agent.connected(send)
                await send(await agent.hello())
                if agent.local is not None:
                    agent.local.uplink = send
                watcher = asyncio.create_task(agent.watch_models(send))
                try:
                    async for raw in ws:
                        try:
                            message = json.loads(raw)
                        except ValueError:
                            continue
                        if isinstance(message, dict):
                            await agent.on_message(message, send)
                finally:
                    watcher.cancel()
        except ConnectionClosed as exc:
            if exc.rcvd is not None and exc.rcvd.code == 4401:
                raise SystemExit("The hub rejected this agent token. Create a new one with 'Connect laptop'.")
            log.warning("hub connection closed: %s", exc)
        except InvalidStatus as exc:
            log.warning("hub refused connection: %s", exc)
        except OSError as exc:
            log.warning("cannot reach hub: %s", exc)
        finally:
            if agent.local is not None:
                agent.local.uplink = None
            await agent.disconnect()
        await asyncio.sleep(backoff)
        backoff = min(backoff * 2, max_backoff)


def run_agent(settings: Settings) -> None:
    if not settings.hub_token:
        raise SystemExit(
            "Set DOAIDE_HUB_TOKEN to the token from 'Connect laptop' on the hosted UI, then run `doaide-code agent`."
        )
    store = Store(settings.db_path)
    # Answers cached by an earlier build may predate today's prompt and checks; start clean.
    if cleared := store.cache_clear():
        log.info("cleared %d cached answers", cleared)
    if interrupted := store.fail_interrupted():
        log.info("marked %d replies interrupted by the restart", interrupted)
    router = build_router(settings)
    local = MirrorHub() if settings.local_ui else None
    agent = LaptopAgent(store, router, settings.owner_email, workspace=settings.workspace, local=local)

    async def main() -> None:
        jobs = [serve(agent, settings.hub_url, settings.hub_token), warm_models(router)]
        if local is not None:
            jobs.append(serve_local_ui(settings, store, router, local))
        await asyncio.gather(*jobs)

    try:
        asyncio.run(main())
    except KeyboardInterrupt:
        pass
    finally:
        store.close()


async def warm_models(router: RouterBrain) -> None:
    """Load the local models now, so the first task does not wait for them (see OllamaExecutor)."""
    for executor in router.executors:
        if hasattr(executor, "warm"):
            await executor.warm()


async def serve_local_ui(settings: Settings, store: Store, router: RouterBrain, hub: MirrorHub) -> None:
    """The laptop's own UI at http://127.0.0.1:<port>, sharing this process's store and models.
    If the port is taken (say, by a separately started `doaide-code`), the agent runs without it."""
    import uvicorn

    from .main import create_app

    local_settings = replace(settings, mode="local")
    app = create_app(local_settings, store=store, router=router, hub=hub)
    server = uvicorn.Server(uvicorn.Config(app, host=settings.host, port=settings.port, log_level="warning"))
    log.info("local UI at http://%s:%d", settings.host, settings.port)
    try:
        await server.serve()
    except (OSError, SystemExit) as exc:
        log.warning("local UI not started on port %d: %s", settings.port, exc)
