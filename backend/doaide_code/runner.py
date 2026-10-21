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
from .context import Ranking, git_context, rank_files
from .db import Store
from .detect import ModelDetector, answer_meta, meta_question, pin_problem
from .executors import Executor, ExecutorError, Job, Turn, build_executors
from .fastpath import direct_answer, math_answer
from .prompts import PROMPT_VERSION
from .router import RouteDecision, RouterBrain, heuristic_tier
from .usage import Usage
from .validate import check_code_blocks, edit_checks, incomplete_reason

log = logging.getLogger(__name__)

NO_EXECUTOR = "No model is available on this laptop. Type /models to see what was detected and how to set one up."
# Incomplete answers are retried this many times, each on the next executor up with more context.
MAX_RETRIES = 1


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
    # Which model answered and why (shown under the reply and in the usage dashboard).
    route: dict | None = None
    # Validation results: completeness, code syntax, proposed edits.
    checks: list[dict] = field(default_factory=list)

    def add_usage(self, usage: Usage) -> None:
        self.usage = usage if self.usage is None else self.usage + usage

    def meta(self) -> dict:
        """What the UI shows for this reply: usage, the model that answered, checks, changes."""
        meta: dict = {}
        if self.usage is not None or self.cached:
            usage = (self.usage or Usage()).as_dict()
            meta["usage"] = {**usage, "cached": True} if self.cached else usage
        if self.changes:
            meta["changes"] = self.changes
        if self.route:
            meta["route"] = self.route
        if self.checks:
            meta["checks"] = {"items": self.checks}
        return meta


def strip_meta_turns(history) -> list[Turn]:
    """History without meta questions (see detect.meta_question) and the replies to them."""
    kept: list[Turn] = []
    skip_reply = False
    for turn in history:
        if turn.role == "user":
            skip_reply = meta_question(turn.content) is not None
            if not skip_reply:
                kept.append(turn)
        elif not skip_reply:
            kept.append(turn)
    return kept


def cache_key(job: Job, ranking: Ranking | None, pin: dict[str, str] | None = None) -> str:
    history = [(t.role, t.content) for t in list(job.history)[-6:]]
    prompt = " ".join(job.prompt.split())
    fingerprint = ranking.fingerprint if ranking else str(job.cwd)
    payload = json.dumps([PROMPT_VERSION, prompt, history, fingerprint, pin or None], sort_keys=True)
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
    pin: dict[str, str] | None = None,
) -> Outcome:
    """`pin` ({"tool", "model"}) runs one model the user chose instead of routing."""
    # 1. Reading a file or listing a folder needs no model at all, and questions about DoAide
    # itself (who it is, what it can do, which models it has) are answered from detection: small
    # local models answer those from training data ("I am GPT-4, made by OpenAI").
    answer = math_answer(job.prompt)
    if answer is not None:
        pass
    elif kind := meta_question(job.prompt):
        answer = answer_meta(kind, await router.models(force=True))
    elif job.cwd is not None:
        answer = await asyncio.to_thread(direct_answer, job.cwd, job.prompt)
    if answer is not None:
        outcome.route = {"executor": "direct", "model": None, "free": True, "reasons": ["answered without a model"]}
        outcome.content, outcome.status, outcome.executor = answer, "done", "direct"
        outcome.add_usage(Usage("none"))
        store.record_usage(source, "direct", None, 0, 0, 0.0)
        await on_delta(answer)
        return outcome

    # Earlier meta questions were answered (or, before detection, made up) outside the models'
    # knowledge; keeping them in history only invites the model to repeat them.
    job = replace(job, history=strip_meta_turns(job.history))

    # 2. Rank project files once: it feeds both the cache key and every executor's context.
    ranking: Ranking | None = None
    if job.cwd is not None:
        recent = " ".join(t.content for t in list(job.history)[-2:] if t.role == "user")
        try:
            ranking = await asyncio.to_thread(rank_files, job.cwd, f"{job.prompt}\n{recent}")
        except OSError as exc:
            log.warning("context selection failed: %s", exc)
    key = cache_key(job, ranking, pin) if router.cache_ttl > 0 else None
    if key is not None and (hit := store.cache_get(key, router.cache_ttl)) is not None:
        outcome.content, outcome.status, outcome.executor, outcome.cached = hit["answer"], "done", hit["executor"], True
        outcome.route = {"executor": hit["executor"], "model": None, "free": True, "reasons": ["cached answer"]}
        store.record_usage(source, hit["executor"], None, 0, 0, 0.0, cached=True)
        await on_delta(hit["answer"])
        await _preview_changes(store, job, outcome, None, None, on_delta, source)
        return outcome

    # 3a. A model the user picked runs alone: no routing, no fallback to other models.
    decision: RouteDecision
    if pin:
        decision = heuristic_tier(job.prompt)
        outcome.tier = decision.tier
        if problem := pin_problem(pin, await router.models()):
            outcome.content = f"Cannot use the selected model: {problem} Pick another model or Auto."
            return outcome
        executor = router.pinned(pin["tool"], pin["model"])
        if executor is None:
            outcome.content = f"Cannot use the selected model: {pin['tool']} is not set up on this laptop."
            return outcome
        candidates: list[Executor] = [executor]
    else:
        # 3b. Classify, then try executors cheapest-first with fallback.
        decision, candidates = await _routed(router, store, job, outcome, project)
    job = replace(job, kind=decision.kind)

    # Extra context the task asks for: the recent diff for "review my changes"-style requests.
    diff = ""
    if decision.wants_diff and job.cwd is not None:
        diff = await asyncio.to_thread(git_context, job.cwd)

    if not decision.about_project:
        # General knowledge ("how do I reverse a list"): project files would only slow it down.
        ranking = None

    errors: list[str] = []
    retries = 0
    retry_note: str | None = None
    for executor in candidates:
        more = retry_note is not None
        run = job
        context, files = await _context_for(executor, ranking, diff, more=more)
        if context:
            run = replace(job, context=context)
            outcome.context_files = files
        started = time.monotonic()
        streamed: list[str] = []
        previous = outcome.content
        outcome.content = ""
        try:
            used = await _drain(executor, run, outcome, store, source, streamed, on_delta)
        except ExecutorError as exc:
            store.record_executor(executor.name, ok=False, elapsed_ms=_ms(started))
            log.warning("%s failed: %s", executor.name, exc)
            errors.append(f"{executor.name}: {exc}")
            if streamed:
                outcome.content += f"\n\n[stopped: {exc}]"
                outcome.executor = executor.name
                break
            outcome.content = previous
            continue
        store.record_executor(executor.name, ok=True, elapsed_ms=_ms(started))
        outcome.executor, outcome.status = executor.name, "done"
        outcome.route = _route(executor, decision, used)

        # Incomplete? Retry once on the next executor up, with more context.
        reason = incomplete_reason(outcome.content, decision.kind)
        nxt = _next_up(candidates, executor, decision.tier)
        if reason and not pin and retries < MAX_RETRIES and nxt is not None:
            retries += 1
            retry_note = f"retried on {nxt.name} with more context ({reason} from {executor.name})"
            await on_delta(f"\n\n---\n_The answer looked incomplete ({reason}); retrying on {nxt.name} with more context…_\n\n")
            outcome.status = "error"
            continue
        outcome.checks.append(
            {"name": "complete", "ok": reason is None, "detail": reason or retry_note or "looks complete"}
        )
        if key is not None and executor.cacheable and reason is None and outcome.content.strip():
            store.cache_put(key, outcome.content, executor.name)
        outcome.checks += await check_code_blocks(outcome.content)
        await _preview_changes(store, job, outcome, executor, run, on_delta, source)
        outcome.checks += edit_checks(outcome.changes)
        break
    if outcome.status != "done" and not outcome.content and errors:
        outcome.content = "All executors failed.\n" + "\n".join(errors)
    return outcome


def _next_up(candidates: list[Executor], current: Executor, task_tier: int) -> Executor | None:
    """Where to retry an incomplete answer: the next candidate that is stronger (or, at the top
    of the task's tier, an alternative of the same tier), never above the task's own tier past
    Sonnet: an incomplete Sonnet answer goes to Codex, not Opus."""
    ceiling = max(task_tier, 2)
    after = candidates[candidates.index(current) + 1 :]
    floor = current.tier if current.tier >= 2 else current.tier + 1
    return next((e for e in after if floor <= e.tier <= ceiling), None)


async def _context_for(
    executor: Executor, ranking: Ranking | None, diff: str, *, more: bool
) -> tuple[str, list[str]]:
    """Context sized for this executor: whole files for Ollama (2-3 of them), a project map for
    the CLI agents; double the budget on a retry."""
    budget = executor.context_chars * (2 if more else 1)
    if ranking is None:
        return (diff[:budget], []) if diff else ("", [])
    if executor.context_mode == "files":
        max_files = executor.max_files + (2 if more else 0)
        return await asyncio.to_thread(ranking.render, budget, max_files=max_files, extra=diff)
    return ranking.render_map(budget, extra=diff)


def _route(executor: Executor, decision: RouteDecision, used: Usage | None) -> dict:
    # The model this executor reported (not the sum of earlier attempts), else its configured one.
    model = (used.model if used else "") or getattr(executor, "model", "") or None
    return {
        "executor": executor.name,
        "model": model,
        "tier": decision.tier,
        "kind": decision.kind,
        "score": decision.complexity,
        "reasons": list(decision.reasons[:4]),
        "free": executor.tool == "ollama",
    }


async def _routed(
    router: RouterBrain, store: Store, job: Job, outcome: Outcome, project: str | None
) -> tuple[RouteDecision, list[Executor]]:
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
    return decision, candidates


async def _drain(
    executor: Executor,
    run: Job,
    outcome: Outcome,
    store: Store,
    source: str,
    streamed: list[str],
    on_delta: Callable[[str], Awaitable[None]],
) -> Usage | None:
    """Stream one executor into the outcome, logging its usage; returns that executor's usage."""
    used: Usage | None = None
    async for chunk in executor.stream(run):
        if isinstance(chunk, Usage):
            outcome.add_usage(chunk)
            used = chunk if used is None else used + chunk
            store.record_usage(source, executor.name, chunk.model, chunk.input_tokens, chunk.output_tokens, chunk.cost_usd)
            continue
        streamed.append(chunk)
        outcome.content += chunk
        await on_delta(chunk)
    return used


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
        if changeset.all_problems:
            outcome.checks.append(
                {"name": "edits", "ok": False, "detail": f"no edit could be applied: {changeset.all_problems[0]}"}
            )
        return
    store.add_changeset(changeset.id, changeset.record(), changeset.summary())
    outcome.changes = changeset.summary()
    outcome.content = strip_edits(outcome.content) or "Proposed changes:"


def _ms(started: float) -> int:
    return int((time.monotonic() - started) * 1000)
