from __future__ import annotations

from ..config import Settings
from .base import Executor, ExecutorError, Job, Turn
from .claude_cli import ClaudeCliExecutor
from .codex_cli import CodexCliExecutor
from .jev import JevDecision, JevExecutor
from .ollama import OllamaExecutor

__all__ = [
    "ClaudeCliExecutor",
    "CodexCliExecutor",
    "Executor",
    "ExecutorError",
    "JevDecision",
    "JevExecutor",
    "Job",
    "OllamaExecutor",
    "Turn",
    "build_executors",
]


def build_executors(settings: Settings) -> list[Executor]:
    """The laptop's executors, cheapest first: Ollama with a fast model (tier 0) and with the best
    local coder model (tier 1), both free; then Claude Sonnet and Codex (tier 2) and Claude Opus
    (tier 3) on the user's own subscription logins. Haiku stands in at tier 1 when Ollama is down.
    Opus and Codex are only used for complex tasks. No API keys are used."""
    executors: list[Executor] = [
        OllamaExecutor(settings.ollama_url, settings.ollama_model),
        OllamaExecutor(
            settings.ollama_url,
            settings.ollama_coder_model,
            name="ollama-coder",
            tier=1,
            prefer_large=True,
            # Reading the prompt is most of a 32B model's time (~150 tokens/s on an M2 Max).
            context_chars=14_000,
        ),
    ]
    if settings.use_claude_cli:
        executors += [
            ClaudeCliExecutor(
                settings.claude_bin, settings.claude_haiku_model, name="claude-haiku", tier=1, timeout=settings.cli_timeout
            ),
            ClaudeCliExecutor(
                settings.claude_bin, settings.claude_sonnet_model, name="claude-sonnet", tier=2, timeout=settings.cli_timeout
            ),
            ClaudeCliExecutor(
                settings.claude_bin,
                settings.claude_opus_model,
                name="claude-opus",
                tier=3,
                timeout=settings.cli_timeout,
                min_task_tier=2,
            ),
        ]
    # After Sonnet in the same tier: the second choice for complex work.
    if settings.use_codex_cli:
        executors.append(CodexCliExecutor(settings.codex_bin, settings.codex_model, timeout=settings.cli_timeout))
    return executors
