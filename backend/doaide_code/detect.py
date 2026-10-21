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
import tomllib
from collections.abc import Awaitable, Callable, Sequence
from pathlib import Path
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


def _unique(items: list[str]) -> list[str]:
    return list(dict.fromkeys(i for i in items if i))




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
        return _tool("ollama", "Ollama", "ready", count, models=names, default=default, choices=names)

    def claude_choices(self) -> list[str]:
        s = self.settings
        return _unique([s.claude_haiku_model, s.claude_sonnet_model, s.claude_opus_model])

    def codex_choices(self) -> list[str]:
        return _unique([self.settings.codex_model or self.codex_configured_model(), *self.settings.codex_models])

    def codex_configured_model(self) -> str:
        """The model in Codex's own config.toml, which is what runs without `--model`."""
        try:
            config = tomllib.loads((self.settings.codex_home / "config.toml").read_text())
        except (OSError, ValueError):
            return "default"
        model = config.get("model")
        return model if isinstance(model, str) and model else "default"

    async def claude(self) -> dict[str, Any]:
        tool = await self._claude()
        return {**tool, "choices": self.claude_choices()} if tool["usable"] else tool

    async def codex(self) -> dict[str, Any]:
        tool = await self._codex()
        return {**tool, "choices": self.codex_choices()} if tool["usable"] else tool

    async def _claude(self) -> dict[str, Any]:
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

    async def _codex(self) -> dict[str, Any]:
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


# Questions about DoAide itself (who it is, what it can do, which models it has) are answered
# here from detection. Small local models answer them from training data ("I am GPT-4, made by
# OpenAI"), so they never reach a model. Matching is by keywords, not exact phrasing.
_IDENTITY = re.compile(
    r"\bwho\s+(?:are|r)\s+(?:you|u)\b|\bwho\s+(?:made|created|built|trained|developed|owns|wrote)\s+(?:you|u)\b"
    r"|\bwhat\s+(?:are|r)\s+(?:you|u)\b(?!\s+(?:doing|working|thinking|saying|talking))"
    r"|\bare\s+(?:you|u)\s+(?:an?\s+)?(?:gpt|chat\s?gpt|openai|claude|gemini|llama|bard|copilot|human|real|bot|ai|llm|robot)\b"
    r"|\b(?:what|which)\s+(?:company|model|llm|ai|version)\s+(?:are|r|is)\s+(?:you|u|this)\b"
    r"|\b(?:what(?:'s|\s+is)\s+your\s+name|your\s+name\s*\?|introduce\s+yourself|tell\s+me\s+about\s+yourself)\b"
    r"|\b(?:who|what)\s+(?:is|are)\s+(?:behind|powering)\s+(?:you|this)\b|\bwhat\s+powers\s+(?:you|this)\b",
    re.I,
)
_CAPABILITIES = re.compile(
    r"\bwhat\s+(?:can|could)\s+(?:you|u)\s+do\b|\b(?:your|ur)\s+(?:capabilit\w*|abilit\w*|features|limitations)\b"
    r"|\bwhat\s+are\s+(?:you|u)\s+capable\s+of\b|\bhow\s+can\s+(?:you|u)\s+help\b"
    r"|\bwhat\s+(?:do|can)\s+(?:you|u)\s+(?:help|support|offer)\b|\bwhat\s+tools\s+do\s+(?:you|u)\s+have\b",
    re.I,
)
# "Can you access my files?", "are you able to read my code?", "do you have access to my projects
# folder?": small models answer from training data that they cannot. DoAide can.
_ACCESS = re.compile(
    r"\b(?:can|could|do|are|will|would)\s+(?:you|u)\s+(?:be\s+)?(?:able\s+to\s+|have\s+access\s+to\s+)?"
    r"(?:access|read|see|open|view|browse|look\s+(?:at|through|into)|scan|search)\b.{0,40}?"
    r"\b(?:files?|folders?|director(?:y|ies)|code(?:base)?|projects?|repos?|repositor(?:y|ies)|computer|laptop|machine|disk)\b"
    r"|\b(?:do|have)\s+(?:you|u)\s+(?:got\s+|have\s+)?access\s+to\b"
    r"|\b(?:access|read)\s+(?:to\s+)?(?:my|local|the\s+local)\s+(?:local\s+)?(?:files?|folders?|code|projects?)\s*\?",
    re.I,
)
# ...but "can you read app.py and fix the bug" is a task, not a question about access.
_ACCESS_TASK = re.compile(
    r"\.\w{1,5}\b|`|\b(?:and|then)\s+(?:fix|explain|refactor|change|add|write|implement|review|summari[sz]e|find|debug"
    r"|test|tell|show|list|update|remove|rename)\b",
    re.I,
)
# A request for code work is never a question about DoAide, whatever words it shares with one
# ("refactor ... across the backend ... (project DoAide-Code)" is not "which backends do you have").
# Only an imperative counts: "which models do you use to write code?" is still about DoAide.
_CODE_TASK = re.compile(
    r"^\s*(?:please\s+|(?:can|could|would)\s+(?:you|u)\s+(?:please\s+)?)?"
    r"(?:refactor\w*|fix|implement|rename|propose|rewrite|write|add|remove|delete|change|update|debug|migrate|optimi[sz]e)\b",
    re.I,
)
_MODEL_WORD = re.compile(r"\b(?:models?|llms?|executors?|backends?|engines?|ai\s+providers?|gpts?)\b", re.I)
# The question is about this assistant / this laptop, not about code.
_ABOUT_US = re.compile(
    r"\b(?:you|u|your|ur|yours|available|installed|access|accessible|support(?:ed|s)?|offer|use|using|run|running"
    r"|this\s+(?:laptop|machine|computer|system|app|tool)|doaide|locally|local|list|which|switch|choose|pick)\b",
    re.I,
)
# ...unless it is clearly about the user's own code (ORM models, model files, ML training).
_ABOUT_CODE = re.compile(
    r"\.\w{1,5}\b|`|\b(?:class|table|schema|database|db|orm|django|rails|sequelize|prisma|pydantic|sqlalchemy|field|column"
    r"|migration|data\s+models?|user\s+model|repo|codebase|file|function|method|train\w*|fine-?tun\w*|dataset|weights"
    r"|accuracy|predict\w*|inference|pytorch|tensorflow|keras|sklearn|regression)\b",
    re.I,
)


def meta_question(prompt: str) -> str | None:
    """"identity", "access", "capabilities" or "models" for questions about DoAide itself, else None."""
    text = prompt.strip()
    if not text or len(text) > 200 or "\n" in text.strip() or _CODE_TASK.search(text):
        return None
    if _IDENTITY.search(text):
        return "identity"
    if _ACCESS.search(text) and not _ACCESS_TASK.search(text):
        return "access"
    if _MODEL_WORD.search(text) and _ABOUT_US.search(text) and not _ABOUT_CODE.search(text):
        return "models"
    if _CAPABILITIES.search(text):
        return "capabilities"
    return None


def asks_about_models(prompt: str) -> bool:
    return meta_question(prompt) is not None


IDENTITY = (
    "I'm **DoAide Code**, a coding assistant that runs on your own laptop. I'm not ChatGPT or GPT-4, "
    "and I'm not made by OpenAI. Each request is handled by one of the tools installed on this laptop "
    "(local Ollama models, the Claude CLI, or the Codex CLI), picked automatically: a free local model "
    "first, Claude Sonnet when its answer fails a check."
)
CAPABILITIES = (
    "I'm **DoAide Code**. I can answer coding questions about your project, read and list its files, "
    "and change its code: changes that pass every check are written to the files, and `/undo` puts them back. "
    "Commands: `/models`, `/undo`, `/projects`, `/add-project`, `/switch-project`, `/workspace`, `/usage`, `/new`, `/help`."
)


def answer_access(folder: Path | None) -> str:
    """The zero-token answer to "can you access my files?": yes, and which folder."""
    where = (
        f"Right now I'm working in `{folder}`: I can list its folders, open and search its files, and "
        "change its code (changes that pass every check are written; `/undo` puts them back)."
        if folder is not None
        else "No project folder is selected yet."
    )
    return (
        "Yes. **DoAide Code** runs on your laptop, so it reads your local files directly. "
        f"{where}\n\nI work in one project folder at a time. To use another folder on this laptop, "
        "add it with `/add-project <path>` (for example `/add-project ~/projects/my-app`) and switch with "
        "`/switch-project <name>`; `/projects` lists the ones you have added."
    )


def answer_meta(kind: str, report: dict[str, Any]) -> str:
    """The zero-token answer to a meta question: fixed text plus what detection found."""
    intro = {"identity": IDENTITY, "capabilities": CAPABILITIES}.get(kind)
    return f"{intro}\n\n{format_report(report)}" if intro else format_report(report)
