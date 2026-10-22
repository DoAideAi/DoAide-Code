"""`/model`: choose the executor tried first, or go back to automatic routing."""

from __future__ import annotations

import pytest

from doaide_code.commands import is_model_choice, is_models_command
from doaide_code.router import PIN_KEY, RouterBrain, heuristic_tier, model_command

from .conftest import FakeExecutor
from .test_api import drain_until

pytestmark = pytest.mark.anyio


def _router():
    return RouterBrain(
        [FakeExecutor("ollama", 0), FakeExecutor("claude-sonnet", 2), FakeExecutor("claude-opus", 3, up=False)],
        offline=True,
    )


def test_model_is_not_models():
    assert is_model_choice("/model opus") and is_model_choice("/MODEL")
    assert not is_model_choice("/models") and not is_models_command("/model")


async def test_pinned_executor_goes_first_then_the_usual_order(store):
    router = _router()
    simple = heuristic_tier("what is a list?")
    order, _ = await router.plan(simple)
    assert order[0].name == "ollama"

    assert "claude-sonnet" in await model_command(router, store, "/model claude-sonnet")
    assert store.get_setting(PIN_KEY) == "claude-sonnet"
    order, note = await router.plan(simple)
    assert [e.name for e in order] == ["claude-sonnet", "ollama"]
    assert note == "claude-sonnet chosen with /model"

    await model_command(router, store, "/model auto")
    assert router.pinned is None and store.get_setting(PIN_KEY) is None
    assert (await router.plan(simple))[0][0].name == "ollama"


async def test_unavailable_choice_falls_back_to_auto_and_says_so(store):
    router = _router()
    await model_command(router, store, "/model claude-opus")
    order, note = await router.plan(heuristic_tier("what is a list?"))
    assert order[0].name == "ollama" and "claude-opus (chosen with /model) is unavailable" in note


async def test_unknown_names_are_refused_and_show_the_choices(store):
    router = _router()
    reply = await model_command(router, store, "/model gpt-9")
    assert "Unknown model" in reply and "claude-sonnet" in reply and router.pinned is None
    assert "auto" in await model_command(router, store, "/model")


async def test_models_report_lists_choices_and_the_pin(store):
    router = _router()
    await model_command(router, store, "/model ollama")
    report = await router.models()
    assert report["pinned"] == "ollama"
    assert [(c["name"], c["usable"]) for c in report["executors"]] == [
        ("ollama", True),
        ("claude-sonnet", True),
        ("claude-opus", False),
    ]


def test_model_command_over_websocket(client, token, executors):
    with client.websocket_connect(f"/ws?token={token}") as ws:
        ws.receive_json()
        ws.send_json({"type": "send", "text": "/model claude-sonnet"})
        events = drain_until(ws, "models")
        while events[-1]["models"]["pinned"] is None:  # the report sent on connect
            events += drain_until(ws, "models")
        replies = [e["message"]["content"] for e in events if e["type"] == "message" and e["message"]["role"] == "system"]
        assert replies[-1].startswith("Model: claude-sonnet")
        ws.send_json({"type": "send", "text": "what are decorators?"})
        events = drain_until(ws, "done")
    assert events[-1]["content"] == "sonnet answer" and not executors[0].jobs
