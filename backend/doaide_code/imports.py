"""Import statements: which project files a file imports.

A file the request names rarely explains itself: the helpers it calls live in the files it
imports. Python (`import a.b`, `from .x import y`) and JS/TS (`import ... from './x'`,
`require('./x')`) imports are resolved to project files; packages from outside the project
(numpy, react) resolve to nothing and are dropped.
"""

from __future__ import annotations

import posixpath
import re

PY_IMPORT = re.compile(r"^[ \t]*(?:from[ \t]+(\.*[\w.]*)[ \t]+import[ \t]+(\([^)]*\)|[\w*, \t]+)|import[ \t]+([\w., \t]+))", re.M)
JS_IMPORT = re.compile(
    r"""(?:^\s*import\s+(?:[^'"]*?\s+from\s+)?|^\s*export\s+[^'"]*?\s+from\s+|\brequire\(\s*|\bimport\(\s*)['"]([^'"]+)['"]""",
    re.M,
)
JS_SUFFIXES = (".js", ".jsx", ".ts", ".tsx", ".mjs", ".cjs", ".vue", ".svelte")
JS_EXTENSIONS = ("", *JS_SUFFIXES, *(f"/index{s}" for s in JS_SUFFIXES))


def parse_imports(path: str, text: str) -> list[str]:
    """Module specs imported by `path`: dotted names for Python (relative ones keep their
    leading dots), path specs for JS/TS."""
    if path.endswith((".py", ".pyi")):
        specs: list[str] = []
        for frm, names, plain in PY_IMPORT.findall(text):
            if plain:
                specs += [n.split(" as ")[0].strip() for n in plain.split(",") if n.strip()]
                continue
            specs.append(frm)
            # "from . import x" and "from pkg import mod": each name may be a module itself.
            for name in re.findall(r"\w+", names.split("#")[0]):
                if name != "as":
                    specs.append(f"{frm}.{name}" if not frm.endswith(".") else f"{frm}{name}")
        return specs
    if path.endswith(JS_SUFFIXES):
        return JS_IMPORT.findall(text)
    return []


def resolve(path: str, spec: str, files: set[str], by_suffix: dict[str, list[str]]) -> str | None:
    """The project file `spec` (imported by `path`) refers to, or None."""
    folder = posixpath.dirname(path)
    if path.endswith((".py", ".pyi")):
        dots = len(spec) - len(spec.lstrip("."))
        module = spec[dots:].replace(".", "/")
        if dots:
            base = folder
            for _ in range(dots - 1):
                base = posixpath.dirname(base)
            stem = posixpath.join(base, module) if module else base
            for option in (f"{stem}.py", f"{stem}/__init__.py"):
                if option in files:
                    return option
            return None
        if not module:
            return None
        # Absolute: the package may sit under any folder (backend/app/x.py imports "app.x"),
        # preferring the one closest to the importing file.
        for option in (f"{module}.py", f"{module}/__init__.py"):
            matches = by_suffix.get(option, [])
            if matches:
                return max(matches, key=lambda m: len(posixpath.commonprefix([m, path])))
        return None
    if not spec.startswith("."):
        return None
    stem = posixpath.normpath(posixpath.join(folder, spec))
    return next((stem + ext for ext in JS_EXTENSIONS if stem + ext in files), None)


def suffix_index(files: set[str]) -> dict[str, list[str]]:
    """Every file under each of its path suffixes ("a/b/c.py" under "c.py", "b/c.py", ...)."""
    index: dict[str, list[str]] = {}
    for rel in files:
        parts = rel.split("/")
        for i in range(len(parts)):
            index.setdefault("/".join(parts[i:]), []).append(rel)
    return index
