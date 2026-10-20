"""Run one prompt through the router's executors with fallback. Shared by the local chat
service and the laptop agent, so the "no executor" check only ever runs on the laptop."""

from __future__ import annotations

import logging
import time
from collections.abc import Awaitable, Callable
from dataclasses import dataclass

from .config import Settings
from .db import Store
from .executors import ExecutorError, Job, JevExecutor, build_executors
from .gemini import GeminiClient
from .router import RouterBrain
from .usage import Usage

log = logging.getLogger(__name__)

NO_EXECUTOR = "No executor is available. Start Ollama or sign in to the Claude or Codex CLI."


def build_router(settings: Settings) -> RouterBrain:
    """Router over this machine's executors. Routing decisions use Jev, then Gemini."""
    return RouterBrain(
        build_executors(settings),
        jev=JevExecutor(settings.typesafe_api_key),
        gemini=GeminiClient(settings.gemini_api_key, settings.gemini_model),
        offline=settings.offline_router,
    )


@dataclass
class Outcome:
    """Filled in as the run progresses, so a cancelled run still has its partial answer."""

    content: str = ""
    status: str = "error"
    executor: str | None = None
    tier: int | None = None
    usage: Usage | None = None

    def add_usage(self, usage: Usage) -> None:
        self.usage = usage if self.usage is None else self.usage + usage

    def meta(self) -> dict:
        """What the UI shows for this reply (no model names)."""
        return {"usage": self.usage.as_dict()} if self.usage else {}


async def run_job(
    router: RouterBrain,
    store: Store,
    job: Job,
    outcome: Outcome,
    on_delta: Callable[[str], Awaitable[None]],
    *,
    project: str | None = None,
    source: str = "chat",
) -> Outcome:
    decision = await router.classify(job.prompt, project=project)
    outcome.tier = decision.tier
    if decision.usage is not None:
        outcome.add_usage(decision.usage)
        store.record_usage(
            "router", None, decision.usage.model, decision.usage.input_tokens, decision.usage.output_tokens,
            decision.usage.cost_usd,
        )
    candidates = await router.candidates(decision.tier)
    if not candidates:
        outcome.content = NO_EXECUTOR
    errors: list[str] = []
    for executor in candidates:
        started = time.monotonic()
        produced = False
        try:
            async for chunk in executor.stream(job):
                if isinstance(chunk, Usage):
                    outcome.add_usage(chunk)
                    store.record_usage(
                        source, executor.name, chunk.model, chunk.input_tokens, chunk.output_tokens, chunk.cost_usd
                    )
                    continue
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
