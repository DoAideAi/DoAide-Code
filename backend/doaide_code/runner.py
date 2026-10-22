"""Run one prompt through the router's executors with fallback. Shared by the local chat
service and the laptop agent, so the "no executor" check only ever runs on the laptop.

Try, then escalate: a free Ollama model answers first, out of sight. Its answer is checked
(complete, code parses, edits apply, on topic); one that fails goes to Claude Sonnet with more
context, and the user only ever sees the answer that passed. The route meta says which model
answered, whether it was escalated and why, and what a free answer would have cost on Sonnet.

Follow-ups resume the Claude Code session that gave the previous answer: it already holds the
project map and the files it read, so only the turns it missed and the files changed since are
sent, and the conversation so far is read from Anthropic's prompt cache instead of re-sent.
"""

from __future__ import annotations

import asyncio
import contextlib
import hashlib
import json
import logging
import re
import time
from collections.abc import AsyncIterator, Awaitable, Callable
from dataclasses import dataclass, field, replace
from pathlib import Path

from .changes import SEARCH_RE, apply_record, parse_edits, propose, repair_prompt, strip_edits, undo_record
from .config import Settings
from .metrics import log_task
from .context import HOST, Ranking, git_context, mentioned_paths, rank_files
from .db import Store
from .detect import ModelDetector, answer_access, answer_meta, meta_question
from .executors import Executor, ExecutorError, Job, Turn, build_executors
from .executors.base import user_message
from .fastpath import direct_answer, math_answer, rename_answer
from .history import fit_history
from .prompts import EDIT_KINDS, PROMPT_VERSION
from .router import RouteDecision, RouterBrain, is_local
from .usage import Usage, sonnet_equivalent
from .verify import failing_tests
from .validate import (
    capability_claim,
    check_code_blocks,
    trim_reply,
    early_problem,
    edit_checks,
    FORMAT_SLIPS,
    NO_EDIT,
    incomplete_reason,
    off_topic_reason,
)

log = logging.getLogger(__name__)

NO_EXECUTOR = "No model is available on this laptop. Type /models to see what was detected and how to set one up."
# Jobs whose passing edits are written to the files right away. MCP callers (Claude Code) are
# agents with their own edit tools: they get proposals to apply, never writes underneath them.
# Dispatch (tasks.py) hands over the whole task, as the chat does.
AUTO_APPLY_SOURCES = {"chat", "dispatch"}
UNNAMED_EDIT = "an edit block could not be read (no file path above it, or edit markers inside it)"
# Incomplete answers are retried this many times, each on the next executor up with more context.
MAX_RETRIES = 1
# Claude Code sessions are resumed for follow-ups this recent: past the prompt cache's lifetime
# the whole session is written to the cache again at full price, and its file reads are stale.
RESUME_MAX_AGE = 3600
# ...and this small. Every model call in a resumed run re-sends the whole session, so a long one
# costs more per tool round than a fresh session with a shortened transcript (about 15k tokens).
RESUME_MAX_CONTEXT = 50_000


def build_router(settings: Settings) -> RouterBrain:
    """Router over this machine's executors. Routing is local heuristics: no API calls."""
    return RouterBrain(
        build_executors(settings), offline=True, cache_ttl=settings.cache_ttl, detector=ModelDetector(settings)
    )


@dataclass
class Outcome:
    """Filled in as the run progresses, so a cancelled run still has its partial answer."""

    content: str = ""
    status: str = "error"
    executor: str | None = None
    tier: int | None = None
    usage: Usage | None = None
    cached: bool = False
    context_files: list[str] = field(default_factory=list)
    # Proposed edits (preview summary) awaiting /apply; the id finds them in the store.
    changes: dict | None = None
    # Which model answered and why (shown under the reply and in the usage dashboard).
    route: dict | None = None
    # Validation results: completeness, code syntax, proposed edits.
    checks: list[dict] = field(default_factory=list)

    def add_usage(self, usage: Usage) -> None:
        self.usage = usage if self.usage is None else self.usage + usage

    def meta(self) -> dict:
        """What the UI shows for this reply: usage, the model that answered, checks, changes."""
        meta: dict = {}
        if self.usage is not None or self.cached:
            usage = (self.usage or Usage()).as_dict()
            meta["usage"] = {**usage, "cached": True} if self.cached else usage
        if self.changes:
            meta["changes"] = self.changes
        if self.route:
            meta["route"] = self.route
        if self.checks:
            meta["checks"] = {"items": self.checks}
        return meta


def strip_meta_turns(history) -> list[Turn]:
    """History without meta questions (see detect.meta_question) and the replies to them."""
    kept: list[Turn] = []
    skip_reply = False
    for turn in history:
        if turn.role == "user":
            skip_reply = meta_question(turn.content) is not None
            if not skip_reply:
                kept.append(turn)
        elif not skip_reply:
            kept.append(turn)
    return kept


_CREATE = re.compile(r"\b(?:create|write|new (?:file|module|script|package|test)|scaffold|generate)\b", re.I)


def missing_paths(prompt: str, root: Path) -> list[str]:
    """Relative file paths the request names (with a directory, like backend/app.py) that are not
    in `root`, unless the request is to create them."""
    if _CREATE.search(prompt):
        return []
    missing = []
    for path in sorted(mentioned_paths(prompt)):
        if "/" in path and not path.startswith(("http", "/")) and ".." not in path and not (root / path).exists():
            host = path.split("/", 1)[0]
            # Live: "ollama.com/install.sh" (a URL without https://) was answered as a missing file.
            if HOST.match(host) and not (root / host).exists():
                continue
            missing.append(path)
    return missing


def answer_anchor(text: str) -> str:
    """Identifies an answer in later history (the hub stores replies verbatim)."""
    return hashlib.sha256(" ".join(text.split()).encode()).hexdigest()


@dataclass(frozen=True)
class Resume:
    session_id: str
    created_at: float
    # Turns after the answer the session ended on (answered by other models, or the user's).
    missed: tuple[Turn, ...]


def find_resume(store: Store, job: Job) -> Resume | None:
    """The Claude Code session that gave the latest answer in this conversation, if recent."""
    if job.cwd is None:
        return None
    history = list(job.history)
    anchors = {answer_anchor(t.content): i for i, t in enumerate(history) if t.role == "assistant" and t.content.strip()}
    found = store.cli_sessions_for(list(anchors), str(job.cwd), RESUME_MAX_AGE)
    if not found:
        return None
    anchor = max(found, key=anchors.__getitem__)
    row = found[anchor]
    if row["context_tokens"] > RESUME_MAX_CONTEXT:
        return None
    return Resume(row["session_id"], row["created_at"], tuple(history[anchors[anchor] + 1 :]))


def cache_key(job: Job, ranking: Ranking | None) -> str:
    history = [(t.role, t.content) for t in list(job.history)[-6:]]
    prompt = " ".join(job.prompt.split())
    fingerprint = ranking.fingerprint if ranking else str(job.cwd)
    payload = json.dumps([PROMPT_VERSION, prompt, history, fingerprint], sort_keys=True)
    return hashlib.sha256(payload.encode()).hexdigest()


async def run_job(
    router: RouterBrain,
    store: Store,
    job: Job,
    outcome: Outcome,
    on_delta: Callable[[str], Awaitable[None]],
    *,
    project: str | None = None,
    source: str = "chat",
    on_draft: Callable[[str | None], Awaitable[None]] | None = None,
) -> Outcome:
    """Answer one prompt; models are always chosen by routing (try free first, then escalate).
    The route records how long the whole task took, for the model comparison (dashboard.py).

    `on_draft` gets the buffered local attempt as it streams (None: discard the draft, it is
    being escalated), so the user sees progress before it passes its checks."""
    started = time.monotonic()
    try:
        return await _run_job(router, store, job, outcome, on_delta, project=project, source=source, on_draft=on_draft)
    finally:
        if outcome.route is not None:
            outcome.route["elapsed_ms"] = _ms(started)
        log_task(job.prompt, outcome.meta(), status=outcome.status, source=source)


async def _run_job(
    router: RouterBrain,
    store: Store,
    job: Job,
    outcome: Outcome,
    on_delta: Callable[[str], Awaitable[None]],
    *,
    project: str | None,
    source: str,
    on_draft: Callable[[str | None], Awaitable[None]] | None = None,
) -> Outcome:
    # 1. Reading a file or listing a folder needs no model at all, and questions about DoAide
    # itself (who it is, what it can do, whether it can read your files, which models it has) are
    # answered from detection: small local models answer those from training data ("I am GPT-4,
    # made by OpenAI", "I can't access your local files").
    answer = math_answer(job.prompt)
    if answer is not None:
        pass
    elif (kind := meta_question(job.prompt)) == "access":
        answer = answer_access(job.cwd)
    elif kind:
        answer = answer_meta(kind, await router.models(force=True))
    elif job.cwd is not None:
        answer = await asyncio.to_thread(direct_answer, job.cwd, job.prompt)
    if answer is not None:
        outcome.route = {"executor": "direct", "model": None, "free": True, "reasons": ["answered without a model"]}
        outcome.content, outcome.status, outcome.executor = answer, "done", "direct"
        outcome.add_usage(Usage("none"))
        store.record_usage(source, "direct", None, 0, 0, 0.0)
        await on_delta(answer)
        return outcome
    if job.cwd is not None and (renamed := await asyncio.to_thread(rename_answer, job.cwd, job.prompt)):
        # A rename is mechanical: edit blocks from a project search, checked and tested like any edit.
        outcome.route = {"executor": "direct", "model": None, "free": True, "reasons": ["renamed without a model"]}
        outcome.content, outcome.status, outcome.executor = renamed, "done", "direct"
        outcome.add_usage(Usage("none"))
        store.record_usage(source, "direct", None, 0, 0, 0.0)
        await _preview_changes(store, job, outcome, None, None, on_delta, source)
        await on_delta(outcome.content)
        return outcome

    # Earlier meta questions were answered (or, before detection, made up) outside the models'
    # knowledge; keeping them in history only invites the model to repeat them.
    job = replace(job, history=strip_meta_turns(job.history))

    # 2. Rank project files once: it feeds both the cache key and every executor's context.
    ranking: Ranking | None = None
    if job.cwd is not None:
        recent = " ".join(t.content for t in list(job.history)[-2:] if t.role == "user")
        try:
            ranking = await asyncio.to_thread(rank_files, job.cwd, f"{job.prompt}\n{recent}")
        except OSError as exc:
            log.warning("context selection failed: %s", exc)
    # A file the request names that is not in the project: say so at once (free) instead of having
    # models search for it, which once took two minutes and $0.61 of Sonnet in the wrong folder.
    if job.cwd is not None and (missing := missing_paths(job.prompt, job.cwd)):
        where = f"project {project}" if project else "the workspace (no project selected)"
        answer = (
            f"`{missing[0]}` is not in {where} at `{job.cwd}`. Switch with `/switch-project <name>` "
            "(`/projects` lists them), or ask me to create it."
        )
        outcome.route = {"executor": "direct", "model": None, "free": True, "reasons": [f"{missing[0]} not found"]}
        outcome.content, outcome.status, outcome.executor = answer, "done", "direct"
        outcome.add_usage(Usage("none"))
        store.record_usage(source, "direct", None, 0, 0, 0.0)
        await on_delta(answer)
        return outcome

    key = cache_key(job, ranking) if router.cache_ttl > 0 else None
    if key is not None and (hit := store.cache_get(key, router.cache_ttl)) is not None:
        outcome.content, outcome.status, outcome.executor, outcome.cached = hit["answer"], "done", hit["executor"], True
        outcome.route = {"executor": hit["executor"], "model": None, "free": True, "reasons": ["cached answer"]}
        store.record_usage(source, hit["executor"], None, 0, 0, 0.0, cached=True)
        await on_delta(hit["answer"])
        await _preview_changes(store, job, outcome, None, None, on_delta, source)
        return outcome

    # 3. Classify, then try a free local model first and escalate if its answer fails checks.
    decision, candidates, skipped = await _routed(router, store, job, outcome, project)
    job = replace(job, kind=decision.kind)

    # Extra context the task asks for: the recent diff for "review my changes"-style requests.
    diff = ""
    if decision.wants_diff and job.cwd is not None:
        diff = await asyncio.to_thread(git_context, job.cwd)

    if not decision.about_project:
        # General knowledge ("how do I reverse a list"): project files would only slow it down.
        ranking = None
    candidates, too_big = _fits_whole(candidates, ranking, decision.kind)
    if too_big:
        skipped = f"{skipped}; {too_big}" if skipped else too_big

    resume = find_resume(store, job)
    claude_session, claude_context = "", 0
    errors: list[str] = []
    retries = 0
    retry_note: str | None = None
    # The free local attempt that failed checks (or broke), and why: shown on the paid answer.
    escalated: dict | None = None
    # That attempt's answer, shown after all (with its failed check) if every paid executor fails.
    held: tuple[str, str, dict, list[dict]] | None = None
    for executor in candidates:
        more = retry_note is not None or escalated is not None
        # A local first attempt is buffered: shown only if it passes, else silently escalated.
        trial = executor is candidates[0] and is_local(executor) and _escalation(candidates) is not None
        # History sized for this executor's window (history.py), and its own context.
        fitted = fit_history(job.history, executor.history_tokens, max_turns=executor.history_turns)
        run = replace(job, history=fitted.turns, summary=fitted.summary)
        context, files = await _context_for(executor, ranking, diff, more=more)
        if context:
            run = replace(run, context=context)
            outcome.context_files = files
        fresh = run
        resumed = None
        missed = fitted
        if resume is not None and executor.tool == "claude":
            run, resumed = _resumed(job, resume, ranking, diff)
            missed = fit_history(run.history, executor.history_tokens, max_turns=executor.history_turns)
            run = replace(run, history=missed.turns, summary=missed.summary)
        started = time.monotonic()
        streamed: list[str] = []
        previous = outcome.content
        outcome.content = ""
        try:
            used, run = await _drain_resumable(
                executor, run, fresh, outcome, store, source, streamed, _watch(outcome, on_draft) if trial else on_delta
            )
        except _Abandoned as exc:
            store.record_executor(executor.name, ok=True, elapsed_ms=_ms(started))
            log.info("stopped %s early: %s", executor.name, exc.reason)
            escalated = _escalated_from(executor, None, exc.reason)
            outcome.content = previous
            await _discard(on_draft)
            continue
        except ExecutorError as exc:
            store.record_executor(executor.name, ok=False, elapsed_ms=_ms(started))
            log.warning("%s failed: %s", executor.name, exc)
            errors.append(f"{executor.name}: {exc}")
            if trial:
                escalated = _escalated_from(executor, None, f"it failed: {exc}")
                outcome.content = previous
                await _discard(on_draft)
                continue
            if streamed:
                outcome.content += f"\n\n[stopped: {exc}]"
                outcome.executor = executor.name
                break
            outcome.content = previous
            continue
        store.record_executor(executor.name, ok=True, elapsed_ms=_ms(started))
        outcome.executor, outcome.status = executor.name, "done"
        outcome.content = _without_narration(outcome.content, used)
        outcome.route = _route(executor, decision, used, escalated=escalated, skipped=skipped)
        if run.resume and resumed:
            outcome.route["reasons"].append(resumed)
        if note := (missed if run.resume else fitted).note():
            outcome.route["reasons"].append(note)

        code_checks: list[dict] | None = None
        verified = False
        if trial:
            problem, code_checks, fix = await _vet(job, outcome.content, decision.kind)
            if problem and fix:
                # A concrete, fixable problem (code that does not parse, an edit that does not
                # apply): one more free try with the error spelled out, before paying for Sonnet.
                repaired = await _second_try(executor, run, job, outcome.content, fix, store, source)
                if repaired is not None:
                    outcome.add_usage(repaired.usage or Usage())
                    again, again_checks, _ = await _vet(job, repaired.content, decision.kind)
                    if again is None:
                        retry_note = f"fixed by {executor.name} on a second try ({problem})"
                        outcome.content, problem, code_checks = repaired.content, None, again_checks
            if problem is None and source in AUTO_APPLY_SOURCES:
                # Passes the checks; does it pass the project's tests? (Written, tested, undone.)
                problem = await _test_edits(job, outcome.content)
                verified = problem is None
            if problem:
                log.info("escalating from %s: %s", executor.name, problem)
                escalated = _escalated_from(executor, used, problem)
                held = (outcome.content, executor.name, outcome.route, code_checks)
                outcome.content, outcome.status = previous, "error"
                await _discard(on_draft)
                continue
            await on_delta(outcome.content)

        # Incomplete? Retry once on the next executor up, with more context. CLI agents ("map"
        # context) search the project themselves: "I can't find X" from them is a finding.
        reason = incomplete_reason(outcome.content, decision.kind, reads_files=executor.context_mode == "map")
        nxt = _next_up(candidates, executor, decision.tier)
        if reason and retries < MAX_RETRIES and nxt is not None:
            retries += 1
            retry_note = f"retried on {nxt.name} with more context ({reason} from {executor.name})"
            await on_delta(f"\n\n---\n_The answer looked incomplete ({reason}); retrying on {nxt.name} with more context…_\n\n")
            outcome.status = "error"
            continue
        if reason == NO_EDIT and nxt is None:
            # Live (Sonnet, the top model here): "calc.py, line 2: change a - b to a + b", described
            # but not written. Asked once for the edit blocks, it writes them.
            fix = repair_prompt(job.prompt, [f"{NO_EDIT}: write the change as edit blocks"])
            repaired = await _second_try(executor, run, job, outcome.content, fix, store, source)
            if repaired is not None:
                outcome.add_usage(repaired.usage or Usage())
                if incomplete_reason(repaired.content, decision.kind, reads_files=executor.context_mode == "map") is None:
                    outcome.content, reason = repaired.content, None
                    retry_note = f"edit blocks asked for again ({NO_EDIT})"
        detail = reason or retry_note or (f"escalated from {escalated['executor']}: {escalated['reason']}" if escalated else None)
        outcome.checks.append({"name": "complete", "ok": reason is None, "detail": detail or "looks complete"})
        if claim := capability_claim(outcome.content):
            outcome.checks.append({"name": "capabilities", "ok": False, "detail": claim})
        if key is not None and executor.cacheable and reason is None and outcome.content.strip():
            store.cache_put(key, outcome.content, executor.name)
        outcome.checks += code_checks if code_checks is not None else await check_code_blocks(outcome.content)
        claude_session, claude_context = ("", 0)
        if used is not None and executor.tool == "claude":
            claude_session, claude_context = used.session_id, used.context_tokens
        # A repair round starts from the full context: the resumed session predates this answer.
        await _preview_changes(store, job, outcome, executor, fresh, on_delta, source, verified=verified)
        outcome.checks += edit_checks(outcome.changes)
        outcome.content = trim_reply(outcome.content)
        break
    if outcome.status != "done" and not outcome.content and held is not None:
        outcome.content, outcome.executor, outcome.route, code_checks = held
        outcome.status = "done"
        outcome.checks += [{"name": "complete", "ok": False, "detail": escalated["reason"]}, *code_checks]
        await on_delta(outcome.content)
    if outcome.status != "done" and not outcome.content and errors:
        outcome.content = "All executors failed.\n" + "\n".join(errors)
    if outcome.status == "done" and claude_session and job.cwd is not None and outcome.content.strip():
        store.cli_session_put(answer_anchor(outcome.content), claude_session, str(job.cwd), claude_context)
    return outcome


def _without_narration(content: str, used: Usage | None) -> str:
    """An agent's reply without the narration of its tool rounds ("Let me read runner.py..."): its
    last message, when that message holds every edit block of the whole answer."""
    final = (used.final_text if used else "").strip()
    if not final or final == content.strip():
        return content
    return final if parse_edits(final) == parse_edits(content) else content


def _resumed(job: Job, resume: Resume, ranking: Ranking | None, diff: str) -> tuple[Job, str]:
    """The job as a continuation of `resume`: the missed turns, the files changed since, and the
    diff when asked for. No project map: the session has it. Returns the job and a route note."""
    changed = ranking.changed_since(resume.created_at) if ranking is not None else []
    parts = []
    if changed:
        parts.append(
            "Files changed since your last answer (re-read them before relying on earlier reads):\n"
            + "\n".join(f"- {p}" for p in changed)
        )
    if diff:
        parts.append(diff)
    note = f"resumed the Claude session ({len(changed)} file{'s' if len(changed) != 1 else ''} changed since)"
    return replace(job, resume=resume.session_id, history=resume.missed, context="\n\n".join(parts)), note


async def _drain_resumable(
    executor: Executor,
    run: Job,
    fresh: Job,
    outcome: Outcome,
    store: Store,
    source: str,
    streamed: list[str],
    on_delta: Callable[[str], Awaitable[None]],
) -> tuple[Usage | None, Job]:
    """`_drain`, falling back to a new session when a resume fails before any output (the CLI
    may have pruned the session). Returns the usage and the job that ran."""
    try:
        return await _drain(executor, run, outcome, store, source, streamed, on_delta), run
    except ExecutorError as exc:
        if not run.resume or streamed:
            raise
        log.info("could not resume session %s (%s); starting a new one", run.resume, exc)
        outcome.content = ""
        return await _drain(executor, fresh, outcome, store, source, streamed, on_delta), fresh


async def _test_edits(job: Job, answer: str) -> str | None:
    """Write the answer's edits, run the project's tests, put the files back. Why the tests fail
    (None when they pass, or there are no edits or tests)."""
    if job.cwd is None or (changeset := await propose(job.cwd, answer)) is None or not changeset.changed:
        return None
    if changeset.all_problems:
        return None
    record = changeset.record()
    try:
        await asyncio.to_thread(apply_record, record)
    except (ValueError, OSError):
        return None
    try:
        return await failing_tests(
            job.cwd, [f.path for f in changeset.changed], without_edit=_taken_out(record), request=job.prompt
        )
    finally:
        with contextlib.suppress(ValueError, OSError):
            await asyncio.to_thread(undo_record, record)


def _taken_out(record: dict) -> Callable[[], contextlib.AbstractAsyncContextManager[None]]:
    """For failing_tests: the written changeset `record` undone while entered, then written again,
    so tests that also fail without it are not blamed on it."""

    @contextlib.asynccontextmanager
    async def without() -> AsyncIterator[None]:
        await asyncio.to_thread(undo_record, record)
        try:
            yield
        finally:
            await asyncio.to_thread(apply_record, record)

    return without


class _Abandoned(Exception):
    def __init__(self, reason: str) -> None:
        super().__init__(reason)
        self.reason = reason


def _watch(
    outcome: Outcome, on_draft: Callable[[str | None], Awaitable[None]] | None = None
) -> Callable[[str], Awaitable[None]]:
    """Delta sink for a buffered local attempt: nothing reaches the answer until it passes (only
    the draft, to `on_draft`), and the attempt is stopped as soon as it shows a problem no retry
    would fix."""

    async def sink(chunk: str) -> None:
        if len(outcome.content) <= 700 and (reason := early_problem(outcome.content)):
            raise _Abandoned(reason)
        if on_draft is not None:
            await on_draft(chunk)

    return sink


async def _discard(on_draft: Callable[[str | None], Awaitable[None]] | None) -> None:
    """Tell the UI the draft it showed is not the answer (it is being escalated)."""
    if on_draft is not None:
        await on_draft(None)


async def _second_try(
    executor: Executor, run: Job, job: Job, first: str, fix: str, store: Store, source: str
) -> Outcome | None:
    """The same model, asked once to fix its own answer (buffered, never streamed)."""
    retry = _repair_job(run, fix, first)
    repaired = Outcome()

    async def hold(_chunk: str) -> None:
        pass

    try:
        await _drain(executor, retry, repaired, store, source, [], hold)
    except ExecutorError as exc:
        log.warning("local repair with %s failed: %s", executor.name, exc)
        return None
    return repaired if repaired.content.strip() else None


def _repair_job(run: Job, fix: str, first: str) -> Job:
    """The first request replayed word for word (files included), its answer, then the fix: the
    same prefix, so a local model reuses its prompt cache and reads only the new turn."""
    history = [*run.history, Turn("user", user_message(run)), Turn("assistant", first)]
    return replace(run, prompt=fix, context="", history=history)


# What is left of "Here are the two edit blocks:" once the blocks are taken out (live: Sonnet).
_LEAD_IN = re.compile(r"^\s*(?:here(?:'s| is| are)|below (?:is|are)|the (?:following|edits?|changes?)\b|i'll\b|let me\b).*:\s*$", re.I)


def _edit_summary(prose: str) -> str:
    """The prose around applied edit blocks, without lead-ins to blocks that are not shown; the
    blocks' own captions ("Fix the same typo in the table:") end as sentences. Empty when nothing
    is left, so the caller says which files were updated."""
    lines = [line for line in prose.splitlines() if not _LEAD_IN.match(line)]
    text = "\n".join(re.sub(r":\s*$", ".", line) for line in lines).strip()
    return re.sub(r"\n{3,}", "\n\n", text)


def _fits_whole(
    candidates: list[Executor], ranking: Ranking | None, kind: str
) -> tuple[list[Executor], str | None]:
    """Without the local models that cannot see a named file whole, for edits: they edit what they
    were shown (live: 32b, "fix any typos in README.md", 22k characters against a 14k budget, made
    up a line to replace, twice, for two minutes before escalating). Unchanged when no other
    executor is left."""
    if ranking is None or kind not in EDIT_KINDS:
        return candidates, None
    named = [c for c in ranking.candidates if c.explicit]
    if not named:
        return candidates, None
    biggest = max(named, key=lambda c: c.size)
    kept = [e for e in candidates if not (is_local(e) and e.context_chars < biggest.size)]
    if not kept or len(kept) == len(candidates):
        return candidates, None
    return kept, f"{biggest.path} ({biggest.size // 1000}k characters) is too large for the local models to edit whole"


def _escalation(candidates: list[Executor]) -> Executor | None:
    """The paid executor a failed local first attempt goes to (Sonnet when it is available)."""
    return next((e for e in candidates[1:] if not is_local(e)), None)


async def _vet(job: Job, answer: str, kind: str) -> tuple[str | None, list[dict], str | None]:
    """Whether a local answer is good enough to show: complete, its code parses, its edits apply
    and it is on topic. Returns the first problem (None when it passes), the code checks, and
    for problems the model can fix itself, the prompt asking it to."""
    code_checks = await check_code_blocks(answer)
    if reason := incomplete_reason(answer, kind):
        # A malformed edit block (a finished answer, not a truncated one) is a format slip the
        # model fixes when told; anything else incomplete goes up.
        slip = f"{reason}: each block is <<<<<<< SEARCH, the exact current lines, =======, the new lines, >>>>>>> REPLACE"
        fix = repair_prompt(job.prompt, [slip]) if reason in FORMAT_SLIPS else None
        return reason, code_checks, fix
    if bad := next((c for c in code_checks if not c["ok"]), None):
        fix = (
            f"{job.prompt}\n\nIn your previous answer, the {bad['name']} does not parse: {bad['detail']}.\n"
            "Reply with the complete, corrected answer."
        )
        return f"{bad['name']} does not parse ({bad['detail']})", code_checks, fix
    changeset = await propose(job.cwd, answer) if job.cwd is not None else None
    if changeset is not None and changeset.all_problems:
        # Asking again cannot conjure a file that is not there: no repair round for that.
        fixable = not all("does not exist" in p for p in changeset.all_problems)
        fix = repair_prompt(job.prompt, changeset.all_problems) if fixable else None
        return f"its edit failed checks ({changeset.all_problems[0]})", code_checks, fix
    if job.cwd is not None and changeset is None and any(SEARCH_RE.match(line) for line in answer.splitlines()):
        # Live (32b, "trim the Ollama prompt"): edit blocks quoting a prompt that itself holds edit
        # markers parsed as none, and the free answer was kept with nothing written.
        return f"its edit failed checks ({UNNAMED_EDIT})", code_checks, None
    if reason := capability_claim(answer) or off_topic_reason(job.prompt, answer):
        return reason, code_checks, None
    return None, code_checks, None


def _escalated_from(executor: Executor, used: Usage | None, reason: str) -> dict:
    model = (used.model if used else "") or getattr(executor, "model", "") or None
    return {"executor": executor.name, "model": model, "reason": reason}


def _next_up(candidates: list[Executor], current: Executor, task_tier: int) -> Executor | None:
    """Where to retry an incomplete answer: the next candidate that is stronger (or, at the top
    of the task's tier, an alternative of the same tier), never above the task's own tier past
    Sonnet: an incomplete Sonnet answer goes to Codex, not Opus."""
    ceiling = max(task_tier, 2)
    after = candidates[candidates.index(current) + 1 :]
    floor = current.tier if current.tier >= 2 else current.tier + 1
    return next((e for e in after if floor <= e.tier <= ceiling), None)


async def _context_for(
    executor: Executor, ranking: Ranking | None, diff: str, *, more: bool
) -> tuple[str, list[str]]:
    """Context sized for this executor: whole files for Ollama (2-3 of them), a project map for
    the CLI agents; double the budget on a retry."""
    budget = executor.context_chars * (2 if more else 1)
    if ranking is None:
        return (diff[:budget], []) if diff else ("", [])
    if executor.context_mode == "files":
        max_files = executor.max_files + (2 if more else 0)
        return await asyncio.to_thread(ranking.render, budget, max_files=max_files, extra=diff, more=more)
    return ranking.render_map(budget, extra=diff)


def _route(
    executor: Executor,
    decision: RouteDecision,
    used: Usage | None,
    *,
    escalated: dict | None = None,
    skipped: str | None = None,
) -> dict:
    # The model this executor reported (not the sum of earlier attempts), else its configured one.
    model = (used.model if used else "") or getattr(executor, "model", "") or None
    route = {
        "executor": executor.name,
        "model": model,
        "tier": decision.tier,
        "kind": decision.kind,
        "score": decision.complexity,
        "reasons": list(decision.reasons[:4]),
        "free": is_local(executor),
    }
    if escalated:
        route["escalated_from"] = escalated
    if skipped:
        route["reasons"].append(skipped)
    if route["free"] and used is not None and (used.input_tokens or used.output_tokens):
        # What this free answer would have cost on Claude Sonnet: shown as the saving.
        route["would_cost_usd"] = round(sonnet_equivalent(used.input_tokens, used.output_tokens), 6)
    return route


async def _routed(
    router: RouterBrain, store: Store, job: Job, outcome: Outcome, project: str | None
) -> tuple[RouteDecision, list[Executor], str | None]:
    decision = await router.classify(job.prompt, project=project)
    outcome.tier = decision.tier
    if decision.usage is not None:
        outcome.add_usage(decision.usage)
        store.record_usage(
            "router", None, decision.usage.model, decision.usage.input_tokens, decision.usage.output_tokens,
            decision.usage.cost_usd,
        )
    candidates, skipped = await router.plan(decision)
    if not candidates:
        outcome.content = NO_EXECUTOR
    return decision, candidates, skipped


async def _drain(
    executor: Executor,
    run: Job,
    outcome: Outcome,
    store: Store,
    source: str,
    streamed: list[str],
    on_delta: Callable[[str], Awaitable[None]],
) -> Usage | None:
    """Stream one executor into the outcome, logging its usage; returns that executor's usage."""
    used: Usage | None = None
    # Closed on the way out, so a run stopped early (see _watch) stops generating at once.
    async with contextlib.aclosing(executor.stream(run)) as chunks:
        async for chunk in chunks:
            if isinstance(chunk, Usage):
                outcome.add_usage(chunk)
                used = chunk if used is None else used + chunk
                store.record_usage(
                    source, executor.name, chunk.model, chunk.input_tokens, chunk.output_tokens, chunk.cost_usd
                )
                continue
            streamed.append(chunk)
            outcome.content += chunk
            await on_delta(chunk)
    return used


async def _preview_changes(
    store: Store,
    job: Job,
    outcome: Outcome,
    executor: Executor | None,
    run: Job | None,
    on_delta: Callable[[str], Awaitable[None]],
    source: str,
    *,
    verified: bool = False,
) -> None:
    """Turn edit blocks in the answer into a validated changeset, repairing it once (silently) if
    it fails. Chat edits are written at once (/undo restores them), minus files that fail their
    checks; one asked for over MCP waits for /apply. The reply keeps only the summary: the code
    itself is in the files and in the collapsed diff."""
    if job.cwd is None:
        return
    changeset = await propose(job.cwd, outcome.content)
    if changeset is None:
        if any(SEARCH_RE.match(line) for line in outcome.content.splitlines()):
            # Edit blocks whose file could not be read: say so instead of showing them unwritten.
            outcome.checks.append({"name": "edits", "ok": False, "detail": UNNAMED_EDIT})
            outcome.content = f"{outcome.content}\n\nNothing written: {UNNAMED_EDIT}."
        return
    # One repair round, with the same executor, when checks fail (never on fallback executors).
    if changeset.all_problems and executor is not None and run is not None and not executor.fallback:
        first_answer = outcome.content
        retry = _repair_job(run, repair_prompt(job.prompt, changeset.all_problems), first_answer)
        repaired = Outcome()

        async def hold(_chunk: str) -> None:
            pass

        try:
            await _drain(executor, retry, repaired, store, source, [], hold)
        except ExecutorError as exc:
            log.warning("repair with %s failed: %s", executor.name, exc)
        if repaired.usage is not None:
            outcome.add_usage(repaired.usage)
        better = await propose(job.cwd, repaired.content) if repaired.content else None
        if better is not None and len(better.all_problems) < len(changeset.all_problems):
            changeset, outcome.content = better, repaired.content
    auto = source in AUTO_APPLY_SOURCES
    # Chat edits are written without asking (/undo reverts them): files whose edit did not apply
    # or does not parse are left out and named; the rest is written.
    skipped = changeset.drop_failing() + changeset.problems if auto else []
    if not changeset.changed:
        if changeset.all_problems or skipped:
            problem = (skipped or changeset.all_problems)[0]
            outcome.checks.append({"name": "edits", "ok": False, "detail": f"no edit could be applied: {problem}"})
            # The edit blocks are never shown, applied or not; say in one line why nothing changed.
            outcome.content = f"{strip_edits(outcome.content)}\n\nNothing written: {problem}.".strip()
        return
    record = changeset.record()
    store.add_changeset(changeset.id, record, changeset.summary())
    outcome.changes = changeset.summary()
    files = ", ".join(f.path for f in changeset.changed)
    summary = _edit_summary(strip_edits(outcome.content))
    if auto:
        try:
            await asyncio.to_thread(apply_record, record)
        except (ValueError, OSError) as exc:
            log.warning("could not write changes %s: %s", changeset.id, exc)
            outcome.content = f"{summary}\n\nNot written: {exc}".strip()
            return
        outcome.changes = store.set_changeset_status(changeset.id, "applied")
        notes = [f"Not written: {skipped[0]}." if skipped else ""]
        # The project's tests run on it (unless they already did): a failure is reported, and the
        # edit stays for the user to keep or undo.
        paths = [f.path for f in changeset.changed]
        if failure := None if verified else await failing_tests(
            job.cwd, paths, without_edit=_taken_out(record), request=job.prompt
        ):
            outcome.checks.append({"name": "tests", "ok": False, "detail": failure})
            notes.append(f"Warning: {failure} after this edit; /undo reverts it.")
        outcome.content = "\n\n".join(p for p in [summary or f"Done — updated {files}.", *notes] if p)
        return
    if changeset.all_problems:
        note = f"Not written: {changeset.all_problems[0]} (type /apply to write it anyway)."
        outcome.content = f"{summary or f'Proposed changes to {files}.'}\n\n{note}"
    else:
        outcome.content = summary or "Proposed changes:"


def _ms(started: float) -> int:
    return int((time.monotonic() - started) * 1000)
