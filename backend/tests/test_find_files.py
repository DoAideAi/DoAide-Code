"""@ mentions: find project files by name (files.find_files, GET /api/files/find)."""

from __future__ import annotations

from doaide_code.files import find_files

from .test_api import auth


def _project(root):
    for rel in ["runner.py", "src/router.py", "src/run.py", "docs/README.md", "node_modules/x/run.js", ".git/run", ".env"]:
        path = root / rel
        path.parent.mkdir(parents=True, exist_ok=True)
        path.write_text("x")
    return root


def test_best_matches_first_and_ignored_folders_skipped(tmp_path):
    root = _project(tmp_path)
    assert find_files(root, "run")["files"] == ["src/run.py", "runner.py"]
    # Inside the name beats inside the folder path; letters in order match last.
    assert find_files(root, "router")["files"] == ["src/router.py"]
    assert find_files(root, "rnr")["files"] == ["runner.py"]
    assert find_files(root, "docs")["files"] == ["docs/README.md"]
    assert find_files(root, "./SRC/RUN")["files"] == ["src/run.py"]


def test_empty_query_lists_files_shortest_first_with_a_limit(tmp_path):
    root = _project(tmp_path)
    assert find_files(root, "", limit=2)["files"] == [".env", "runner.py"]


def test_find_endpoint_searches_the_working_root(client, token, settings, tmp_path):
    from pathlib import Path

    workspace = Path(settings.workspace)
    workspace.mkdir(parents=True, exist_ok=True)
    (workspace / "app.py").write_text("print(1)")
    body = client.get("/api/files/find?q=app", headers=auth(token)).json()
    assert body["files"] == ["app.py"]
    assert client.get("/api/files/find?q=app").status_code == 401
