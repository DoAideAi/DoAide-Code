"""Model detection: what the laptop can run comes from the installed tools, never from a model."""

from __future__ import annotations

import json
from collections.abc import Sequence
from typing import Any

import pytest

from doaide_code.agent import LaptopAgent
from doaide_code.commands import is_models_command
from doaide_code.detect import (
    ModelDetector,
    asks_about_models,
    clean_pin,
    format_report,
    meta_question,
    parse_ollama_list,
    pin_problem,
    same_report,
)
from doaide_code.executors import Turn
from doaide_code.executors.base import CODER_SYSTEM_PROMPT
from doaide_code.runner import cache_key, strip_meta_turns
from doaide_code.executors import Job
from doaide_code.router import RouterBrain
from doaide_code.runner import Outcome, run_job

from .conftest import FakeExecutor
from .test_api import drain_until
from .test_relay import agent_token, hub  # noqa: F401  (fixtures)

pytestmark = pytest.mark.anyio

OLLAMA_LIST = """NAME                     ID              SIZE      MODIFIED
qwen2.5-coder:32b        b92d6a0bd47e    19 GB     15 hours ago
qwen2.5-coder:7b         dae161e27b0e    4.7 GB    15 hours ago
llama3.2:latest          a80c4f17acd5    2.0 GB    19 months ago
"""

CLAUDE_SIGNED_IN = json.dumps({"loggedIn": True, "authMethod": "claude.ai", "subscriptionType": "max"})


def fake_run(table: dict[tuple[str, ...], Any]) -> Any:
    """A `run` for ModelDetector: argv -> result, or an exception class to raise."""
    calls: list[tuple[str, ...]] = []

    async def run(argv: Sequence[str], timeout: float):
        calls.append(tuple(argv))
        result = table.get(tuple(argv), FileNotFoundError)
        if isinstance(result, type):
            raise result()
        return result

    run.calls = calls  # type: ignore[attr-defined]
    return run


ALL_READY = {
    ("ollama", "list"): (0, OLLAMA_LIST, ""),
    ("claude", "--version"): (0, "2.1.185 (Claude Code)\n", ""),
    ("claude", "auth", "status"): (0, CLAUDE_SIGNED_IN, ""),
    ("codex", "--version"): (0, "codex-cli 0.163.0\n", ""),
    ("codex", "login", "status"): (0, "Logged in using ChatGPT\n", ""),
}


def tools(report) -> dict[str, dict]:
    return {t["id"]: t for t in report["tools"]}


def test_parse_ollama_list():
    assert parse_ollama_list(OLLAMA_LIST) == [
        ("qwen2.5-coder:32b", 19 * 10**9),
        ("qwen2.5-coder:7b", 4_700_000_000),
        ("llama3.2:latest", 2 * 10**9),
    ]
    assert parse_ollama_list("NAME    ID    SIZE    MODIFIED\n") == []


async def test_detects_everything_ready(settings):
    settings.codex_home.mkdir()
    (settings.codex_home / "config.toml").write_text('model = "gpt-6-astra"\nmodel_reasoning_effort = "high"\n')
    settings.codex_models = ("o3",)
    report = await ModelDetector(settings, run=fake_run(ALL_READY)).detect()
    found = tools(report)
    assert report["any_usable"] is True
    assert found["ollama"]["state"] == "ready"
    assert found["ollama"]["models"] == ["qwen2.5-coder:32b", "qwen2.5-coder:7b", "llama3.2:latest"]
    # The model DoAide will use: no qwen3-coder, so the smallest coder model.
    assert found["ollama"]["default"] == "qwen2.5-coder:7b"
    assert found["claude"] == {
        "id": "claude", "label": "Claude CLI", "state": "signed_in", "usable": True,
        "detail": "signed in (max)", "version": "2.1.185", "choices": ["haiku", "sonnet", "opus"],
    }
    # Codex offers the model from its own config.toml (the only kind a ChatGPT login accepts) first.
    assert found["codex"]["choices"] == ["gpt-6-astra", "o3"]
    assert found["ollama"]["choices"] == found["ollama"]["models"]
    assert found["codex"]["state"] == "signed_in" and found["codex"]["version"] == "0.163.0"


async def test_detects_missing_stopped_and_signed_out(settings):
    run = fake_run(
        {
            ("ollama", "list"): (1, "", "Error: could not connect to ollama app, is it running?"),
            ("claude", "--version"): (0, "2.1.185 (Claude Code)", ""),
            ("claude", "auth", "status"): (1, json.dumps({"loggedIn": False}), ""),
            # codex is not installed at all
        }
    )
    report = await ModelDetector(settings, run=run).detect()
    found = tools(report)
    assert report["any_usable"] is False
    assert found["ollama"]["state"] == "not_running" and "is it running" in found["ollama"]["detail"]
    assert found["claude"]["state"] == "signed_out" and "claude auth login" in found["claude"]["setup"]
    assert found["codex"]["state"] == "not_found" and "npm install -g @openai/codex" in found["codex"]["setup"]

    text = format_report(report)
    assert "No model is available" in text
    assert "ollama serve" in text and "claude auth login" in text and "codex login" in text
    # Nothing but what was detected: no invented providers or models.
    assert "OpenAI model" not in text and "gpt" not in text.lower()


async def test_no_models_disabled_and_old_cli(settings):
    settings.use_codex_cli = False
    run = fake_run(
        {
            ("ollama", "list"): (0, "NAME    ID    SIZE    MODIFIED\n", ""),
            ("claude", "--version"): (0, "1.0.3", ""),
            ("claude", "auth", "status"): (1, "", "error: unknown command 'auth'"),
        }
    )
    found = tools(await ModelDetector(settings, run=run).detect())
    assert found["ollama"]["state"] == "no_models" and found["ollama"]["usable"] is False
    # Sign-in cannot be checked on old CLIs: still offered, the run itself will tell.
    assert found["claude"]["state"] == "unknown" and found["claude"]["usable"] is True
    assert found["codex"]["state"] == "disabled"
    assert ("codex", "--version") not in run.calls


async def test_timeouts_count_as_failures(settings):
    report = await ModelDetector(settings, run=fake_run({**ALL_READY, ("ollama", "list"): TimeoutError})).detect()
    assert tools(report)["ollama"]["state"] == "not_running"


async def test_report_is_cached_until_forced(settings):
    run = fake_run(ALL_READY)
    detector = ModelDetector(settings, run=run, ttl=60)
    first = await detector.detect()
    assert await detector.detect() is first
    calls = len(run.calls)
    second = await detector.detect(force=True)
    assert len(run.calls) == 2 * calls and same_report(first, second)


def test_asks_about_models():
    for prompt in [
        "what models are available?",
        "Which models do you have",
        "which LLMs are installed on my laptop?",
        "list models",
        "show me the available models",
        "what models can you use",
        "which executors are running?",
    ]:
        assert asks_about_models(prompt), prompt
    for prompt in [
        "which model class should I use for the user table?",
        "add a models.py with a User model",
        "explain the data models in this repo",
        "what is a large language model",
    ]:
        assert not asks_about_models(prompt), prompt


def test_models_command():
    assert is_models_command("/models") and is_models_command(" /status ")
    assert not is_models_command("/model-ish") and not is_models_command("models")


async def test_router_skips_executors_whose_tool_is_unusable(settings):
    run = fake_run({**ALL_READY, ("claude", "auth", "status"): (1, json.dumps({"loggedIn": False}), "")})
    ollama, claude = FakeExecutor("ollama", 0), FakeExecutor("claude-sonnet", 2)
    ollama.tool, claude.tool = "ollama", "claude"
    router = RouterBrain([ollama, claude], offline=True, detector=ModelDetector(settings, run=run))
    # The signed-out Claude CLI is never tried, even though its binary exists.
    assert [e.name for e in await router.candidates(2)] == ["ollama"]


async def test_model_questions_are_answered_by_detection_not_a_model(settings, store):
    executor = FakeExecutor("ollama", 0, ["We have GPT-4 and other OpenAI models."])
    executor.tool = "ollama"
    router = RouterBrain([executor], offline=True, detector=ModelDetector(settings, run=fake_run(ALL_READY)))
    seen: list[str] = []

    async def on_delta(chunk: str) -> None:
        seen.append(chunk)

    outcome = await run_job(router, store, Job("what models are available?"), Outcome(), on_delta)
    assert outcome.status == "done" and outcome.executor == "direct"
    assert executor.jobs == []
    assert "qwen2.5-coder:7b (default)" in outcome.content and "OpenAI" not in outcome.content
    assert outcome.meta()["usage"]["tokens_in"] == 0


async def test_agent_answers_models_command_and_reports_changes(settings, store, tmp_path):
    table = dict(ALL_READY)
    router = RouterBrain([FakeExecutor("ollama", 0)], offline=True, detector=ModelDetector(settings, run=fake_run(table)))
    agent = LaptopAgent(store, router, "owner@example.com", workspace=str(tmp_path / "ws"))
    hello = await agent.hello()
    assert tools(hello["models"])["codex"]["state"] == "signed_in"

    events: list[dict] = []

    async def send(event: dict) -> None:
        events.append(event)

    # Unchanged: nothing is sent.
    await agent.send_models(send, force=True)
    assert events == []
    # Codex signed out: the hub hears about it.
    table[("codex", "login", "status")] = (1, "Not logged in\n", "")
    await agent.send_models(send, force=True)
    assert events[-1]["type"] == "models" and tools(events[-1]["models"])["codex"]["state"] == "signed_out"

    await agent.on_message({"type": "job", "id": "j1", "text": "/models"}, send)
    await agent._task
    done = next(e for e in events if e.get("type") == "done")
    assert done["role"] == "system" and "**Codex CLI**: not signed in" in done["content"]


def test_hub_relays_laptop_models_to_browsers(hub, token, agent_token):  # noqa: F811
    report = {"checked_at": 1, "any_usable": True, "tools": [{"id": "ollama", "label": "Ollama", "state": "ready",
                                                                 "usable": True, "detail": "", "models": ["llama3:latest"]}]}
    with hub.websocket_connect(f"/ws?token={token}") as browser:
        assert browser.receive_json()["models"] is None
        browser.send_json({"type": "send", "text": "/models"})
        drain_until(browser, "message")  # the user's own message
        events = drain_until(browser, "message")
        # Laptop offline: the hub says so instead of guessing.
        assert "laptop is offline" in events[-1]["message"]["content"]

        with hub.websocket_connect(f"/agent?token={agent_token}") as laptop:
            laptop.send_json({"type": "hello", "project": None, "executors": ["ollama"], "models": report})
            assert drain_until(browser, "models")[-1]["models"] == report
            assert hub.get("/api/session", headers={"Authorization": f"Bearer {token}"}).json()["models"] == report
            changed = {**report, "any_usable": False, "tools": []}
            laptop.send_json({"type": "models", "models": changed})
            assert drain_until(browser, "models")[-1]["models"] == changed
            # Malformed reports are ignored.
            laptop.send_json({"type": "models", "models": "gpt-4, gpt-4o"})
            laptop.send_json({"type": "project", "project": "x"})
            assert all(e["type"] != "models" for e in drain_until(browser, "project"))


def test_local_socket_sends_detected_models(client, token):
    with client.websocket_connect(f"/ws?token={token}") as ws:
        assert ws.receive_json()["type"] == "snapshot"
        models = ws.receive_json()
        assert models["type"] == "models"
        assert {t["id"] for t in models["models"]["tools"]} == {"ollama", "codex", "claude-sonnet", "claude-opus"}


# Round two: the production prompts that still reached qwen2.5-coder:7b, plus identity questions.


def test_meta_questions_in_any_wording():
    cases = {
        "list of models that you have access to ?": "models",
        "what are the model you have access to": "models",
        "which LLMs can you use": "models",
        "can I switch models?": "models",
        "who are you": "identity",
        "Who made you?": "identity",
        "are you gpt-4": "identity",
        "what model are you": "identity",
        "tell me about yourself": "identity",
        "what can you do?": "capabilities",
        "what are your capabilities": "capabilities",
        "how can you help me": "capabilities",
    }
    for prompt, kind in cases.items():
        assert meta_question(prompt) == kind, prompt
    for prompt in [
        "fix the bug in models/user.py",
        "write a django model for orders",
        "how do I train a model in pytorch",
        "what are you doing in this function",
        "explain the data models in this repo",
    ]:
        assert meta_question(prompt) is None, prompt


async def test_identity_is_answered_without_a_model(settings, store):
    executor = FakeExecutor("ollama", 0, ["As an AI developed by OpenAI, I have GPT-4 and DALL-E 2."])
    executor.tool = "ollama"
    router = RouterBrain([executor], offline=True, detector=ModelDetector(settings, run=fake_run(ALL_READY)))

    async def on_delta(chunk: str) -> None:
        pass

    for prompt in ["who made you?", "list of models that you have access to ?", "what can you do"]:
        outcome = await run_job(router, store, Job(prompt), Outcome(), on_delta)
        assert outcome.executor == "direct", prompt
        assert "OpenAI, I" not in outcome.content and "DALL-E" not in outcome.content
    assert executor.jobs == []
    outcome = await run_job(router, store, Job("who are you"), Outcome(), on_delta)
    assert "DoAide Code" in outcome.content and "not made by OpenAI" in outcome.content


def test_system_prompt_states_identity():
    assert "You are NOT GPT-4" in CODER_SYSTEM_PROMPT
    assert "Never claim to be made by OpenAI or have access to GPT/DALL-E models" in CODER_SYSTEM_PROMPT


async def test_hallucinated_history_is_not_fed_back(settings, store):
    executor = FakeExecutor("ollama", 0, ["ok"])
    router = RouterBrain([executor], offline=True)
    history = [
        Turn("user", "what are the model you have access to"),
        Turn("assistant", "I have access to GPT-4, GPT-3.5-turbo and DALL-E 2."),
        Turn("user", "explain decorators"),
        Turn("assistant", "A decorator wraps a function."),
    ]
    assert strip_meta_turns(history) == history[2:]

    async def on_delta(chunk: str) -> None:
        pass

    await run_job(router, store, Job("and generators?", history=history), Outcome(), on_delta)
    assert [t.content for t in executor.jobs[0].history] == ["explain decorators", "A decorator wraps a function."]


def test_cache_clear_and_pin_in_cache_key(store):
    store.cache_put("k1", "As an AI developed by OpenAI...", "ollama")
    store.cache_put("k2", "x", "ollama")
    assert store.cache_clear() == 2 and store.cache_get("k1", 3600) is None
    job = Job("explain x")
    assert cache_key(job, None) != cache_key(job, None, {"tool": "claude", "model": "opus"})


class ModelEcho(FakeExecutor):
    """Answers with the model it was asked to run, like `claude --model X`."""

    def __init__(self, name, tier, tool, model):
        super().__init__(name, tier)
        self.tool, self.model = tool, model

    async def stream(self, job):
        self.jobs.append(job)
        yield f"ran {self.tool} --model {self.model}"


async def test_pinned_model_runs_alone(settings, store):
    ollama = ModelEcho("ollama", 0, "ollama", "qwen2.5-coder:7b")
    claude = ModelEcho("claude-haiku", 1, "claude", "haiku")
    router = RouterBrain([ollama, claude], offline=True, detector=ModelDetector(settings, run=fake_run(ALL_READY)))

    async def on_delta(chunk: str) -> None:
        pass

    outcome = await run_job(router, store, Job("explain x"), Outcome(), on_delta, pin={"tool": "claude", "model": "opus"})
    assert outcome.status == "done" and outcome.content == "ran claude --model opus"
    assert outcome.executor == "claude:opus" and claude.model == "haiku"  # the template is untouched
    outcome = await run_job(
        router, store, Job("explain y"), Outcome(), on_delta, pin={"tool": "ollama", "model": "llama3.2:latest"}
    )
    assert outcome.content == "ran ollama --model llama3.2:latest"

    # Not installed, or the tool is signed out: a clear error, never a silent switch to another model.
    outcome = await run_job(router, store, Job("explain z"), Outcome(), on_delta, pin={"tool": "ollama", "model": "gpt-4"})
    assert outcome.status == "error" and "has no model 'gpt-4'" in outcome.content
    assert ollama.jobs[-1].prompt == "explain y"


def test_pin_validation():
    assert clean_pin({"tool": "claude", "model": "opus"}) == {"tool": "claude", "model": "opus"}
    assert clean_pin({"tool": "openai", "model": "gpt-4"}) is None
    assert clean_pin({"tool": "ollama", "model": "x; rm -rf /"}) is None
    assert clean_pin(None) is None
    report = {"tools": [{"id": "codex", "label": "Codex CLI", "state": "signed_out", "usable": False,
                         "setup": "Sign in: `codex login`."}]}
    assert pin_problem({"tool": "codex", "model": "o3"}, report) == "Codex CLI is not signed in. Sign in: `codex login`."


def test_hub_stores_model_choice_and_sends_it_with_jobs(hub, token, agent_token):  # noqa: F811
    with hub.websocket_connect(f"/ws?token={token}") as browser:
        assert browser.receive_json()["model_pref"] is None
        browser.send_json({"type": "set_model", "model": {"tool": "claude", "model": "opus"}})
        assert drain_until(browser, "model_pref")[-1]["pref"] == {"tool": "claude", "model": "opus"}
        browser.send_json({"type": "send", "text": "explain this"})
        drain_until(browser, "status")
        with hub.websocket_connect(f"/agent?token={agent_token}") as laptop:
            job = laptop.receive_json()
            assert job["model"] == {"tool": "claude", "model": "opus"}
        # Invalid choices reset to automatic routing.
        browser.send_json({"type": "set_model", "model": {"tool": "openai", "model": "gpt-4"}})
        assert drain_until(browser, "model_pref")[-1]["pref"] is None
    # Remembered across reconnects (and devices).
    browser_snapshot = hub.get("/api/session", headers={"Authorization": f"Bearer {token}"}).json()
    assert browser_snapshot["model_pref"] is None


def test_local_model_choice_persists(client, token):
    with client.websocket_connect(f"/ws?token={token}") as ws:
        assert ws.receive_json()["model_pref"] is None
        ws.send_json({"type": "set_model", "model": {"tool": "ollama", "model": "llama3:latest"}})
        assert drain_until(ws, "model_pref")[-1]["pref"] == {"tool": "ollama", "model": "llama3:latest"}
    with client.websocket_connect(f"/ws?token={token}") as ws:
        assert ws.receive_json()["model_pref"] == {"tool": "ollama", "model": "llama3:latest"}


async def test_agent_runs_the_model_sent_by_the_hub(settings, store, tmp_path):
    codex = ModelEcho("codex", 1, "codex", "o4-mini")
    router = RouterBrain([codex], offline=True, detector=ModelDetector(settings, run=fake_run(ALL_READY)))
    agent = LaptopAgent(store, router, "owner@example.com", workspace=str(tmp_path / "ws"))
    events: list[dict] = []

    async def send(event: dict) -> None:
        events.append(event)

    await agent.on_message({"type": "job", "id": "j", "text": "explain x", "model": {"tool": "codex", "model": "default"}}, send)
    await agent._task
    assert events[-1]["content"] == "ran codex --model default"


async def test_codex_without_config_offers_its_default(settings):
    found = tools(await ModelDetector(settings, run=fake_run(ALL_READY)).detect())
    assert found["codex"]["choices"] == ["default"]
