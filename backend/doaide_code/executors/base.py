"""Executor interface and the shared subprocess streaming helper."""

from __future__ import annotations

import asyncio
import json
import os
import shutil
from abc import ABC, abstractmethod
from collections.abc import AsyncIterator, Callable, Sequence
from dataclasses import dataclass
from pathlib import Path


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


class Executor(ABC):
    name: str
    tier: int

    @abstractmethod
    async def available(self) -> bool: ...

    @abstractmethod
    def stream(self, job: Job) -> AsyncIterator[str]:
        """Yield answer text chunks as they arrive."""


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


LineParser = Callable[[dict], str | None]


async def stream_subprocess(
    argv: Sequence[str],
    *,
    parse: LineParser,
    cwd: Path | None,
    env: dict[str, str],
    timeout: float,
) -> AsyncIterator[str]:
    """Run `argv` and yield text parsed from each JSON line of its stdout.

    Non-JSON lines are passed through unchanged. A non-zero exit raises ExecutorError
    carrying the tail of stderr.
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
                yield line + "\n"
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
