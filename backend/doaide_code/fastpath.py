"""Zero-token answers: requests that only read a file or list a folder are answered straight
from disk, without routing or any model call."""

from __future__ import annotations

import re
from pathlib import Path

from .context import LANG
from .files import FileAccessError, list_dir, read_file, resolve_in_root

_QUOTE = r"[`'\"]?"
READ_RE = re.compile(
    rf"^\s*(?:please\s+)?(?:show|read|open|cat|print|view|display)(?:\s+me)?(?:\s+the)?"
    rf"(?:\s+(?:file|contents\s+of|content\s+of))?\s+{_QUOTE}(?P<path>[\w./-]+){_QUOTE}\s*[.?!]?\s*$",
    re.I,
)
LIST_RE = re.compile(
    rf"^\s*(?:please\s+)?(?:ls|list(?:\s+(?:the|all))?\s+(?:files|folders|directories|dirs)"
    rf"|show(?:\s+me)?(?:\s+the)?\s+(?:files|file\s+tree|tree))"
    rf"(?:\s+(?:in|under|of)\s+{_QUOTE}(?P<path>[\w./-]+){_QUOTE})?\s*[.?!]?\s*$",
    re.I,
)


def direct_answer(root: Path | None, prompt: str) -> str | None:
    """The answer for a pure read/list request, or None when a model is needed."""
    if root is None or len(prompt) > 300:
        return None
    if match := LIST_RE.match(prompt):
        rel = (match.group("path") or "").strip("/")
        try:
            listing = list_dir(root, rel)
        except FileAccessError:
            return None
        lines = [f"{e['path']}/" if e["type"] == "dir" else e["path"] for e in listing["entries"]]
        return f"`{rel or '.'}`\n```\n" + ("\n".join(lines) or "(empty)") + "\n```"
    if match := READ_RE.match(prompt):
        rel = match.group("path")
        rel = rel[2:] if rel.startswith("./") else rel
        try:
            target = resolve_in_root(root, rel)
            if not target.is_file():
                return None
            data = read_file(root, rel)
        except FileAccessError:
            return None
        if data["binary"]:
            return f"`{rel}` is a binary file ({data['size']} bytes)."
        note = "\n\n_Showing the first 500 KB._" if data["truncated"] else ""
        content = data["content"].rstrip("\n")
        return f"`{rel}` ({content.count(chr(10)) + 1} lines)\n```{LANG.get(Path(rel).suffix, '')}\n{content}\n```{note}"
    return None
