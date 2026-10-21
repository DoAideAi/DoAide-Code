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

from .changes import propose, repair_prompt, strip_edits
from .config import Settings
from .context import Ranking, rank_files
from .db import Store
from .detect import ModelDetector, asks_about_models, format_report
from .executors import Executor, ExecutorError, Job, Turn, build_executors
from .executors.base import CODER_SYSTEM_PROMPT
from .fastpath import direct_answer
from .router import RouterBrain
from .usage import Usage

log = logging.getLogger(__name__)

NO_EXECUTOR = "No model is available on this laptop. Type /models to see what was detected and how to set one up."
# Cached answers are only reused while the instructions that produced them are unchanged.
PROMPT_VERSION = hashlib.sha256(CODER_SYSTEM_PROMPT.encode()).hexdigest()[:12]
# Characters of project context for API executors that do not set their own budget (~15k tokens).
DEFAULT_CONTEXT_CHARS = 60_000


def build_router(settings: Settings) -> RouterBrain:
    """Router over this machine's executors. Routing is local heuristics: no API calls."""
    return RouterBrain(
        build_executors(settings), offline=True, cache_ttl=settings.cache_ttl, detector=ModelDetector(settings)
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
    # Proposed edits (preview summary) awaiting /apply; the id finds them in the store.
    changes: dict | None = None

    def add_usage(self, usage: Usage) -> None:
        self.usage = usage if self.usage is None else self.usage + usage

    def meta(self) -> dict:
        """What the UI shows for this reply (no model names)."""
        meta: dict = {}
        if self.usage is not None or self.cached:
            usage = (self.usage or Usage()).as_dict()
            meta["usage"] = {**usage, "cached": True} if self.cached else usage
        if self.changes:
            meta["changes"] = self.changes
        return meta


def cache_key(job: Job, ranking: Ranking | None) -> str:
    history = [(t.role, t.content) for t in list(job.history)[-6:]]
    prompt = " ".join(job.prompt.split())
    payload = json.dumps([PROMPT_VERSION, prompt, history, ranking.fingerprint if ranking else str(job.cwd)])
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
    # 1. Reading a file or listing a folder needs no model at all, and questions about which
    # models exist are answered by detection: a model asked that only guesses.
    answer = None
    if asks_about_models(job.prompt):
        answer = format_report(await router.models(force=True))
    elif job.cwd is not None:
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
        await _preview_changes(store, job, outcome, None, None, on_delta, source)
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
        streamed: list[str] = []
        try:
            await _drain(executor, run, outcome, store, source, streamed, on_delta)
        except ExecutorError as exc:
            store.record_executor(executor.name, ok=False, elapsed_ms=_ms(started))
            log.warning("%s failed: %s", executor.name, exc)
            errors.append(f"{executor.name}: {exc}")
            if streamed:
                outcome.content += f"\n\n[stopped: {exc}]"
                outcome.executor = executor.name
                break
            continue
        store.record_executor(executor.name, ok=True, elapsed_ms=_ms(started))
        outcome.executor, outcome.status = executor.name, "done"
        if key is not None and executor.cacheable and outcome.content.strip():
            store.cache_put(key, outcome.content, executor.name)
        await _preview_changes(store, job, outcome, executor, run, on_delta, source)
        break
    if outcome.status != "done" and not outcome.content and errors:
        outcome.content = "All executors failed.\n" + "\n".join(errors)
    return outcome


async def _drain(
    executor: Executor,
    run: Job,
    outcome: Outcome,
    store: Store,
    source: str,
    streamed: list[str],
    on_delta: Callable[[str], Awaitable[None]],
) -> None:
    """Stream one executor into the outcome, logging its usage."""
    async for chunk in executor.stream(run):
        if isinstance(chunk, Usage):
            outcome.add_usage(chunk)
            store.record_usage(source, executor.name, chunk.model, chunk.input_tokens, chunk.output_tokens, chunk.cost_usd)
            continue
        streamed.append(chunk)
        outcome.content += chunk
        await on_delta(chunk)


async def _preview_changes(
    store: Store,
    job: Job,
    outcome: Outcome,
    executor: Executor | None,
    run: Job | None,
    on_delta: Callable[[str], Awaitable[None]],
    source: str,
) -> None:
    """Turn edit blocks in the answer into a validated changeset; repair once if they fail."""
    if job.cwd is None:
        return
    changeset = await propose(job.cwd, outcome.content)
    if changeset is None:
        return
    # One repair round, with the same executor, when checks fail (never on fallback executors).
    if changeset.all_problems and executor is not None and run is not None and not executor.fallback:
        notes = "\n".join(f"- {p}" for p in changeset.all_problems)
        await on_delta(f"\n\n---\n_The proposed edit did not pass checks; asking for a fix:_\n{notes}\n\n")
        first_answer = outcome.content
        retry = replace(
            run,
            prompt=repair_prompt(job.prompt, changeset.all_problems),
            history=[*run.history, Turn("user", job.prompt), Turn("assistant", first_answer)],
        )
        repaired = Outcome()
        try:
            await _drain(executor, retry, repaired, store, source, [], on_delta)
        except ExecutorError as exc:
            log.warning("repair with %s failed: %s", executor.name, exc)
        if repaired.usage is not None:
            outcome.add_usage(repaired.usage)
        better = await propose(job.cwd, repaired.content) if repaired.content else None
        if better is not None and len(better.all_problems) < len(changeset.all_problems):
            changeset, outcome.content = better, repaired.content
    if not changeset.changed:
        return
    store.add_changeset(changeset.id, changeset.record(), changeset.summary())
    outcome.changes = changeset.summary()
    outcome.content = strip_edits(outcome.content) or "Proposed changes:"


def _ms(started: float) -> int:
    return int((time.monotonic() - started) * 1000)
