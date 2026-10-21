from __future__ import annotations

from types import SimpleNamespace

import pytest

from doaide_code.executors import JevExecutor
from doaide_code.router import RouterBrain, heuristic_tier

from .conftest import FakeExecutor


@pytest.mark.parametrize(
    ("message", "tier"),
    [
        # Simple -> Ollama fast model
        ("what does a python list comprehension do?", 0),
        ("how do I reverse a list in python", 0),
        # Medium (explain, small edits, debugging, tests) -> Ollama coder model
        ("explain runner.py", 1),
        ("write a unit test for parse_date", 1),
        ("fix the off-by-one bug in pager.py", 1),
        ("here is a traceback, please debug it", 1),
        ("add a --verbose flag to the cli", 1),
        # Complex (multi-file, refactors, architecture) -> Claude Sonnet
        ("refactor the auth module across the services", 2),
        ("rename foo to bar in a.py, b.py, c.py, d.py", 2),
        ("design the system architecture for multi-region sync", 2),
        ("do a security audit of the upload endpoint", 2),
        # Hardest -> Claude Opus
        ("design a distributed architecture and do a security audit across all services", 3),
    ],
)
def test_heuristic_tiers(message, tier):
    assert heuristic_tier(message).tier == tier


def test_long_messages_climb_a_tier():
    assert heuristic_tier("hello " * 500).tier >= 1


def test_decisions_carry_kind_reasons_and_context_needs():
    d = heuristic_tier("review my recent changes before i commit")
    assert (d.kind, d.wants_diff) == ("review", True)
    d = heuristic_tier('Traceback (most recent call last):\n  File "app/x.py", line 3\nKeyError: 1')
    assert d.kind == "debug" and d.has_error and d.reasons


class FakeTypeSafe:
    def __init__(self, choice="tier1", confidence=0.9, score=1.2, fail=False):
        self.choice, self.confidence, self.score, self.fail = choice, confidence, score, fail
        self.calls = []

    async def system_one(self, state, questions):
        self.calls.append((state, questions))
        if self.fail:
            raise RuntimeError("typesafe down")
        return SimpleNamespace(
            model="system-one",
            choices={"tier": SimpleNamespace(choice=self.choice, confidence=self.confidence)},
            scores={"complexity": SimpleNamespace(score=self.score)},
        )


@pytest.mark.anyio
async def test_jev_choice_routes_with_score_and_choice_questions():
    fake = FakeTypeSafe(choice="tier2")
    brain = RouterBrain([], jev=JevExecutor("", client=fake))
    decision = await brain.classify("add oauth", project="alpha")
    assert (decision.tier, decision.source) == (2, "jev")
    state, questions = fake.calls[0]
    assert state == {"request": "add oauth", "project": "alpha"}
    assert type(questions["tier"]).__name__ == "Choice"
    assert type(questions["complexity"]).__name__ == "Score"
    assert set(questions["tier"].criteria) == {"tier0", "tier1", "tier2", "tier3"}


@pytest.mark.anyio
async def test_jev_low_confidence_uses_complexity_score():
    brain = RouterBrain([], jev=JevExecutor("", client=FakeTypeSafe(choice="tier0", confidence=0.3, score=2.6)))
    assert (await brain.classify("something")).tier == 3


@pytest.mark.anyio
async def test_offline_mode_skips_remote_classifiers():
    fake = FakeTypeSafe()
    brain = RouterBrain([], jev=JevExecutor("", client=fake), offline=True)
    assert (await brain.classify("explain closures")).source == "classifier"
    assert fake.calls == []


@pytest.mark.anyio
async def test_candidates_prefer_tier_then_escalate_then_fall_back():
    execs = [
        FakeExecutor("ollama", 0),
        FakeExecutor("codex", 1),
        FakeExecutor("haiku", 1, up=False),
        FakeExecutor("sonnet", 2),
        FakeExecutor("opus", 3),
    ]
    brain = RouterBrain(execs)
    assert [e.name for e in await brain.candidates(1)] == ["codex", "sonnet", "opus", "ollama"]
    assert [e.name for e in await brain.candidates(3)] == ["opus", "sonnet", "codex", "ollama"]
    assert [e.name for e in await brain.candidates(0)][0] == "ollama"


def test_jev_disabled_for_missing_or_placeholder_keys():
    assert not JevExecutor("").enabled
    assert not JevExecutor("paste key here").enabled
    assert JevExecutor("ts_live_abc123").enabled
