"""Cheap routing, per-executor prompts and context, answer checks, and the usage dashboard."""

from __future__ import annotations

import json
import subprocess
import time
from pathlib import Path

import httpx
import pytest

from doaide_code.classify import classify_task
from doaide_code.context import _excerpt, git_context, rank_files
from doaide_code.dashboard import usage_report
from doaide_code.executors import Job, OllamaExecutor
from doaide_code.executors.ollama import choose_model, num_ctx
from doaide_code.fastpath import math_answer
from doaide_code.changes import parse_edits
from doaide_code.prompts import FEW_SHOT_ANSWER, FEW_SHOT_DEBUG, FEW_SHOT_EDIT, IDENTITY, few_shot, system_prompt
from doaide_code.router import RouterBrain
from doaide_code.runner import Outcome, run_job
from doaide_code.validate import check_code_blocks, edit_checks, incomplete_reason

from .conftest import FakeExecutor
from .test_api import auth

pytestmark = pytest.mark.anyio


async def nop(_chunk: str) -> None:
    pass


@pytest.fixture
def repo(tmp_path: Path) -> Path:
    root = tmp_path / "repo"
    (root / "app").mkdir(parents=True)
    (root / "app" / "billing.py").write_text("def charge(amount):\n    return amount * 100\n")
    (root / "app" / "util.py").write_text("def add(a, b):\n    return a - b\n")
    (root / "pkg.egg-info").mkdir()
    (root / "pkg.egg-info" / "requires.txt").write_text("charge add billing\n")
    return root


# 1. Routing


def test_classifier_scores_kind_and_reasons():
    simple = classify_task("how do I reverse a list in python")
    assert (simple.tier, simple.kind) == (0, "question")
    edit = classify_task("fix the off-by-one bug in pager.py")
    assert edit.tier == 1 and edit.kind in {"edit", "debug"} and edit.score == 6
    hard = classify_task("design a distributed architecture and do a security audit across all services")
    assert hard.tier == 3 and hard.kind == "design"
    assert any("distributed" in r for r in hard.reasons)
    # One phrase counts once: "security review" is not also a "review".
    assert classify_task("do a security review of auth.py").reasons == ("security review (+9)",)


async def test_premium_executors_never_take_simple_or_medium_tasks():
    ollama, coder = FakeExecutor("ollama", 0), FakeExecutor("ollama-coder", 1)
    sonnet, opus, codex = FakeExecutor("claude-sonnet", 2), FakeExecutor("claude-opus", 3), FakeExecutor("codex", 2)
    opus.min_task_tier = codex.min_task_tier = 2
    brain = RouterBrain([ollama, coder, sonnet, opus, codex], offline=True)
    assert [e.name for e in await brain.candidates(0)] == ["ollama", "ollama-coder", "claude-sonnet"]
    assert [e.name for e in await brain.candidates(2)] == ["claude-sonnet", "codex", "claude-opus", "ollama-coder", "ollama"]
    # Nothing cheaper available at all: the premium ones are the last resort.
    for e in (ollama, coder, sonnet):
        e.up = False
    assert [e.name for e in await brain.candidates(0)] == ["codex", "claude-opus"]


async def test_math_is_answered_without_a_model(store):
    ex = FakeExecutor("ollama", 0, ["it is 391"])
    outcome = await run_job(RouterBrain([ex], offline=True), store, Job("what is 17*23?"), Outcome(), nop)
    assert outcome.content == "17*23 = **391**" and ex.jobs == []
    assert outcome.meta()["route"]["executor"] == "direct"
    assert math_answer("2^10") == "2^10 = **1,024**" and math_answer("what is a closure") is None
    assert math_answer("compute 9**9999") is None


async def test_route_meta_names_the_model_and_why(store):
    ex = FakeExecutor("ollama-coder", 1, ["The function adds two numbers and returns the sum of them."])
    ex.tool, ex.model = "ollama", "qwen2.5-coder:32b"
    outcome = await run_job(RouterBrain([ex], offline=True), store, Job("explain add()"), Outcome(), nop)
    route = outcome.meta()["route"]
    assert isinstance(route.pop("elapsed_ms"), int)
    assert route == {
        "executor": "ollama-coder", "model": "qwen2.5-coder:32b", "tier": 1, "kind": "explain",
        "score": 3.0, "reasons": ["explain (+3)"], "free": True,
    }
    assert ex.jobs[0].kind == "explain"


# 2. Context


def test_ollama_gets_the_top_files_only_and_excerpts_of_big_ones(repo):
    for n in range(5):
        (repo / "app" / f"mod{n}.py").write_text(f"def charge_{n}():\n    return charge({n})\n")
    big = "\n".join(f"x{i} = {i}" for i in range(3000)) + "\ndef charge_total(items):\n    return sum(items)\n"
    (repo / "app" / "ledger.py").write_text(big)
    ranking = rank_files(repo, "where is charge_total used for billing charge")
    assert not any("egg-info" in p for p in ranking.tree)
    text, included = ranking.render(6_000, max_files=3)
    # ledger.py defines charge_total: as good as named, so files sharing only the word "charge"
    # (billing.py, the mod*.py files) stay out.
    assert included == ["app/ledger.py"] and len(text) <= 6_100
    _, included = rank_files(repo, "where is the billing charge total computed").render(6_000, max_files=3)
    # Without a name, the mod*.py files share only the common word "charge": below the cutoff.
    assert included == ["app/billing.py", "app/ledger.py"]
    assert len(ranking.render(500_000, max_files=1)[1]) == 1
    assert "app/ledger.py (excerpts)" in text and "def charge_total" in text and "x5 = 5" not in text


def test_excerpt_keeps_matching_windows_with_line_numbers():
    text = "\n".join(["filler"] * 100 + ["def target():", "    pass"] + ["filler"] * 100)
    out = _excerpt(text, {"target"}, 2_000, radius=2)
    assert "\ndef target():\n" in out and out.startswith("# ... (from line 99)")
    assert _excerpt(text, {"absent"}, 2_000) == ""


def test_traceback_paths_become_named_files(repo):
    trace = f'Traceback (most recent call last):\n  File "{repo / "app" / "util.py"}", line 2\nAssertionError'
    ranking = rank_files(repo, trace)
    assert ranking.candidates[0].path == "app/util.py" and ranking.candidates[0].explicit


def test_cli_agents_get_a_map_and_git_diff(repo):
    subprocess.run(["git", "init", "-q", str(repo)], check=True)
    subprocess.run(["git", "-C", str(repo), "add", "."], check=True)
    env = ["-c", "user.email=t@t", "-c", "user.name=t"]
    subprocess.run(["git", *env, "-C", str(repo), "commit", "-qm", "init"], check=True)
    assert git_context(repo).startswith("## Last commit")
    (repo / "app" / "util.py").write_text("def add(a, b):\n    return a + b\n")
    diff = git_context(repo)
    assert diff.startswith("## Uncommitted changes") and "+    return a + b" in diff
    text, files = rank_files(repo, "review util.py").render_map(4_000, extra=diff)
    assert "- app/util.py" in text and "+    return a + b" in text and "def charge" not in text
    # The file the request names comes whole (a Read round re-sends everything); then no tree.
    assert files == ["app/util.py"] and "## File: app/util.py (complete" in text and "## Tree" not in text
    text, files = rank_files(repo, "review the adding code").render_map(4_000)
    assert files == [] and "## Tree" in text


async def test_review_requests_include_the_diff(repo, store):
    subprocess.run(["git", "init", "-q", str(repo)], check=True)
    subprocess.run(["git", "-C", str(repo), "add", "."], check=True)
    subprocess.run(["git", "-c", "user.email=t@t", "-c", "user.name=t", "-C", str(repo), "commit", "-qm", "i"], check=True)
    (repo / "app" / "util.py").write_text("def add(a, b):\n    return a + b\n")
    ex = FakeExecutor("ollama-coder", 1, ["The change fixes add: it now returns a + b instead of a - b."])
    ex.context_mode = "files"
    await run_job(RouterBrain([ex], offline=True), store, Job("review my recent changes", cwd=repo), Outcome(), nop)
    assert "Uncommitted changes" in ex.jobs[0].context and "+    return a + b" in ex.jobs[0].context


# 4. Prompts


def test_prompts_per_executor_style():
    local = system_prompt("local", "edit")
    assert IDENTITY in local and "<<<<<<< SEARCH" in local and len(local) < 1500
    assert "<<<<<<< SEARCH" not in system_prompt("local", "question")
    assert "Prefer code over prose" in system_prompt("codex", "edit")
    claude = system_prompt("claude", "review")
    assert "You are NOT GPT-4" in claude and "List concrete problems in the diff" in claude
    assert system_prompt("local", "edit") is system_prompt("local", "edit")  # cached
    assert few_shot("local", "edit") == [FEW_SHOT_EDIT] and few_shot("local", "debug") == [FEW_SHOT_DEBUG]
    assert few_shot("local", "explain") == [FEW_SHOT_ANSWER] == few_shot("local", "question")
    assert few_shot("local", "math") == [] and few_shot("claude", "edit") == []
    for user, answer in (FEW_SHOT_ANSWER, FEW_SHOT_EDIT, FEW_SHOT_DEBUG):
        assert (len(user) + len(answer)) / 3.5 < 200  # each example under ~200 tokens
    # The answer example is one plain line, the edit examples apply as edit blocks.
    assert "\n" not in FEW_SHOT_ANSWER[1] and "```" not in FEW_SHOT_ANSWER[1]
    assert all(len(parse_edits(a)) == 1 for _, a in (FEW_SHOT_EDIT, FEW_SHOT_DEBUG))


async def test_ollama_payload_uses_local_prompt_few_shot_and_a_fitting_window():
    seen: list[dict] = []

    def handler(request: httpx.Request) -> httpx.Response:
        if request.url.path == "/api/tags":
            return httpx.Response(200, json={"models": [{"name": "qwen2.5-coder:7b", "size": 4}]})
        seen.append(json.loads(request.content))
        return httpx.Response(200, content=json.dumps({"message": {"content": ""}, "done": True}).encode())

    ex = OllamaExecutor("http://o", "qwen2.5-coder", transport=httpx.MockTransport(handler))
    [c async for c in ex.stream(Job("fix add", context="x" * 40_000, kind="edit"))]
    payload = seen[0]
    roles = [m["role"] for m in payload["messages"]]
    assert roles == ["system", "user", "assistant", "user"]  # system, one worked example, the request
    assert payload["messages"][0]["content"] == system_prompt("local", "edit")
    assert payload["keep_alive"] == "2h"
    # 40k characters of context needs more than Ollama's default window.
    assert payload["options"]["num_ctx"] >= 14_336
    # One fixed window (no reload between requests) unless a prompt needs more.
    assert num_ctx([{"content": "hi"}]) == 16384 == num_ctx([{"content": "x" * 40_000}])
    assert num_ctx([{"content": "x" * 60_000}]) == 24576 and num_ctx([{"content": "x" * 500_000}]) == 32768


def test_coder_tier_picks_the_largest_coder_that_fits():
    names = ["llama3.2:latest", "qwen2.5-coder:7b", "qwen2.5-coder:32b", "deepseek-v2.5:latest"]
    sizes = {"llama3.2:latest": 2, "qwen2.5-coder:7b": 5, "qwen2.5-coder:32b": 19, "deepseek-v2.5:latest": 132}
    assert choose_model("", names, sizes, largest_under=40) == "qwen2.5-coder:32b"
    assert choose_model("", names, sizes, largest_under=10) == "qwen2.5-coder:7b"
    assert choose_model("qwen2.5-coder:7b", names, sizes, largest_under=40) == "qwen2.5-coder:7b"  # configured wins
    assert choose_model("qwen3-coder", names, sizes) == "qwen2.5-coder:7b"  # fast tier: smallest coder


# 3. Validation and refinement


def test_incomplete_answers_are_detected():
    assert incomplete_reason("", "question") == "empty answer"
    assert incomplete_reason("Here:\n```python\ndef f(", "edit") == "a code block was left open"
    assert "could not see" in incomplete_reason("I don't see the file. Please provide the code.", "debug")
    assert incomplete_reason("Sure, I will do that.", "edit") == "no code or edit was proposed"
    assert incomplete_reason("It returns a list of tuples, one per row.", "explain") is None
    assert incomplete_reason("42", "math") is None


async def test_code_blocks_are_syntax_checked():
    answer = "ok:\n```python\ndef f():\n    return 1\n```\nbad:\n```python\ndef g(:\n```\n```json\n{\"a\": 1}\n```"
    results = await check_code_blocks(answer)
    assert [(r["name"], r["ok"]) for r in results] == [("python block 1", True), ("python block 2", False), ("json block 3", True)]
    assert results[1]["detail"].startswith("line 1:")


def test_edit_checks_summarise_changesets():
    assert edit_checks({"files": [{"problems": []}], "problems": []})[0]["ok"] is True
    bad = edit_checks({"files": [{"problems": ["a.py: SEARCH text not found"]}], "problems": []})[0]
    assert bad["ok"] is False and "SEARCH text not found" in bad["detail"]


async def test_incomplete_answer_is_retried_one_tier_up_with_more_context(repo, store):
    weak = FakeExecutor("ollama-coder", 1, ["Please provide the code for add so I can help."])
    weak.context_mode, weak.context_chars, weak.max_files = "files", 3_000, 1
    strong = FakeExecutor("claude-sonnet", 2, ["`add` subtracts.\n\napp/util.py\n<<<<<<< SEARCH\n    return a - b\n=======\n    return a + b\n>>>>>>> REPLACE"])
    strong.context_mode, strong.context_chars, strong.max_files = "files", 3_000, 1
    (repo / "app" / "calc.py").write_text("from app.util import add\n\ntotal = add(2, 3)\n")
    sent: list[str] = []

    async def on_delta(chunk: str) -> None:
        sent.append(chunk)

    outcome = await run_job(RouterBrain([weak, strong], offline=True), store, Job("why is add in util.py wrong", cwd=repo), Outcome(), on_delta)
    assert outcome.status == "done" and outcome.executor == "claude-sonnet"
    assert any("retrying on claude-sonnet with more context" in c for c in sent)
    # The retry had double the budget and two more files.
    assert "## File: app/calc.py" in strong.jobs[0].context and "## File: app/calc.py" not in weak.jobs[0].context
    checks = {c["name"]: c for c in outcome.meta()["checks"]["items"]}
    assert checks["complete"]["detail"].startswith("retried on claude-sonnet")
    assert checks["edits"]["ok"] is True and outcome.changes["files"][0]["path"] == "app/util.py"
    assert "Please provide" not in outcome.content


async def test_retry_never_escalates_simple_work_to_opus(store):
    weak = FakeExecutor("ollama", 0, [""])
    opus = FakeExecutor("claude-opus", 3, ["A long and careful answer about lists in Python."])
    opus.min_task_tier = 2
    outcome = await run_job(RouterBrain([weak, opus], offline=True), store, Job("how do I sort a list"), Outcome(), nop)
    assert opus.jobs == [] and outcome.meta()["checks"]["items"][0] == {"name": "complete", "ok": False, "detail": "empty answer"}


# 5. Dashboard


def _reply(store, session, created, meta, prompt="do it"):
    store._exec(
        "INSERT INTO messages (id, session_id, role, content, status, created_at) VALUES (?, ?, 'user', ?, 'done', ?)",
        (f"u{created}", session, prompt, created - 1),
    )
    store._exec(
        "INSERT INTO messages (id, session_id, role, content, status, created_at, meta) VALUES (?, ?, 'assistant', 'a', 'done', ?, ?)",
        (f"a{created}", session, created, json.dumps(meta)),
    )


def test_usage_report_breaks_down_cost_by_model_and_day(store):
    session = store.create_session("me@x.com")["id"]
    other = store.create_session("other@x.com")["id"]
    now = 1_800_000_000.0
    local = {"executor": "ollama-coder", "model": "qwen2.5-coder:32b", "tier": 1, "kind": "edit", "free": True}
    paid = {"executor": "claude-sonnet", "model": "sonnet", "tier": 2, "kind": "design", "free": False}
    for i in range(4):
        _reply(store, session, now - 100 - i, {"usage": {"tokens_in": 1000, "tokens_out": 200, "cost_usd": 0}, "route": local,
                                                "checks": {"items": [{"name": "complete", "ok": True}]}}, prompt=f"task {i}")
    _reply(store, session, now - 90_000, {"usage": {"tokens_in": 5000, "tokens_out": 1000, "cost_usd": 0.03}, "route": paid})
    _reply(store, session, now - 50, {"usage": {"tokens_in": 0, "tokens_out": 0, "cost_usd": 0}, "route": {"executor": "direct", "free": True}})
    _reply(store, session, now - 40, {"changes": {"id": "c"}})  # not a task
    _reply(store, other, now - 30, {"usage": {"tokens_in": 9, "tokens_out": 9, "cost_usd": 9}, "route": paid})
    _reply(store, session, now - 30 * 86400, {"usage": {"cost_usd": 5}, "route": paid})  # out of range

    report = usage_report(store, "me@x.com", days=7, now=now)
    t = report["totals"]
    assert (t["tasks"], t["free_tasks"], t["cost_usd"]) == (6, 5, 0.03)
    assert t["free_share"] == pytest.approx(5 / 6, abs=1e-3)
    # 4 local tasks at Sonnet prices: 4 * (1000 * 2 + 200 * 10) / 1M
    assert t["saved_usd"] == pytest.approx(0.016)
    assert report["headline"] == "Free local models and direct answers handled 83% of 6 tasks at no cost."
    assert [(m["model"], m["tasks"], m["free"]) for m in report["by_model"]] == [
        ("ollama-coder · qwen2.5-coder:32b", 4, True), ("No model (direct)", 1, True), ("claude-sonnet", 1, False),
    ]
    assert len(report["daily"]) == 7 and sum(d["tasks"] for d in report["daily"]) == 6
    assert report["daily"][-1]["free_tasks"] == 5 and report["daily"][-2]["cost_usd"] == 0.03
    first = report["recent"][0]
    assert first["model"] == "No model (direct)" and report["recent"][1]["prompt"] == "task 0"
    assert report["recent"][1]["checks_ok"] is True and report["recent"][1]["kind"] == "edit"


def test_usage_endpoint(client, token):
    body = client.get("/api/usage?days=30&tz=-330", headers=auth(token)).json()
    assert body["days"] == 30 and len(body["daily"]) == 30 and body["totals"]["tasks"] == 0
    assert client.get("/api/usage").status_code == 401


def test_chat_replies_feed_the_dashboard(client, token):
    from .test_api import drain_until

    with client.websocket_connect(f"/ws?token={token}") as ws:
        ws.receive_json()
        ws.send_json({"type": "send", "text": "what is a closure?"})
        done = drain_until(ws, "done")[-1]
    assert done["meta"]["route"]["executor"] == "ollama"
    time.sleep(0.01)
    report = client.get("/api/usage", headers=auth(token)).json()
    assert report["totals"]["tasks"] == 1 and report["recent"][0]["prompt"] == "what is a closure?"


def test_source_outranks_its_tests_unless_tests_are_asked_for(repo):
    (repo / "tests").mkdir()
    (repo / "tests" / "test_billing.py").write_text("from app.billing import charge\n\ndef test_charge():\n    assert charge(1) == 100\n")
    assert rank_files(repo, "what does charge do").candidates[0].path == "app/billing.py"
    assert rank_files(repo, "fix the failing test for charge").candidates[0].path == "tests/test_billing.py"


def test_general_questions_get_no_project_files():
    assert classify_task("how do I reverse a list in python").about_project is False
    assert classify_task("what does LaptopAgent do").about_project is True
    assert classify_task("where is the jwt secret configured").about_project is True
    assert classify_task("what does refresh_session return").about_project is True


# Found by dogfooding through the MCP relay.


def test_claude_cli_cannot_write_even_with_bypass_permissions():
    from doaide_code.executors import ClaudeCliExecutor

    argv = ClaudeCliExecutor("claude", "sonnet", name="claude-sonnet", tier=2).argv("fix it", "debug")
    # --allowedTools only pre-approves; --tools limits what exists, and writes are denied too.
    assert argv[argv.index("--tools") + 1] == "Read,Grep,Glob"
    denied = argv[argv.index("--disallowedTools") + 1 :]
    assert {"Edit", "Write", "Bash"} <= set(denied)


def test_a_traceback_is_one_debugging_signal_not_two():
    trace = 'Traceback (most recent call last):\n  File "/x/dashboard.py", line 38\nValueError: bad\nfix this'
    profile = classify_task(trace)
    assert profile.tier == 1 and profile.kind in {"debug", "edit"} and profile.has_error


async def test_incomplete_sonnet_answer_retries_on_codex_not_opus(store):
    sonnet = FakeExecutor("claude-sonnet", 2, ["I'll check the file."])
    codex = FakeExecutor("codex", 2, ["Here is the refactor:\n```python\ndef handler():\n    return 1\n```"])
    opus = FakeExecutor("claude-opus", 3, ["opus"])
    codex.min_task_tier = opus.min_task_tier = 2
    codex.model, sonnet.model = "gpt-6-astra", "sonnet"
    brain = RouterBrain([sonnet, opus, codex], offline=True)
    outcome = await run_job(brain, store, Job("refactor the handlers across all files"), Outcome(), nop)
    assert opus.jobs == [] and outcome.executor == "codex"
    # The route names the model that answered, not one from an earlier attempt.
    assert outcome.meta()["route"]["model"] == "gpt-6-astra"


def test_opus_only_for_design_class_work():
    big_refactor = classify_task("refactor the duplicated search-and-replace helpers across the backend")
    assert big_refactor.tier == 2 and big_refactor.score >= 12
    assert classify_task("design a distributed architecture and do a security audit across all services").tier == 3


def test_saying_something_is_absent_is_not_a_missing_context_complaint():
    assert incomplete_reason("I don't see any `sub()` helper in backend/; the only matches are submit().", "explain") is None
    assert incomplete_reason("I can't see the file you mean. Please provide the code.", "edit") is not None


def test_claude_messages_after_tool_calls_start_a_new_paragraph():
    from doaide_code.executors.claude_cli import ClaudeStreamParser

    parse = ClaudeStreamParser("sonnet")

    def delta(text):
        return {"type": "stream_event", "event": {"type": "content_block_delta", "delta": {"type": "text_delta", "text": text}}}

    start = {"type": "stream_event", "event": {"type": "message_start"}}
    out = [parse(start), parse(delta("I'll search first.")), parse(start), parse(delta("Found it")), parse(delta(" here."))]
    assert "".join(c for c in out if c) == "I'll search first.\n\nFound it here."


def test_which_files_questions_get_a_list_reminder():
    from doaide_code.prompts import LIST_REMINDER, LOCAL_REMINDER, local_reminder

    assert local_reminder("what files handle the WebSocket connection?") == LIST_REMINDER
    assert local_reminder("Which modules read the config") == LIST_REMINDER
    assert local_reminder("what does router.py do?") == LOCAL_REMINDER


def test_a_list_of_files_answers_a_which_files_question():
    from doaide_code.validate import off_topic_reason

    q = "what files handle the WebSocket connection?"
    assert off_topic_reason(q, "- frontend/src/socket.js opens and reconnects.\n- backend/doaide_code/main.py serves /ws.") is None
    assert off_topic_reason(q, "- socket.js and relay.py") is None
    assert off_topic_reason(q, "I like turtles.") is not None


def test_why_questions_ask_for_the_codes_own_reason():
    from doaide_code.prompts import LOCAL_REMINDER, WHY_REMINDER, local_reminder

    assert local_reminder("why does num_ctx round up?") == WHY_REMINDER
    assert local_reminder("Why is FIXED_CTX a constant") == WHY_REMINDER
    assert local_reminder("explain why the cache exists") == LOCAL_REMINDER
