"""Run one prompt through the router's executors with fallback. Shared by the local chat
service and the laptop agent, so the "no executor" check only ever runs on the laptop."""

from __future__ import annotations

import asyncio
import hashlib
import json
import logging
import time
from collections.abc import Awaitable, Callable
from dataclasses import dataclass, field, replace

from .config import Settings
from .context import Ranking, rank_files
from .db import Store
from .executors import ExecutorError, Job, JevExecutor, build_executors
from .fastpath import direct_answer
from .gemini import GeminiClient
from .router import RouterBrain
from .usage import Usage

log = logging.getLogger(__name__)

NO_EXECUTOR = "No executor is available. Start Ollama or sign in to the Claude or Codex CLI."
# Characters of project context for API executors that do not set their own budget (~15k tokens).
DEFAULT_CONTEXT_CHARS = 60_000


def build_router(settings: Settings) -> RouterBrain:
    """Router over this machine's executors. Routing decisions use Jev, then Gemini."""
    return RouterBrain(
        build_executors(settings),
        jev=JevExecutor(settings.typesafe_api_key),
        gemini=GeminiClient(settings.gemini_api_key, settings.gemini_model),
        offline=settings.offline_router,
        cache_ttl=settings.cache_ttl,
    )


@dataclass
class Outcome:
    """Filled in as the run progresses, so a cancelled run still has its partial answer."""

    content: str = ""
    status: str = "error"
    executor: str | None = None
    tier: int | None = None
    usage: Usage | None = None
    cached: bool = False
    context_files: list[str] = field(default_factory=list)

    def add_usage(self, usage: Usage) -> None:
        self.usage = usage if self.usage is None else self.usage + usage

    def meta(self) -> dict:
        """What the UI shows for this reply (no model names)."""
        if self.usage is None and not self.cached:
            return {}
        usage = (self.usage or Usage()).as_dict()
        return {"usage": {**usage, "cached": True} if self.cached else usage}


def cache_key(job: Job, ranking: Ranking | None) -> str:
    history = [(t.role, t.content) for t in list(job.history)[-6:]]
    prompt = " ".join(job.prompt.split())
    payload = json.dumps([prompt, history, ranking.fingerprint if ranking else str(job.cwd)])
    return hashlib.sha256(payload.encode()).hexdigest()


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
    # 1. Reading a file or listing a folder needs no model at all.
    if job.cwd is not None:
        answer = await asyncio.to_thread(direct_answer, job.cwd, job.prompt)
        if answer is not None:
            outcome.content, outcome.status, outcome.executor = answer, "done", "direct"
            outcome.add_usage(Usage("none"))
            store.record_usage(source, "direct", None, 0, 0, 0.0)
            await on_delta(answer)
            return outcome

    # 2. Rank project files once: it feeds both the cache key and every executor's context.
    ranking: Ranking | None = None
    if job.cwd is not None:
        recent = " ".join(t.content for t in list(job.history)[-2:] if t.role == "user")
        try:
            ranking = await asyncio.to_thread(rank_files, job.cwd, f"{job.prompt}\n{recent}")
        except OSError as exc:
            log.warning("context selection failed: %s", exc)
    key = cache_key(job, ranking) if router.cache_ttl > 0 else None
    if key is not None and (hit := store.cache_get(key, router.cache_ttl)) is not None:
        outcome.content, outcome.status, outcome.executor, outcome.cached = hit["answer"], "done", hit["executor"], True
        store.record_usage(source, hit["executor"], None, 0, 0, 0.0, cached=True)
        await on_delta(hit["answer"])
        return outcome

    # 3. Route, then try executors cheapest-first with fallback.
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
    rendered: dict[int, tuple[str, list[str]]] = {}
    for executor in candidates:
        run = job
        if executor.needs_context and ranking is not None:
            budget = getattr(executor, "context_chars", DEFAULT_CONTEXT_CHARS)
            if budget not in rendered:
                rendered[budget] = await asyncio.to_thread(ranking.render, budget)
            run = replace(job, context=rendered[budget][0])
            outcome.context_files = rendered[budget][1]
        started = time.monotonic()
        produced = False
        try:
            async for chunk in executor.stream(run):
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
        if key is not None and executor.cacheable and outcome.content.strip():
            store.cache_put(key, outcome.content, executor.name)
        break
    if outcome.status != "done" and not outcome.content and errors:
        outcome.content = "All executors failed.\n" + "\n".join(errors)
    return outcome


def _ms(started: float) -> int:
    return int((time.monotonic() - started) * 1000)
