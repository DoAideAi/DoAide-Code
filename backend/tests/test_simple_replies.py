"""Short, plain replies for non-technical users: the local prompt asks for them, and the reply
trimmer removes the preamble and sign-offs models add anyway."""

import json

import httpx
import pytest

from doaide_code.executors import Job
from doaide_code.executors.ollama import OllamaExecutor
from doaide_code.prompts import BRIEF, KIND_GUIDANCE, LOCAL_REMINDER, system_prompt
from doaide_code.router import RouterBrain
from doaide_code.runner import Outcome, run_job
from doaide_code.validate import trim_reply

from .conftest import FakeExecutor

pytestmark = pytest.mark.anyio


@pytest.mark.parametrize("kind", [*KIND_GUIDANCE])
def test_local_prompts_ask_for_one_or_two_plain_sentences_and_stay_small(kind):
    prompt = system_prompt("local", kind)
    assert BRIEF in prompt and "Reply in 1-2 sentences" in prompt and "Done — updated [file]" in prompt
    assert "No preamble" in prompt
    assert len(prompt) // 4 < 500  # roughly 4 characters per token


def test_local_explanations_skip_line_numbers():
    assert "line numbers" not in system_prompt("local", "explain")
    assert "line numbers" in system_prompt("claude", "explain")


@pytest.mark.parametrize(
    ("reply", "trimmed"),
    [
        (
            "Great question! Based on the provided code, `router.py` picks which model answers.\n\n"
            "Let me know if you have any other questions!",
            "`router.py` picks which model answers.",
        ),
        ("Sure! The port is 3097.", "The port is 3097."),
        ("Okay, sure, the port is 3097.", "The port is 3097."),
        ("To answer your question, it caches answers.", "It caches answers."),
        ("It sorts the rows. I hope this helps!", "It sorts the rows."),
        ("It sorts the rows.\n\nIf you need any further help, just ask.", "It sorts the rows."),
        ("Looking at the code, it retries once.\n\nFeel free to ask about the details.", "It retries once."),
    ],
)
def test_preamble_and_sign_offs_are_trimmed(reply, trimmed):
    assert trim_reply(reply) == trimmed


@pytest.mark.parametrize(
    "reply",
    [
        "Sure!",  # nothing else to keep
        "Feel free to ask.",
        "Users feel free to edit it. Done.",  # mid-sentence, not a sign-off
        "It caches answers.\n\nThe cache key includes the files.",
    ],
)
def test_replies_without_filler_are_unchanged(reply):
    assert trim_reply(reply) == reply


async def test_a_chat_answer_reaches_the_user_without_filler(store):
    async def nop(_chunk: str) -> None:
        pass

    ex = FakeExecutor("ollama", 0, ["Great question! The router picks the cheapest model that can answer.\n\nHope this helps!"])
    outcome = await run_job(RouterBrain([ex], offline=True), store, Job("what does the router do?"), Outcome(), nop)
    assert outcome.content == "The router picks the cheapest model that can answer."


async def _sent_request(kind: str) -> str:
    seen: list[dict] = []

    def handler(request: httpx.Request) -> httpx.Response:
        if request.url.path == "/api/tags":
            return httpx.Response(200, json={"models": [{"name": "qwen2.5-coder:7b", "size": 1}]})
        seen.append(json.loads(request.content))
        return httpx.Response(200, text='{"message": {"content": "ok"}, "done": true}\n')

    ex = OllamaExecutor("http://x", "qwen2.5-coder:7b", transport=httpx.MockTransport(handler))
    [_ async for _ in ex.stream(Job("what does router.py do?", kind=kind))]
    return seen[0]["messages"][-1]["content"]


async def test_local_questions_end_with_the_short_answer_reminder():
    # Live: the 7b wrote three long jargon sentences until the rule followed the request itself.
    assert (await _sent_request("question")).endswith(LOCAL_REMINDER)
    assert LOCAL_REMINDER not in await _sent_request("edit")  # edits answer with blocks, not prose
