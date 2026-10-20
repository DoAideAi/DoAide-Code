from __future__ import annotations

from ..config import Settings
from .base import Executor, ExecutorError, Job, Turn
from .claude_cli import ClaudeCliExecutor
from .codex_cli import CodexCliExecutor
from .gemini_api import GeminiApiExecutor
from .jev import JevDecision, JevExecutor
from .ollama import OllamaExecutor

__all__ = [
    "ClaudeCliExecutor",
    "CodexCliExecutor",
    "Executor",
    "ExecutorError",
    "GeminiApiExecutor",
    "JevDecision",
    "JevExecutor",
    "Job",
    "OllamaExecutor",
    "Turn",
    "build_executors",
]


def build_executors(settings: Settings) -> list[Executor]:
    """All answering executors. Ollama (free) and Gemini (cheap API) are the defaults; the
    subscription CLIs (Codex, Claude) are fallbacks used only when those cannot answer."""
    key = settings.gemini_api_key
    executors: list[Executor] = [
        OllamaExecutor(settings.ollama_url, settings.ollama_model),
        GeminiApiExecutor(key, settings.gemini_lite_model, name="gemini-lite", tier=1, thinking="low"),
        GeminiApiExecutor(key, settings.gemini_flash_model, name="gemini-flash", tier=2, thinking="medium"),
        GeminiApiExecutor(key, settings.gemini_pro_model, name="gemini-pro", tier=3, thinking="high"),
    ]
    if settings.use_codex_cli:
        executors.append(CodexCliExecutor(settings.codex_bin, settings.codex_model, timeout=settings.cli_timeout))
    if settings.use_claude_cli:
        executors += [
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
    return executors
