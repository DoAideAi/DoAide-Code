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
from pathlib import Path
from typing import Any

from .commands import is_command, run_command
from .config import Settings
from .db import Store
from .executors import Job, Turn, build_executors
from .executors.jev import JevExecutor
from .gemini import GeminiClient
from .router import RouterBrain
from .runner import Outcome, run_job

log = logging.getLogger(__name__)

Send = Callable[[dict[str, Any]], Awaitable[None]]


class LaptopAgent:
    def __init__(self, store: Store, router: RouterBrain, owner_email: str):
        self.store = store
        self.router = router
        # Projects and the active project are kept per laptop owner in the local database.
        self.owner = owner_email
        self._task: asyncio.Task | None = None
        self._task_id: str | None = None

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

    async def cancel(self) -> None:
        task, self._task, self._task_id = self._task, None, None
        if task is not None and not task.done():
            task.cancel()
            with contextlib.suppress(asyncio.CancelledError):
                await task

    async def run(self, message: dict[str, Any], send: Send) -> None:
        job_id, text = message["id"], message["text"]
        if is_command(text):
            result = run_command(self.store, self.owner, text)
            await send({"type": "done", "id": job_id, "role": "system", "status": "done", "content": result.text})
            if result.project_changed:
                await send({"type": "project", "project": self.project_name()})
            return

        project = self.store.active_project(self.owner)
        cwd = Path(project["path"]) if project and Path(project["path"]).is_dir() else None
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
            await agent.cancel()
        await asyncio.sleep(backoff)
        backoff = min(backoff * 2, max_backoff)


def run_agent(settings: Settings) -> None:
    if not settings.hub_token:
        raise SystemExit(
            "Set DOAIDE_HUB_TOKEN to the token from 'Connect laptop' on the hosted UI, then run `doaide-code agent`."
        )
    store = Store(settings.db_path)
    router = RouterBrain(
        build_executors(settings),
        jev=JevExecutor(settings.typesafe_api_key),
        gemini=GeminiClient(settings.gemini_api_key, settings.gemini_model),
        offline=settings.offline_router,
    )
    agent = LaptopAgent(store, router, settings.owner_email)
    try:
        asyncio.run(serve(agent, settings.hub_url, settings.hub_token))
    except KeyboardInterrupt:
        pass
    finally:
        store.close()
