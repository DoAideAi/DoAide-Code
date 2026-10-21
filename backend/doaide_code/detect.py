"""What can this laptop actually run? Detected from the installed tools, never from a model.

- Ollama: `ollama list` (installed models)
- Claude CLI: `claude --version` and `claude auth status` (JSON with `loggedIn`)
- Codex CLI: `codex --version` and `codex login status` (exit 0 when logged in)

The report is what the UI, `/models`, the MCP `get_status` tool and the router all use, so
the answer to "which models are available?" always comes from these commands.
"""

from __future__ import annotations

import asyncio
import json
import re
import time
from collections.abc import Awaitable, Callable, Sequence
from typing import Any

from .config import Settings
from .executors.base import cli_env
from .executors.ollama import choose_model

# (exit code, stdout, stderr); raises FileNotFoundError when the binary is missing.
RunResult = tuple[int, str, str]
Run = Callable[[Sequence[str], float], Awaitable[RunResult]]

# States a tool can be in. Only the usable ones are offered to the router.
USABLE = {"ready", "signed_in", "unknown"}

SETUP = {
    ("ollama", "not_found"): "Install Ollama from https://ollama.com/download, then run `ollama pull qwen2.5-coder:7b`.",
    ("ollama", "not_running"): "Start Ollama (open the Ollama app, or run `ollama serve`).",
    ("ollama", "no_models"): "Pull a coding model: `ollama pull qwen2.5-coder:7b`.",
    ("claude", "not_found"): "Install Claude Code: `npm install -g @anthropic-ai/claude-code`, then `claude auth login`.",
    ("claude", "signed_out"): "Sign in: `claude auth login`.",
    ("codex", "not_found"): "Install Codex CLI: `npm install -g @openai/codex`, then `codex login`.",
    ("codex", "signed_out"): "Sign in: `codex login`.",
}

STATE_TEXT = {
    "ready": "ready",
    "signed_in": "signed in",
    "unknown": "installed (sign-in not verified)",
    "signed_out": "not signed in",
    "not_found": "not found",
    "not_running": "not running",
    "no_models": "no models installed",
    "disabled": "disabled",
    "error": "check failed",
}

_SIZE_UNITS = {"B": 1, "KB": 10**3, "MB": 10**6, "GB": 10**9, "TB": 10**12}


async def run_command(argv: Sequence[str], timeout: float) -> RunResult:
    # Same environment as the executors: no API keys, so sign-in reflects the subscription login.
    proc = await asyncio.create_subprocess_exec(
        *argv,
        env=cli_env("ANTHROPIC_API_KEY", "ANTHROPIC_AUTH_TOKEN", "OPENAI_API_KEY"),
        stdin=asyncio.subprocess.DEVNULL,
        stdout=asyncio.subprocess.PIPE,
        stderr=asyncio.subprocess.PIPE,
    )
    try:
        out, err = await asyncio.wait_for(proc.communicate(), timeout)
    except TimeoutError:
        proc.kill()
        await proc.wait()
        raise
    return proc.returncode or 0, out.decode(errors="replace"), err.decode(errors="replace")


def parse_ollama_list(output: str) -> list[tuple[str, int]]:
    """(name, size in bytes) for each row of `ollama list`; the header row is skipped."""
    models: list[tuple[str, int]] = []
    for line in output.splitlines():
        cols = line.split()
        if not cols or cols[0] == "NAME":
            continue
        size = 0
        # Columns: NAME ID SIZE UNIT MODIFIED...
        if len(cols) >= 4 and cols[3].upper() in _SIZE_UNITS:
            try:
                size = int(float(cols[2]) * _SIZE_UNITS[cols[3].upper()])
            except ValueError:
                size = 0
        models.append((cols[0], size))
    return models


def _tool(tool_id: str, label: str, state: str, detail: str = "", **extra: Any) -> dict[str, Any]:
    entry: dict[str, Any] = {"id": tool_id, "label": label, "state": state, "usable": state in USABLE, "detail": detail}
    if setup := SETUP.get((tool_id, state)):
        entry["setup"] = setup
    return {**entry, **extra}


def _tail(text: str, limit: int = 200) -> str:
    return " ".join(text.split())[-limit:]


def _version(output: str) -> str | None:
    match = re.search(r"\d+\.\d+(?:\.\d+)?", output)
    return match.group(0) if match else None


class ModelDetector:
    def __init__(self, settings: Settings, *, run: Run = run_command, ttl: float = 30, timeout: float = 15):
        self.settings = settings
        self.run = run
        self.ttl = ttl
        self.timeout = timeout
        self._report: dict[str, Any] | None = None
        self._lock = asyncio.Lock()

    async def _exec(self, *argv: str) -> RunResult | None:
        """None when the binary is missing; a timeout counts as a failed run."""
        try:
            return await self.run(argv, self.timeout)
        except (FileNotFoundError, PermissionError, NotADirectoryError):
            return None
        except TimeoutError:
            return 124, "", f"{argv[0]} timed out"

    async def ollama(self) -> dict[str, Any]:
        result = await self._exec(self.settings.ollama_bin, "list")
        if result is None:
            return _tool("ollama", "Ollama", "not_found", f"`{self.settings.ollama_bin}` is not on PATH", models=[])
        code, out, err = result
        if code != 0:
            return _tool("ollama", "Ollama", "not_running", _tail(err or out) or f"exit {code}", models=[])
        rows = parse_ollama_list(out)
        names = [name for name, _ in rows]
        if not names:
            return _tool("ollama", "Ollama", "no_models", "running, but no models are installed", models=[])
        smallest_first = [name for name, _ in sorted(rows, key=lambda r: r[1])]
        default = choose_model(self.settings.ollama_model, smallest_first)
        count = f"{len(names)} model{'s' if len(names) != 1 else ''} installed"
        return _tool("ollama", "Ollama", "ready", count, models=names, default=default)

    async def claude(self) -> dict[str, Any]:
        binary = self.settings.claude_bin
        if not self.settings.use_claude_cli:
            return _tool("claude", "Claude CLI", "disabled", "turned off with DOAIDE_DISABLE_CLAUDE_CLI")
        version = await self._exec(binary, "--version")
        if version is None:
            return _tool("claude", "Claude CLI", "not_found", f"`{binary}` is not on PATH")
        ver = _version(version[1])
        status = await self._exec(binary, "auth", "status")
        code, out, err = status or (1, "", "")
        try:
            info = json.loads(out)
        except ValueError:
            info = None
        if isinstance(info, dict) and "loggedIn" in info:
            if not info["loggedIn"]:
                return _tool("claude", "Claude CLI", "signed_out", "installed but not signed in", version=ver)
            plan = info.get("subscriptionType") or info.get("authMethod")
            return _tool("claude", "Claude CLI", "signed_in", f"signed in ({plan})" if plan else "signed in", version=ver)
        # Older CLIs have no `auth status`; the executor will find out on first use.
        return _tool("claude", "Claude CLI", "unknown", _tail(err or out) or f"exit {code}", version=ver)

    async def codex(self) -> dict[str, Any]:
        binary = self.settings.codex_bin
        if not self.settings.use_codex_cli:
            return _tool("codex", "Codex CLI", "disabled", "turned off with DOAIDE_DISABLE_CODEX_CLI")
        version = await self._exec(binary, "--version")
        if version is None:
            return _tool("codex", "Codex CLI", "not_found", f"`{binary}` is not on PATH")
        ver = _version(version[1])
        status = await self._exec(binary, "login", "status")
        code, out, err = status or (1, "", "")
        text = (out + "\n" + err).strip()
        if code == 0:
            return _tool("codex", "Codex CLI", "signed_in", _tail(text) or "signed in", version=ver)
        if re.search(r"not logged in|logged out|no credentials", text, re.I):
            return _tool("codex", "Codex CLI", "signed_out", "installed but not signed in", version=ver)
        return _tool("codex", "Codex CLI", "unknown", _tail(text) or f"exit {code}", version=ver)

    async def detect(self, *, force: bool = False) -> dict[str, Any]:
        async with self._lock:
            if not force and self._report and time.time() - self._report["checked_at"] < self.ttl:
                return self._report
            tools = list(await asyncio.gather(self.ollama(), self.claude(), self.codex()))
            self._report = {"checked_at": time.time(), "any_usable": any(t["usable"] for t in tools), "tools": tools}
            return self._report

    def cached(self) -> dict[str, Any] | None:
        return self._report


def executor_report(available: dict[str, bool]) -> dict[str, Any]:
    """A report from executor availability alone, for routers built without a detector."""
    tools = [
        _tool(name, name, "ready" if up else "not_found", "available" if up else "unavailable")
        for name, up in available.items()
    ]
    return {"checked_at": time.time(), "any_usable": any(t["usable"] for t in tools), "tools": tools}


def same_report(a: dict[str, Any] | None, b: dict[str, Any] | None) -> bool:
    """Equal apart from when they were checked."""
    if a is None or b is None:
        return a is b
    return a.get("tools") == b.get("tools")


def format_report(report: dict[str, Any]) -> str:
    """Plain-text answer for `/models` and "which models are available?"."""
    lines = ["Detected on this laptop just now (from `ollama list`, `claude auth status` and `codex login status`):", ""]
    for tool in report["tools"]:
        state = STATE_TEXT.get(tool["state"], tool["state"])
        line = f"- **{tool['label']}**: {state}"
        if tool.get("models"):
            names = [f"{m} (default)" if m == tool.get("default") else m for m in tool["models"]]
            line += f": {', '.join(names)}"
        elif tool.get("version"):
            line += f" (v{tool['version']})"
        if not tool["usable"] and tool.get("detail") and tool["state"] not in {"not_found", "disabled"}:
            line += f" ({tool['detail']})"
        lines.append(line)
    setup = [f"- {t['setup']}" for t in report["tools"] if t.get("setup")]
    if not report["any_usable"]:
        lines += ["", "No model is available, so prompts cannot run yet. To set one up:", *setup]
    elif setup:
        lines += ["", "To add more:", *setup]
    return "\n".join(lines)


_MODELS_WORD = r"\b(models?|llms?|executors?|backends?|ai engines?)\b"
_ASKS = re.compile(
    rf"^\s*(?:(?:what|which)\b.*{_MODELS_WORD}.*\b(?:available|installed|have|has|got|use|using|running|support\w*|there|detected|access)\b"
    rf"|(?:list|show)(?:\s+me)?(?:\s+(?:the|all|my|available|installed|local))*\s+{_MODELS_WORD}"
    rf"|(?:what|which)\s+(?:local\s+)?{_MODELS_WORD}(?:\s+(?:do|can|are|is)\b.*)?)\s*[.?!]*\s*$",
    re.I,
)


def asks_about_models(prompt: str) -> bool:
    """True for questions about which models this system has; those are answered by detection."""
    return len(prompt) <= 160 and bool(_ASKS.match(prompt))
