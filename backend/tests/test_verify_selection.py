"""An edit runs the tests that reference what it changed, not the whole suite (live: 8.2 s of a
16 s edit was the full suite; the related tests took 3.7 s)."""

from __future__ import annotations

import sys

import pytest

from doaide_code.verify import failing_tests, related_tests

pytestmark = pytest.mark.anyio
PATH = "import sys, pathlib\nsys.path.insert(0, str(pathlib.Path(__file__).parents[1]))\n"


@pytest.fixture
def project(tmp_path):
    (tmp_path / "pyproject.toml").write_text("[project]\nname = 'app'\nversion = '0'\n")
    (tmp_path / "app" / "engines").mkdir(parents=True)
    (tmp_path / "app" / "__init__.py").write_text("")
    (tmp_path / "app" / "calc.py").write_text("def add(a, b):\n    return a + b\n")
    (tmp_path / "app" / "engines" / "__init__.py").write_text("from .fast import FastEngine\n")
    (tmp_path / "app" / "engines" / "fast.py").write_text("class FastEngine:\n    pass\n")
    (tmp_path / "tests").mkdir()
    (tmp_path / "tests" / "test_calc.py").write_text(f"{PATH}from app.calc import add\n\n\ndef test_add():\n    assert add(2, 3) == 5\n")
    (tmp_path / "tests" / "test_engines.py").write_text(f"{PATH}from app.engines import FastEngine\n\n\ndef test_it():\n    assert FastEngine\n")
    (tmp_path / "tests" / "test_other.py").write_text("def test_broken():\n    assert False\n")
    (tmp_path / ".venv" / "bin").mkdir(parents=True)
    (tmp_path / ".venv" / "bin" / "python").symlink_to(sys.executable)
    return tmp_path


def test_the_tests_that_import_or_use_an_edited_module_are_selected(project):
    assert related_tests(project, project, ["app/calc.py"]) == ["tests/test_calc.py"]
    # Through a package: the test uses a class the edited file defines.
    assert related_tests(project, project, ["app/engines/fast.py"]) == ["tests/test_engines.py"]
    assert related_tests(project, project, ["tests/test_other.py"]) == ["tests/test_other.py"]
    # Nothing references it: the whole suite.
    (project / "app" / "unused.py").write_text("X = 1\n")
    assert related_tests(project, project, ["app/unused.py"]) == []


async def test_an_unrelated_failing_test_does_not_block_an_edit(project):
    assert await failing_tests(project, ["app/calc.py"]) is None
    (project / "app" / "calc.py").write_text("def add(a, b):\n    return a - b\n")
    assert await failing_tests(project, ["app/calc.py"]) == "tests fail (tests/test_calc.py::test_add)"
    assert await failing_tests(project, ["app/unused.py"]) == "tests fail (tests/test_calc.py::test_add)"
