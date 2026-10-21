"""MCP server: real protocol calls through the SDK client (in-process and over stdio)."""

from __future__ import annotations

import os
import sys
from pathlib import Path

import pytest
from mcp import Client, StdioServerParameters

from doaide_code.mcp_server import LaptopTools, build_server
from doaide_code.router import RouterBrain
from doaide_code.runner import NO_EXECUTOR

pytestmark = pytest.mark.anyio

OWNER = "owner@example.com"
TOOLS = {
    "get_status",
    "execute_code",
    "read_file",
    "write_file",
    "edit_file",
    "run_command",
    "list_files",
    "search_code",
    "apply_changes",
    "discard_changes",
}


@pytest.fixture
def project(tmp_path) -> Path:
    root = tmp_path / "proj"
    (root / "src").mkdir(parents=True)
    (root / "src" / "app.py").write_text("def greet():\n    return 'hello'\n\nprint(greet())\n")
    (root / "README.md").write_text("# Demo\nTODO: write docs\n")
    (root / "node_modules" / "x").mkdir(parents=True)
    (root / "node_modules" / "x" / "index.js").write_text("TODO hidden")
    return root


@pytest.fixture
def tools(store, executors, project, tmp_path) -> LaptopTools:
    store.set_active_project(OWNER, store.add_project("demo", str(project))["id"])
    t = LaptopTools(store, RouterBrain(executors, offline=True), OWNER, workspace=str(tmp_path / "ws"))
    t.progress_interval = 0
    return t


async def call(tools: LaptopTools, name: str, args: dict | None = None, **kwargs):
    async with Client(build_server(tools)) as client:
        return await client.call_tool(name, args or {}, **kwargs)


def text(result) -> str:
    return "\n".join(block.text for block in result.content if getattr(block, "type", "") == "text")


async def test_lists_all_tools_with_safety_annotations(tools):
    async with Client(build_server(tools)) as client:
        listed = (await client.list_tools()).tools
    by_name = {t.name: t for t in listed}
    assert set(by_name) == TOOLS
    for name in ("read_file", "list_files", "search_code", "get_status"):
        assert by_name[name].annotations.read_only_hint is True
    for name in ("write_file", "edit_file", "run_command", "execute_code"):
        assert by_name[name].annotations.destructive_hint is True
    assert "ctx" not in by_name["execute_code"].input_schema["properties"]
    assert by_name["execute_code"].input_schema["required"] == ["prompt"]


async def test_get_status_reports_executors_and_projects(tools, executors, project):
    executors[1].up = False
    result = await call(tools, "get_status")
    status = result.structured_content
    assert status["online"] is True
    assert status["active_project"] == {"name": "demo", "path": str(project)}
    assert status["available_executors"] == ["ollama", "claude-sonnet", "claude-opus"]
    assert {"name": "codex", "tier": 1, "available": False} in status["executors"]


async def test_execute_code_runs_on_local_executor_in_project(tools, executors, project):
    progress = []

    async def on_progress(done, _total, _message):
        progress.append(done)

    result = await call(tools, "execute_code", {"prompt": "what does greet() return?"}, progress_callback=on_progress)
    assert not result.is_error
    assert result.structured_content["answer"] == "Hello world"
    assert result.structured_content["executor"] == "ollama"
    assert executors[0].jobs[0].cwd == project.resolve()
    assert progress  # long tasks keep the client informed


async def test_execute_code_reports_missing_executors_as_tool_error(tools, executors):
    for ex in executors:
        ex.up = False
    result = await call(tools, "execute_code", {"prompt": "hi"})
    assert result.is_error and NO_EXECUTOR in text(result)


async def test_execute_code_in_named_project(tools, executors, tmp_path, store):
    other = tmp_path / "other"
    other.mkdir()
    store.add_project("other", str(other))
    await call(tools, "execute_code", {"prompt": "hi", "project": "other"})
    assert executors[0].jobs[-1].cwd == other.resolve()
    result = await call(tools, "execute_code", {"prompt": "hi", "project": "nope"})
    assert result.is_error and "No project named 'nope'" in text(result)


async def test_read_file_whole_and_line_range(tools):
    assert text(await call(tools, "read_file", {"path": "src/app.py"})).startswith("def greet():")
    assert text(await call(tools, "read_file", {"path": "src/app.py", "start_line": 2, "end_line": 2})) == (
        "    return 'hello'\n"
    )


async def test_write_and_edit_file(tools, project):
    result = await call(tools, "write_file", {"path": "pkg/new.py", "content": "x = 1\nx = 1\n"})
    assert "Created pkg/new.py" in text(result)
    assert (project / "pkg" / "new.py").read_text() == "x = 1\nx = 1\n"

    ambiguous = await call(tools, "edit_file", {"path": "pkg/new.py", "old_text": "x = 1", "new_text": "x = 2"})
    assert ambiguous.is_error and "appears 2 times" in text(ambiguous)
    done = await call(
        tools, "edit_file", {"path": "pkg/new.py", "old_text": "x = 1", "new_text": "x = 2", "replace_all": True}
    )
    assert "2 replacement(s)" in text(done) and (project / "pkg" / "new.py").read_text() == "x = 2\nx = 2\n"

    missing = await call(tools, "edit_file", {"path": "pkg/new.py", "old_text": "nope", "new_text": ""})
    assert missing.is_error and "not found" in text(missing)


async def test_paths_cannot_leave_the_project(tools, project, tmp_path):
    (tmp_path / "secret.txt").write_text("secret")
    os.symlink(tmp_path / "secret.txt", project / "link.txt")
    for name, args in [
        ("read_file", {"path": "../secret.txt"}),
        ("read_file", {"path": "link.txt"}),
        ("read_file", {"path": str(tmp_path / "secret.txt")}),
        ("write_file", {"path": "../escape.txt", "content": "x"}),
        ("edit_file", {"path": "../secret.txt", "old_text": "secret", "new_text": "x"}),
        ("run_command", {"command": "pwd", "cwd": ".."}),
        ("list_files", {"path": "../"}),
    ]:
        result = await call(tools, name, args)
        assert result.is_error, (name, args)
    assert not (tmp_path / "escape.txt").exists()
    assert (tmp_path / "secret.txt").read_text() == "secret"
    # Absolute paths inside the project are fine.
    assert "def greet" in text(await call(tools, "read_file", {"path": str(project / "src" / "app.py")}))


async def test_list_files_flat_and_recursive_skip_heavy_folders(tools):
    flat = text(await call(tools, "list_files"))
    assert flat.splitlines()[1:] == ["src/", "README.md"]
    deep = text(await call(tools, "list_files", {"recursive": True}))
    assert "src/app.py" in deep and "node_modules" not in deep


async def test_search_code_literal_regex_and_glob(tools):
    hits = text(await call(tools, "search_code", {"pattern": "todo"}))
    assert hits == "README.md:2: TODO: write docs"  # node_modules skipped, case-insensitive
    assert "src/app.py:1: def greet():" in text(
        await call(tools, "search_code", {"pattern": r"def \w+\(", "regex": True, "glob": "*.py"})
    )
    assert "No matches" in text(await call(tools, "search_code", {"pattern": "todo", "case_sensitive": True}))
    bad = await call(tools, "search_code", {"pattern": "(", "regex": True})
    assert bad.is_error and "Invalid regex" in text(bad)


async def test_run_command_output_exit_code_and_cwd(tools, project):
    result = text(await call(tools, "run_command", {"command": "pwd && ls && echo oops >&2 && exit 3"}))
    assert "[exit code 3, cwd .]" in result
    assert str(project.resolve()) in result and "README.md" in result and "oops" in result
    sub = text(await call(tools, "run_command", {"command": "pwd", "cwd": "src"}))
    assert str((project / "src").resolve()) in sub


async def test_run_command_timeout_kills_process(tools):
    result = text(await call(tools, "run_command", {"command": "sleep 30; echo late", "timeout": 1}))
    header, output = result.split("]\n", 1)
    assert "timed out after 1s" in header and "late" not in output


async def test_run_command_cannot_read_protocol_stdin(tools):
    # stdin is /dev/null: a command that reads stdin gets EOF instead of the MCP stream.
    result = text(await call(tools, "run_command", {"command": "cat; echo done", "timeout": 5}))
    assert "exit code 0" in result and "done" in result


async def test_without_project_tools_use_the_workspace(store, executors, tmp_path):
    workspace = tmp_path / "ws"
    tools = LaptopTools(store, RouterBrain(executors, offline=True), OWNER, workspace=str(workspace))
    await call(tools, "write_file", {"path": "hello.txt", "content": "hi"})
    assert (workspace / "hello.txt").read_text() == "hi"
    status = (await call(tools, "get_status")).structured_content
    assert status["workspace"] == str(workspace.resolve()) and status["active_project"] is None


async def test_stdio_transport_end_to_end(tmp_path):
    """Launch `doaide-code mcp` the way Claude does and talk to it over stdin/stdout."""
    workspace = tmp_path / "ws"
    env = {
        **os.environ,
        "DOAIDE_DB": str(tmp_path / "mcp.db"),
        "DOAIDE_WORKSPACE": str(workspace),
        "DOAIDE_KEYS_DIR": str(tmp_path / "no-keys"),
        "DOAIDE_OFFLINE_ROUTER": "1",
        "OLLAMA_URL": "http://127.0.0.1:9",  # nothing listens: no real model is used
        "DOAIDE_CLAUDE_BIN": "/nonexistent/claude",
        "DOAIDE_CODEX_BIN": "/nonexistent/codex",
    }
    for key in ("GEMINI_API_KEY", "TYPESAFE_API_KEY"):
        env.pop(key, None)
    params = StdioServerParameters(command=sys.executable, args=["-m", "doaide_code.main", "mcp"], env=env)
    async with Client(params) as client:
        assert {t.name for t in (await client.list_tools()).tools} == TOOLS
        wrote = await client.call_tool("write_file", {"path": "a.txt", "content": "from claude"})
        assert not wrote.is_error
        status = (await client.call_tool("get_status", {})).structured_content
        assert status["available_executors"] == []
        failed = await client.call_tool("execute_code", {"prompt": "hi"})
        assert failed.is_error and NO_EXECUTOR in text(failed)
    assert (workspace / "a.txt").read_text() == "from claude"
