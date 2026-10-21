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
import subprocess
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
# Small models get a short tree: it is orientation, not the content they need.
SMALL_TREE_LINES = 60
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
# With named files in the context, other files are added only if this much budget is left.
NAMED_REMAINDER = 4000
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
    # The request's search terms, used to cut large files down to their relevant parts.
    terms: set[str] = field(default_factory=set)
    # Every scanned file's modification time, for "what changed since the last turn".
    mtimes: dict[str, float] = field(default_factory=dict)

    def changed_since(self, when: float, limit: int = 20) -> list[str]:
        """Files modified after `when`, newest first."""
        changed = sorted((m, p) for p, m in self.mtimes.items() if m > when)
        return [p for _, p in reversed(changed)][:limit]

    @property
    def fingerprint(self) -> str:
        digest = hashlib.sha256(str(self.root).encode())
        digest.update("\n".join(self.tree).encode())
        for c in self.candidates:
            digest.update(f"{c.path}:{c.size}:{c.mtime_ns}".encode())
        return digest.hexdigest()

    def render(self, budget: int, *, max_files: int | None = None, extra: str = "") -> tuple[str, list[str]]:
        """Context text within `budget` characters, and the files it includes: the tree, then
        whole files by rank (at most `max_files`), with `extra` (a recent diff) first.

        Files the request names come whole (the model edits them, and SEARCH text copied from an
        excerpt does not match) and the tree is left out (it only helps find a file); other files
        only fill a real remainder of the budget. Less to read, and nothing to confuse."""
        if budget <= 0 or not (self.tree or self.candidates or extra):
            return "", []
        named = any(c.explicit for c in self.candidates)
        parts = ["# Project files (selected for this request)"]
        if not named:
            tree_lines = TREE_LINES if max_files is None or max_files > 3 else SMALL_TREE_LINES
            parts += ["## Tree", *self.tree[:tree_lines]]
            if len(self.tree) > tree_lines:
                parts.append(f"... {len(self.tree) - tree_lines} more")
        if extra:
            parts.insert(0, extra[: budget // 2])
        used = sum(len(p) + 1 for p in parts)
        included: list[str] = []
        for c in self.candidates:
            if max_files is not None and len(included) >= max_files:
                break
            try:
                text = (self.root / c.path).read_text(encoding="utf-8", errors="replace")
            except OSError:
                continue
            lang = LANG.get(Path(c.path).suffix, "")
            block = f"\n## File: {c.path}\n```{lang}\n{text}\n```"
            if named and not c.explicit and budget - used < NAMED_REMAINDER:
                continue  # the named files took the budget; the rest would only be excerpts
            # Small models: a large file is sent as its relevant parts even when it would fit,
            # since reading the prompt is most of a local model's time (not files the user named).
            if (
                max_files is not None
                and not (c.explicit and used + len(block) <= budget)
                and len(block) > budget // 3
                and (cut := _excerpt(text, self.terms, budget // 3))
            ):
                block = f"\n## File: {c.path} (excerpts)\n```{lang}\n{cut}\n```"
            if used + len(block) > budget:
                room = budget - used - 80
                if max_files is not None:
                    # Leave room for the files still to come.
                    room = min(room, max(1500, room // max(1, max_files - len(included))))
                if room < 1500:
                    continue
                # Too big to send whole: the parts that mention the request's terms.
                excerpt = _excerpt(text, self.terms, room)
                if excerpt:
                    block = f"\n## File: {c.path} (excerpts)\n```{lang}\n{excerpt}\n```"
                elif c.explicit:
                    # Files the user named are worth a partial read even without a match.
                    block = block[:room] + "\n... [truncated]\n```"
                else:
                    continue
            parts.append(block)
            included.append(c.path)
            used += len(block)
        return "\n".join(parts), included

    def render_map(self, budget: int, *, extra: str = "", files: int = 10) -> tuple[str, list[str]]:
        """For agents that read files themselves: the tree, the likeliest files (paths only)
        and `extra` (a recent diff), so they spend fewer tool calls searching."""
        if budget <= 0 or not (self.tree or self.candidates or extra):
            return "", []
        likely = [c.path for c in self.candidates[:files]]
        parts = ["# Project map (selected for this request; open files yourself as needed)"]
        if likely:
            parts += ["## Most relevant files", *(f"- {p}" for p in likely)]
        if extra:
            parts.append(extra[: budget // 2])
        parts += ["## Tree", *self.tree[:SMALL_TREE_LINES]]
        if len(self.tree) > SMALL_TREE_LINES:
            parts.append(f"... {len(self.tree) - SMALL_TREE_LINES} more")
        return "\n".join(parts)[:budget], []


def git_context(root: Path, max_chars: int = 12_000) -> str:
    """Uncommitted changes against HEAD, or the last commit when the tree is clean (blocking)."""
    def git(*args: str) -> str:
        try:
            done = subprocess.run(
                ["git", "-C", str(root), *args], capture_output=True, text=True, timeout=10, check=False
            )
        except (OSError, subprocess.TimeoutExpired):
            return ""
        return done.stdout if done.returncode == 0 else ""

    diff = git("diff", "HEAD", "--stat", "--patch", "--no-color")
    title = "## Uncommitted changes (git diff HEAD)"
    if not diff.strip():
        diff = git("show", "HEAD", "--stat", "--patch", "--no-color", "--format=%h %s%n")
        title = "## Last commit (git show HEAD)"
    if not diff.strip():
        return ""
    if len(diff) > max_chars:
        diff = diff[:max_chars] + "\n... [diff truncated]"
    return f"{title}\n```diff\n{diff}\n```"


def _excerpt(text: str, terms: set[str], limit: int, radius: int = 12) -> str:
    """Line windows around matches of `terms`, best-matching first, within `limit` characters;
    "" when nothing matches. Each window starts with its line number, but lines are verbatim:
    models copy prefixed lines into code and into SEARCH text, which then fails to match."""
    lines = text.splitlines()
    hits = [i for i, line in enumerate(lines) if any(t in line.lower() for t in terms)]
    if not hits:
        return ""
    windows: list[list[int]] = []
    for i in hits:
        if windows and i - radius <= windows[-1][1]:
            windows[-1][1] = min(len(lines), i + radius + 1)
        else:
            windows.append([max(0, i - radius), min(len(lines), i + radius + 1)])
    # Windows with the most distinct terms first.
    def weight(w: list[int]) -> int:
        chunk = "\n".join(lines[w[0] : w[1]]).lower()
        return sum(t in chunk for t in terms)

    chosen: list[list[int]] = []
    used = 0
    for w in sorted(windows, key=weight, reverse=True):
        size = sum(len(lines[i]) + 1 for i in range(w[0], w[1])) + 20
        if used + size > limit:
            continue
        chosen.append(w)
        used += size
    out: list[str] = []
    for start, end in sorted(chosen):
        out.append(f"# ... (from line {start + 1})")
        out += lines[start:end]
    return "\n".join(out)


def _is_test(lower_path: str) -> bool:
    name = lower_path.rsplit("/", 1)[-1]
    return "/tests/" in f"/{lower_path}" or name.startswith("test_") or ".test." in name or ".spec." in name


def _is_text(name: str) -> bool:
    return name in TEXT_NAMES or Path(name).suffix.lower() in TEXT_SUFFIXES


def _terms(text: str) -> set[str]:
    words = {w.lower() for w in re.findall(r"[A-Za-z_][A-Za-z0-9_]{2,}", text)}
    # Split camelCase and snake_case so "parseConfig" also matches "parse_config.py".
    for w in re.findall(r"[A-Za-z][A-Za-z0-9]+", text):
        words |= {p.lower() for p in re.findall(r"[A-Z]?[a-z]+|[A-Z]+(?![a-z])|\d+", w) if len(p) > 2}
    return {w for w in words if w not in STOPWORDS}


def mentioned_paths(text: str, root: Path | None = None) -> set[str]:
    """Paths named in the request. Absolute ones under `root` (as in tracebacks) become relative."""
    found: set[str] = set()
    for m in re.findall(r"[`'\"]?[\w./-]+\.[A-Za-z0-9]{1,6}[`'\"]?", text):
        m = m.strip("`'\"")
        if root is not None and m.startswith("/"):
            try:
                m = Path(m).resolve().relative_to(root).as_posix()
            except (ValueError, OSError):
                pass
        found.add(m.lstrip("./"))
    return found


def rank_files(root: Path, request: str) -> Ranking:
    """Walk the project once and rank files for `request` (blocking; run in a thread)."""
    root = root.resolve()
    ranking = Ranking(root)
    files: list[tuple[str, os.stat_result]] = []
    for current, dirs, names in os.walk(root):
        dirs[:] = sorted(d for d in dirs if d not in IGNORED and not d.startswith(".") and not d.endswith(".egg-info"))
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

    ranking.mtimes = {rel: st.st_mtime for rel, st in files}
    terms = _terms(request)
    ranking.terms = terms
    mentioned = mentioned_paths(request, root)
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
    wants_tests = bool(terms & {"test", "tests", "testing", "pytest", "spec", "vitest"}) or "test" in request.lower()
    for rel, found in present.items():
        lower = rel.lower()
        score = sum(idf.get(t, 0) * (3 if t in lower else 1) for t in found)
        if _is_test(lower):
            # Tests repeat the names they test; the source is what explains them, unless the
            # request is about the tests.
            score *= 1.5 if wants_tests else 0.5
        if rel in explicit or score > 0:
            st = stats[rel]
            scored.append(Candidate(rel, score + (1000 if rel in explicit else 0), st.st_size, st.st_mtime_ns, rel in explicit))
    best = max((c.score for c in scored if not c.explicit), default=0)
    scored = [c for c in scored if c.explicit or c.score >= best * RELATIVE_CUTOFF]
    scored.sort(key=lambda c: (-c.score, c.size))
    ranking.candidates = scored[:MAX_CANDIDATES]
    return ranking
