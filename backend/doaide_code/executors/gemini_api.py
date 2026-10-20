"""Gemini API executors: the default, cheapest paid models for tiers 1-3.

Streams `streamGenerateContent` over SSE. Gemini cannot open files, so it gets the selected
project context in the prompt and proposes edits as SEARCH/REPLACE blocks. The key is sent in
a header from the laptop backend only.
"""

from __future__ import annotations

import json
from collections.abc import AsyncIterator
from typing import Any

import httpx

from ..usage import Usage, usage_for
from .base import CODER_SYSTEM_PROMPT, Executor, ExecutorError, Job

API_BASE = "https://generativelanguage.googleapis.com/v1beta"


class GeminiApiExecutor(Executor):
    needs_context = True
    cacheable = True

    def __init__(
        self,
        api_key: str,
        model: str,
        *,
        name: str,
        tier: int,
        thinking: str | None = None,
        timeout: float = 300,
        transport: httpx.AsyncBaseTransport | None = None,
    ):
        self.api_key = api_key
        self.model = model
        self.name = name
        self.tier = tier
        self.thinking = thinking
        self.timeout = timeout
        self._transport = transport

    async def available(self) -> bool:
        return bool(self.api_key)

    def body(self, job: Job) -> dict[str, Any]:
        contents = [
            {"role": "model" if t.role == "assistant" else "user", "parts": [{"text": t.content}]} for t in job.history
        ]
        prompt = f"{job.context}\n\n# Request\n{job.prompt}" if job.context else job.prompt
        contents.append({"role": "user", "parts": [{"text": prompt}]})
        config: dict[str, Any] = {"temperature": 0.2}
        if self.thinking:
            config["thinkingConfig"] = {"thinkingLevel": self.thinking}
        return {
            "systemInstruction": {"parts": [{"text": CODER_SYSTEM_PROMPT}]},
            "contents": contents,
            "generationConfig": config,
        }

    async def stream(self, job: Job) -> AsyncIterator[str | Usage]:
        if not self.api_key:
            raise ExecutorError("Gemini API key is not configured")
        url = f"{API_BASE}/models/{self.model}:streamGenerateContent?alt=sse"
        metadata: dict[str, Any] = {}
        try:
            async with httpx.AsyncClient(timeout=httpx.Timeout(15, read=self.timeout), transport=self._transport) as client:
                async with client.stream(
                    "POST", url, json=self.body(job), headers={"x-goog-api-key": self.api_key}
                ) as resp:
                    if resp.status_code != 200:
                        raise ExecutorError(_error_text(resp.status_code, await resp.aread()))
                    async for line in resp.aiter_lines():
                        if not line.startswith("data:"):
                            continue
                        try:
                            event = json.loads(line[5:])
                        except json.JSONDecodeError:
                            continue
                        if event.get("error"):
                            raise ExecutorError(f"Gemini: {event['error'].get('message', 'error')}")
                        metadata = event.get("usageMetadata") or metadata
                        for candidate in event.get("candidates", [])[:1]:
                            for part in candidate.get("content", {}).get("parts", []):
                                # Thought summaries are not part of the answer.
                                if part.get("text") and not part.get("thought"):
                                    yield part["text"]
                            if candidate.get("finishReason") in {"SAFETY", "RECITATION", "PROHIBITED_CONTENT"}:
                                raise ExecutorError(f"Gemini stopped the answer ({candidate['finishReason']})")
        except httpx.HTTPError as exc:
            raise ExecutorError(f"Gemini request failed: {exc}") from exc
        if metadata:
            output = int(metadata.get("candidatesTokenCount", 0)) + int(metadata.get("thoughtsTokenCount", 0))
            yield usage_for(self.model, int(metadata.get("promptTokenCount", 0)), output)


def _error_text(status: int, raw: bytes) -> str:
    try:
        message = json.loads(raw)["error"]["message"]
    except (ValueError, KeyError, TypeError):
        message = raw.decode(errors="replace")[:300]
    return f"Gemini returned {status}: {message}"
