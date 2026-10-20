"""MCP server: lets an MCP client (Claude Desktop / Cowork / Claude Code) dispatch coding
work to this laptop.

Runs over stdio (`doaide-code mcp`), so it opens no network port: the client launches it
as a subprocess and speaks JSON-RPC over stdin/stdout. Every tool works inside one root,
the active project or the workspace (~/doaide-code-workspace), or a registered project
named in the call. `execute_code` hands a task to the local executors (Ollama, Codex CLI,
Claude CLI) through the same router the chat uses.

Because stdout carries the protocol, nothing here may print to it, and subprocesses get
stdin=DEVNULL so they cannot read the protocol stream.
"""

from __future__ import annotations

import asyncio
import fnmatch
import os
import re
import time
from pathlib import Path
from typing import Any

from mcp import Client
from mcp.server.mcpserver import Context, MCPServer
from mcp.server.mcpserver.exceptions import ToolError
from mcp.types import ToolAnnotations

from . import __version__
from .config import Settings
from .db import Store
from .executors import Job
from .files import IGNORED, FileAccessError, list_dir, read_file, resolve_in_root
from .router import RouterBrain
from .runner import NO_EXECUTOR, Outcome, build_router, run_job
from .workspace import DEFAULT_WORKSPACE, working_root, workspace_path

MAX_OUTPUT = 100_000
MAX_LIST = 2000
MAX_SEARCH_FILE = 1_000_000
COMMAND_TIMEOUT_LIMIT = 1800
RELAYED_METHODS = {"initialize", "ping", "tools/list", "tools/call"}

INSTRUCTIONS = """DoAide Code runs on the user's laptop. Tools act inside the active project
(or the workspace ~/doaide-code-workspace when no project is active); pass `project` to
target another registered project. Paths are relative to that root and cannot leave it.
Use execute_code to hand a whole coding task to the laptop's local models (Ollama, Codex,
Claude CLI): it picks the cheapest capable one and may edit files. Use the file, search
and command tools for precise steps. Call get_status first to see what is available."""


class ToolInputError(ValueError):
    """A bad argument or a failed operation, reported back to the MCP client as a tool error."""


class LaptopTools:
    """The tool implementations, independent of the MCP transport so they are easy to test."""

    def __init__(self, store: Store, router: RouterBrain, owner_email: str, *, workspace: str = DEFAULT_WORKSPACE):
        self.store = store
        self.router = router
        self.owner = owner_email
        self.workspace = workspace
        # Seconds between progress notifications while execute_code streams.
        self.progress_interval = 2.0

    # Roots and paths

    def root(self, project: str | None = None) -> tuple[Path, str]:
        if project:
            row = self.store.get_project(project)
            if row is None:
                names = ", ".join(p["name"] for p in self.store.list_projects()) or "none"
                raise ToolInputError(f"No project named '{project}'. Registered projects: {names}")
            path = Path(row["path"])
            if not path.is_dir():
                raise ToolInputError(f"Project folder is missing: {path}")
            return path.resolve(), row["name"]
        root, label = working_root(self.store, self.owner, self.workspace)
        return root.resolve(), label

    def resolve(self, path: str, project: str | None = None) -> tuple[Path, Path]:
        root, _ = self.root(project)
        rel = path.strip()
        # Absolute paths are accepted when they point inside the root.
        if os.path.isabs(rel):
            try:
                rel = str(Path(rel).resolve().relative_to(root))
            except ValueError as exc:
                raise ToolInputError(f"{path} is outside {root}") from exc
        try:
            return root, resolve_in_root(root, rel)
        except FileAccessError as exc:
            raise ToolInputError(f"{path}: {exc}") from exc

    @staticmethod
    def rel(root: Path, target: Path) -> str:
        return target.relative_to(root).as_posix() or "."

    # Tools

    async def get_status(self) -> dict[str, Any]:
        project = self.store.active_project(self.owner)
        executors = [
            {"name": e.name, "tier": e.tier, "available": await e.available()} for e in self.router.executors
        ]
        return {
            "online": True,
            "workspace": str(workspace_path(self.store, self.workspace)),
            "active_project": {"name": project["name"], "path": project["path"]} if project else None,
            "projects": [{"name": p["name"], "path": p["path"]} for p in self.store.list_projects()],
            "executors": executors,
            "available_executors": [e["name"] for e in executors if e["available"]],
            "usage_today": {
                "cost_usd": round(sum(r["cost_usd"] or 0 for r in self.store.usage_summary(time.time() - 86400)), 6),
            },
        }

    async def execute_code(self, prompt: str, project: str | None = None, on_progress=None) -> dict[str, Any]:
        if not prompt.strip():
            raise ToolInputError("prompt is empty")
        root, label = self.root(project)
        outcome = Outcome()
        last = 0.0

        async def on_delta(chunk: str) -> None:
            nonlocal last
            now = time.monotonic()
            if on_progress is not None and now - last >= self.progress_interval:
                last = now
                await on_progress(len(outcome.content), f"{len(outcome.content)} characters so far")

        await run_job(
            self.router, self.store, Job(prompt=prompt, cwd=root), outcome, on_delta, project=label, source="mcp"
        )
        if outcome.status != "done":
            raise ToolInputError(outcome.content or NO_EXECUTOR)
        return {
            "project": label,
            "root": str(root),
            "executor": outcome.executor,
            "answer": outcome.content,
            "usage": outcome.meta().get("usage"),
        }

    async def read_file(self, path: str, start_line: int = 1, end_line: int | None = None, project: str | None = None) -> str:
        root, target = self.resolve(path, project)
        try:
            data = await asyncio.to_thread(read_file, root, self.rel(root, target))
        except FileAccessError as exc:
            raise ToolInputError(str(exc)) from exc
        if data["binary"]:
            raise ToolInputError(f"{path} is a binary file ({data['size']} bytes)")
        lines = data["content"].splitlines(keepends=True)
        start = max(start_line, 1)
        text = "".join(lines[start - 1 : end_line])
        if data["truncated"] and end_line is None:
            text += f"\n[truncated: file is {data['size']} bytes; pass start_line/end_line to read further]"
        return text

    async def write_file(self, path: str, content: str, project: str | None = None) -> str:
        root, target = self.resolve(path, project)
        if target == root or target.is_dir():
            raise ToolInputError(f"{path} is a directory")
        existed = target.exists()
        await asyncio.to_thread(_write, target, content)
        verb = "Updated" if existed else "Created"
        return f"{verb} {self.rel(root, target)} ({len(content.encode())} bytes)"

    async def edit_file(
        self, path: str, old_text: str, new_text: str, replace_all: bool = False, project: str | None = None
    ) -> str:
        root, target = self.resolve(path, project)
        if not target.is_file():
            raise ToolInputError(f"No such file: {path}")
        if not old_text:
            raise ToolInputError("old_text is empty; use write_file to create or replace a whole file")
        original = await asyncio.to_thread(target.read_text, encoding="utf-8")
        count = original.count(old_text)
        if count == 0:
            raise ToolInputError(f"old_text was not found in {path}")
        if count > 1 and not replace_all:
            raise ToolInputError(
                f"old_text appears {count} times in {path}; add surrounding context or set replace_all"
            )
        updated = original.replace(old_text, new_text) if replace_all else original.replace(old_text, new_text, 1)
        await asyncio.to_thread(_write, target, updated)
        return f"Edited {self.rel(root, target)}: {count if replace_all else 1} replacement(s)"

    async def list_files(self, path: str = "", recursive: bool = False, project: str | None = None) -> str:
        root, target = self.resolve(path, project)
        if not target.is_dir():
            raise ToolInputError(f"No such folder: {path or '.'}")
        if not recursive:
            listing = await asyncio.to_thread(list_dir, root, self.rel(root, target) if target != root else "")
            lines = [f"{e['path']}/" if e["type"] == "dir" else e["path"] for e in listing["entries"]]
        else:
            lines = await asyncio.to_thread(_walk, root, target)
        header = f"{self.rel(root, target)} in {root}"
        if not lines:
            return f"{header}\n(empty)"
        more = "\n[listing truncated]" if len(lines) >= MAX_LIST else ""
        return header + "\n" + "\n".join(lines) + more

    async def search_code(
        self,
        pattern: str,
        path: str = "",
        glob: str | None = None,
        regex: bool = False,
        case_sensitive: bool = False,
        max_results: int = 200,
        project: str | None = None,
    ) -> str:
        if not pattern:
            raise ToolInputError("pattern is empty")
        flags = 0 if case_sensitive else re.IGNORECASE
        try:
            matcher = re.compile(pattern if regex else re.escape(pattern), flags)
        except re.error as exc:
            raise ToolInputError(f"Invalid regex: {exc}") from exc
        root, target = self.resolve(path, project)
        limit = max(1, min(max_results, 1000))
        hits = await asyncio.to_thread(_search, root, target, matcher, glob, limit)
        if not hits:
            return f"No matches for {pattern!r}"
        more = f"\n[stopped at {limit} matches]" if len(hits) >= limit else ""
        return "\n".join(hits) + more

    async def run_command(self, command: str, cwd: str = "", timeout: int = 120, project: str | None = None) -> str:
        if not command.strip():
            raise ToolInputError("command is empty")
        root, target = self.resolve(cwd, project)
        if not target.is_dir():
            raise ToolInputError(f"No such folder: {cwd}")
        timeout = max(1, min(timeout, COMMAND_TIMEOUT_LIMIT))
        proc = await asyncio.create_subprocess_shell(
            command,
            cwd=str(target),
            stdin=asyncio.subprocess.DEVNULL,
            stdout=asyncio.subprocess.PIPE,
            stderr=asyncio.subprocess.STDOUT,
            start_new_session=True,  # so a timeout can stop the whole process group
        )
        try:
            output, _ = await asyncio.wait_for(proc.communicate(), timeout)
            status = f"exit code {proc.returncode}"
        except TimeoutError:
            _kill_group(proc)
            output, _ = await proc.communicate()
            status = f"timed out after {timeout}s (killed)"
        text = output.decode("utf-8", errors="replace")
        if len(text) > MAX_OUTPUT:
            half = MAX_OUTPUT // 2
            text = f"{text[:half]}\n[... {len(text) - MAX_OUTPUT} characters omitted ...]\n{text[-half:]}"
        return f"$ {command}\n[{status}, cwd {self.rel(root, target)}]\n{text}"


def _write(target: Path, content: str) -> None:
    target.parent.mkdir(parents=True, exist_ok=True)
    target.write_text(content, encoding="utf-8")


def _kill_group(proc: asyncio.subprocess.Process) -> None:
    try:
        os.killpg(proc.pid, 9)
    except (ProcessLookupError, PermissionError):
        proc.kill()


def _walk(root: Path, start: Path) -> list[str]:
    lines: list[str] = []
    for current, dirs, files in os.walk(start):
        dirs[:] = sorted(d for d in dirs if d not in IGNORED)
        base = Path(current)
        for d in dirs:
            lines.append((base / d).relative_to(root).as_posix() + "/")
        for f in sorted(files):
            if f not in IGNORED:
                lines.append((base / f).relative_to(root).as_posix())
        if len(lines) >= MAX_LIST:
            return lines[:MAX_LIST]
    return lines


def _search(root: Path, start: Path, matcher: re.Pattern, glob: str | None, limit: int) -> list[str]:
    hits: list[str] = []
    candidates = [start] if start.is_file() else None
    if candidates is None:
        candidates = []
        for current, dirs, files in os.walk(start):
            dirs[:] = sorted(d for d in dirs if d not in IGNORED)
            candidates.extend(Path(current) / f for f in sorted(files) if f not in IGNORED)
    for path in candidates:
        rel = path.relative_to(root).as_posix()
        if glob and not (fnmatch.fnmatch(path.name, glob) or fnmatch.fnmatch(rel, glob)):
            continue
        try:
            if path.stat().st_size > MAX_SEARCH_FILE:
                continue
            data = path.read_bytes()
        except OSError:
            continue
        if b"\0" in data[:8192]:
            continue
        for number, line in enumerate(data.decode("utf-8", errors="replace").splitlines(), 1):
            if matcher.search(line):
                hits.append(f"{rel}:{number}: {line.strip()[:300]}")
                if len(hits) >= limit:
                    return hits
    return hits


def build_server(tools: LaptopTools):
    """Register the tools on an MCP server. Errors come back as tool errors (is_error)."""
    server = MCPServer(name="doaide-code", title="DoAide Code", version=__version__, instructions=INSTRUCTIONS)
    read_only = ToolAnnotations(read_only_hint=True, destructive_hint=False, idempotent_hint=True, open_world_hint=False)
    writes = ToolAnnotations(read_only_hint=False, destructive_hint=True, open_world_hint=False)

    async def guard(call):
        try:
            return await call
        except ToolInputError as exc:
            raise ToolError(str(exc)) from exc

    @server.tool(annotations=read_only)
    async def get_status() -> dict[str, Any]:
        """Whether the laptop executor is online, which local LLMs (Ollama, Codex CLI, Claude CLI)
        are available, the workspace folder, and the registered projects."""
        return await guard(tools.get_status())

    @server.tool(annotations=ToolAnnotations(read_only_hint=False, destructive_hint=True, open_world_hint=True))
    async def execute_code(prompt: str, ctx: Context, project: str | None = None) -> dict[str, Any]:
        """Hand a coding task to the laptop's local models. The router picks the cheapest capable
        executor (Ollama, then Codex / Claude CLI) and runs it in the project folder; it may read and
        edit files there. Returns the final answer. Can take several minutes for large tasks."""

        async def progress(done: int, message: str) -> None:
            await ctx.report_progress(done, None, message)

        return await guard(tools.execute_code(prompt, project, on_progress=progress))

    @server.tool(annotations=read_only)
    async def read_file(path: str, start_line: int = 1, end_line: int | None = None, project: str | None = None) -> str:
        """Read a text file (up to 500 KB), optionally only lines start_line..end_line (1-based, inclusive)."""
        return await guard(tools.read_file(path, start_line, end_line, project))

    @server.tool(annotations=writes)
    async def write_file(path: str, content: str, project: str | None = None) -> str:
        """Create or overwrite a file with the given content. Parent folders are created."""
        return await guard(tools.write_file(path, content, project))

    @server.tool(annotations=writes)
    async def edit_file(
        path: str, old_text: str, new_text: str, replace_all: bool = False, project: str | None = None
    ) -> str:
        """Replace exact text in a file. old_text must occur exactly once unless replace_all is true."""
        return await guard(tools.edit_file(path, old_text, new_text, replace_all, project))

    @server.tool(annotations=writes)
    async def run_command(command: str, cwd: str = "", timeout: int = 120, project: str | None = None) -> str:
        """Run a shell command in the project folder (or a subfolder via cwd). Returns the exit code
        and combined stdout/stderr. timeout is in seconds (max 1800)."""
        return await guard(tools.run_command(command, cwd, timeout, project))

    @server.tool(annotations=read_only)
    async def list_files(path: str = "", recursive: bool = False, project: str | None = None) -> str:
        """List files and folders (folders end with '/'). Skips .git, node_modules, virtualenvs and caches."""
        return await guard(tools.list_files(path, recursive, project))

    @server.tool(annotations=read_only)
    async def search_code(
        pattern: str,
        path: str = "",
        glob: str | None = None,
        regex: bool = False,
        case_sensitive: bool = False,
        max_results: int = 200,
        project: str | None = None,
    ) -> str:
        """Search file contents. Returns 'path:line: text' matches. pattern is literal unless regex is
        true; glob (e.g. '*.py') filters file names."""
        return await guard(tools.search_code(pattern, path, glob, regex, case_sensitive, max_results, project))

    return server


async def handle_relayed(tools: LaptopTools, message: dict[str, Any]) -> dict[str, Any]:
    """Answer one JSON-RPC request relayed from the hub (POST /api/v1/mcp/relay).

    The hub's endpoint is stateless, so each request runs against a fresh in-memory MCP
    session; only the tool methods (plus initialize and ping) are supported.
    """
    request_id = message.get("id")
    method = message.get("method")
    params = message.get("params") if isinstance(message.get("params"), dict) else {}

    def ok(result: dict[str, Any]) -> dict[str, Any]:
        return {"jsonrpc": "2.0", "id": request_id, "result": result}

    def fail(code: int, text: str) -> dict[str, Any]:
        return {"jsonrpc": "2.0", "id": request_id, "error": {"code": code, "message": text}}

    if method not in RELAYED_METHODS:
        return fail(-32601, f"Method not supported over the relay: {method}")
    try:
        async with Client(build_server(tools)) as client:
            if method == "initialize":
                return ok(
                    {
                        # Tool calls look the same across protocol versions, so accept the client's.
                        "protocolVersion": params.get("protocolVersion") or client.protocol_version,
                        "capabilities": {"tools": {}},
                        "serverInfo": client.server_info.model_dump(mode="json", by_alias=True, exclude_none=True),
                        "instructions": client.instructions,
                    }
                )
            if method == "ping":
                return ok({})
            if method == "tools/list":
                result = await client.list_tools()
            else:
                name = params.get("name")
                if not isinstance(name, str):
                    return fail(-32602, "tools/call needs a tool name")
                arguments = params.get("arguments") if isinstance(params.get("arguments"), dict) else {}
                result = await client.call_tool(name, arguments)
            return ok(result.model_dump(mode="json", by_alias=True, exclude_none=True))
    except Exception as exc:  # never leave the hub waiting
        return fail(-32603, f"Laptop MCP error: {exc}")


def run_mcp(settings: Settings) -> None:
    store = Store(settings.db_path)
    tools = LaptopTools(store, build_router(settings), settings.owner_email, workspace=settings.workspace)
    try:
        build_server(tools).run("stdio")
    finally:
        store.close()
