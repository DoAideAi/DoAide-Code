"""Zero-token answers: requests that only read a file or list a folder are answered straight
from disk, without routing or any model call."""

from __future__ import annotations

import ast
import math
import operator
import os
import re
from pathlib import Path

from .context import LANG, MAX_FILE_BYTES, MAX_SCAN_FILES, SKIP_NAMES, _is_test, _is_text
from .files import IGNORED, FileAccessError, list_dir, read_file, resolve_in_root

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

# "Which files call X", "where is X used/defined", "who calls X", "find usages of X": a search,
# answered from disk (exact, instant) rather than by a model guessing from a few files.
_NAME = r"`?([A-Za-z_](?:[\w.]*\w)?)(?:\(\))?`?"
USAGE_RE = re.compile(
    rf"^\s*(?:in\s+[\w./-]+,\s*)?(?:"
    rf"(?:which|what)\s+(?:files|functions|modules|code)\s+(?:call|calls|use|uses|import|imports|reference|references)\s+{_NAME}"
    rf"|who\s+(?:calls|uses)\s+{_NAME}"
    rf"|where\s+(?:is|are)\s+{_NAME}\s+(?:used|called|referenced|defined|imported)"
    rf"|(?:find|list|show)(?:\s+(?:me|all|the))*\s+(?:usages|uses|callers|references)\s+(?:of|to)\s+{_NAME}"
    rf")(?:\s+(?:in|from|across)\s+(?:the\s+)?(?:project|repo|codebase|code))?\s*[.?!]?\s*$",
    re.I,
)
_IMPORT_LINE = re.compile(r"^\s*(?:from\s+\S+\s+)?import\b|^\s*(?:const|let|var)\s*\{[^}]*\}\s*=\s*require\(")
MAX_HITS = 40


def _definition(name: str) -> re.Pattern[str]:
    n = re.escape(name)
    return re.compile(rf"^\s*(?:async\s+)?(?:def|class|function|func|fn)\s+{n}\b|^\s*(?:export\s+)?(?:const|let|var)\s+{n}\s*=|^{n}\s*(?::[^=]+)?=(?!=)")


def usage_answer(root: Path, prompt: str) -> str | None:
    """Where a name is defined and used, searched across the project's text files."""
    match = USAGE_RE.match(prompt)
    if not match:
        return None
    name = next(g for g in match.groups() if g).split(".")[-1]
    if len(name) < 3:
        return None
    word, definition = re.compile(rf"(?<![\w.]){re.escape(name)}\b|(?<=\.){re.escape(name)}\b"), _definition(name)
    defined: list[str] = []
    used: list[str] = []
    scanned = 0
    for current, dirs, names in os.walk(root):
        dirs[:] = sorted(d for d in dirs if d not in IGNORED and not d.startswith(".") and not d.endswith(".egg-info"))
        for fname in sorted(names):
            path = Path(current) / fname
            if fname in IGNORED or fname in SKIP_NAMES or not _is_text(fname):
                continue
            scanned += 1
            try:
                if path.stat().st_size > MAX_FILE_BYTES:
                    continue
                text = path.read_text(encoding="utf-8", errors="ignore")
            except OSError:
                continue
            if name not in text:
                continue
            rel = path.relative_to(root).as_posix()
            for number, line in enumerate(text.splitlines(), 1):
                if not word.search(line) or _IMPORT_LINE.match(line):
                    continue
                tick = "``" if "`" in line else "`"
                hit = f"- `{rel}:{number}` {tick}{line.strip()[:120]}{tick}"
                (defined if definition.match(line) else used).append(hit)
        if scanned >= MAX_SCAN_FILES:
            break
    if not defined and not re.search(r"_|[a-z][A-Z]|^[A-Z]", name) and "`" not in match.group(0):
        return None  # a plain word ("where is caching used?") may be a concept, not a name
    if not defined and not used:
        return f"`{name}` does not appear in the project."
    used.sort(key=lambda h: _is_test(h.split("`")[1].lower()))
    parts = []
    if defined:
        parts += [f"`{name}` is defined in:", *defined[:5]]
    if used:
        files = len({h.split(":")[0] for h in used})
        times = "once" if len(used) == 1 else f"{len(used)} times"
        parts += [f"Used {times} in {files} file{'s' * (files != 1)}:", *used[:MAX_HITS]]
        if len(used) > MAX_HITS:
            parts.append(f"... {len(used) - MAX_HITS} more")
    else:
        parts.append("It is not used anywhere else.")
    return "\n".join(parts)


_MATH_PROMPT = re.compile(
    r"^\s*(?:(?:what\s+is|what's|calculate|compute|evaluate|how\s+much\s+is|solve)\s+)?"
    r"(?P<expr>[\d\s+\-*/%^().,x×÷]+?)\s*(?:=\s*)?\??\s*$",
    re.I,
)
_OPS = {
    ast.Add: operator.add, ast.Sub: operator.sub, ast.Mult: operator.mul, ast.Div: operator.truediv,
    ast.FloorDiv: operator.floordiv, ast.Mod: operator.mod, ast.Pow: operator.pow,
}


def _eval(node: ast.AST) -> float:
    if isinstance(node, ast.Constant) and isinstance(node.value, (int, float)):
        return node.value
    if isinstance(node, ast.UnaryOp) and isinstance(node.op, (ast.USub, ast.UAdd)):
        value = _eval(node.operand)
        return -value if isinstance(node.op, ast.USub) else value
    if isinstance(node, ast.BinOp) and type(node.op) in _OPS:
        left, right = _eval(node.left), _eval(node.right)
        if isinstance(node.op, ast.Pow) and (abs(right) > 1000 or abs(left) > 1e6):
            raise ValueError("too large")
        return _OPS[type(node.op)](left, right)
    raise ValueError("not arithmetic")


def math_answer(prompt: str) -> str | None:
    """Plain arithmetic ("what is 17*23?", "2^10") answered exactly, with no model."""
    match = _MATH_PROMPT.match(prompt)
    if not match or not re.search(r"\d\s*[-+*/%^x×÷]\s*[\d(]", match.group("expr")):
        return None
    expr = match.group("expr").replace("×", "*").replace("÷", "/").replace("^", "**").replace(",", "")
    expr = re.sub(r"(?<=[\d)])\s*x\s*(?=[\d(])", "*", expr)
    try:
        value = _eval(ast.parse(expr.strip(), mode="eval").body)
    except (SyntaxError, ValueError, ZeroDivisionError, OverflowError, TypeError):
        return None
    if isinstance(value, float):
        if not math.isfinite(value):
            return None
        value = int(value) if value.is_integer() else round(value, 10)
    return f"{match.group('expr').strip()} = **{value:,}**" if isinstance(value, int) else f"{match.group('expr').strip()} = **{value}**"


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
    if answer := usage_answer(root, prompt):
        return answer
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
