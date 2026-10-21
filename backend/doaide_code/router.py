"""Router Brain: pick the cheapest executor that can handle each message.

Tiers: 0 = Ollama (free), 1 = Codex / Claude Haiku, 2 = Claude Sonnet, 3 = Claude Opus. All
run on the laptop; the CLIs use the user's subscription logins. Classification uses Jev
(TypeSafe Choice + Score) only when one is passed in, else local keyword heuristics.
"""

from __future__ import annotations

import logging
import re
from dataclasses import dataclass
from typing import Any

from .detect import ModelDetector, executor_report
from .executors import Executor, JevExecutor
from .usage import Usage

log = logging.getLogger(__name__)

MAX_TIER = 3
JEV_MIN_CONFIDENCE = 0.55

_TIER_PATTERNS: list[tuple[int, re.Pattern[str]]] = [
    (
        3,
        re.compile(
            r"\b(architect\w*|system design|design (a|the) system|security|vulnerab\w*|threat model|audit|"
            r"race condition|deadlock|concurrency|scalab\w*|migrat\w+ (the|our|from)|rewrite (the|our) entire)\b",
            re.I,
        ),
    ),
    (
        2,
        re.compile(
            r"\b(refactor\w*|multi-?file|across (the|all)|debug\w*|stack ?trace|traceback|failing tests?|"
            r"integrat\w+|new feature|add (an? )?endpoint|build (a|an|the)|end-to-end|investigate)\b",
            re.I,
        ),
    ),
    (
        1,
        re.compile(
            r"\b(write (a |some )?tests?|unit tests?|fix (the|this|a)|bug|implement|add (a|an) (function|method|class)|"
            r"edit|update the|change the|rename)\b",
            re.I,
        ),
    ),
]


@dataclass(frozen=True)
class RouteDecision:
    tier: int
    complexity: float
    source: str
    confidence: float = 1.0
    # Tokens spent deciding; None when no paid call was made.
    usage: Usage | None = None


def heuristic_tier(message: str) -> RouteDecision:
    tier = next((t for t, pattern in _TIER_PATTERNS if pattern.search(message)), 0)
    if len(message) > 2000:
        tier = max(tier, 2)
    return RouteDecision(tier=tier, complexity=float(tier), source="heuristic", confidence=0.5)



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
                return RouteDecision(tier=_clamp_tier(tier), complexity=d.complexity, source="jev", confidence=d.confidence)
            except Exception as exc:  # any SDK, network, or schema failure falls through
                log.warning("Jev routing failed: %s", exc)
        return heuristic_tier(message)

    async def models(self, *, force: bool = False) -> dict[str, Any]:
        """What this machine can run, detected from the installed tools (never from a model)."""
        if self.detector is not None:
            return await self.detector.detect(force=force)
        return executor_report({e.name: await e.available() for e in self.executors})

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
        return [e for e in order if await self._usable(e)]
