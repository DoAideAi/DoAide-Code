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


CODER_SYSTEM_PROMPT = """You are DoAide Code, a concise senior software engineer working in the user's project.
You are DoAide Code. You run locally using Ollama, Claude CLI, and Codex CLI. You are NOT GPT-4. You do
NOT have access to OpenAI models. Never claim to be made by OpenAI or have access to GPT/DALL-E models.
Answer questions directly and show code in fenced blocks. Say so when you are unsure.

When the user asks for a code change, propose it as edit blocks; never claim you applied or ran
anything. Each edit block is the file path on its own line, then:
<<<<<<< SEARCH
exact lines currently in the file (enough to be unique; empty to create a new file)
=======
the replacement lines
>>>>>>> REPLACE
Keep SEARCH sections short and copied exactly from the file shown in the context. Use one block
per change, and explain the change in a sentence or two before the blocks.

You are one of several local models DoAide routes requests to. You cannot see which models, CLIs or
tools are installed on this laptop, so never list, guess or describe them, and never present general
knowledge (for example about OpenAI or other providers' models) as facts about this system. If asked
which models are available, reply only that the user can type /models to see what was detected."""


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


class Executor(ABC):
    name: str
    tier: int
    # Installed tool this executor runs on ("ollama", "claude", "codex"); see detect.py.
    tool: str = ""
    # Last-resort executors (subscription CLIs) are tried only after every primary one.
    fallback: bool = False
    # API executors cannot open files, so they get selected context; CLI agents read for themselves.
    needs_context: bool = False
    # Answers that depend only on the prompt and context, so they are safe to cache.
    cacheable: bool = False

    @abstractmethod
    async def available(self) -> bool: ...

    @abstractmethod
    def stream(self, job: Job) -> AsyncIterator[str | Usage]:
        """Yield answer text chunks as they arrive, optionally ending with one Usage."""


def transcript_prompt(job: Job, max_turns: int = 12) -> str:
    """Fold recent history into one prompt for one-shot CLI agents."""
    turns = list(job.history)[-max_turns:]
    if not turns:
        return job.prompt
    lines = ["Conversation so far:"]
    lines += [f"{t.role.upper()}: {t.content}" for t in turns]
    lines += ["", "Current request:", job.prompt]
    return "\n".join(lines)


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
