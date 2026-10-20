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
    """All answering executors, cheapest first."""
    return [
        OllamaExecutor(settings.ollama_url, settings.ollama_model),
        CodexCliExecutor(settings.codex_bin, settings.codex_model, timeout=settings.cli_timeout),
        ClaudeCliExecutor(
            settings.claude_bin, settings.claude_haiku_model, name="claude-haiku", tier=1, timeout=settings.cli_timeout
        ),
        ClaudeCliExecutor(
            settings.claude_bin, settings.claude_sonnet_model, name="claude-sonnet", tier=2, timeout=settings.cli_timeout
        ),
        ClaudeCliExecutor(
            settings.claude_bin, settings.claude_opus_model, name="claude-opus", tier=3, timeout=settings.cli_timeout
        ),
    ]
