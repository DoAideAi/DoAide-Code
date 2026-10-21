"""Tiers 1-3: Claude Code CLI (`claude -p ... --output-format stream-json`)."""

from __future__ import annotations

from collections.abc import AsyncIterator

from ..usage import Usage
from ..prompts import system_prompt
from .base import Executor, ExecutorError, Job, cli_env, stream_subprocess, which, with_context

# Read-only: the agent may look around the project, but changes come back as edit blocks that
# DoAide shows as a diff and applies only on request. `--tools` limits which tools exist at all;
# `--allowedTools` alone only pre-approves, so a user setting like bypassPermissions would still
# let Claude edit files and run commands. The write tools are also denied explicitly.
READ_ONLY_TOOLS = ["Read", "Grep", "Glob"]
WRITE_TOOLS = ["Edit", "Write", "MultiEdit", "NotebookEdit", "Bash"]


class ClaudeStreamParser:
    """Turns Claude stream-json events into text.

    With partial messages enabled, text arrives as `stream_event` deltas and the full
    `assistant` message repeats it, so assistant text is only used when no delta was seen.
    """

    def __init__(self, model: str = "") -> None:
        self.saw_delta = False
        self.model = model
        # Each assistant message after a tool call starts a new paragraph instead of running on
        # ("first.Let me look"): set on message_start, applied to that message's first text.
        self.message_text = False
        self.pending_break = False

    def __call__(self, event: dict) -> str | Usage | None:
        kind = event.get("type")
        if kind == "stream_event":
            inner = event.get("event", {})
            if inner.get("type") == "message_start":
                self.pending_break, self.message_text = self.saw_delta, False
                return None
            delta = inner.get("delta", {}) if inner.get("type") == "content_block_delta" else {}
            if delta.get("type") == "text_delta":
                text = delta.get("text") or ""
                if self.pending_break and not self.message_text and text:
                    text = "\n\n" + text
                self.saw_delta = self.message_text = True
                self.pending_break = False
                return text or None
            return None
        if kind == "assistant" and not self.saw_delta:
            blocks = event.get("message", {}).get("content", [])
            text = "".join(b.get("text", "") for b in blocks if b.get("type") == "text")
            return text or None
        if kind == "result" and event.get("is_error"):
            raise ExecutorError(f"claude: {event.get('result') or event.get('subtype') or 'error'}")
        if kind == "result":
            usage = event.get("usage") or {}
            tokens_in = sum(int(usage.get(k, 0)) for k in ("input_tokens", "cache_read_input_tokens", "cache_creation_input_tokens"))
            # Subscription runs: total_cost_usd is the API-equivalent cost Claude Code reports.
            return Usage(self.model, tokens_in, int(usage.get("output_tokens", 0)), float(event.get("total_cost_usd") or 0))
        return None


class ClaudeCliExecutor(Executor):
    tool = "claude"
    # A map of the project (tree, likely files, recent diff) so Claude spends fewer tool calls looking.
    context_chars = 16_000

    def __init__(self, binary: str, model: str, *, name: str, tier: int, timeout: float = 600, min_task_tier: int = 0):
        self.binary = binary
        self.model = model
        self.name = name
        self.tier = tier
        self.timeout = timeout
        self.min_task_tier = min_task_tier

    async def available(self) -> bool:
        return which(self.binary) is not None

    def argv(self, prompt: str, kind: str = "question") -> list[str]:
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
            "--tools",
            ",".join(READ_ONLY_TOOLS),
            "--allowedTools",
            *READ_ONLY_TOOLS,
            "--disallowedTools",
            *WRITE_TOOLS,
            "--append-system-prompt",
            system_prompt("claude", kind),
        ]

    async def stream(self, job: Job) -> AsyncIterator[str | Usage]:
        async for chunk in stream_subprocess(
            self.argv(with_context(job), job.kind),
            parse=ClaudeStreamParser(self.model),
            cwd=job.cwd,
            env=cli_env("ANTHROPIC_API_KEY", "ANTHROPIC_AUTH_TOKEN"),
            timeout=self.timeout,
        ):
            yield chunk
