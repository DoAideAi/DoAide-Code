"""Read-only file browsing for the UI's file tree and code viewer.

Access is confined to one root (the active project, else the workspace). Paths are
resolved before checking, so `..` and symlinks cannot escape the root.
"""

from __future__ import annotations

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


def _size(path: Path) -> int | None:
    try:
        return path.stat().st_size
    except OSError:
        return None
