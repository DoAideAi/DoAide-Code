"""Run the project's tests after DoAide writes an edit; a failing edit is undone.

Syntax and lint checks (changes.py) cannot tell a correct edit from one that parses but breaks
behaviour (a local model once "stripped filler" by calling .strip() on every streamed chunk,
gluing every reply's words together). The project's own tests can. For Python projects with a
virtualenv and pytest, the tests of the package holding the edited files run after the write
(those that reference the edited modules, or all of them when none do): exit status 1 means the
edit broke them. Tests that fail with the edit taken out again too were already broken and do
not count against it (live: a red test in the repo sent every edit near it to Sonnet), unless
the request is about them: "fix add" must make a red test_add pass. No tests,
no virtualenv or no pytest: nothing runs and the edit stands, as before. DOAIDE_RUN_TESTS=0 turns
this off.
"""

from __future__ import annotations

import asyncio
import os
import re
from collections.abc import Callable
from contextlib import AbstractAsyncContextManager
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
        if path.name.startswith("test_"):
            # Also outside tests/: a new test file a model put next to the code must still run
            # (live: one with a wrong import passed, never collected).
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


async def failing_tests(
    root: Path,
    paths: list[str],
    *,
    timeout: float = TIMEOUT,
    without_edit: Callable[[], AbstractAsyncContextManager[None]] | None = None,
    request: str = "",
    details: dict[str, str] | None = None,
) -> str | None:
    """Why the project's tests fail after an edit to `paths` (the first failure), or None when
    they pass, or none could be run.

    `without_edit`: takes the edit out of the files while it is entered. The failing tests run
    again inside it, and those that fail there too are not the edit's doing, unless `request`
    (what the user asked) is about them. `details` gets each failing test's pytest summary line
    ("AssertionError: assert 'a  b' == 'a b'"), for asking the model to fix its edit."""
    if not enabled() or (target := test_target(root, paths)) is None:
        return None
    folder, python = target
    selected = related_tests(folder, root.resolve(), paths)
    failed = await _pytest(folder, python, selected, timeout, details)
    if not failed or without_edit is None or failed == ["?"]:
        return _reason(failed)
    if wanted := [t for t in failed if about(request, t)]:
        # They count whatever the baseline says.
        return _reason(wanted)
    # Only the files that failed run again (live: 15 s for the 293 tests touching router.py, ~1 s
    # for the one file with the red test).
    files = sorted({t.split("::")[0] for t in failed})
    try:
        async with without_edit():
            before = await _pytest(folder, python, files, timeout)
    except (ValueError, OSError):
        # The edit could not be taken out: no baseline, so every failure counts.
        return _reason(failed)
    if before is None:
        return _reason(failed)
    return _reason([t for t in failed if t not in before or about(request, t)])


_FIX_TESTS = re.compile(
    r"\b(?:fix|make)\b.*\btests?\b|\btests?\b.*\b(?:fail\w*|broken|pass\w*|red)\b|\b(?:fail\w*|broken|red)\s+tests?\b", re.I
)


def about(request: str, test_id: str) -> bool:
    """Whether the request is about this (already failing) test: it names the test ("fix add"
    for test_add) or asks to fix failing tests. Not its file: "edit calc.py" is not about a red
    test in test_calc.py."""
    if _FIX_TESTS.search(request):
        return True
    words = set(re.findall(r"\w+", request.lower()))
    func = test_id.split("[")[0].rsplit("::", 1)[-1].lower()
    return bool(words & ({func, func.removeprefix("test_")} - {""}))


def _reason(failed: list[str] | None) -> str | None:
    if not failed:
        return None
    return "tests fail" if failed == ["?"] else f"tests fail ({failed[0]})"


async def _pytest(
    folder: Path, python: Path, selected: list[str], timeout: float, details: dict[str, str] | None = None
) -> list[str] | None:
    """The failing tests' ids ([] when they pass, ["?"] when pytest failed without naming one),
    or None when nothing could be learned (no pytest, a usage error, a timeout). Their summary
    messages go into `details`."""
    proc = None
    try:
        # No .pyc files: an edit that keeps a file's size within the same second as the last run
        # would otherwise be tested against the stale bytecode of the code it replaced.
        proc = await asyncio.create_subprocess_exec(
            # Not -x: a test that was already failing would hide the ones after it.
            str(python), "-B", "-m", "pytest", "-q", "-p", "no:cacheprovider", *selected,
            cwd=folder, stdout=asyncio.subprocess.PIPE, stderr=asyncio.subprocess.STDOUT,
            env={**os.environ, "PYTHONDONTWRITEBYTECODE": "1"},
        )
        out, _ = await asyncio.wait_for(proc.communicate(), timeout)
    except (OSError, asyncio.TimeoutError):
        if proc is not None and proc.returncode is None:
            proc.kill()
        return None
    # 1: tests failed; 2 with ERROR lines: a test file failed to import (live: a new test importing
    # the package by a path that does not resolve passed as "nothing learned"). 0 passed, 5 found
    # none; anything else (no pytest, a usage error) says nothing about the edit.
    if proc.returncode in (0, 5):
        return []
    text = out.decode(errors="replace")
    found = re.findall(r"^(?:FAILED|ERROR) (\S+)(?: - (.*))?$", text, re.M)
    if proc.returncode != 1 and not (proc.returncode == 2 and found):
        return None
    if details is not None:
        for test, message in found:
            if not message.strip() and (block := re.search(rf"ERROR collecting {re.escape(test)} _+\n(.*?)(?=^[_=]{{3,}})", text, re.M | re.S)):
                # A collection error's summary line has no message: its last "E   ..." line does.
                message = next(iter(reversed(re.findall(r"^E\s+(.+)$", block.group(1), re.M))), "")
            if message.strip():
                details[test] = message.strip()[:300]
    return [test for test, _ in found] or ["?"]
