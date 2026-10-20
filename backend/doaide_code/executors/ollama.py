"""Tier 0: local Ollama chat (free)."""

from __future__ import annotations

import json
import time
from collections.abc import AsyncIterator

import httpx

from ..usage import Usage
from .base import CODER_SYSTEM_PROMPT, Executor, ExecutorError, Job


class OllamaExecutor(Executor):
    name = "ollama"
    tier = 0
    needs_context = True
    cacheable = True
    # Small local models have small windows; keep their context modest.
    context_chars = 24_000

    def __init__(self, base_url: str, model: str, *, transport: httpx.AsyncBaseTransport | None = None):
        self.base_url = base_url.rstrip("/")
        self.model = model
        self._transport = transport
        self._resolved: str | None = None
        self._checked_at = 0.0

    def _client(self, timeout: float | httpx.Timeout) -> httpx.AsyncClient:
        return httpx.AsyncClient(base_url=self.base_url, timeout=timeout, transport=self._transport)

    async def resolve_model(self) -> str | None:
        """Use the configured model if pulled, else the closest installed coder model."""
        if self._resolved and time.monotonic() - self._checked_at < 30:
            return self._resolved
        try:
            async with self._client(3) as client:
                resp = await client.get("/api/tags")
                resp.raise_for_status()
                models = sorted(resp.json().get("models", []), key=lambda m: m.get("size") or 0)
                names = [m.get("name", "") for m in models]  # smallest first: tier 0 should be fast
        except (httpx.HTTPError, ValueError):
            self._resolved = None
            return None
        wanted = self.model if ":" in self.model else f"{self.model}:latest"
        chosen = None
        if self.model in names or wanted in names:
            chosen = self.model if self.model in names else wanted
        else:
            family = self.model.split(":")[0]
            chosen = next((n for n in names if n.startswith(family)), None)
            chosen = chosen or next((n for n in names if "coder" in n), None)
        self._resolved, self._checked_at = chosen, time.monotonic()
        return chosen

    async def available(self) -> bool:
        return await self.resolve_model() is not None

    async def stream(self, job: Job) -> AsyncIterator[str | Usage]:
        model = await self.resolve_model()
        if not model:
            raise ExecutorError("Ollama is not reachable or has no coder model pulled")
        messages = [{"role": "system", "content": CODER_SYSTEM_PROMPT}]
        messages += [{"role": t.role, "content": t.content} for t in job.history]
        prompt = f"{job.context}\n\n# Request\n{job.prompt}" if job.context else job.prompt
        messages.append({"role": "user", "content": prompt})
        payload = {"model": model, "messages": messages, "stream": True}
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
                            yield Usage(model, int(event.get("prompt_eval_count", 0)), int(event.get("eval_count", 0)))
                            break
        except httpx.HTTPError as exc:
            raise ExecutorError(f"Ollama request failed: {exc}") from exc
