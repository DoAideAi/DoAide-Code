"""Read-only file browsing for the UI's file tree and code viewer.

Access is confined to one root (the active project, else the workspace). Paths are
resolved before checking, so `..` and symlinks cannot escape the root.
"""

from __future__ import annotations

import os
from pathlib import Path
from typing import Any

IGNORED = {
    ".git", ".hg", ".svn", "node_modules", "__pycache__", ".venv", "venv", ".next",
    ".pytest_cache", ".mypy_cache", ".ruff_cache", ".DS_Store", ".idea",
}
MAX_ENTRIES = 1000
MAX_BYTES = 512_000


class FileAccessError(Exception):
    def __init__(self, message: str, status: int = 400):
        super().__init__(message)
        self.status = status


def resolve_in_root(root: Path, rel: str) -> Path:
    root = root.resolve()
    target = (root / rel).resolve() if rel else root
    if not target.is_relative_to(root):
        raise FileAccessError("Path is outside the project", 400)
    return target


def list_dir(root: Path, rel: str = "") -> dict[str, Any]:
    target = resolve_in_root(root, rel)
    if not target.is_dir():
        raise FileAccessError(f"No such folder: {rel or '.'}", 404)
    entries = []
    for child in sorted(target.iterdir(), key=lambda p: (not p.is_dir(), p.name.lower())):
        if child.name in IGNORED:
            continue
        is_dir = child.is_dir()
        entries.append(
            {
                "name": child.name,
                "path": f"{rel.strip('/')}/{child.name}" if rel.strip("/") else child.name,
                "type": "dir" if is_dir else "file",
                "size": None if is_dir else _size(child),
            }
        )
        if len(entries) >= MAX_ENTRIES:
            break
    return {"path": rel, "entries": entries}


def read_file(root: Path, rel: str) -> dict[str, Any]:
    target = resolve_in_root(root, rel)
    if not target.is_file():
        raise FileAccessError(f"No such file: {rel}", 404)
    size = target.stat().st_size
    with target.open("rb") as fh:
        data = fh.read(MAX_BYTES)
    if b"\0" in data[:8192]:
        return {"path": rel, "size": size, "binary": True, "truncated": False, "content": ""}
    return {
        "path": rel,
        "size": size,
        "binary": False,
        "truncated": size > MAX_BYTES,
        "content": data.decode("utf-8", errors="replace"),
    }


# Enough for any real project; a walk of a home folder by mistake stops here.
MAX_WALK = 50_000


def _rank(rel: str, query: str) -> int | None:
    """Lower is better; None when `rel` does not match. The file name counts more than the folders,
    and a prefix more than a match inside; letters in order ("rnr" for runner.py) match last."""
    path, name = rel.lower(), rel.rsplit("/", 1)[-1].lower()
    if not query:
        return 0
    if name == query or name.rsplit(".", 1)[0] == query:
        return 0
    if name.startswith(query):
        return 1
    if query in name:
        return 2
    if query in path:
        return 3
    it = iter(path)
    return 4 if all(ch in it for ch in query) else None


def find_files(root: Path, query: str = "", limit: int = 20) -> dict[str, Any]:
    """Project files matching `query` (for @ mentions), best first, then shortest path."""
    root = resolve_in_root(root, "")
    query = query.strip().lower().lstrip("./")
    found: list[tuple[int, int, str]] = []
    seen = 0
    for folder, dirs, names in os.walk(root):
        dirs[:] = sorted(d for d in dirs if d not in IGNORED and not d.startswith("."))
        base = Path(folder).relative_to(root).as_posix()
        for name in names:
            if name in IGNORED:
                continue
            rel = name if base == "." else f"{base}/{name}"
            rank = _rank(rel, query)
            if rank is not None:
                found.append((rank, len(rel), rel))
            seen += 1
        if seen >= MAX_WALK:
            break
    found.sort()
    return {"query": query, "files": [rel for _, _, rel in found[:limit]]}


def _size(path: Path) -> int | None:
    try:
        return path.stat().st_size
    except OSError:
        return None
