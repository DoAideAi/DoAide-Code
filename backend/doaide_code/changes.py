"""Proposed code changes: parse edit blocks, preview them as diffs, validate, then apply.

Models never write files. They answer with SEARCH/REPLACE blocks; DoAide applies them in
memory, shows a unified diff, runs quick checks (syntax / linters) on the result, and writes
to disk only when the user applies the changeset. Applying refuses if a file changed since
the preview, so nothing is overwritten blindly.
"""

from __future__ import annotations

import ast
import asyncio
import difflib
import hashlib
import json
import logging
import os
import re
import shutil
import sys
import tempfile
import tomllib
import uuid
from dataclasses import dataclass, field
from pathlib import Path
from typing import Any

from .files import IGNORED, FileAccessError, resolve_in_root

log = logging.getLogger(__name__)

SEARCH_RE = re.compile(r"^\s*<{5,9}\s*SEARCH\s*$")
DIVIDER_RE = re.compile(r"^\s*={5,9}\s*$")
REPLACE_RE = re.compile(r"^\s*>{5,9}\s*REPLACE\s*$")
FENCE_RE = re.compile(r"^\s*```")
MAX_DIFF_CHARS = 60_000
CHECK_TIMEOUT = 15


@dataclass
class Edit:
    path: str
    search: str
    replace: str


@dataclass
class FileChange:
    path: str
    original: str | None
    new: str
    problems: list[str] = field(default_factory=list)
    checks: list[str] = field(default_factory=list)

    @property
    def diff(self) -> str:
        before = (self.original or "").splitlines(keepends=True)
        after = self.new.splitlines(keepends=True)
        text = "".join(
            difflib.unified_diff(before, after, f"a/{self.path}" if self.original is not None else "/dev/null", f"b/{self.path}")
        )
        return text if len(text) <= MAX_DIFF_CHARS else text[:MAX_DIFF_CHARS] + "\n... [diff truncated]\n"

    def summary(self) -> dict[str, Any]:
        diff = self.diff
        lines = diff.splitlines()
        return {
            "path": self.path,
            "new_file": self.original is None,
            "additions": sum(1 for line in lines if line.startswith("+") and not line.startswith("+++")),
            "deletions": sum(1 for line in lines if line.startswith("-") and not line.startswith("---")),
            "diff": diff,
            "problems": self.problems + self.checks,
        }


@dataclass
class Changeset:
    root: Path
    files: dict[str, FileChange] = field(default_factory=dict)
    problems: list[str] = field(default_factory=list)
    id: str = field(default_factory=lambda: uuid.uuid4().hex[:12])

    @property
    def all_problems(self) -> list[str]:
        return self.problems + [p for f in self.files.values() for p in f.problems + f.checks]

    @property
    def changed(self) -> list[FileChange]:
        return [f for f in self.files.values() if f.new != (f.original or "") or f.original is None]

    def drop_failing(self) -> list[str]:
        """Remove the files whose edits did not apply cleanly or fail their checks (so the rest
        can be written as is); returns their problems."""
        dropped = [p for f in self.files.values() for p in f.problems + f.checks]
        self.files = {k: f for k, f in self.files.items() if not (f.problems or f.checks)}
        return dropped

    def summary(self, status: str = "pending") -> dict[str, Any]:
        return {
            "id": self.id,
            "status": status,
            "files": [f.summary() for f in self.changed],
            "problems": self.problems,
        }

    def record(self) -> dict[str, Any]:
        """What is stored to apply (and undo) later: target contents, what they replace, and its hash."""
        return {
            "root": str(self.root),
            "files": [
                {"path": f.path, "original_hash": _hash(f.original), "original": f.original, "new": f.new}
                for f in self.changed
            ],
        }


def _hash(text: str | None) -> str | None:
    return None if text is None else hashlib.sha256(text.encode()).hexdigest()


# Parsing


def _path_before(lines: list[str], index: int) -> str | None:
    """The file path written above a SEARCH marker, skipping fences and blank lines."""
    for line in reversed(lines[max(0, index - 4) : index]):
        stripped = line.strip()
        if not stripped or FENCE_RE.match(stripped):
            continue
        # Live (Sonnet): "`backend/doaide_code/validate.py`, line 116 — why", a backticked path then prose.
        if quoted := re.match(r"^(?:#+\s*|File:\s*|\*\*)*`([^`\s]+\.[^`\s]+)`", stripped):
            return quoted.group(1)
        candidate = re.sub(r"^(#+\s*|File:\s*|\*\*|`)+|(\*\*|`|:)+$", "", stripped).strip()
        return candidate if candidate and " " not in candidate else None
    return None


def _normalize(text: str) -> list[str]:
    """Lines of an answer, with a marker glued to the next text split off (">>>>>>> REPLACEapp.py")."""
    return re.sub(r"^(\s*>{5,9}\s*REPLACE)[ \t]*(\S)", r"\1\n\2", text, flags=re.M).splitlines()


def _block(lines: list[str], i: int) -> tuple[list[str], list[str], int] | None:
    """The edit block whose SEARCH marker is line i: (search, replace, index of its last line),
    or None if it is cut off. Local models sometimes drop the ======= divider and put the new code
    after the REPLACE marker; that form is read too, the replacement running up to the next block."""
    j = i + 1
    while j < len(lines) and not (DIVIDER_RE.match(lines[j]) or REPLACE_RE.match(lines[j]) or SEARCH_RE.match(lines[j])):
        j += 1
    if j >= len(lines) or SEARCH_RE.match(lines[j]):
        return None
    if DIVIDER_RE.match(lines[j]):
        k = j + 1
        while k < len(lines) and not REPLACE_RE.match(lines[k]):
            k += 1
        return (lines[i + 1 : j], lines[j + 1 : k], k) if k < len(lines) else None
    nxt = next((n for n in range(j + 1, len(lines)) if SEARCH_RE.match(lines[n])), len(lines))
    # A REPLACE marker where the divider goes, then another closing the block (live, 32b model).
    if (k := next((n for n in range(j + 1, nxt) if REPLACE_RE.match(lines[n])), None)) is not None:
        return lines[i + 1 : j], lines[j + 1 : k], k
    # No divider: SEARCH lines, REPLACE marker, then the replacement until the next block's path.
    end = nxt - 1
    if nxt < len(lines):
        while end > j and (not lines[end].strip() or FENCE_RE.match(lines[end].strip())):
            end -= 1
        if end > j and _path_before(lines, nxt) is not None and lines[end].strip().strip("`*#: ") == _path_before(lines, nxt):
            end -= 1
    while end > j and (not lines[end].strip() or FENCE_RE.match(lines[end].strip())):
        end -= 1
    return lines[i + 1 : j], lines[j + 1 : end + 1], end


def parse_edits(text: str) -> list[Edit]:
    lines = _normalize(text)
    edits: list[Edit] = []
    i = 0
    while i < len(lines):
        if not SEARCH_RE.match(lines[i]):
            i += 1
            continue
        path = _path_before(lines, i)
        block = _block(lines, i)
        if block is None:
            break
        search, replace, end = block
        edit = Edit(path, _join(search), _join(replace)) if path else None
        # The same block written twice is one edit.
        if edit is not None and edit not in edits:
            edits.append(edit)
        i = end + 1
    return edits


def _join(lines: list[str]) -> str:
    return "\n".join(lines) + "\n" if lines else ""


def strip_edits(text: str) -> str:
    """The answer's prose with edit blocks (and the fences/paths around them) removed."""
    lines = _normalize(text)
    drop: set[int] = set()
    i = 0
    while i < len(lines):
        if not SEARCH_RE.match(lines[i]):
            i += 1
            continue
        path = _path_before(lines, i)
        # Back over blank lines, at most one fence and the path line.
        back, seen_path, seen_fence = i - 1, False, False
        while back >= 0:
            stripped = lines[back].strip()
            if not stripped:
                back -= 1
                continue
            if FENCE_RE.match(stripped) and not seen_fence:
                seen_fence = True
            elif not seen_path and path and stripped.strip("`*#: ").removeprefix("File:").strip() == path:
                seen_path = True
            else:
                break
            drop.add(back)
            back -= 1
        block = _block(lines, i)
        end = block[2] if block else len(lines) - 1
        if seen_fence and end + 1 < len(lines) and FENCE_RE.match(lines[end + 1].strip()):
            end += 1
        drop.update(range(i, min(end + 1, len(lines))))
        i = end + 1
    prose = "\n".join(line for n, line in enumerate(lines) if n not in drop)
    return re.sub(r"\n{3,}", "\n\n", prose).strip()


# Building and checking


def _replace_once(content: str, search: str, replace: str) -> tuple[str | None, str | None]:
    """Apply one SEARCH/REPLACE; tolerate trailing-whitespace differences. Returns (new, warning)."""
    count = content.count(search)
    if count:
        warning = f"SEARCH text matches {count} places; applied to the first" if count > 1 else None
        return content.replace(search, replace, 1), warning
    want = [line.rstrip() for line in search.splitlines()]
    have = content.splitlines(keepends=True)
    for start in range(len(have) - len(want) + 1):
        if [line.rstrip() for line in have[start : start + len(want)]] == want:
            return "".join(have[:start]) + replace + "".join(have[start + len(want) :]), None
    # Same lines at another indentation (small models often get the nesting depth wrong): match
    # them, and move the replacement by the same amount.
    bare = [line.strip() for line in want]
    for start in range(len(have) - len(want) + 1):
        window = have[start : start + len(want)]
        if [line.strip() for line in window] == bare and any(bare):
            shift = len(_indent(window)) - len(_indent(want))
            log.info("SEARCH matched at a different indentation; replacement moved %+d", shift)
            return "".join(have[:start]) + _reindent(replace, shift) + "".join(have[start + len(want) :]), None
    return None, None


def _indent(lines: list[str]) -> str:
    """Leading whitespace of the first non-blank line."""
    first = next((line for line in lines if line.strip()), "")
    return first[: len(first) - len(first.lstrip())]


def _reindent(text: str, shift: int) -> str:
    """Every non-blank line moved right (shift > 0) or left by `shift` spaces."""
    if shift == 0:
        return text
    out = []
    for line in text.splitlines(keepends=True):
        if not line.strip():
            out.append(line)
        elif shift > 0:
            out.append(" " * shift + line)
        else:
            lead = len(line) - len(line.lstrip(" "))
            out.append(line[min(lead, -shift) :])
    return "".join(out)


def _compiles(path: str, text: str) -> bool:
    if not path.endswith(".py"):
        return True
    try:
        compile(text, path, "exec")
    except SyntaxError:
        return False
    return True


def _only_match(root: Path, path: str) -> Path | None:
    """The one project file whose path ends with `path` ("history.py" for
    backend/doaide_code/history.py), or None when there is none or more than one."""
    found: list[Path] = []
    for current, dirs, names in os.walk(root):
        dirs[:] = [d for d in dirs if d not in IGNORED and not d.startswith(".")]
        for name in names:
            full = Path(current, name)
            if full.relative_to(root).as_posix().endswith("/" + path):
                found.append(full)
                if len(found) > 1:
                    return None
    return found[0] if found else None


def _same_file_here(root: Path, path: str) -> Path | None:
    """The project file an absolute path from elsewhere means: the one sharing the longest tail
    with it (/elsewhere/AgentProving/src/stats/x.py -> src/stats/x.py), or None when no file has
    that name or two share the longest tail."""
    want = Path(path).parts
    best: list[Path] = []
    longest = 0
    for current, dirs, names in os.walk(root):
        dirs[:] = [d for d in dirs if d not in IGNORED and not d.startswith(".")]
        if want[-1] not in names:
            continue
        full = Path(current, want[-1])
        have = full.relative_to(root).parts
        shared = 0
        while shared < min(len(have), len(want)) and have[-1 - shared] == want[-1 - shared]:
            shared += 1
        if shared > longest:
            best, longest = [full], shared
        elif shared == longest:
            best.append(full)
    return best[0] if len(best) == 1 else None


def build_changeset(root: Path, edits: list[Edit]) -> Changeset:
    root = root.resolve()
    changeset = Changeset(root)
    for edit in edits:
        try:
            target = resolve_in_root(root, edit.path)
        except FileAccessError:
            # Models copy absolute paths from tracebacks or another checkout of the project (live:
            # /Users/.../AgentProving/assurance/src/assurance/stats/statistics.py, opened elsewhere).
            match = _same_file_here(root, edit.path) if Path(edit.path).is_absolute() and edit.search.strip() else None
            if match is None:
                changeset.problems.append(
                    f"{edit.path} is outside the project at {root}, so it was not edited "
                    "(use a path inside the project, or switch with /switch-project)"
                )
                continue
            log.info("%s: absolute path taken as %s", edit.path, match.relative_to(root).as_posix())
            target = match
        if edit.search.strip() and not target.exists() and (match := _only_match(root, edit.path.strip("./"))):
            # An edit to "history.py" means the project's only history.py (live: the 32b wrote
            # the path as the request named it, and the edit escalated as "file does not exist").
            target = match
        rel = target.relative_to(root).as_posix()
        change = changeset.files.get(rel)
        if change is None:
            original = target.read_text(encoding="utf-8") if target.is_file() else None
            change = changeset.files[rel] = FileChange(rel, original, original or "")
        if not edit.search.strip():
            if change.original is None or not change.new.strip():
                change.new = edit.replace
            elif _is_new_code(change.new, edit.replace):
                # Models add a function with an empty SEARCH: new code, so it goes at the end.
                gap = "\n\n\n" if rel.endswith(".py") else "\n\n"
                change.new = change.new.rstrip("\n") + gap + edit.replace
            else:
                change.problems.append(f"{rel}: empty SEARCH for an existing file; edit skipped")
            continue
        if change.original is None and not change.new:
            change.problems.append(f"{rel}: file does not exist; SEARCH cannot match")
            continue
        updated, warning = _replace_once(change.new, edit.search, edit.replace)
        if updated is not None and not _compiles(rel, updated) and _compiles(rel, change.new):
            # The replacement's own indentation is off from the code it replaces: align it.
            shift = len(_indent(edit.search.splitlines())) - len(_indent(edit.replace.splitlines()))
            aligned, _ = _replace_once(change.new, edit.search, _reindent(edit.replace, shift)) if shift else (None, None)
            if aligned is not None and _compiles(rel, aligned):
                # A repair, not a problem: the syntax and lint checks still run on the result.
                log.info("%s: replacement re-indented %+d to match the code it replaces", rel, shift)
                updated = aligned
        if updated is None:
            first = edit.search.strip().splitlines()[0][:80]
            change.problems.append(f"{rel}: SEARCH text not found (starts with {first!r})")
        else:
            change.new = updated
            if warning:
                change.problems.append(f"{rel}: {warning}")
    return changeset


async def _run(argv: list[str], stdin: str | None = None) -> tuple[int, str]:
    proc = await asyncio.create_subprocess_exec(
        *argv,
        stdin=asyncio.subprocess.PIPE if stdin is not None else asyncio.subprocess.DEVNULL,
        stdout=asyncio.subprocess.PIPE,
        stderr=asyncio.subprocess.STDOUT,
    )
    try:
        out, _ = await asyncio.wait_for(proc.communicate(stdin.encode() if stdin is not None else None), CHECK_TIMEOUT)
    except TimeoutError:
        proc.kill()
        await proc.wait()
        return 0, ""  # a slow checker is not a failed check
    return proc.returncode or 0, out.decode(errors="replace")


def ruff_binary() -> str | None:
    """ruff from DoAide's own environment, else from PATH. The laptop agent runs from a LaunchAgent
    whose PATH lacked the folder ruff was in: every lint check was silently skipped."""
    beside = Path(sys.executable).parent / "ruff"
    return str(beside) if beside.is_file() else shutil.which("ruff")


async def check_file(path: str, content: str) -> list[str]:
    """Quick checks on one file's content: syntax for Python/JSON/TOML/JS, plus ruff if installed."""
    suffix = Path(path).suffix.lower()
    issues: list[str] = []
    if suffix == ".py":
        try:
            compile(content, path, "exec")
        except SyntaxError as exc:
            return [f"{path}:{exc.lineno}: SyntaxError: {exc.msg}"]
        issues += _second_docstrings(path, content)
        if ruff := ruff_binary():
            # Errors that break code (syntax, undefined names) and the damage local models do when
            # they paste a module's header into its middle: a re-import or redefinition (F811), an
            # unused import (F401), an import below code (E402). Only problems an edit introduces
            # count (see validate), so a file that already has them can still be edited.
            _, out = await _run(
                [ruff, "check", "--quiet", "--no-cache", "--output-format", "concise", "--select", "E9,F63,F7,F82,F811,F401,E402",
                 "--stdin-filename", path, "-"],
                stdin=content,
            )
            issues += [line.strip() for line in out.splitlines() if line.strip() and ":" in line and "Found" not in line]
    elif suffix == ".json":
        try:
            json.loads(content)
        except json.JSONDecodeError as exc:
            issues.append(f"{path}:{exc.lineno}: invalid JSON: {exc.msg}")
    elif suffix == ".toml":
        try:
            tomllib.loads(content)
        except tomllib.TOMLDecodeError as exc:
            issues.append(f"{path}: invalid TOML: {exc}")
    elif suffix in {".js", ".mjs", ".cjs"} and (node := shutil.which("node")):
        with tempfile.NamedTemporaryFile("w", suffix=suffix, delete=False) as fh:
            fh.write(content)
        try:
            code, out = await _run([node, "--check", fh.name])
        finally:
            Path(fh.name).unlink(missing_ok=True)
        if code:
            detail = next((line for line in out.splitlines() if "Error" in line), "syntax error")
            issues.append(f"{path}: {detail.strip()}")
    return issues


def _second_docstrings(path: str, content: str) -> list[str]:
    """A function, class or module that starts with two string statements: an edit asked to add
    a docstring that put one above the existing one (live: 32b on "add a docstring to log_task");
    the second string does nothing, and linters do not flag it."""
    try:
        tree = ast.parse(content)
    except SyntaxError:
        return []
    found = []
    for node in ast.walk(tree):
        if not isinstance(node, (ast.Module, ast.FunctionDef, ast.AsyncFunctionDef, ast.ClassDef)):
            continue
        first, second = (node.body + [None, None])[:2]
        if all(isinstance(n, ast.Expr) and isinstance(n.value, ast.Constant) and isinstance(n.value.value, str) for n in (first, second)):
            name = getattr(node, "name", "the module")
            found.append(f"{path}:{second.lineno}: {name} has two docstrings; merge the new text into the existing docstring, keeping what it says")
    return found


def _normalise(issue: str) -> str:
    return re.sub(r":\d+(:\d+)?:", ":", issue)


async def validate(changeset: Changeset) -> None:
    """Check each changed file, reporting only problems the change introduces."""
    for change in changeset.changed:
        after = await check_file(change.path, change.new)
        if not after:
            continue
        before = {_normalise(i) for i in await check_file(change.path, change.original)} if change.original else set()
        change.checks = [i for i in after if _normalise(i) not in before]


async def propose(root: Path, answer: str) -> Changeset | None:
    """A validated changeset from an answer's edit blocks, or None if it proposes none."""
    edits = parse_edits(answer)
    if not edits:
        return None
    changeset = await asyncio.to_thread(build_changeset, root, edits)
    await validate(changeset)
    return changeset


def _is_new_code(current: str, addition: str) -> bool:
    """Whether code written for an empty SEARCH is an addition (almost none of its lines are in the
    file yet) rather than a rewrite of the whole file."""
    lines = {line.strip() for line in addition.splitlines() if len(line.strip()) > 3}
    have = {line.strip() for line in current.splitlines()}
    return bool(lines) and len(lines & have) <= len(lines) // 5


def repair_prompt(request: str, problems: list[str]) -> str:
    listed = "\n".join(f"- {p}" for p in problems)
    return (
        f"{request}\n\nYour previous edit blocks could not be applied cleanly:\n{listed}\n"
        "Reply with the complete, corrected set of edit blocks. Copy SEARCH text exactly from the files "
        "in the context."
    )


# Applying


def apply_record(record: dict[str, Any]) -> list[str]:
    """Write a stored changeset. Raises ValueError (nothing written) if any file changed since."""
    root = Path(record["root"])
    plan: list[tuple[Path, str]] = []
    for item in record["files"]:
        target = resolve_in_root(root, item["path"])
        current = target.read_text(encoding="utf-8") if target.is_file() else None
        if _hash(current) != item["original_hash"]:
            raise ValueError(f"{item['path']} changed since the preview; ask again for a fresh diff")
        plan.append((target, item["new"]))
    for target, content in plan:
        target.parent.mkdir(parents=True, exist_ok=True)
        target.write_text(content, encoding="utf-8")
    return [item["path"] for item in record["files"]]


def undo_record(record: dict[str, Any]) -> list[str]:
    """Put back what an applied changeset replaced (new files are removed). Raises ValueError
    (nothing changed) if any file was edited since DoAide wrote it, or the record predates undo."""
    root = Path(record["root"])
    plan: list[tuple[Path, str | None]] = []
    for item in record["files"]:
        if "original" not in item:
            raise ValueError("these changes were made before undo was available")
        target = resolve_in_root(root, item["path"])
        current = target.read_text(encoding="utf-8") if target.is_file() else None
        if _hash(current) != _hash(item["new"]):
            raise ValueError(f"{item['path']} changed after DoAide wrote it; not undone")
        plan.append((target, item["original"]))
    for target, original in plan:
        if original is None:
            target.unlink(missing_ok=True)
        else:
            target.write_text(original, encoding="utf-8")
    return [item["path"] for item in record["files"]]
