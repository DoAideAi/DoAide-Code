"""Minimal Gemini client for product-side LLM calls (routing fallback, session titles)."""

from __future__ import annotations

import json
from typing import Any

import httpx

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

    async def generate(self, prompt: str, *, schema: dict[str, Any] | None = None, timeout: float = 20) -> str:
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
            parts = resp.json()["candidates"][0]["content"]["parts"]
            return "".join(p.get("text", "") for p in parts)
        except (KeyError, IndexError, ValueError) as exc:
            raise GeminiError("Gemini returned an unexpected response") from exc

    async def generate_json(self, prompt: str, schema: dict[str, Any], *, timeout: float = 20) -> dict[str, Any]:
        text = await self.generate(prompt, schema=schema, timeout=timeout)
        try:
            data = json.loads(text)
        except json.JSONDecodeError as exc:
            raise GeminiError("Gemini returned invalid JSON") from exc
        if not isinstance(data, dict):
            raise GeminiError("Gemini returned a non-object JSON value")
        return data
