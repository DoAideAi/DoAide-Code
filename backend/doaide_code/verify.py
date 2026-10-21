"""Run the project's tests after DoAide writes an edit; a failing edit is undone.

Syntax and lint checks (changes.py) cannot tell a correct edit from one that parses but breaks
behaviour (a local model once "stripped filler" by calling .strip() on every streamed chunk,
gluing every reply's words together). The project's own tests can. For Python projects with a
virtualenv and pytest, the tests of the package holding the edited files run after the write
(those that reference the edited modules, or all of them when none do): exit status 1 means the
edit broke them. No tests, no virtualenv or no pytest: nothing runs and
the edit stands, as before. DOAIDE_RUN_TESTS=0 turns this off.
"""

from __future__ import annotations

import asyncio
import os
import re
from pathlib import Path

TIMEOUT = 120
_MARKERS = ("pyproject.toml", "setup.cfg", "pytest.ini", "tox.ini")


def enabled() -> bool:
    return os.environ.get("DOAIDE_RUN_TESTS", "1").strip() != "0"


def test_target(root: Path, paths: list[str]) -> tuple[Path, Path] | None:
    """(package folder, its python) for the first edited Python file whose package has tests."""
    root = root.resolve()
    for rel in paths:
        if not rel.endswith(".py"):
            continue
        folder = (root / rel).resolve().parent
        while folder == root or root in folder.parents:
            if any((folder / m).is_file() for m in _MARKERS) and (folder / "tests").is_dir():
                for venv in (folder / ".venv", root / ".venv"):
                    python = venv / "bin" / "python"
                    if python.is_file():
                        return folder, python
                return None
            if folder == root:
                break
            folder = folder.parent
    return None


def related_tests(folder: Path, root: Path, paths: list[str]) -> list[str]:
    """Test files (relative to `folder`) that import or name the edited modules, plus edited test
    files themselves; empty when none do (then the whole suite runs)."""
    tests = folder / "tests"
    targets: list[tuple[str, str, set[str]]] = []
    found: set[str] = set()
    for rel in paths:
        path = (root / rel).resolve()
        if not rel.endswith(".py") or folder not in path.parents:
            continue
        if tests in path.parents and path.name.startswith("test_"):
            found.add(path.relative_to(folder).as_posix())
            continue
        dotted = ".".join(path.relative_to(folder).with_suffix("").parts)
        try:
            source = path.read_text(encoding="utf-8", errors="ignore")
        except OSError:
            source = ""
        # Its top-level functions and classes: tests often import them through a package
        # ("from app.executors import OllamaExecutor" for app/executors/ollama.py).
        names = {n for n in re.findall(r"^(?:async\s+)?(?:def|class)\s+(\w+)", source, re.M) if len(n) >= 5}
        targets.append((dotted.removesuffix(".__init__"), path.stem, names))
    if not targets:
        return sorted(found)
    for test in sorted(tests.rglob("test_*.py")):
        try:
            text = test.read_text(encoding="utf-8", errors="ignore")
        except OSError:
            continue
        for dotted, stem, names in targets:
            package = dotted.rpartition(".")[0]
            imports_stem = package and re.search(rf"^\s*from\s+{re.escape(package)}\s+import\s+[^\n]*\b{re.escape(stem)}\b", text, re.M)
            uses_name = names and re.search(rf"\b(?:{'|'.join(map(re.escape, sorted(names)))})\b", text)
            if dotted in text or imports_stem or uses_name or test.stem.startswith(f"test_{stem}"):
                found.add(test.relative_to(folder).as_posix())
                break
    return sorted(found)


async def failing_tests(root: Path, paths: list[str], *, timeout: float = TIMEOUT) -> str | None:
    """Why the project's tests fail after an edit to `paths` (the first failure), or None when
    they pass, or none could be run."""
    if not enabled() or (target := test_target(root, paths)) is None:
        return None
    folder, python = target
    selected = related_tests(folder, root.resolve(), paths)
    proc = None
    try:
        # No .pyc files: an edit that keeps a file's size within the same second as the last run
        # would otherwise be tested against the stale bytecode of the code it replaced.
        proc = await asyncio.create_subprocess_exec(
            str(python), "-B", "-m", "pytest", "-x", "-q", "-p", "no:cacheprovider", *selected,
            cwd=folder, stdout=asyncio.subprocess.PIPE, stderr=asyncio.subprocess.STDOUT,
            env={**os.environ, "PYTHONDONTWRITEBYTECODE": "1"},
        )
        out, _ = await asyncio.wait_for(proc.communicate(), timeout)
    except (OSError, asyncio.TimeoutError):
        if proc is not None and proc.returncode is None:
            proc.kill()
        return None
    # 1: tests failed. 0 passed, 5 found none; anything else (no pytest, a usage error) says
    # nothing about the edit.
    if proc.returncode != 1:
        return None
    text = out.decode(errors="replace")
    failed = re.findall(r"^FAILED (\S+)", text, re.M)
    return f"tests fail ({failed[0]})" if failed else "tests fail"
