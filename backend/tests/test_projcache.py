"""The project cache: tree and import specs reused while folders and files are unchanged."""

from __future__ import annotations

import json
import os
import time
from pathlib import Path

import pytest

from doaide_code import projcache
from doaide_code.context import rank_files


@pytest.fixture
def project(tmp_path: Path) -> Path:
    root = tmp_path / "proj"
    (root / "app").mkdir(parents=True)
    (root / "app" / "billing.py").write_text("from .rates import vat\n\ndef total(x):\n    return x * vat()\n")
    (root / "app" / "rates.py").write_text("def vat():\n    return 1.2\n")
    return root


def cache_file(root: Path) -> dict:
    [path] = list(projcache.CACHE_DIR.glob("*.json"))
    return json.loads(path.read_text())


def bump(path: Path) -> None:
    later = time.time_ns() + 5_000_000_000
    os.utime(path, ns=(later, later))


def test_walk_and_imports_are_cached(project: Path, monkeypatch):
    first = rank_files(project, "why is total wrong in app/billing.py")
    data = cache_file(project)
    assert data["root"] == str(project.resolve()) and "app/rates.py" in data["files"]
    assert data["imports"]["app/billing.py"][2] == [".rates", ".rates.vat"]
    # Second run: no walk and no parse.
    monkeypatch.setattr("doaide_code.context._walk", lambda *a: pytest.fail("walked again"))
    monkeypatch.setattr("doaide_code.context.parse_imports", lambda *a: pytest.fail("parsed again"))
    again = rank_files(project, "why is total wrong in app/billing.py")
    assert again.tree == first.tree and [c.path for c in again.candidates] == [c.path for c in first.candidates]


def test_a_new_file_invalidates_the_tree(project: Path):
    rank_files(project, "total")
    (project / "app" / "tax.py").write_text("def tax():\n    return 0\n")
    bump(project / "app")
    assert "app/tax.py" in rank_files(project, "total").tree


def test_an_edited_file_is_parsed_again_and_stats_stay_fresh(project: Path):
    before = rank_files(project, "why is total wrong in app/billing.py")
    billing = project / "app" / "billing.py"
    billing.write_text("from .rates import vat, rate\n\ndef total(x):\n    return x * vat()\n")
    bump(billing)
    after = rank_files(project, "why is total wrong in app/billing.py")
    assert ".rates.rate" in cache_file(project)["imports"]["app/billing.py"][2]
    # File mtimes key the response cache: a cached tree must not hide an edit.
    assert after.fingerprint != before.fingerprint


def test_a_corrupt_cache_is_rebuilt(project: Path):
    rank_files(project, "total")
    [path] = list(projcache.CACHE_DIR.glob("*.json"))
    path.write_text("{not json")
    assert "app/rates.py" in rank_files(project, "total").tree
    assert cache_file(project)["version"] == projcache.VERSION
