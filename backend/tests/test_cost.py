"""Gemini-first execution, CLI fallbacks, and per-request token usage and cost."""

from __future__ import annotations

import datetime as dt
import json

import httpx
import pytest

from doaide_code.config import Settings
from doaide_code.executors import ExecutorError, GeminiApiExecutor, Job, Turn, build_executors
from doaide_code.gemini import GeminiClient
from doaide_code.relay import clean_meta
from doaide_code.router import RouterBrain
from doaide_code.runner import Outcome, run_job
from doaide_code.usage import Usage, price, usage_for

from .conftest import FakeExecutor
from .test_api import drain_until

pytestmark = pytest.mark.anyio


# Pricing


def test_prices_match_google_list_prices():
    assert price("gemini-3.1-flash-lite", 1_000_000, 1_000_000) == pytest.approx(0.25 + 1.50)
    # Longest prefix wins: flash-lite is not priced as flash.
    assert price("gemini-2.5-flash-lite", 1_000_000, 0) == pytest.approx(0.10)
    assert price("gemini-2.5-flash", 1_000_000, 0) == pytest.approx(0.30)
    # Long prompts on Pro cost more.
    assert price("gemini-3.1-pro-preview", 100_000, 0) == pytest.approx(0.20)
    assert price("gemini-3.1-pro-preview", 300_000, 0) == pytest.approx(1.20)
    # Scheduled price changes apply from their date.
    assert price("gemini-3.8-flash", 1_000_000, 0, on=dt.date(2026, 10, 21)) == pytest.approx(0.75)
    assert price("gemini-3.8-flash", 1_000_000, 0, on=dt.date(2027, 1, 1)) == pytest.approx(1.50)
    assert price("qwen3-coder:latest", 10_000, 10_000) == 0.0


def test_usage_adds_up():
    total = usage_for("gemini-3.1-flash-lite", 1000, 100) + Usage("x", 10, 1, 0.5)
    assert (total.input_tokens, total.output_tokens) == (1010, 101)
    assert total.as_dict() == {"tokens_in": 1010, "tokens_out": 101, "cost_usd": pytest.approx(0.50040, abs=1e-6)}


# Gemini executor


def sse(events: list[dict]) -> bytes:
    return "".join(f"data: {json.dumps(e)}\r\n\r\n" for e in events).encode()


def gemini_transport(events, seen, status=200):
    def handler(request: httpx.Request) -> httpx.Response:
        seen.append(request)
        if status != 200:
            return httpx.Response(status, json={"error": {"message": "API key not valid"}})
        return httpx.Response(200, content=sse(events))

    return httpx.MockTransport(handler)


async def test_gemini_streams_text_skips_thoughts_and_reports_usage():
    seen: list[httpx.Request] = []
    events = [
        {"candidates": [{"content": {"parts": [{"text": "thinking...", "thought": True}]}}]},
        {"candidates": [{"content": {"parts": [{"text": "Hello"}]}}]},
        {
            "candidates": [{"content": {"parts": [{"text": " world"}]}, "finishReason": "STOP"}],
            "usageMetadata": {"promptTokenCount": 1000, "candidatesTokenCount": 50, "thoughtsTokenCount": 50},
        },
    ]
    ex = GeminiApiExecutor("k", "gemini-3.1-flash-lite", name="gemini-lite", tier=1, thinking="low",
                           transport=gemini_transport(events, seen))
    job = Job("fix it", history=[Turn("user", "hi"), Turn("assistant", "hello")], context="# src/a.py\nx = 1")
    out = [c async for c in ex.stream(job)]
    assert out[:2] == ["Hello", " world"]
    assert out[2] == usage_for("gemini-3.1-flash-lite", 1000, 100)

    request = seen[0]
    assert request.headers["x-goog-api-key"] == "k" and "key=" not in str(request.url)
    assert str(request.url).endswith("gemini-3.1-flash-lite:streamGenerateContent?alt=sse")
    body = json.loads(request.content)
    assert [c["role"] for c in body["contents"]] == ["user", "model", "user"]
    assert body["contents"][-1]["parts"][0]["text"].startswith("# src/a.py")
    assert "SEARCH" in body["systemInstruction"]["parts"][0]["text"]
    assert body["generationConfig"]["thinkingConfig"] == {"thinkingLevel": "low"}


async def test_gemini_errors_are_readable():
    ex = GeminiApiExecutor("bad", "m", name="g", tier=1, transport=gemini_transport([], [], status=400))
    with pytest.raises(ExecutorError, match="400: API key not valid"):
        [c async for c in ex.stream(Job("hi"))]
    assert not await GeminiApiExecutor("", "m", name="g", tier=1).available()


async def test_gemini_classifier_reports_its_usage():
    def handler(request):
        return httpx.Response(
            200,
            json={
                "candidates": [{"content": {"parts": [{"text": '{"tier": 2, "complexity": 2}'}]}}],
                "usageMetadata": {"promptTokenCount": 300, "candidatesTokenCount": 10},
            },
        )

    gemini = GeminiClient("k", "gemini-3.1-flash-lite", transport=httpx.MockTransport(handler))
    decision = await RouterBrain([], gemini=gemini).classify("refactor the auth module")
    assert decision.tier == 2 and decision.usage == usage_for("gemini-3.1-flash-lite", 300, 10)


# Routing order


def test_gemini_is_the_default_and_clis_can_be_disabled(settings):
    settings.gemini_api_key = "k"
    names = [(e.name, e.tier, e.fallback) for e in build_executors(settings)]
    assert names[:4] == [("ollama", 0, False), ("gemini-lite", 1, False), ("gemini-flash", 2, False), ("gemini-pro", 3, False)]
    assert all(fallback for _, _, fallback in names[4:])
    settings.use_claude_cli = False
    settings.use_codex_cli = False
    assert [e.name for e in build_executors(settings)] == ["ollama", "gemini-lite", "gemini-flash", "gemini-pro"]


def test_default_models_are_gemini(monkeypatch):
    for key in ("DOAIDE_GEMINI_MODEL", "DOAIDE_GEMINI_LITE_MODEL", "DOAIDE_GEMINI_FLASH_MODEL", "DOAIDE_GEMINI_PRO_MODEL"):
        monkeypatch.delenv(key, raising=False)
    s = Settings()
    assert (s.gemini_model, s.gemini_lite_model, s.gemini_flash_model, s.gemini_pro_model) == (
        "gemini-3.1-flash-lite",
        "gemini-3.1-flash-lite",
        "gemini-3.8-flash",
        "gemini-3.1-pro-preview",
    )


async def test_subscription_clis_only_after_every_primary_executor():
    def fallback(name, tier):
        ex = FakeExecutor(name, tier)
        ex.fallback = True
        return ex

    execs = [
        FakeExecutor("ollama", 0),
        FakeExecutor("gemini-lite", 1),
        FakeExecutor("gemini-flash", 2),
        FakeExecutor("gemini-pro", 3),
        fallback("codex", 1),
        fallback("claude-sonnet", 2),
        fallback("claude-opus", 3),
    ]
    brain = RouterBrain(execs)
    assert [e.name for e in await brain.candidates(2)] == [
        "gemini-flash", "gemini-pro", "gemini-lite", "ollama", "claude-sonnet", "claude-opus", "codex",
    ]
    execs[1].up = execs[2].up = execs[3].up = False  # no Gemini key
    assert [e.name for e in await brain.candidates(1)][:2] == ["ollama", "codex"]


# Usage tracking


class Metered(FakeExecutor):
    async def stream(self, job):
        async for chunk in super().stream(job):
            yield chunk
        yield usage_for("gemini-3.1-flash-lite", 2000, 400)


async def test_run_job_accumulates_and_logs_usage(store):
    brain = RouterBrain([Metered("gemini-lite", 0, ["ok"])], offline=True)
    outcome = Outcome()

    async def ignore(_):
        pass

    await run_job(brain, store, Job("hi"), outcome, ignore, source="mcp")
    assert outcome.content == "ok" and outcome.status == "done"
    assert outcome.meta() == {"usage": {"tokens_in": 2000, "tokens_out": 400, "cost_usd": pytest.approx(0.0011)}}
    (row,) = store.usage_summary()
    assert row["executor"] == "gemini-lite" and row["tokens_in"] == 2000 and row["calls"] == 1


async def test_chat_reply_carries_usage_to_every_device(settings, store):
    from fastapi.testclient import TestClient

    from doaide_code.auth import User, issue_token
    from doaide_code.main import create_app

    app = create_app(settings, executors=[Metered("ollama", 0, ["Hi"])])
    token = issue_token(settings, User(email="owner@example.com"))
    with TestClient(app, client=("127.0.0.1", 1)) as client, client.websocket_connect(f"/ws?token={token}") as ws:
        ws.receive_json()
        ws.send_json({"type": "send", "text": "hello"})
        done = drain_until(ws, "done")[-1]
        assert done["meta"]["usage"]["tokens_in"] == 2000
        reply = client.get("/api/session", headers={"Authorization": f"Bearer {token}"}).json()["messages"][-1]
    assert reply["meta"]["usage"] == done["meta"]["usage"]
    assert "executor" not in reply  # model names stay server-side


def test_hub_only_keeps_known_meta_from_laptop():
    meta = {"usage": {"tokens_in": 1}, "changes": {"id": "c"}, "evil": {"x": 1}, "usage2": "nope"}
    assert clean_meta(meta) == {"usage": {"tokens_in": 1}, "changes": {"id": "c"}}
    assert clean_meta({"usage": {"blob": "x" * 600_000}}) == {}
    assert clean_meta("nope") == {}


def test_usage_command_summarises_spend(store):
    from doaide_code.commands import run_command

    store.record_usage("chat", "gemini-lite", "gemini-3.1-flash-lite", 1000, 200, 0.00055)
    store.record_usage("chat", "ollama", "qwen", 500, 50, 0.0)
    text = run_command(store, "owner@example.com", "/usage").text
    assert text.splitlines()[0].startswith("Today    $0.0006  1,750 tokens  2 calls")
    assert "gemini-lite" in text and "ollama" in text
