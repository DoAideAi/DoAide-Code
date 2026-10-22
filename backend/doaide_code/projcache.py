"""Per-project cache of the file tree and the import graph, in ~/.doaide-code/cache/.

Every request walks the project to pick its context. The walk's result (folders, files) is
kept with each folder's mtime: a folder's mtime changes when an entry is added, removed or
renamed in it, so while none has changed the cached list is still the project's file list and
only the files themselves are stat'ed (their own mtimes key the response cache and must be
fresh). Each file's resolved imports are kept with its mtime and size, and parsed again only
when it changes. A missing or unreadable cache is rebuilt; nothing depends on it being there.
"""

from __future__ import annotations

import hashlib
import json
import logging
import os
from pathlib import Path

CACHE_DIR = Path(os.environ.get("DOAIDE_CACHE_DIR", str(Path.home() / ".doaide-code" / "cache")))
VERSION = 1
log = logging.getLogger(__name__)


class ProjectCache:
    def __init__(self, root: Path) -> None:
        self.root = root
        self.path = CACHE_DIR / f"{hashlib.sha256(str(root).encode()).hexdigest()[:16]}.json"
        self.dirs: dict[str, int] = {}
        self.tree: list[str] = []
        self.files: list[str] = []
        self.imports: dict[str, list] = {}
        self.dirty = False
        try:
            data = json.loads(self.path.read_text())
        except (OSError, ValueError):
            return
        if data.get("version") == VERSION and data.get("root") == str(root):
            self.dirs, self.tree, self.files = data.get("dirs", {}), data.get("tree", []), data.get("files", [])
            self.imports = data.get("imports", {})

    def cached_walk(self) -> tuple[list[str], list[tuple[str, os.stat_result]]] | None:
        """The cached tree and freshly stat'ed files, or None when any folder has changed."""
        if not self.dirs:
            return None
        for rel, mtime in self.dirs.items():
            try:
                if (self.root / rel).stat().st_mtime_ns != mtime:
                    return None
            except OSError:
                return None
        files = []
        for rel in self.files:
            try:
                files.append((rel, (self.root / rel).stat()))
            except OSError:
                return None  # deleted since: its folder's mtime should have said so; rescan
        return self.tree, files

    def store_walk(self, dirs: dict[str, int], tree: list[str], files: list[str]) -> None:
        self.dirs, self.tree, self.files, self.dirty = dirs, tree, files, True

    def imports_of(self, rel: str, st: os.stat_result) -> list[str] | None:
        entry = self.imports.get(rel)
        if entry and entry[0] == st.st_mtime_ns and entry[1] == st.st_size:
            return entry[2]
        return None

    def store_imports(self, rel: str, st: os.stat_result, targets: list[str]) -> None:
        self.imports[rel] = [st.st_mtime_ns, st.st_size, targets]
        self.dirty = True

    def save(self) -> None:
        if not self.dirty:
            return
        known = set(self.files)
        data = {
            "version": VERSION,
            "root": str(self.root),
            "dirs": self.dirs,
            "tree": self.tree,
            "files": self.files,
            "imports": {k: v for k, v in self.imports.items() if k in known},
        }
        try:
            CACHE_DIR.mkdir(parents=True, exist_ok=True)
            tmp = self.path.with_suffix(f".{os.getpid()}.tmp")
            tmp.write_text(json.dumps(data))
            os.replace(tmp, self.path)
            self.dirty = False
        except OSError as exc:
            log.warning("could not write the project cache: %s", exc)
