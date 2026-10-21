from __future__ import annotations

import json
import sys
from pathlib import Path

import httpx
import pytest

from doaide_code.executors import ClaudeCliExecutor, CodexCliExecutor, ExecutorError, Job, OllamaExecutor, Turn
from doaide_code.executors.base import stream_subprocess, transcript_prompt
from doaide_code.executors.claude_cli import ClaudeStreamParser
from doaide_code.executors.codex_cli import parse_codex_event
from doaide_code.usage import Usage


def ollama_transport(models: list[str], chunks: list[str], seen: list[dict]) -> httpx.MockTransport:
    def handler(request: httpx.Request) -> httpx.Response:
        if request.url.path == "/api/tags":
            return httpx.Response(200, json={"models": [{"name": m} for m in models]})
        assert request.url.path == "/api/chat"
        seen.append(json.loads(request.content))
        lines = [json.dumps({"message": {"content": c}, "done": False}) for c in chunks]
        lines.append(json.dumps({"message": {"content": ""}, "done": True, "prompt_eval_count": 12, "eval_count": 3}))
        return httpx.Response(200, content="\n".join(lines).encode())

    return httpx.MockTransport(handler)


@pytest.mark.anyio
async def test_ollama_streams_chunks_with_history():
    seen: list[dict] = []
    ex = OllamaExecutor("http://ollama", "qwen3-coder", transport=ollama_transport(["qwen3-coder:latest"], ["a", "b"], seen))
    job = Job("next", history=[Turn("user", "earlier"), Turn("assistant", "reply")])
    out = [c async for c in ex.stream(job)]
    assert out[:2] == ["a", "b"]
    # Local tokens are reported at no cost.
    assert out[2] == Usage("qwen3-coder:latest", 12, 3, 0.0)
    payload = seen[0]
    assert payload["model"] == "qwen3-coder:latest" and payload["stream"] is True
    assert [m["role"] for m in payload["messages"]] == ["system", "user", "assistant", "user"]


@pytest.mark.anyio
async def test_ollama_falls_back_to_installed_coder_model():
    ex = OllamaExecutor("http://ollama", "qwen3-coder", transport=ollama_transport(["llama3:latest", "qwen2.5-coder:7b"], [], []))
    assert await ex.resolve_model() == "qwen2.5-coder:7b"
    # No coder model: the smallest installed chat model, never an embedding model.
    chat = OllamaExecutor(
        "http://ollama", "qwen3-coder", transport=ollama_transport(["nomic-embed-text:latest", "llama3:latest"], [], [])
    )
    assert await chat.resolve_model() == "llama3:latest"
    embed_only = OllamaExecutor("http://ollama", "qwen3-coder", transport=ollama_transport(["nomic-embed-text:latest"], [], []))
    assert await embed_only.available() is False


@pytest.mark.anyio
async def test_ollama_unreachable_is_unavailable():
    def boom(request):
        raise httpx.ConnectError("refused")

    ex = OllamaExecutor("http://ollama", "qwen3-coder", transport=httpx.MockTransport(boom))
    assert await ex.available() is False
    with pytest.raises(ExecutorError):
        [c async for c in ex.stream(Job("hi"))]


def test_claude_argv_matches_spec():
    ex = ClaudeCliExecutor("claude", "claude-sonnet-4-5-20250514", name="claude-sonnet", tier=2)
    argv = ex.argv("do it")
    assert argv[:5] == ["claude", "-p", "do it", "--model", "claude-sonnet-4-5-20250514"]
    assert argv[argv.index("--output-format") + 1] == "stream-json"
    assert "--verbose" in argv  # required by the CLI for stream-json with -p
    # Read-only: edits come back as blocks for preview, never written by the CLI.
    assert "acceptEdits" not in argv
    allowed = argv[argv.index("--tools") + 1 : argv.index("--disallowedTools")]
    assert "Edit" not in " ".join(allowed) and "Write" not in " ".join(allowed)
    assert argv[argv.index("--allowedTools") + 1 : argv.index("--allowedTools") + 4] == ["Read", "Grep", "Glob"]
    assert "SEARCH" in argv[argv.index("--append-system-prompt") + 1]


def test_claude_parser_prefers_deltas_and_reports_errors():
    parse = ClaudeStreamParser()
    delta = {"type": "stream_event", "event": {"type": "content_block_delta", "delta": {"type": "text_delta", "text": "Hi"}}}
    full = {"type": "assistant", "message": {"content": [{"type": "text", "text": "Hi"}]}}
    assert parse(delta) == "Hi"
    assert parse(full) is None  # already streamed via the delta
    assert ClaudeStreamParser()(full) == "Hi"
    with pytest.raises(ExecutorError, match="bad model"):
        parse({"type": "result", "is_error": True, "result": "bad model"})
    usage = parse(
        {
            "type": "result",
            "is_error": False,
            "result": "Hi",
            "total_cost_usd": 0.012,
            "usage": {"input_tokens": 10, "cache_read_input_tokens": 90, "output_tokens": 5},
        }
    )
    assert usage == Usage("", 100, 5, 0.012)


def test_codex_argv_and_parser():
    argv = CodexCliExecutor("codex", "o4-mini").argv("fix it", "/repo")
    assert argv[:4] == ["codex", "exec", "--model", "o4-mini"]
    # No model (or "default"): Codex's own config.toml decides.
    assert CodexCliExecutor("codex", "").argv("x", None)[:3] == ["codex", "exec", "--sandbox"]
    assert "--model" not in CodexCliExecutor("codex", "default").argv("x", None)
    assert argv[argv.index("--sandbox") + 1] == "read-only"
    assert argv[argv.index("--cd") + 1] == "/repo" and argv[-1] == "fix it"

    assert parse_codex_event({"type": "item.completed", "item": {"type": "agent_message", "text": "done"}}) == "done\n"
    change = {"type": "item.completed", "item": {"type": "file_change", "changes": [{"path": "a.py"}]}}
    assert "a.py" in parse_codex_event(change)
    assert parse_codex_event({"type": "thread.started"}) is None
    done = {"type": "turn.completed", "usage": {"input_tokens": 1000, "output_tokens": 100}}
    assert parse_codex_event(done, "o4-mini") == Usage("o4-mini", 1000, 100, (1000 * 1.10 + 100 * 4.40) / 1e6)
    with pytest.raises(ExecutorError):
        parse_codex_event({"type": "turn.failed", "error": {"message": "quota"}})


def test_transcript_prompt_includes_recent_history():
    assert transcript_prompt(Job("q")) == "q"
    text = transcript_prompt(Job("q", history=[Turn("user", "a"), Turn("assistant", "b")]))
    assert "USER: a" in text and "ASSISTANT: b" in text and text.endswith("q")


SCRIPT = """
import json, sys
print(json.dumps({"t": "one"}))
print("plain line")
print(json.dumps({"t": "two"}))
sys.stderr.write("boom\\n")
sys.exit(int(sys.argv[1]))
"""


@pytest.mark.anyio
async def test_stream_subprocess_parses_lines_and_raises_on_exit(tmp_path: Path):
    script = tmp_path / "fake_cli.py"
    script.write_text(SCRIPT)
    out = [
        c
        async for c in stream_subprocess(
            [sys.executable, str(script), "0"], parse=lambda e: e.get("t"), cwd=tmp_path, env={}, timeout=20
        )
    ]
    # Non-JSON stdout (banners, warnings) is not part of the answer.
    assert out == ["one", "two"]
    with pytest.raises(ExecutorError, match="boom"):
        [c async for c in stream_subprocess([sys.executable, str(script), "3"], parse=lambda e: None, cwd=None, env={}, timeout=20)]


@pytest.mark.anyio
async def test_stream_subprocess_missing_binary_and_timeout(tmp_path: Path):
    with pytest.raises(ExecutorError, match="cannot start"):
        [c async for c in stream_subprocess(["/nonexistent/cli"], parse=lambda e: None, cwd=None, env={}, timeout=5)]
    slow = [sys.executable, "-c", "import time; time.sleep(5)"]
    with pytest.raises(ExecutorError, match="timed out"):
        [c async for c in stream_subprocess(slow, parse=lambda e: None, cwd=None, env={}, timeout=0.3)]
