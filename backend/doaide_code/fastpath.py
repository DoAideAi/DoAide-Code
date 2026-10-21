"""Zero-token answers: requests that only read a file or list a folder are answered straight
from disk, without routing or any model call."""

from __future__ import annotations

import ast
import math
import operator
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
