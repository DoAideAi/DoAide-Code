"""Tier 1: Codex CLI.

Codex 0.1xx replaced `--approval-mode` with `exec --sandbox ...`. DoAide runs it read-only:
changes come back as edit blocks that are previewed as a diff and applied on request.
"""

from __future__ import annotations

from collections.abc import AsyncIterator

from ..usage import Usage, usage_for
from .base import CODER_SYSTEM_PROMPT, Executor, ExecutorError, Job, cli_env, stream_subprocess, transcript_prompt, which


def parse_codex_event(event: dict, model: str = "") -> str | Usage | None:
    """Extract user-visible text (or the final token usage) from a `codex exec --json` event."""
    kind = event.get("type", "")
    if kind == "turn.completed" and isinstance(event.get("usage"), dict):
        usage = event["usage"]
        return usage_for(model, int(usage.get("input_tokens", 0)), int(usage.get("output_tokens", 0)))
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
    # Uses the user's ChatGPT subscription: a fallback after Gemini/Ollama.
    fallback = True

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
            "read-only",
            "--skip-git-repo-check",
            "--json",
        ]
        if cwd:
            argv += ["--cd", cwd]
        return [*argv, prompt]

    async def stream(self, job: Job) -> AsyncIterator[str | Usage]:
        prompt = f"{CODER_SYSTEM_PROMPT}\n\n{transcript_prompt(job)}"
        async for chunk in stream_subprocess(
            self.argv(prompt, str(job.cwd) if job.cwd else None),
            parse=lambda event: parse_codex_event(event, self.model),
            cwd=job.cwd,
            env=cli_env("OPENAI_API_KEY"),
            timeout=self.timeout,
        ):
            yield chunk
