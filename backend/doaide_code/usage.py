"""Token usage and cost per request.

Gemini prices are Google's paid-tier list prices per 1M tokens (ai.google.dev/gemini-api/docs/pricing,
checked 2026-10-21); output includes thinking tokens. Ollama is free. Claude CLI reports its own
API-equivalent cost; Codex prices are OpenAI list prices for the model and are an estimate.
"""

from __future__ import annotations

import datetime as dt
from dataclasses import dataclass


@dataclass
class Usage:
    model: str = ""
    input_tokens: int = 0
    output_tokens: int = 0
    cost_usd: float = 0.0
    # The CLI conversation this run belongs to (Claude Code), so a follow-up can resume it.
    session_id: str = ""
    # Tokens in that conversation at its last model call: what resuming it would re-send.
    context_tokens: int = 0
    # The agent's last message alone, without the narration of its earlier tool rounds ("Let me
    # read runner.py..."): the reply to show. Empty when unknown.
    final_text: str = ""

    def __add__(self, other: Usage) -> Usage:
        return Usage(
            model=other.model or self.model,
            input_tokens=self.input_tokens + other.input_tokens,
            output_tokens=self.output_tokens + other.output_tokens,
            cost_usd=self.cost_usd + other.cost_usd,
            session_id=other.session_id or self.session_id,
            context_tokens=other.context_tokens or self.context_tokens,
            final_text=other.final_text or self.final_text,
        )

    def as_dict(self) -> dict:
        return {
            "tokens_in": self.input_tokens,
            "tokens_out": self.output_tokens,
            "cost_usd": round(self.cost_usd, 6),
        }


# model prefix -> list of (effective from, input $/1M, output $/1M, long-prompt override)
# where the override is (prompt tokens above which it applies, input $/1M, output $/1M).
_LongPrompt = tuple[int, float, float] | None
_PRICES: dict[str, list[tuple[dt.date, float, float, _LongPrompt]]] = {
    "gemini-2.5-flash-lite": [(dt.date.min, 0.10, 0.40, None)],
    "gemini-3.1-flash-lite": [(dt.date.min, 0.25, 1.50, None)],
    "gemini-3.5-flash-lite": [(dt.date.min, 0.30, 2.50, None)],
    "gemini-2.5-flash": [(dt.date.min, 0.30, 2.50, None)],
    "gemini-3.6-flash": [(dt.date.min, 0.75, 3.75, None), (dt.date(2027, 1, 1), 1.50, 7.50, None)],
    "gemini-3.8-flash": [(dt.date.min, 0.75, 3.75, None), (dt.date(2027, 1, 1), 1.50, 7.50, None)],
    "gemini-2.5-pro": [(dt.date.min, 1.25, 10.00, (200_000, 2.50, 15.00))],
    "gemini-3.1-pro-preview": [(dt.date.min, 2.00, 12.00, (200_000, 4.00, 18.00))],
    "gemini-4-argon": [(dt.date.min, 2.00, 10.00, None), (dt.date(2026, 12, 1), 4.00, 20.00, None)],
    "o4-mini": [(dt.date.min, 1.10, 4.40, None)],
}


def known_model(model: str) -> bool:
    return _lookup(model) is not None


def _lookup(model: str):
    # Longest matching prefix, so "gemini-2.5-flash-lite" is not priced as "gemini-2.5-flash".
    for prefix in sorted(_PRICES, key=len, reverse=True):
        if model == prefix or model.startswith(prefix + "-") or model.startswith(prefix + "@"):
            return _PRICES[prefix]
    return None


def price(model: str, input_tokens: int, output_tokens: int, *, on: dt.date | None = None) -> float:
    """List-price cost in USD; 0 for unknown or local models."""
    table = _lookup(model)
    if table is None:
        return 0.0
    day = on or dt.date.today()
    _, rate_in, rate_out, long_prompt = [row for row in table if row[0] <= day][-1]
    if long_prompt is not None and input_tokens > long_prompt[0]:
        rate_in, rate_out = long_prompt[1], long_prompt[2]
    return (input_tokens * rate_in + output_tokens * rate_out) / 1_000_000


def usage_for(model: str, input_tokens: int, output_tokens: int) -> Usage:
    return Usage(model, input_tokens, output_tokens, price(model, input_tokens, output_tokens))


# Claude Sonnet list price per 1M tokens (input, output): what a free answer would have cost had
# it gone to the default paid model ("saved" in the UI and the usage dashboard). Claude Sonnet 5.5,
# which the CLI's `sonnet` alias runs (platform.claude.com/docs/en/about-claude/pricing, 2026-10-21).
SONNET_RATES = (2.00, 10.00)


def sonnet_equivalent(input_tokens: int, output_tokens: int) -> float:
    return (input_tokens * SONNET_RATES[0] + output_tokens * SONNET_RATES[1]) / 1_000_000


def estimate_tokens(text: str) -> int:
    """Rough token count (~4 characters per token) for executors that do not report usage."""
    return max(1, len(text) // 4) if text else 0
