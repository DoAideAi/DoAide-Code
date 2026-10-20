"""Router Brain: pick the cheapest executor that can handle each message.

Tiers: 0 = Ollama (free), 1 = Gemini Flash-Lite, 2 = Gemini Flash, 3 = Gemini Pro. Codex and
Claude CLIs are fallbacks, tried only after every Ollama/Gemini executor. Classification order:
Jev (TypeSafe Choice + Score), then Gemini, then local keyword heuristics, so routing still works
offline.
"""

from __future__ import annotations

import logging
import re
from dataclasses import dataclass

from .executors import Executor, JevExecutor
from .gemini import GeminiClient, GeminiError
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
    # Tokens spent deciding (Gemini classifier); None when no paid call was made.
    usage: Usage | None = None


def heuristic_tier(message: str) -> RouteDecision:
    tier = next((t for t, pattern in _TIER_PATTERNS if pattern.search(message)), 0)
    if len(message) > 2000:
        tier = max(tier, 2)
    return RouteDecision(tier=tier, complexity=float(tier), source="heuristic", confidence=0.5)


GEMINI_SCHEMA = {
    "type": "OBJECT",
    "properties": {
        "tier": {"type": "INTEGER", "description": "0-3"},
        "complexity": {"type": "NUMBER", "description": "0-3"},
    },
    "required": ["tier", "complexity"],
}

GEMINI_PROMPT = """You route coding-assistant requests to the cheapest capable model tier.
Tier 0: simple explanations, syntax, tiny snippets (small local model).
Tier 1: routine single-file edits, small functions, writing a test, focused bug fixes.
Tier 2: multi-file features, non-trivial debugging, refactors needing repository context.
Tier 3: architecture, security review, concurrency/performance deep dives, large migrations.
Also rate complexity 0 (trivial) to 3 (high).

Request:
<<<
{message}
>>>"""


def _clamp_tier(value: float) -> int:
    return max(0, min(MAX_TIER, int(round(value))))


class RouterBrain:
    def __init__(
        self,
        executors: list[Executor],
        *,
        jev: JevExecutor | None = None,
        gemini: GeminiClient | None = None,
        offline: bool = False,
    ):
        self.executors = sorted(executors, key=lambda e: e.tier)
        self.jev = jev
        self.gemini = gemini
        self.offline = offline

    async def classify(self, message: str, *, project: str | None = None) -> RouteDecision:
        if not self.offline and self.jev is not None and self.jev.enabled:
            try:
                d = await self.jev.decide(message, project=project)
                tier = d.tier if d.confidence >= JEV_MIN_CONFIDENCE else _clamp_tier(d.complexity)
                return RouteDecision(tier=_clamp_tier(tier), complexity=d.complexity, source="jev", confidence=d.confidence)
            except Exception as exc:  # any SDK, network, or schema failure falls through
                log.warning("Jev routing failed: %s", exc)
        if not self.offline and self.gemini is not None and self.gemini.enabled:
            spent: list[Usage] = []
            try:
                data = await self.gemini.generate_json(
                    GEMINI_PROMPT.format(message=message[:6000]), GEMINI_SCHEMA, usage=spent
                )
                return RouteDecision(
                    tier=_clamp_tier(float(data["tier"])),
                    complexity=float(data.get("complexity", data["tier"])),
                    source="gemini",
                    confidence=0.7,
                    usage=spent[0] if spent else None,
                )
            except (GeminiError, KeyError, TypeError, ValueError) as exc:
                log.warning("Gemini routing failed: %s", exc)
        return heuristic_tier(message)

    async def candidates(self, tier: int) -> list[Executor]:
        """Available executors to try: the target tier, then escalate, then fall back down, all
        among primary (Ollama/Gemini) executors first; subscription CLIs come last, same order."""

        def ordered(pool: list[Executor]) -> list[Executor]:
            return (
                [e for e in pool if e.tier == tier]
                + [e for e in pool if e.tier > tier]
                + sorted((e for e in pool if e.tier < tier), key=lambda e: -e.tier)
            )

        order = ordered([e for e in self.executors if not e.fallback]) + ordered(
            [e for e in self.executors if e.fallback]
        )
        return [e for e in order if await e.available()]
