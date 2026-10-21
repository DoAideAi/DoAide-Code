"""Executor interface and the shared subprocess streaming helper."""

from __future__ import annotations

import asyncio
import json
import logging
import os
import shutil
from abc import ABC, abstractmethod
from collections.abc import AsyncIterator, Callable, Sequence
from dataclasses import dataclass
from pathlib import Path

from ..usage import Usage

log = logging.getLogger(__name__)


from ..prompts import CODER_SYSTEM_PROMPT  # noqa: E402,F401  (re-exported)


class ExecutorError(RuntimeError):
    """Raised when an executor cannot produce an answer."""


@dataclass(frozen=True)
class Turn:
    role: str
    content: str


@dataclass(frozen=True)
class Job:
    prompt: str
    history: Sequence[Turn] = ()
    cwd: Path | None = None
    # Relevant project files, selected for executors that cannot read the disk themselves.
    context: str = ""
    # Task kind from the classifier (question, explain, edit, debug, ...): picks the prompt.
    kind: str = "question"
    # A Claude Code session to continue: it already holds the earlier turns and the files it
    # read, so `history` is only the turns it missed and `context` only what changed since.
    resume: str = ""
    # Digest of the earlier conversation that did not fit this executor's window (history.py).
    summary: str = ""


class Executor(ABC):
    name: str
    tier: int
    # Installed tool this executor runs on ("ollama", "claude", "codex"); see detect.py.
    tool: str = ""
    # Last-resort executors (subscription CLIs) are tried only after every primary one.
    fallback: bool = False
    # Executors that cannot open files get file contents ("files"); CLI agents read for themselves
    # and get a project map instead ("map": tree, likely files, recent diff), which saves them tool calls.
    context_mode: str = "map"
    context_chars: int = 12_000
    # At most this many whole files in "files" mode (small models do best with 2-3 relevant files).
    max_files: int = 8
    # Executors only worth using from this task tier up (Opus, Codex: never for what Ollama can do).
    min_task_tier: int = 0
    # Answers that depend only on the prompt and context, so they are safe to cache.
    cacheable: bool = False
    # Conversation history this executor gets (see history.py): at most this many messages and
    # about this many tokens; older messages are shortened or summarized to fit.
    history_turns: int = 20
    history_tokens: int = 32_000

    @abstractmethod
    async def available(self) -> bool: ...

    @abstractmethod
    def stream(self, job: Job) -> AsyncIterator[str | Usage]:
        """Yield answer text chunks as they arrive, optionally ending with one Usage."""


def transcript_prompt(job: Job) -> str:
    """Fold the history (already fitted to this executor by history.py) into one prompt for
    one-shot CLI agents, after the summary of anything older."""
    if not job.history and not job.summary:
        return job.prompt
    lines = [job.summary, ""] if job.summary else []
    if job.history:
        lines.append("Conversation so far:")
        lines += [f"{t.role.upper()}: {t.content}" for t in job.history]
        lines.append("")
    lines += ["Current request:", job.prompt]
    return "\n".join(lines)


def user_message(job: Job) -> str:
    """The request as a chat model receives it: the project files first, then the request."""
    return f"{job.context}\n\n# Request\n{job.prompt}" if job.context else job.prompt


def with_context(job: Job) -> str:
    """The transcript prompt, preceded by the project map when there is one."""
    prompt = transcript_prompt(job)
    return f"{job.context}\n\n# Request\n{prompt}" if job.context else prompt


def cli_env(*remove: str) -> dict[str, str]:
    """Environment for CLI agents, minus API keys so they use their saved subscription login."""
    env = dict(os.environ)
    for key in remove:
        env.pop(key, None)
    return env


def which(binary: str) -> str | None:
    return shutil.which(binary)


LineParser = Callable[[dict], str | Usage | None]


async def stream_subprocess(
    argv: Sequence[str],
    *,
    parse: LineParser,
    cwd: Path | None,
    env: dict[str, str],
    timeout: float,
) -> AsyncIterator[str | Usage]:
    """Run `argv` and yield text parsed from each JSON line of its stdout.

    Non-JSON lines (CLI banners, update notices, warnings) are logged, not shown: they are not
    the model's answer. A non-zero exit raises ExecutorError carrying the tail of stderr.
    """
    try:
        proc = await asyncio.create_subprocess_exec(
            *argv,
            cwd=str(cwd) if cwd else None,
            env=env,
            stdin=asyncio.subprocess.DEVNULL,
            stdout=asyncio.subprocess.PIPE,
            stderr=asyncio.subprocess.PIPE,
            limit=16 * 1024 * 1024,
        )
    except (FileNotFoundError, PermissionError) as exc:
        raise ExecutorError(f"cannot start {argv[0]}: {exc}") from exc

    stderr_task = asyncio.create_task(proc.stderr.read())  # type: ignore[union-attr]
    loop = asyncio.get_running_loop()
    deadline = loop.time() + timeout
    try:
        while True:
            remaining = deadline - loop.time()
            if remaining <= 0:
                raise ExecutorError(f"{argv[0]} timed out after {int(timeout)}s")
            try:
                raw = await asyncio.wait_for(proc.stdout.readline(), remaining)  # type: ignore[union-attr]
            except TimeoutError as exc:
                raise ExecutorError(f"{argv[0]} timed out after {int(timeout)}s") from exc
            if not raw:
                break
            line = raw.decode("utf-8", errors="replace").rstrip("\n")
            if not line.strip():
                continue
            try:
                event = json.loads(line)
            except json.JSONDecodeError:
                log.debug("%s: %s", argv[0], line)
                continue
            if not isinstance(event, dict):
                continue
            text = parse(event)
            if text:
                yield text
        code = await proc.wait()
        stderr = (await stderr_task).decode("utf-8", errors="replace").strip()
        if code != 0:
            tail = stderr[-600:] if stderr else "no error output"
            raise ExecutorError(f"{argv[0]} exited with {code}: {tail}")
    finally:
        if proc.returncode is None:
            proc.kill()
            await proc.wait()
        if not stderr_task.done():
            stderr_task.cancel()
