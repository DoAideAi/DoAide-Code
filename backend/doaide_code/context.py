"""Smart file selection: give API models the project files that matter for a request.

Files named in the request come first, then the project files they import (where the helpers
they call live); the rest are ranked by how many of the request's
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

from .classify import without_urls
from .files import IGNORED
from .imports import parse_imports, resolve, suffix_index
from .projcache import ProjectCache

TEXT_SUFFIXES = {
    ".py", ".pyi", ".js", ".jsx", ".mjs", ".cjs", ".ts", ".tsx", ".json", ".toml", ".yaml", ".yml",
    ".md", ".txt", ".html", ".css", ".scss", ".go", ".rs", ".java", ".kt", ".swift", ".c", ".h",
    ".cpp", ".hpp", ".cs", ".rb", ".php", ".sh", ".sql", ".vue", ".svelte", ".ini", ".cfg", ".env.example",
}
TEXT_NAMES = {"Dockerfile", "Makefile", "Caddyfile", "Procfile", ".gitignore"}
# Build output and coverage reports: generated, never what a question is about.
SKIP_DIRS = {"dist", "coverage", "htmlcov"}
# Old code kept for reference: ranked below the live code that shares its words.
STALE_DIRS = {"legacy", "deprecated", "archive", "old", "attic"}
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
# Characters kept for the names of matching files a small model is not shown.
POINTER_ROOM = 1000
# Project files imported by the named files: one level deep, at most this many.
MAX_IMPORTED = 6
LANG = {".py": "python", ".js": "js", ".jsx": "jsx", ".ts": "ts", ".tsx": "tsx", ".json": "json", ".md": "md",
        ".toml": "toml", ".yaml": "yaml", ".yml": "yaml", ".sh": "bash", ".css": "css", ".html": "html"}


@dataclass
class Candidate:
    path: str
    score: float
    size: int
    mtime_ns: int
    explicit: bool = False
    # Imported by a file the request names.
    imported: bool = False


@dataclass
class Ranking:
    root: Path
    tree: list[str] = field(default_factory=list)
    candidates: list[Candidate] = field(default_factory=list)
    # The request's search terms, used to cut large files down to their relevant parts.
    terms: set[str] = field(default_factory=set)
    # Code identifiers in the request (FIXED_CTX, parseConfig): with a file named, the only reason
    # to send another file.
    idents: set[str] = field(default_factory=set)
    wants_tests: bool = False
    # Names the named files import ("charge" for "from app.billing import charge"): what to cut
    # an imported file down to.
    import_names: set[str] = field(default_factory=set)
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

    def render(
        self, budget: int, *, max_files: int | None = None, extra: str = "", more: bool = False
    ) -> tuple[str, list[str]]:
        """Context text within `budget` characters, and the files it includes: the tree, then
        whole files by rank (at most `max_files`), with `extra` (a recent diff) first.

        Files the request names come whole (the model edits them, and SEARCH text copied from an
        excerpt does not match) and the tree is left out (it only helps find a file); other files
        only fill a real remainder of the budget, and only if they contain a name from the request
        (any file `more`, for a retry). Less to read, and nothing to confuse."""
        if budget <= 0 or not (self.tree or self.candidates or extra):
            return "", []
        named = any(c.explicit for c in self.candidates)
        # Room kept for the other matching files' names (see _pointers), which whole files would
        # otherwise always take.
        pointer_room = POINTER_ROOM if max_files is not None and not named and budget > 4 * POINTER_ROOM else 0
        budget -= pointer_room
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
            terms = self.terms | self.import_names if c.imported else self.terms
            if named and not c.explicit and (
                budget - used < NAMED_REMAINDER
                or not more
                and not c.imported
                and (not any(i in text for i in self.idents) or (_is_test(c.path.lower()) and not self.wants_tests))
            ):
                # The named files took the budget (the rest would only be excerpts), or this file
                # shares only common words with the request, or only tests it: noise that slows
                # a local model.
                continue
            # Small models: a large file is sent as its relevant parts even when it would fit,
            # since reading the prompt is most of a local model's time (not files the user named).
            if (
                max_files is not None
                and not (c.explicit and used + len(block) <= budget)
                and len(block) > budget // 3
                and (cut := _excerpt(text, terms, budget // 3))
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
                excerpt = _excerpt(text, terms, room)
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
        if pointer_room and (pointers := self._pointers(included, budget + pointer_room - used)):
            parts.append(pointers)
        return "\n".join(parts), included

    def _pointers(self, shown: list[str], room: int, limit: int = 8) -> str:
        """The next-best files by name, each with its best-matching line: a small model sees only
        2-3 files, and "which files handle X?" needs the rest named (live: the 7b model answered
        with agent.py and socket.js, never seeing main.py's /ws endpoint)."""
        lines = ["\n## Other matching files (not shown; name them if relevant)"]
        for c in [c for c in self.candidates if c.path not in shown][:limit]:
            try:
                text = (self.root / c.path).read_text(encoding="utf-8", errors="replace")
            except OSError:
                continue
            best = max(text.splitlines() or [""], key=lambda line: sum(t in line.lower() for t in self.terms))
            line = f"- {c.path}: {best.strip()[:100]}" if best.strip() else f"- {c.path}"
            if sum(len(x) + 1 for x in lines) + len(line) > room:
                break
            lines.append(line)
        return "\n".join(lines) if len(lines) > 1 else ""

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
        # Files the request names come whole when they fit: every tool round re-sends the whole
        # conversation, and reading a named file was a round (live: 113k tokens for a 7-line edit).
        included: list[str] = []
        room = budget - sum(len(p) + 1 for p in parts) - 2000
        for c in (c for c in self.candidates if c.explicit):
            try:
                text = (self.root / c.path).read_text(encoding="utf-8", errors="replace")
            except OSError:
                continue
            block = f"## File: {c.path} (complete; no need to read it again)\n```{LANG.get(Path(c.path).suffix, '')}\n{text}\n```"
            if len(block) <= room:
                parts.append(block)
                included.append(c.path)
                room -= len(block) + 1
        if included:
            # Live: told to "open files yourself", Claude grepped a file it had been shown (a
            # second round: 52k more tokens).
            parts[0] = (
                "# Project map (selected for this request). The files shown below are complete and current: "
                "work from them without reading or searching them again; open other files only if needed."
            )
        else:
            parts += ["## Tree", *self.tree[:SMALL_TREE_LINES]]
            if len(self.tree) > SMALL_TREE_LINES:
                parts.append(f"... {len(self.tree) - SMALL_TREE_LINES} more")
        return "\n".join(parts)[:budget], included


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


def definition_re(name: str) -> re.Pattern[str]:
    """A line defining `name`: def/class/function, a JS const/let/var, or a top-level assignment."""
    n = re.escape(name)
    return re.compile(
        rf"^\s*(?:async\s+)?(?:def|class|function|func|fn)\s+{n}\b|^\s*(?:export\s+)?(?:const|let|var)\s+{n}\s*=|^{n}\s*(?::[^=]+)?=(?!=)",
        re.M,
    )


def _idents(text: str, paths: set[str]) -> set[str]:
    """snake_case, camelCase and backticked names in the request, outside the paths it names."""
    for path in sorted(paths, key=len, reverse=True):
        text = text.replace(path, " ")
    found = set(re.findall(r"`([^`\s]+)`", text))
    found |= set(re.findall(r"\b_*[A-Za-z]\w*_\w+\b|\b[a-z]+[A-Z]\w*\b|\b[A-Z][a-z0-9]+[A-Z]\w*\b", text))
    return {f.strip("()") for f in found if len(f.strip("()")) > 2}


# A first path segment that is a host name ("ollama.com/install.sh", written without https://).
HOST = re.compile(r"^(?:[a-z0-9-]+\.)+[a-z]{2,6}$", re.IGNORECASE)


def mentioned_paths(text: str, root: Path | None = None) -> set[str]:
    """Paths named in the request. Absolute ones under `root` (as in tracebacks) become relative."""
    found: set[str] = set()
    # A URL ("https://ollama.com/install.sh", "ollama.com/install.sh") or a home path
    # ("~/.doaide/metrics.jsonl") names no project file.
    text = without_urls(text)
    text = re.sub(r"~[\w.-]*/\S*", " ", text)
    for m in re.findall(r"[`'\"]?[\w./-]+\.[A-Za-z0-9]{1,6}[`'\"]?", text):
        m = m.strip("`'\"")
        if m.startswith("/"):
            try:
                m = Path(m).resolve().relative_to(root).as_posix() if root is not None else m
            except (ValueError, OSError):
                pass
            if m.startswith("/"):
                found.add(m)  # outside the project: kept absolute, not read as a project path
                continue
        found.add(m.lstrip("./"))
    return found


def rank_files(root: Path, request: str) -> Ranking:
    """Walk the project once and rank files for `request` (blocking; run in a thread)."""
    root = root.resolve()
    ranking = Ranking(root)
    cache = ProjectCache(root)
    if (hit := cache.cached_walk()) is not None:
        ranking.tree, files = list(hit[0]), hit[1]
    else:
        ranking.tree, files = _walk(root, cache)

    ranking.mtimes = {rel: st.st_mtime for rel, st in files}
    terms = _terms(request)
    ranking.terms = terms
    mentioned = mentioned_paths(request, root)
    ranking.idents = _idents(request, mentioned)
    present: dict[str, set[str]] = {}
    explicit: set[str] = set()
    defines: list[str] = []
    for rel, st in files:
        if st.st_size > MAX_FILE_BYTES:
            continue
        if rel in mentioned or any(rel.endswith("/" + m) or Path(rel).name == m for m in mentioned):
            explicit.add(rel)
        lower = rel.lower()
        found = {t for t in terms if t in lower}
        if terms:
            try:
                raw = (root / rel).read_text(encoding="utf-8", errors="ignore")
            except OSError:
                continue
            content = raw.lower()
            found |= {t for t in terms if t in content}
            if named := [i for i in ranking.idents if i in raw]:
                if any(definition_re(i).search(raw) for i in named):
                    defines.append(rel)
        present[rel] = found
    # No path named, but a name defined in one or two files ("estimate_tokens returns a float"):
    # those files are as good as named.
    if not explicit and 0 < len(defines) <= 2:
        explicit.update(defines)
    stats = dict(files)
    imported = _imported(root, explicit, stats, ranking, cache)
    cache.save()

    # Rare terms say more than common ones: weight each by inverse document frequency.
    total = max(len(present), 1)
    df = {t: sum(1 for found in present.values() if t in found) for t in terms}
    idf = {t: math.log(1 + total / df[t]) for t in terms if df[t]}
    scored: list[Candidate] = []
    wants_tests = bool(terms & {"test", "tests", "testing", "pytest", "spec", "vitest"}) or "test" in request.lower()
    ranking.wants_tests = wants_tests
    for rel, found in present.items():
        lower = rel.lower()
        score = sum(idf.get(t, 0) * (3 if t in lower else 1) for t in found)
        if _is_test(lower):
            # Tests repeat the names they test; the source is what explains them, unless the
            # request is about the tests.
            score *= 1.5 if wants_tests else 0.5
        if STALE_DIRS & set(lower.split("/")[:-1]):
            score *= 0.4
        if rel in explicit or rel in imported or score > 0:
            st = stats[rel]
            boost = 1000 if rel in explicit else 500 if rel in imported else 0
            scored.append(
                Candidate(rel, score + boost, st.st_size, st.st_mtime_ns, rel in explicit, rel in imported and rel not in explicit)
            )
    best = max((c.score for c in scored if not (c.explicit or c.imported)), default=0)
    scored = [c for c in scored if c.explicit or c.imported or c.score >= best * RELATIVE_CUTOFF]
    scored.sort(key=lambda c: (-c.score, c.size))
    ranking.candidates = scored[:MAX_CANDIDATES]
    return ranking


def _walk(root: Path, cache: ProjectCache) -> tuple[list[str], list[tuple[str, os.stat_result]]]:
    """The project's folders and text files (the tree) and the files' stats, stored in `cache`."""
    tree: list[str] = []
    files: list[tuple[str, os.stat_result]] = []
    dir_mtimes: dict[str, int] = {}
    for current, dirs, names in os.walk(root):
        dirs[:] = sorted(
            d for d in dirs if d not in IGNORED and d not in SKIP_DIRS and not d.startswith(".") and not d.endswith(".egg-info")
        )
        base = Path(current)
        rel_dir = base.relative_to(root).as_posix()
        try:
            dir_mtimes[rel_dir] = base.stat().st_mtime_ns
        except OSError:
            pass
        if rel_dir != ".":
            tree.append(rel_dir + "/")
        for name in sorted(names):
            if name in IGNORED or name in SKIP_NAMES or not _is_text(name):
                continue
            rel = (base / name).relative_to(root).as_posix()
            tree.append(rel)
            try:
                files.append((rel, (base / name).stat()))
            except OSError:
                continue
        if len(files) >= MAX_SCAN_FILES:
            break
    cache.store_walk(dir_mtimes, tree, [rel for rel, _ in files])
    return tree, files


def _imported(
    root: Path, explicit: set[str], stats: dict[str, os.stat_result], ranking: Ranking, cache: ProjectCache
) -> set[str]:
    """Project files the named files import (one level), recording the imported names. Each
    file's import specs come from `cache` while it is unchanged; resolving them is cheap."""
    found: set[str] = set()
    files = set(stats)
    index: dict[str, list[str]] | None = None
    for rel in sorted(explicit):
        specs = cache.imports_of(rel, stats[rel])
        if specs is None:
            try:
                text = (root / rel).read_text(encoding="utf-8", errors="ignore")
            except OSError:
                continue
            specs = parse_imports(rel, text)
            cache.store_imports(rel, stats[rel], specs)
        for spec in specs:
            index = index if index is not None else suffix_index(files)
            target = resolve(rel, spec, files, index)
            if target is None or target in explicit:
                continue
            if len(found) < MAX_IMPORTED:
                found.add(target)
            name = spec.rstrip("/").rsplit(".", 1)[-1].rsplit("/", 1)[-1].lower()
            if len(name) > 2 and name not in STOPWORDS:
                ranking.import_names.add(name)
    return found
