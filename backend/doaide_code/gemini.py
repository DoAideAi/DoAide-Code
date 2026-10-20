"""Minimal Gemini client for product-side LLM calls (routing fallback, session titles)."""

from __future__ import annotations

import json
from typing import Any

import httpx

from .usage import Usage, usage_for

API_BASE = "https://generativelanguage.googleapis.com/v1beta"


class GeminiError(RuntimeError):
    pass


class GeminiClient:
    def __init__(self, api_key: str, model: str, *, transport: httpx.AsyncBaseTransport | None = None):
        self.api_key = api_key
        self.model = model
        self._transport = transport

    @property
    def enabled(self) -> bool:
        return bool(self.api_key)

    async def generate(
        self,
        prompt: str,
        *,
        schema: dict[str, Any] | None = None,
        timeout: float = 20,
        usage: list[Usage] | None = None,
    ) -> str:
        """One completion. If `usage` is given, the call's token usage is appended to it."""
        if not self.api_key:
            raise GeminiError("Gemini API key is not configured")
        # Routing and titles need no deliberation; minimal thinking keeps latency down.
        config: dict[str, Any] = {"temperature": 0, "thinkingConfig": {"thinkingLevel": "minimal"}}
        if schema is not None:
            config |= {"responseMimeType": "application/json", "responseSchema": schema}
        body = {"contents": [{"role": "user", "parts": [{"text": prompt}]}], "generationConfig": config}
        try:
            async with httpx.AsyncClient(timeout=timeout, transport=self._transport) as client:
                resp = await client.post(
                    f"{API_BASE}/models/{self.model}:generateContent",
                    json=body,
                    # Header, not query string, so the key never lands in access logs.
                    headers={"x-goog-api-key": self.api_key},
                )
        except httpx.HTTPError as exc:
            raise GeminiError(f"Gemini request failed: {exc}") from exc
        if resp.status_code != 200:
            raise GeminiError(f"Gemini returned {resp.status_code}")
        try:
            data = resp.json()
            parts = data["candidates"][0]["content"]["parts"]
            if usage is not None and isinstance(data.get("usageMetadata"), dict):
                meta = data["usageMetadata"]
                out = int(meta.get("candidatesTokenCount", 0)) + int(meta.get("thoughtsTokenCount", 0))
                usage.append(usage_for(self.model, int(meta.get("promptTokenCount", 0)), out))
            return "".join(p.get("text", "") for p in parts if not p.get("thought"))
        except (KeyError, IndexError, ValueError) as exc:
            raise GeminiError("Gemini returned an unexpected response") from exc

    async def generate_json(
        self, prompt: str, schema: dict[str, Any], *, timeout: float = 20, usage: list[Usage] | None = None
    ) -> dict[str, Any]:
        text = await self.generate(prompt, schema=schema, timeout=timeout, usage=usage)
        try:
            data = json.loads(text)
        except json.JSONDecodeError as exc:
            raise GeminiError("Gemini returned invalid JSON") from exc
        if not isinstance(data, dict):
            raise GeminiError("Gemini returned a non-object JSON value")
        return data
