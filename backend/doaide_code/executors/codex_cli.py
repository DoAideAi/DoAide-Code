"""Tier 1: Codex CLI.

Codex 0.1xx replaced `--approval-mode auto-edit` with `exec --sandbox workspace-write`,
which lets the agent edit files inside the project without approval prompts.
"""

from __future__ import annotations

from collections.abc import AsyncIterator

from .base import Executor, ExecutorError, Job, cli_env, stream_subprocess, transcript_prompt, which


def parse_codex_event(event: dict) -> str | None:
    """Extract user-visible text from a `codex exec --json` event."""
    kind = event.get("type", "")
    if kind == "item.completed":
        item = event.get("item", {})
        if item.get("type") in {"agent_message", "assistant_message"}:
            text = item.get("text", "")
            return f"{text}\n" if text else None
        if item.get("type") == "file_change":
            paths = [c.get("path", "?") for c in item.get("changes", [])]
            return f"\n_edited: {', '.join(paths)}_\n" if paths else None
        return None
    if kind in {"error", "turn.failed"}:
        message = event.get("message") or event.get("error", {}).get("message") or "codex failed"
        raise ExecutorError(f"codex: {message}")
    return None


class CodexCliExecutor(Executor):
    name = "codex"
    tier = 1

    def __init__(self, binary: str, model: str, *, timeout: float = 600):
        self.binary = binary
        self.model = model
        self.timeout = timeout

    async def available(self) -> bool:
        return which(self.binary) is not None

    def argv(self, prompt: str, cwd: str | None) -> list[str]:
        argv = [
            self.binary,
            "exec",
            "--model",
            self.model,
            "--sandbox",
            "workspace-write",
            "--skip-git-repo-check",
            "--json",
        ]
        if cwd:
            argv += ["--cd", cwd]
        return [*argv, prompt]

    async def stream(self, job: Job) -> AsyncIterator[str]:
        async for chunk in stream_subprocess(
            self.argv(transcript_prompt(job), str(job.cwd) if job.cwd else None),
            parse=parse_codex_event,
            cwd=job.cwd,
            env=cli_env("OPENAI_API_KEY"),
            timeout=self.timeout,
        ):
            yield chunk
