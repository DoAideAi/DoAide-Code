"""Jev: structured routing decisions through the TypeSafe SDK.

Jev never writes an answer. It asks two typed questions about a user message:
a `Choice` of the cheapest capable tier and a `Score` of task complexity.
"""

from __future__ import annotations

from dataclasses import dataclass
from typing import Any

TIER_CRITERIA: dict[str, str] = {
    "tier0": "Simple: explanations, syntax questions, small snippets, renames, one-line fixes. A small local model can answer.",
    "tier1": "Routine edits: implementing a small function, writing a test, a focused bug fix in one or two files.",
    "tier2": "Substantial work: multi-file features, non-trivial debugging, refactors that need repository context.",
    "tier3": "Hard: architecture or system design, security review, concurrency or performance deep dives, large migrations.",
}

COMPLEXITY_RUBRIC = [
    "Trivial: answerable from general knowledge in a few lines.",
    "Low: small, well-scoped change or question.",
    "Medium: requires reading several files or careful multi-step reasoning.",
    "High: broad, ambiguous, or high-risk work needing expert judgment.",
]


@dataclass(frozen=True)
class JevDecision:
    tier: int
    confidence: float
    complexity: float
    model: str


class JevExecutor:
    name = "jev"

    def __init__(self, api_key: str, *, client: Any | None = None, timeout: float = 8.0):
        self.api_key = api_key
        self.timeout = timeout
        self._client = client

    @property
    def enabled(self) -> bool:
        # The key file may hold placeholder text until a real key is added.
        key = self.api_key
        return bool(self._client) or (bool(key) and key.isascii() and key.isprintable() and not any(c.isspace() for c in key))

    def _get_client(self) -> Any:
        if self._client is None:
            from typesafe_sdk import AsyncTypeSafeClient

            self._client = AsyncTypeSafeClient(api_key=self.api_key, timeout=self.timeout)
        return self._client

    async def decide(self, message: str, *, project: str | None = None) -> JevDecision:
        from typesafe_sdk import Choice, Score

        state: dict[str, Any] = {"request": message[:6000]}
        if project:
            state["project"] = project
        response = await self._get_client().system_one(
            state=state,
            questions={
                "tier": Choice(
                    instructions="Which is the cheapest tier of coding assistant that can fully handle this request?",
                    criteria=TIER_CRITERIA,
                ),
                "complexity": Score(
                    instructions="How complex is this software engineering request?",
                    criteria=COMPLEXITY_RUBRIC,
                ),
            },
        )
        choice = response.choices["tier"]
        score = response.scores["complexity"]
        return JevDecision(
            tier=int(choice.choice.removeprefix("tier")),
            confidence=float(choice.confidence),
            complexity=float(score.score),
            model=response.model,
        )

    async def aclose(self) -> None:
        if self._client is not None and hasattr(self._client, "aclose"):
            await self._client.aclose()
