"""Tier 1: Codex CLI.

Codex 0.1xx replaced `--approval-mode` with `exec --sandbox ...`. DoAide runs it read-only:
changes come back as edit blocks that are previewed as a diff and applied on request.
"""

from __future__ import annotations

from collections.abc import AsyncIterator

from ..usage import Usage, usage_for
from ..prompts import system_prompt
from .base import Executor, ExecutorError, Job, cli_env, stream_subprocess, which, with_context


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
    # An alternative to Claude Sonnet for complex work; never used for what Ollama can do.
    tier = 2
    min_task_tier = 2
    tool = "codex"
    context_chars = 16_000

    def __init__(self, binary: str, model: str, *, timeout: float = 600):
        self.binary = binary
        self.model = model
        self.timeout = timeout

    async def available(self) -> bool:
        return which(self.binary) is not None

    def argv(self, prompt: str, cwd: str | None) -> list[str]:
        # No model (or "default"): whatever the user's Codex config.toml selects.
        model = ["--model", self.model] if self.model and self.model != "default" else []
        argv = [
            self.binary,
            "exec",
            *model,
            "--sandbox",
            "read-only",
            "--skip-git-repo-check",
            "--json",
        ]
        if cwd:
            argv += ["--cd", cwd]
        return [*argv, prompt]

    async def stream(self, job: Job) -> AsyncIterator[str | Usage]:
        prompt = f"{system_prompt('codex', job.kind)}\n\n{with_context(job)}"
        async for chunk in stream_subprocess(
            self.argv(prompt, str(job.cwd) if job.cwd else None),
            parse=lambda event: parse_codex_event(event, self.model),
            cwd=job.cwd,
            env=cli_env("OPENAI_API_KEY"),
            timeout=self.timeout,
        ):
            yield chunk
