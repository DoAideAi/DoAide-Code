"""Tiers 1-3: Claude Code CLI (`claude -p ... --output-format stream-json`)."""

from __future__ import annotations

from collections.abc import AsyncIterator

from .base import Executor, ExecutorError, Job, cli_env, stream_subprocess, transcript_prompt, which


class ClaudeStreamParser:
    """Turns Claude stream-json events into text.

    With partial messages enabled, text arrives as `stream_event` deltas and the full
    `assistant` message repeats it, so assistant text is only used when no delta was seen.
    """

    def __init__(self) -> None:
        self.saw_delta = False

    def __call__(self, event: dict) -> str | None:
        kind = event.get("type")
        if kind == "stream_event":
            inner = event.get("event", {})
            delta = inner.get("delta", {}) if inner.get("type") == "content_block_delta" else {}
            if delta.get("type") == "text_delta":
                self.saw_delta = True
                return delta.get("text")
            return None
        if kind == "assistant" and not self.saw_delta:
            blocks = event.get("message", {}).get("content", [])
            text = "".join(b.get("text", "") for b in blocks if b.get("type") == "text")
            return text or None
        if kind == "result" and event.get("is_error"):
            raise ExecutorError(f"claude: {event.get('result') or event.get('subtype') or 'error'}")
        return None


class ClaudeCliExecutor(Executor):
    def __init__(self, binary: str, model: str, *, name: str, tier: int, timeout: float = 600):
        self.binary = binary
        self.model = model
        self.name = name
        self.tier = tier
        self.timeout = timeout

    async def available(self) -> bool:
        return which(self.binary) is not None

    def argv(self, prompt: str) -> list[str]:
        return [
            self.binary,
            "-p",
            prompt,
            "--model",
            self.model,
            "--output-format",
            "stream-json",
            "--verbose",
            "--include-partial-messages",
            "--permission-mode",
            "acceptEdits",
        ]

    async def stream(self, job: Job) -> AsyncIterator[str]:
        async for chunk in stream_subprocess(
            self.argv(transcript_prompt(job)),
            parse=ClaudeStreamParser(),
            cwd=job.cwd,
            env=cli_env("ANTHROPIC_API_KEY", "ANTHROPIC_AUTH_TOKEN"),
            timeout=self.timeout,
        ):
            yield chunk
