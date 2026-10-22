"""The buffered local attempt streams as a draft, so users see progress before it is checked."""

from __future__ import annotations

import pytest

from doaide_code.executors import Job
from doaide_code.router import RouterBrain
from doaide_code.runner import Outcome, run_job
from doaide_code.sync import MIRRORED, draft_event

from .test_escalation import GOOD, local, paid

pytestmark = pytest.mark.anyio


async def run(executors, prompt, store):
    sent: list[str] = []
    drafts: list[str | None] = []

    async def on_delta(chunk: str) -> None:
        sent.append(chunk)

    async def on_draft(chunk: str | None) -> None:
        drafts.append(chunk)

    outcome = await run_job(RouterBrain(executors, offline=True), store, Job(prompt), Outcome(), on_delta, on_draft=on_draft)
    return outcome, "".join(sent), drafts


async def test_a_passing_local_answer_streams_as_a_draft_then_lands(store):
    ollama = local("ollama", 0, [GOOD[:20], GOOD[20:]])
    outcome, sent, drafts = await run([ollama, paid("claude-sonnet", 2)], "how do I sort a list in python", store)
    assert drafts == [GOOD[:20], GOOD[20:]] and sent == GOOD and outcome.executor == "ollama"


async def test_an_escalated_draft_is_cleared(store):
    broken = "Here:\n```python\ndef sort_list(xs)\n    return sorted(xs)\n```"
    ollama = local("ollama", 0, [broken])
    sonnet = paid("claude-sonnet", 2, [GOOD])
    outcome, sent, drafts = await run([ollama, sonnet], "how do I sort a list in python", store)
    assert drafts[0] == broken and drafts[-1] is None
    assert sent == GOOD and outcome.executor == "claude-sonnet"


async def test_without_an_escalation_target_the_answer_streams_directly(store):
    ollama = local("ollama", 0, [GOOD])
    _, sent, drafts = await run([ollama], "how do I sort a list in python", store)
    assert drafts == [] and sent == GOOD


def test_draft_events_are_mirrored():
    assert draft_event("m1", "Hel") == {"type": "draft", "id": "m1", "text": "Hel"}
    assert draft_event("m1", None) == {"type": "draft", "id": "m1", "text": "", "clear": True}
    assert "draft" in MIRRORED
