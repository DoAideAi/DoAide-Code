"""Tiers 0-1: local Ollama chat (free).

Two instances run on the same Ollama: "ollama" (tier 0) with a small fast model for simple
questions, and "ollama-coder" (tier 1) with the strongest coder model that fits in memory for
explanations, small edits and debugging. Both get the short local prompt and only the 2-3 most
relevant files, and `num_ctx` is set per request: Ollama's default window is a few thousand
tokens and silently cuts longer prompts.
"""

from __future__ import annotations

import json
import logging
import os
import re
import time
from collections.abc import AsyncIterator

import httpx

from ..usage import Usage
from ..prompts import few_shot, system_prompt
from .base import Executor, ExecutorError, Job, user_message

# Tokens kept free for the answer, and the window bounds (qwen2.5-coder supports 32k).
ANSWER_RESERVE = 3072
MAX_CTX = 32768
# One window for every request: Ollama reloads a model whenever num_ctx changes (~2 s for a 32B
# model from the page cache, much more from disk), so a fixed 16k that fits DoAide's context and
# history budgets keeps it loaded. Only a prompt that does not fit gets a larger window.
FIXED_CTX = 16384
# Keep models loaded between requests (DOAIDE_OLLAMA_KEEP_ALIVE), and load them when the agent
# starts (warm), so the first task after a break does not wait for a load either.
KEEP_ALIVE = os.environ.get("DOAIDE_OLLAMA_KEEP_ALIVE", "2h")
log = logging.getLogger(__name__)


FAST_CODERS = ("qwen3-coder",)


def num_ctx(messages: list[dict]) -> int:
    """FIXED_CTX, or for a prompt (plus an answer) that does not fit, a larger window in 8k steps
    (~3.5 characters per token)."""
    tokens = sum(len(m["content"]) for m in messages) // 3.5 + ANSWER_RESERVE
    return int(min(MAX_CTX, max(FIXED_CTX, -(-tokens // 8192) * 8192)))


def choose_model(
    configured: str, names: list[str], sizes: dict[str, int] | None = None, *, largest_under: int | None = None
) -> str | None:
    """The configured model if pulled, else the same family, else a coder model, else the
    smallest chat model. `names` is ordered smallest first; embedding models never chat.

    With `largest_under` (bytes), the fallback is the largest coder model that fits, for the
    tier that needs quality more than speed."""
    names = [n for n in names if "embed" not in n.lower()]
    wanted = configured if ":" in configured else f"{configured}:latest"
    if configured and (configured in names or wanted in names):
        return configured if configured in names else wanted
    coders = [n for n in names if "coder" in n]
    if largest_under is not None and sizes:
        # A mixture-of-experts coder (Qwen3-Coder 30B: ~3B parameters active per token) is about
        # as good as a dense 32B one and several times faster: preferred when it fits.
        fast = [n for n in coders if n.startswith(FAST_CODERS) and 0 < sizes.get(n, 0) <= largest_under]
        if fast:
            return fast[-1]
        fitting = [n for n in coders if 0 < sizes.get(n, 0) <= largest_under]
        if fitting:
            return fitting[-1]
    family = configured.split(":")[0]
    return (
        (next((n for n in names if n.startswith(family)), None) if family else None)
        or (coders[0] if coders else None)
        or (names[0] if names else None)
    )


def memory_bytes() -> int:
    try:
        return os.sysconf("SC_PAGE_SIZE") * os.sysconf("SC_PHYS_PAGES")
    except (ValueError, OSError, AttributeError):
        return 16 * 2**30


class OllamaExecutor(Executor):
    name = "ollama"
    tier = 0
    tool = "ollama"
    context_mode = "files"
    cacheable = True
    # Small local models have small windows: the 2-3 most relevant files only.
    context_chars = 24_000
    max_files = 3

    def __init__(
        self,
        base_url: str,
        model: str,
        *,
        name: str = "ollama",
        tier: int = 0,
        prefer_large: bool = False,
        context_chars: int = 24_000,
        transport: httpx.AsyncBaseTransport | None = None,
    ):
        self.base_url = base_url.rstrip("/")
        self.model = model
        self.name = name
        self.tier = tier
        # Strong tier: the largest installed coder model that uses at most 40% of memory.
        self.prefer_large = prefer_large
        self.context_chars = context_chars
        self._transport = transport
        self._resolved: str | None = None
        self._checked_at = 0.0

    def _client(self, timeout: float | httpx.Timeout) -> httpx.AsyncClient:
        return httpx.AsyncClient(base_url=self.base_url, timeout=timeout, transport=self._transport)

    async def resolve_model(self) -> str | None:
        """The installed model to use (see choose_model), rechecked every 30 s."""
        if self._resolved and time.monotonic() - self._checked_at < 30:
            return self._resolved
        try:
            async with self._client(3) as client:
                resp = await client.get("/api/tags")
                resp.raise_for_status()
                models = sorted(resp.json().get("models", []), key=lambda m: m.get("size") or 0)
                names = [m.get("name", "") for m in models]  # smallest first: tier 0 should be fast
                sizes = {m.get("name", ""): int(m.get("size") or 0) for m in models}
        except (httpx.HTTPError, ValueError):
            self._resolved = None
            return None
        budget = int(memory_bytes() * 0.4) if self.prefer_large else None
        chosen = choose_model(self.model, names, sizes, largest_under=budget)
        self._resolved, self._checked_at = chosen, time.monotonic()
        return chosen

    async def available(self) -> bool:
        return await self.resolve_model() is not None

    async def warm(self) -> bool:
        """Load the model (with the window requests use) without generating anything."""
        model = await self.resolve_model()
        if not model:
            return False
        payload = {"model": model, "keep_alive": KEEP_ALIVE, "options": {"num_ctx": FIXED_CTX}}
        try:
            async with self._client(httpx.Timeout(10, read=180)) as client:
                resp = await client.post("/api/generate", json=payload)
        except httpx.HTTPError as exc:
            log.warning("could not preload %s: %s", model, exc)
            return False
        log.info("preloaded %s", model)
        return resp.status_code == 200

    @property
    def history_tokens(self) -> int:  # type: ignore[override]
        """~4k tokens of history for small models, ~8k for 14B and larger (or the coder tier)."""
        size = re.search(r"(\d+(?:\.\d+)?)b\b", (self._resolved or self.model).lower())
        large = float(size.group(1)) >= 14 if size else self.prefer_large
        return 8_000 if large else 4_000

    @property
    def history_turns(self) -> int:  # type: ignore[override]
        return 12 if self.history_tokens > 4_000 else 8

    async def stream(self, job: Job) -> AsyncIterator[str | Usage]:
        model = await self.resolve_model()
        if not model:
            raise ExecutorError("Ollama is not reachable or has no model pulled")
        messages = [{"role": "system", "content": system_prompt("local", job.kind)}]
        for example_user, example_answer in few_shot("local", job.kind):
            messages += [{"role": "user", "content": example_user}, {"role": "assistant", "content": example_answer}]
        if job.summary:
            messages.append({"role": "system", "content": job.summary})
        messages += [{"role": t.role, "content": t.content} for t in job.history]
        messages.append({"role": "user", "content": user_message(job)})
        payload = {
            "model": model,
            "messages": messages,
            "stream": True,
            "keep_alive": KEEP_ALIVE,
            "options": {"num_ctx": num_ctx(messages)},
        }
        try:
            async with self._client(httpx.Timeout(10, read=300)) as client:
                async with client.stream("POST", "/api/chat", json=payload) as resp:
                    if resp.status_code != 200:
                        body = (await resp.aread()).decode(errors="replace")[:300]
                        raise ExecutorError(f"Ollama returned {resp.status_code}: {body}")
                    async for line in resp.aiter_lines():
                        if not line.strip():
                            continue
                        event = json.loads(line)
                        if event.get("error"):
                            raise ExecutorError(f"Ollama: {event['error']}")
                        chunk = event.get("message", {}).get("content", "")
                        if chunk:
                            yield chunk
                        if event.get("done"):
                            # Local and free: report tokens so speed and size are visible, at $0.
                            log.info(
                                "%s: load %.1fs, read %d tokens in %.1fs, wrote %d in %.1fs",
                                model,
                                event.get("load_duration", 0) / 1e9,
                                event.get("prompt_eval_count", 0),
                                event.get("prompt_eval_duration", 0) / 1e9,
                                event.get("eval_count", 0),
                                event.get("eval_duration", 0) / 1e9,
                            )
                            yield Usage(model, int(event.get("prompt_eval_count", 0)), int(event.get("eval_count", 0)))
                            break
        except httpx.HTTPError as exc:
            raise ExecutorError(f"Ollama request failed: {exc}") from exc
