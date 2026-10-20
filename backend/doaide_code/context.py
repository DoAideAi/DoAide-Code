"""Smart file selection: give API models the project files that matter for a request.

Files named in the request come first; the rest are ranked by how many of the request's
identifiers appear in their path and contents. The ranking is computed once per request and
rendered to each executor's character budget. Its fingerprint (paths, sizes, mtimes) keys the
response cache, so editing any selected file invalidates cached answers that read it.
"""

from __future__ import annotations

import hashlib
import math
import os
import re
from dataclasses import dataclass, field
from pathlib import Path

from .files import IGNORED

TEXT_SUFFIXES = {
    ".py", ".pyi", ".js", ".jsx", ".mjs", ".cjs", ".ts", ".tsx", ".json", ".toml", ".yaml", ".yml",
    ".md", ".txt", ".html", ".css", ".scss", ".go", ".rs", ".java", ".kt", ".swift", ".c", ".h",
    ".cpp", ".hpp", ".cs", ".rb", ".php", ".sh", ".sql", ".vue", ".svelte", ".ini", ".cfg", ".env.example",
}
TEXT_NAMES = {"Dockerfile", "Makefile", "Caddyfile", "Procfile", ".gitignore"}
SKIP_NAMES = {"package-lock.json", "yarn.lock", "pnpm-lock.yaml", "poetry.lock", "uv.lock", "Cargo.lock"}
MAX_SCAN_FILES = 4000
MAX_FILE_BYTES = 200_000
MAX_CANDIDATES = 40
TREE_LINES = 150
STOPWORDS = {
    "the", "and", "for", "with", "this", "that", "from", "into", "what", "when", "where", "which", "how",
    "why", "can", "you", "please", "make", "add", "fix", "use", "using", "file", "files", "code", "should",
    "would", "could", "does", "not", "all", "any", "are", "was", "but", "have", "has", "its", "our", "your",
    "there", "then", "than", "them", "they", "will", "about", "some", "more", "also", "just", "like", "need",
    "want", "show", "read", "change", "update", "write", "new", "one", "two", "get", "set", "test", "tests",
    # Language keywords appear everywhere and say nothing about relevance.
    "return", "def", "class", "import", "function", "const", "let", "var", "self", "none", "null", "true",
    "false", "async", "await", "print", "export", "default", "public", "private", "static", "void", "int",
    "str", "string", "see", "why", "who",
}
# Files scoring below this fraction of the best match are dropped as noise.
RELATIVE_CUTOFF = 0.3
LANG = {".py": "python", ".js": "js", ".jsx": "jsx", ".ts": "ts", ".tsx": "tsx", ".json": "json", ".md": "md",
        ".toml": "toml", ".yaml": "yaml", ".yml": "yaml", ".sh": "bash", ".css": "css", ".html": "html"}


@dataclass
class Candidate:
    path: str
    score: float
    size: int
    mtime_ns: int
    explicit: bool = False


@dataclass
class Ranking:
    root: Path
    tree: list[str] = field(default_factory=list)
    candidates: list[Candidate] = field(default_factory=list)

    @property
    def fingerprint(self) -> str:
        digest = hashlib.sha256(str(self.root).encode())
        digest.update("\n".join(self.tree).encode())
        for c in self.candidates:
            digest.update(f"{c.path}:{c.size}:{c.mtime_ns}".encode())
        return digest.hexdigest()

    def render(self, budget: int) -> tuple[str, list[str]]:
        """Context text within `budget` characters, and the files it includes."""
        if budget <= 0 or not (self.tree or self.candidates):
            return "", []
        parts = ["# Project files (selected for this request)", "## Tree", *self.tree[:TREE_LINES]]
        if len(self.tree) > TREE_LINES:
            parts.append(f"... {len(self.tree) - TREE_LINES} more")
        used = sum(len(p) + 1 for p in parts)
        included: list[str] = []
        for c in self.candidates:
            try:
                text = (self.root / c.path).read_text(encoding="utf-8", errors="replace")
            except OSError:
                continue
            block = f"\n## File: {c.path}\n```{LANG.get(Path(c.path).suffix, '')}\n{text}\n```"
            if used + len(block) > budget:
                if c.explicit and budget - used > 2000:
                    # Files the user named are worth a partial read.
                    block = block[: budget - used - 40] + "\n... [truncated]\n```"
                else:
                    continue
            parts.append(block)
            included.append(c.path)
            used += len(block)
        return "\n".join(parts), included


def _is_text(name: str) -> bool:
    return name in TEXT_NAMES or Path(name).suffix.lower() in TEXT_SUFFIXES


def _terms(text: str) -> set[str]:
    words = {w.lower() for w in re.findall(r"[A-Za-z_][A-Za-z0-9_]{2,}", text)}
    # Split camelCase and snake_case so "parseConfig" also matches "parse_config.py".
    for w in re.findall(r"[A-Za-z][A-Za-z0-9]+", text):
        words |= {p.lower() for p in re.findall(r"[A-Z]?[a-z]+|[A-Z]+(?![a-z])|\d+", w) if len(p) > 2}
    return {w for w in words if w not in STOPWORDS}


def _mentioned_paths(text: str) -> set[str]:
    return {m.strip("`'\"").lstrip("./") for m in re.findall(r"[`'\"]?[\w./-]+\.[A-Za-z0-9]{1,6}[`'\"]?", text)}


def rank_files(root: Path, request: str) -> Ranking:
    """Walk the project once and rank files for `request` (blocking; run in a thread)."""
    root = root.resolve()
    ranking = Ranking(root)
    files: list[tuple[str, os.stat_result]] = []
    for current, dirs, names in os.walk(root):
        dirs[:] = sorted(d for d in dirs if d not in IGNORED and not d.startswith("."))
        base = Path(current)
        rel_dir = base.relative_to(root).as_posix()
        if rel_dir != ".":
            ranking.tree.append(rel_dir + "/")
        for name in sorted(names):
            if name in IGNORED or name in SKIP_NAMES or not _is_text(name):
                continue
            rel = (base / name).relative_to(root).as_posix()
            ranking.tree.append(rel)
            try:
                files.append((rel, (base / name).stat()))
            except OSError:
                continue
        if len(files) >= MAX_SCAN_FILES:
            break

    terms = _terms(request)
    mentioned = _mentioned_paths(request)
    present: dict[str, set[str]] = {}
    explicit: set[str] = set()
    for rel, st in files:
        if st.st_size > MAX_FILE_BYTES:
            continue
        if rel in mentioned or any(rel.endswith("/" + m) or Path(rel).name == m for m in mentioned):
            explicit.add(rel)
        lower = rel.lower()
        found = {t for t in terms if t in lower}
        if terms:
            try:
                content = (root / rel).read_text(encoding="utf-8", errors="ignore").lower()
            except OSError:
                continue
            found |= {t for t in terms if t in content}
        present[rel] = found

    # Rare terms say more than common ones: weight each by inverse document frequency.
    total = max(len(present), 1)
    df = {t: sum(1 for found in present.values() if t in found) for t in terms}
    idf = {t: math.log(1 + total / df[t]) for t in terms if df[t]}
    stats = dict(files)
    scored: list[Candidate] = []
    for rel, found in present.items():
        lower = rel.lower()
        score = sum(idf.get(t, 0) * (3 if t in lower else 1) for t in found)
        if rel in explicit or score > 0:
            st = stats[rel]
            scored.append(Candidate(rel, score + (1000 if rel in explicit else 0), st.st_size, st.st_mtime_ns, rel in explicit))
    best = max((c.score for c in scored if not c.explicit), default=0)
    scored = [c for c in scored if c.explicit or c.score >= best * RELATIVE_CUTOFF]
    scored.sort(key=lambda c: (-c.score, c.size))
    ranking.candidates = scored[:MAX_CANDIDATES]
    return ranking
