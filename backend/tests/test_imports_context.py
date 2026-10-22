"""Context follows imports: files the named files import come next, and context is capped per model size."""

from __future__ import annotations

from pathlib import Path

from doaide_code.context import rank_files
from doaide_code.executors import OllamaExecutor
from doaide_code.imports import parse_imports, resolve, suffix_index


def test_suffix_index():
    files = {"a/b/c.py", "x/b/c.py", "a/d.py"}
    index = suffix_index(files)
    # Every suffix level is indexed
    assert set(index["a/b/c.py"]) == {"a/b/c.py"}
    assert set(index["b/c.py"]) == {"a/b/c.py", "x/b/c.py"}
    assert set(index["c.py"]) == {"a/b/c.py", "x/b/c.py"}
    assert set(index["d.py"]) == {"a/d.py"}
    # Full path is also present
    assert set(index["a/d.py"]) == {"a/d.py"}
    # Unknown key is absent
    assert "z.py" not in index


def test_parse_python_and_js_imports():
    py = "import os, app.util as u\nfrom .billing import charge, refund\nfrom . import tax\nfrom app.x import (\n    a,\n    b,\n)\n"
    specs = parse_imports("app/api.py", py)
    assert {"os", "app.util", ".billing", ".billing.charge", ".tax", "app.x", "app.x.a", "app.x.b"} <= set(specs)
    js = "import React from 'react'\nimport { api } from './api'\nconst s = require('../store.js')\nexport { x } from './x'\n"
    assert parse_imports("src/App.jsx", js) == ["react", "./api", "../store.js", "./x"]


def test_resolve_to_project_files():
    files = {"backend/app/__init__.py", "backend/app/util.py", "backend/app/api.py", "src/api.js", "src/store/index.js"}
    index = suffix_index(files)
    assert resolve("backend/app/api.py", ".util", files, index) == "backend/app/util.py"
    assert resolve("backend/app/api.py", "app.util", files, index) == "backend/app/util.py"
    assert resolve("backend/app/api.py", "app", files, index) == "backend/app/__init__.py"
    assert resolve("backend/app/api.py", "numpy", files, index) is None
    assert resolve("src/App.jsx", "./api", files, index) == "src/api.js"
    assert resolve("src/App.jsx", "./store", files, index) == "src/store/index.js"
    assert resolve("src/App.jsx", "react", files, index) is None


def test_named_file_brings_its_imports(tmp_path: Path):
    (tmp_path / "app").mkdir()
    (tmp_path / "app" / "billing.py").write_text("from .rates import vat_rate\n\ndef total(x):\n    return x * vat_rate()\n")
    (tmp_path / "app" / "rates.py").write_text("def vat_rate():\n    return 1.2\n")
    (tmp_path / "app" / "unrelated.py").write_text("def other():\n    return 0\n")
    ranking = rank_files(tmp_path, "why is total wrong in app/billing.py?")
    paths = [c.path for c in ranking.candidates]
    assert paths[:2] == ["app/billing.py", "app/rates.py"]
    assert ranking.candidates[1].imported and not ranking.candidates[1].explicit
    _, files = ranking.render(14_000, max_files=3)
    # The import shares no identifier with the request, but it is where the helper lives.
    assert files == ["app/billing.py", "app/rates.py"]


def test_ollama_context_is_capped_by_model_size():
    small = OllamaExecutor("http://x", "qwen2.5-coder:7b", context_chars=60_000)
    large = OllamaExecutor("http://x", "qwen2.5-coder:32b", context_chars=60_000)
    assert small.context_chars == 14_000 and large.context_chars == 28_000
    assert OllamaExecutor("http://x", "qwen2.5-coder:32b", context_chars=14_000).context_chars == 14_000
    small.context_chars = 3_000
    assert small.context_chars == 3_000


def test_small_models_get_the_other_matching_files_by_name(tmp_path: Path):
    for name, body in {
        "agent.py": "# websocket client\nws = websocket.connect(url)\n" * 3,
        "socket.js": "// websocket wrapper\nnew WebSocket(url)\n" * 3,
        "main.py": '"""Server: chat websocket (/ws) endpoint."""\n@app.websocket("/ws")\n',
        "legacy/app.js": "// old websocket code\nnew WebSocket(url)\n" * 5,
        "dist/bundle.js": "websocket websocket websocket",
    }.items():
        (tmp_path / name).parent.mkdir(exist_ok=True)
        (tmp_path / name).write_text(body)
    ranking = rank_files(tmp_path, "what files handle the websocket?")
    assert "dist/bundle.js" not in ranking.tree  # build output is never context
    text, files = ranking.render(14_000, max_files=2)
    assert "legacy/app.js" not in files  # stale code ranks below live code
    pointers = text[text.index("## Other matching files") :]
    assert all(f"- {p}" in pointers for p in {"agent.py", "socket.js", "main.py", "legacy/app.js"} - set(files))
    # Named files are edited, not searched: no pointer list then.
    assert "## Other matching files" not in rank_files(tmp_path, "fix main.py").render(14_000, max_files=2)[0]
