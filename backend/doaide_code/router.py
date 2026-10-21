"""Router Brain: pick the cheapest executor that can handle each message.

Tiers: 0 = Ollama fast model, 1 = Ollama coder model (Claude Haiku if Ollama is down), 2 = Claude
Sonnet / Codex, 3 = Claude Opus. All run on the laptop; the CLIs use the user's subscription logins.
Classification is the local task classifier (classify.py), or Jev only when one is passed in.

Try, then escalate (see `plan` and runner.py): every task first goes to a free Ollama model, and
only an answer that fails validation goes on to Claude Sonnet. The classifier is a hint that skips
the local attempt for obviously complex work.
"""

from __future__ import annotations

import copy
import logging
from dataclasses import dataclass, replace
from typing import Any

from .classify import classify_task
from .detect import ModelDetector, executor_report
from .executors import Executor, JevExecutor
from .usage import Usage

log = logging.getLogger(__name__)

MAX_TIER = 3
JEV_MIN_CONFIDENCE = 0.55
# Tasks scoring this high (or Opus-tier ones) skip the free local attempt: it would only cost time.
LOCAL_FIRST_MAX_SCORE = 10


def is_local(executor: Executor) -> bool:
    return executor.tool == "ollama"

@dataclass(frozen=True)
class RouteDecision:
    tier: int
    complexity: float
    source: str
    confidence: float = 1.0
    # Tokens spent deciding; None when no paid call was made.
    usage: Usage | None = None
    # From the task classifier: what kind of task, why this tier, and what extra context it needs.
    kind: str = "question"
    reasons: tuple[str, ...] = ()
    wants_diff: bool = False
    has_error: bool = False
    about_project: bool = True


def heuristic_tier(message: str) -> RouteDecision:
    """Local classification (no model call): see classify.py."""
    p = classify_task(message)
    return RouteDecision(
        tier=p.tier,
        complexity=p.score,
        source="classifier",
        confidence=0.5,
        kind=p.kind,
        reasons=p.reasons,
        wants_diff=p.wants_diff,
        has_error=p.has_error,
        about_project=p.about_project,
    )



def _clamp_tier(value: float) -> int:
    return max(0, min(MAX_TIER, int(round(value))))


class RouterBrain:
    def __init__(
        self,
        executors: list[Executor],
        *,
        jev: JevExecutor | None = None,
        offline: bool = False,
        cache_ttl: float = 0,
        detector: ModelDetector | None = None,
    ):
        self.executors = sorted(executors, key=lambda e: e.tier)
        # Detects installed models and CLI sign-ins; None for routers over injected executors.
        self.detector = detector
        # How long answers from cacheable executors are reused (0 = never).
        self.cache_ttl = cache_ttl
        self.jev = jev
        self.offline = offline

    async def classify(self, message: str, *, project: str | None = None) -> RouteDecision:
        if not self.offline and self.jev is not None and self.jev.enabled:
            try:
                d = await self.jev.decide(message, project=project)
                tier = d.tier if d.confidence >= JEV_MIN_CONFIDENCE else _clamp_tier(d.complexity)
                local = heuristic_tier(message)
                return replace(
                    local, tier=_clamp_tier(tier), complexity=d.complexity, source="jev", confidence=d.confidence
                )
            except Exception as exc:  # any SDK, network, or schema failure falls through
                log.warning("Jev routing failed: %s", exc)
        return heuristic_tier(message)

    async def models(self, *, force: bool = False) -> dict[str, Any]:
        """What this machine can run, detected from the installed tools (never from a model)."""
        if self.detector is not None:
            return await self.detector.detect(force=force)
        return executor_report({e.name: await e.available() for e in self.executors})

    def pinned(self, tool: str, model: str) -> Executor | None:
        """An executor for one model the user chose, built from this router's executor for that
        tool (same binary and settings, different `--model`)."""
        template = next((e for e in self.executors if e.tool == tool and hasattr(e, "model")), None)
        if template is None:
            return None
        executor = copy.copy(template)
        executor.model = model  # type: ignore[attr-defined]
        executor.name = f"{tool}:{model}"
        if hasattr(executor, "_resolved"):
            # Ollama re-resolves; choose_model keeps an exact installed name as is.
            executor._resolved = None  # type: ignore[attr-defined]
        return executor

    async def _usable(self, executor: Executor) -> bool:
        if self.detector is not None and executor.tool:
            report = await self.detector.detect()
            tool = next((t for t in report["tools"] if t["id"] == executor.tool), None)
            # A missing binary, a signed-out CLI or a stopped Ollama would only fail at run time.
            if tool is not None and not tool["usable"]:
                return False
        return await executor.available()

    async def candidates(self, tier: int) -> list[Executor]:
        """Available executors to try: the target tier, then escalate, then fall back down, all
        among primary executors first; subscription CLIs come last, same order."""

        def ordered(pool: list[Executor]) -> list[Executor]:
            return (
                [e for e in pool if e.tier == tier]
                + [e for e in pool if e.tier > tier]
                + sorted((e for e in pool if e.tier < tier), key=lambda e: -e.tier)
            )

        order = ordered([e for e in self.executors if not e.fallback]) + ordered(
            [e for e in self.executors if e.fallback]
        )
        usable = [e for e in order if await self._usable(e)]
        # Premium executors (Opus, Codex) only for tasks of their tier; for simpler ones they are a
        # last resort when nothing cheaper is available at all.
        return [e for e in usable if e.min_task_tier <= tier] or usable

    async def plan(self, decision: RouteDecision) -> tuple[list[Executor], str | None]:
        """Try-then-escalate order: one free local attempt (the fast model for simple tasks, the
        coder model otherwise), then the paid executors with Sonnet first, then the other local
        model as a last resort. Obviously complex tasks start on the paid executors instead.
        Returns the order and, when the local attempt was skipped, why."""
        pool = await self.candidates(decision.tier)
        local = [e for e in pool if is_local(e)]
        paid = [e for e in pool if not is_local(e)]
        if not local or not paid:
            return pool, None
        if decision.tier >= MAX_TIER or decision.complexity >= LOCAL_FIRST_MAX_SCORE:
            return paid + local, f"local model skipped: complex task (score {decision.complexity:g})"
        first = next((e for e in local if e.tier == min(decision.tier, 1)), local[0])
        # Escalate to Sonnet-class first; Haiku (tier 1) only if none of those is available.
        paid.sort(key=lambda e: (e.tier < 2, e.tier))
        return [first, *paid, *(e for e in local if e is not first)], None
