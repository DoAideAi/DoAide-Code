"""Run one prompt through the router's executors with fallback. Shared by the local chat
service and the laptop agent, so the "no executor" check only ever runs on the laptop."""

from __future__ import annotations

import logging
import time
from collections.abc import Awaitable, Callable
from dataclasses import dataclass

from .db import Store
from .executors import ExecutorError, Job
from .router import RouterBrain

log = logging.getLogger(__name__)

NO_EXECUTOR = "No executor is available. Start Ollama or sign in to the Claude or Codex CLI."


@dataclass
class Outcome:
    """Filled in as the run progresses, so a cancelled run still has its partial answer."""

    content: str = ""
    status: str = "error"
    executor: str | None = None
    tier: int | None = None


async def run_job(
    router: RouterBrain,
    store: Store,
    job: Job,
    outcome: Outcome,
    on_delta: Callable[[str], Awaitable[None]],
    *,
    project: str | None = None,
) -> Outcome:
    decision = await router.classify(job.prompt, project=project)
    outcome.tier = decision.tier
    candidates = await router.candidates(decision.tier)
    if not candidates:
        outcome.content = NO_EXECUTOR
    errors: list[str] = []
    for executor in candidates:
        started = time.monotonic()
        produced = False
        try:
            async for chunk in executor.stream(job):
                produced = True
                outcome.content += chunk
                await on_delta(chunk)
        except ExecutorError as exc:
            store.record_executor(executor.name, ok=False, elapsed_ms=_ms(started))
            log.warning("%s failed: %s", executor.name, exc)
            errors.append(f"{executor.name}: {exc}")
            if produced:
                outcome.content += f"\n\n[stopped: {exc}]"
                outcome.executor = executor.name
                break
            continue
        store.record_executor(executor.name, ok=True, elapsed_ms=_ms(started))
        outcome.executor, outcome.status = executor.name, "done"
        break
    if outcome.status != "done" and not outcome.content and errors:
        outcome.content = "All executors failed.\n" + "\n".join(errors)
    return outcome


def _ms(started: float) -> int:
    return int((time.monotonic() - started) * 1000)
