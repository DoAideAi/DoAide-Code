"""Regressions from live usage: file-access questions and claims, "not found" from CLI agents,
and resumed sessions that grow too large."""

from __future__ import annotations

import sqlite3

import pytest

from doaide_code.classify import classify_task
from doaide_code.db import Store
from doaide_code.detect import meta_question
from doaide_code.executors import Job, Turn
from doaide_code.executors.claude_cli import ClaudeStreamParser
from doaide_code.prompts import system_prompt
from doaide_code.router import RouterBrain
from doaide_code.runner import RESUME_MAX_CONTEXT, Outcome, answer_anchor, find_resume, run_job
from doaide_code.usage import Usage
from doaide_code.validate import NO_ACCESS_REASON, capability_claim, incomplete_reason

from .conftest import FakeExecutor

pytestmark = pytest.mark.anyio


async def nop(_chunk: str) -> None:
    pass


def executor(name: str, tier: int, chunks=("ok",), tool: str = "claude") -> FakeExecutor:
    ex = FakeExecutor(name, tier, chunks)
    ex.tool = tool
    if tool == "ollama":
        ex.context_mode = "files"
    return ex


# The answer Opus gave live: a correct finding, flagged as "could not see the code it needed".
NOT_FOUND = (
    "I'll search for the duplicated `sub()` helpers first. I searched `backend/` thoroughly and I can't find what the "
    "request describes, so I want to surface that before proposing any edits rather than invent a change.\n\n"
    "**There is no `sub()` search-and-replace helper in the backend.** The only `def sub…` hits are the async "
    "`submit()` methods in `relay.py:167` and `chat.py:96`. The real search-and-replace logic lives in "
    "`backend/doaide_code/changes.py:190` (`_replace_once`) and an inline replace in `mcp_server.py:222`."
)
REFACTOR = (
    "refactor the duplicated sub() search-and-replace helpers across the backend so tests and scripts share one "
    "helper; propose the change for backend/doaide_code only (project DoAide-Code)"
)


# 1. "Not found" from an agent that searched is a finding: no paid retry, no failed check.


def test_the_live_refactor_request_is_not_opus_work():
    profile = classify_task(REFACTOR)
    assert profile.tier == 2 and profile.score >= 10


def test_not_found_is_only_missing_context_for_models_that_were_handed_files():
    assert incomplete_reason(NOT_FOUND, "edit", reads_files=True) is None
    assert incomplete_reason("I don't see the file. Please provide the code.", "edit") is not None


async def test_a_cli_agent_saying_the_code_is_not_there_is_not_retried_on_another_paid_model(store):
    coder = executor("ollama-coder", 1, ["local"], tool="ollama")
    sonnet = executor("claude-sonnet", 2, [NOT_FOUND])
    codex = executor("codex", 2, ["codex"], tool="codex")
    opus = executor("claude-opus", 3, ["opus"])
    codex.min_task_tier = opus.min_task_tier = 2
    outcome = await run_job(RouterBrain([coder, sonnet, codex, opus], offline=True), store, Job(REFACTOR), Outcome(), nop)
    # Too complex to try locally; Sonnet answered; nobody else was paid to say the same thing.
    assert coder.jobs == [] and codex.jobs == [] and opus.jobs == []
    assert outcome.executor == "claude-sonnet" and outcome.meta()["checks"]["items"][0]["ok"] is True


async def test_a_local_model_that_cannot_see_the_code_still_escalates_to_claude(store):
    coder = executor("ollama-coder", 1, ["I don't see the file. Please provide the code for the pager."], tool="ollama")
    sonnet = executor("claude-sonnet", 2, ["The pager splits rows into pages of 20 in pager.py."])
    outcome = await run_job(RouterBrain([coder, sonnet], offline=True), store, Job("explain how the pager works"), Outcome(), nop)
    assert outcome.executor == "claude-sonnet"


# 2. "Can you access my files?" is answered from facts, never by a model.


@pytest.mark.parametrize(
    "question",
    [
        "Are you able to access all my code ? Like the projects folder?",
        "can you access my local files?",
        "Can you read my code?",
        "do you have access to my projects folder",
        "can u see the files on my laptop",
        "Could you look through my repo?",
    ],
)
async def test_file_access_questions_are_answered_directly(tmp_path, store, question):
    assert meta_question(question) == "access"
    model = executor("ollama", 0, ["No, I can't access your local files or folders directly."], tool="ollama")
    outcome = await run_job(RouterBrain([model], offline=True), store, Job(question, cwd=tmp_path), Outcome(), nop)
    assert model.jobs == [] and outcome.executor == "direct"
    assert outcome.content.startswith("Yes.") and str(tmp_path) in outcome.content and "/add-project" in outcome.content


@pytest.mark.parametrize(
    "task",
    [
        "can you read app.py and fix the bug",
        "can you read my code and explain the pager",
        "how do I read files in python",
        "can you read the config and tell me the port",
    ],
)
def test_tasks_that_mention_reading_are_not_access_questions(task):
    assert meta_question(task) != "access"


def test_every_prompt_says_doaide_reads_local_files():
    for style in ("local", "claude", "codex"):
        prompt = system_prompt(style, "question")
        assert "never say you cannot access the user's files" in prompt.lower()


# 4. Answers that misstate DoAide's capabilities fail their checks.


@pytest.mark.parametrize(
    "answer",
    [
        "No, I can't access your local files or folders directly.",
        "I don't have access to your files, so please paste them.",
        "Unfortunately I cannot read files on your computer.",
        "As an AI, I do not have direct access to your codebase.",
        # Live, qwen2.5-coder:7b on "what python version is this project using?"
        "I'm sorry, but I don't have access to the user's system environment or project configuration files.",
        "I cannot access the project's pyproject.toml file.",
        "I'm unable to access your local Python environment.",
        "I am unable to access the repository.",
    ],
)
def test_claims_that_doaide_cannot_access_files_are_caught(answer):
    assert capability_claim(answer) == NO_ACCESS_REASON


@pytest.mark.parametrize(
    "answer",
    [
        "I can't see the file you mean.",
        "I can't find the function in your code.",
        "We cannot access your production database.",
        "I don't have access to the internet, but httpx 0.27 added this.",
        "I don't have access to your API key; set ANTHROPIC_API_KEY in .env.",
        "The test cannot access the file system because of the sandbox.",
    ],
)
def test_other_cannots_are_not_capability_claims(answer):
    assert capability_claim(answer) is None


async def test_a_local_answer_claiming_no_file_access_escalates(store):
    ollama = executor("ollama", 0, ["I can't access your local files, but in general a pager splits rows."], tool="ollama")
    sonnet = executor("claude-sonnet", 2, ["The pager splits rows into pages of 20 in pager.py."])
    outcome = await run_job(RouterBrain([ollama, sonnet], offline=True), store, Job("explain how the pager works"), Outcome(), nop)
    assert outcome.executor == "claude-sonnet"
    assert outcome.meta()["route"]["escalated_from"]["reason"] == NO_ACCESS_REASON


async def test_a_local_refusal_to_a_project_question_escalates(store):
    refusal = "I'm sorry, but I don't have access to the user's system environment or project configuration files."
    ollama = executor("ollama", 0, [refusal], tool="ollama")
    sonnet = executor("claude-sonnet", 2, ["Python 3.11 or newer (`requires-python` in backend/pyproject.toml)."])
    job = Job("what python version is this project using?")
    outcome = await run_job(RouterBrain([ollama, sonnet], offline=True), store, job, Outcome(), nop)
    assert outcome.executor == "claude-sonnet"
    assert outcome.meta()["route"]["escalated_from"]["reason"] == NO_ACCESS_REASON


async def test_a_paid_answer_claiming_no_file_access_fails_its_checks(store):
    sonnet = executor("claude-sonnet", 2, ["I don't have access to your files. The pager usually splits rows."])
    outcome = await run_job(RouterBrain([sonnet], offline=True), store, Job("explain how the pager works"), Outcome(), nop)
    checks = {c["name"]: c for c in outcome.meta()["checks"]["items"]}
    assert checks["capabilities"] == {"name": "capabilities", "ok": False, "detail": NO_ACCESS_REASON}


# 3. Resumed sessions never snowball: past RESUME_MAX_CONTEXT a fresh, shortened session is cheaper.


def test_the_parser_records_the_latest_prompt_size():
    parse = ClaudeStreamParser("sonnet")

    def start(read):
        usage = {"input_tokens": 5, "cache_read_input_tokens": read, "cache_creation_input_tokens": 100}
        return {"type": "stream_event", "event": {"type": "message_start", "message": {"usage": usage}}}

    parse(start(9_000))
    parse(start(40_000))
    usage = parse({"type": "result", "session_id": "s", "usage": {"input_tokens": 1}, "total_cost_usd": 0.1})
    assert isinstance(usage, Usage) and usage.context_tokens == 40_105 and usage.session_id == "s"


def test_large_sessions_are_not_resumed(tmp_path, store):
    history = [Turn("user", "q"), Turn("assistant", "small"), Turn("user", "q2"), Turn("assistant", "big")]
    store.cli_session_put(answer_anchor("small"), "s-small", str(tmp_path), 20_000)
    store.cli_session_put(answer_anchor("big"), "s-big", str(tmp_path), RESUME_MAX_CONTEXT + 1)
    # The latest answer's session is too large: start fresh rather than fall back to an older one.
    assert find_resume(store, Job("next", history=history, cwd=tmp_path)) is None
    assert find_resume(store, Job("next", history=history[:2], cwd=tmp_path)).session_id == "s-small"


def test_older_databases_get_the_context_tokens_column(tmp_path):
    path = tmp_path / "old.db"
    conn = sqlite3.connect(path)
    conn.execute("CREATE TABLE cli_sessions (anchor TEXT PRIMARY KEY, session_id TEXT NOT NULL, cwd TEXT NOT NULL, created_at REAL NOT NULL)")
    conn.commit()
    conn.close()
    store = Store(path)
    store.cli_session_put("a", "s", "/x", 123)
    assert store.cli_sessions_for(["a"], "/x", 60)["a"]["context_tokens"] == 123


@pytest.mark.parametrize(
    "prompt, kind",
    [
        (REFACTOR, None),
        ("fix the backend crash in DoAide", None),
        ("can you add a models page to the backend?", None),
        ("which models do you use to write code?", "models"),
        ("what backends are available on this laptop?", "models"),
    ],
)
def test_code_tasks_are_never_meta_questions(prompt, kind):
    assert meta_question(prompt) == kind


# Short answers, no questions back, and Sonnet (not Opus) behind a failed free answer.


@pytest.mark.parametrize("style", ["local", "claude", "codex"])
@pytest.mark.parametrize("kind", ["question", "edit", "design"])
def test_every_prompt_asks_for_short_autonomous_answers(style, kind):
    prompt = system_prompt(style, kind)
    assert "Keep responses concise. Do not print code blocks in your reply" in prompt
    assert "Work autonomously. Make decisions without asking the user. Only ask when truly ambiguous." in prompt


async def test_a_failed_free_answer_goes_to_sonnet_even_when_opus_is_available(store):
    coder = executor("ollama-coder", 1, [""], tool="ollama")
    opus = executor("claude-opus", 3, ["opus answer about pager.py"])
    codex = executor("codex", 2, ["codex answer about pager.py"], tool="codex")
    sonnet = executor("claude-sonnet", 2, ["The pager splits rows into pages of 20 in pager.py."])
    opus.min_task_tier = codex.min_task_tier = 2
    # Opus listed first on purpose: the order of executors must not matter.
    brain = RouterBrain([opus, codex, coder, sonnet], offline=True)
    outcome = await run_job(brain, store, Job("refactor the pager in pager.py to use a generator"), Outcome(), nop)
    assert outcome.executor == "claude-sonnet" and opus.jobs == [] and codex.jobs == []
    assert outcome.meta()["route"]["escalated_from"]["executor"] == "ollama-coder"


async def test_opus_only_takes_expert_level_work(store):
    sonnet = executor("claude-sonnet", 2, ["sonnet"])
    opus = executor("claude-opus", 3, ["A threat model for the auth flow, with the top three risks."])
    opus.min_task_tier = 2
    brain = RouterBrain([sonnet, opus], offline=True)
    expert = await run_job(brain, store, Job("design a distributed architecture and do a security audit across all services"), Outcome(), nop)
    assert expert.executor == "claude-opus"
    hard = await run_job(brain, store, Job("refactor the handlers across all files and add a new endpoint"), Outcome(), nop)
    assert hard.executor == "claude-sonnet"
