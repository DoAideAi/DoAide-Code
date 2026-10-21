"""An edit runs the tests that reference what it changed, not the whole suite (live: 8.2 s of a
16 s edit was the full suite; the related tests took 3.7 s)."""

from __future__ import annotations

import contextlib
import sys

import pytest

from doaide_code.executors import Job
from doaide_code.router import RouterBrain
from doaide_code.runner import Outcome, run_job
from doaide_code.verify import about, failing_tests, related_tests

from .conftest import FakeExecutor

pytestmark = pytest.mark.anyio
async def nop(_chunk: str) -> None:
    pass


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


# A test that was already failing before the edit is not the edit's doing (live: the repo's one
# red test sent "add a comment to router.py" from a correct local answer to Sonnet, $0.024).

RED = "\n\ndef test_cache_map():\n    assert False, 'red before any edit'\n"


def taken_out(path, original):
    """failing_tests' without_edit for a test: `path` holds `original` while entered."""

    @contextlib.asynccontextmanager
    async def without():
        edited = path.read_text()
        path.write_text(original)
        try:
            yield
        finally:
            path.write_text(edited)

    return without


async def test_a_test_that_was_already_red_does_not_count_against_an_edit(project):
    with open(project / "tests" / "test_calc.py", "a") as f:
        f.write(RED)
    calc = project / "app" / "calc.py"
    original = calc.read_text()
    calc.write_text(f"# Calculator\n{original}")
    without = taken_out(calc, original)
    assert await failing_tests(project, ["app/calc.py"]) == "tests fail (tests/test_calc.py::test_cache_map)"
    assert await failing_tests(project, ["app/calc.py"], without_edit=without, request="add a comment to calc.py") is None
    assert calc.read_text() == f"# Calculator\n{original}"  # the edit is back after the baseline run


async def test_a_test_the_edit_breaks_still_counts_after_an_already_red_one(project):
    # The red test runs first; without -x it can no longer hide the one the edit broke.
    (project / "tests" / "test_aaa.py").write_text(f"{PATH}from app.calc import add{RED}")
    calc = project / "app" / "calc.py"
    original = calc.read_text()
    calc.write_text(original.replace("a + b", "a - b"))
    reason = await failing_tests(project, ["app/calc.py"], without_edit=taken_out(calc, original), request="tidy calc.py")
    assert reason == "tests fail (tests/test_calc.py::test_add)"


async def test_an_already_red_test_the_request_is_about_still_counts(project):
    # "fix add": a wrong fix that leaves the red test_add red is still a failed edit.
    calc = project / "app" / "calc.py"
    calc.write_text("def add(a, b):\n    return a - b\n")
    broken = calc.read_text()
    calc.write_text("def add(a, b):\n    return a * b\n")
    without = taken_out(calc, broken)
    for request in ("fix add in calc.py", "make the failing tests pass"):
        assert await failing_tests(project, ["app/calc.py"], without_edit=without, request=request) == (
            "tests fail (tests/test_calc.py::test_add)"
        )
    assert await failing_tests(project, ["app/calc.py"], without_edit=without, request="rename a variable") is None


@pytest.mark.parametrize(
    ("request_text", "test_id", "expected"),
    [
        ("fix add in calc.py", "tests/test_calc.py::test_add", True),
        ("paginate drops the last item", "tests/test_pages.py::test_paginate[3]", True),
        ("the failing test in test_api", "tests/test_api.py::test_login", True),
        # Naming the file a red test covers is not asking about that test.
        ("add a comment to calc.py", "tests/test_calc.py::test_cache_map", False),
        ("make the tests pass", "tests/test_x.py::test_y", True),
        ("add a comment at the top of router.py", "tests/test_context_cache.py::test_local_models_get_a_map", False),
        ("add a docstring", "tests/test_calc.py::test_mul[2-3]", False),
    ],
)
def test_what_a_request_is_about(request_text, test_id, expected):
    assert about(request_text, test_id) is expected


async def test_a_local_edit_next_to_an_already_red_test_is_not_escalated(project, store):
    with open(project / "tests" / "test_calc.py", "a") as f:
        f.write(RED)
    edit = "Added a comment.\n\napp/calc.py\n<<<<<<< SEARCH\ndef add(a, b):\n=======\n# Calculator\ndef add(a, b):\n>>>>>>> REPLACE"
    coder = FakeExecutor("ollama-coder", 1, [edit])
    coder.tool, coder.context_mode = "ollama", "files"
    sonnet = FakeExecutor("claude-sonnet", 2, [edit])
    sonnet.tool = "claude"
    job = Job("add a comment at the top of app/calc.py saying # Calculator", cwd=project)
    outcome = await run_job(RouterBrain([coder, sonnet], offline=True), store, job, Outcome(), nop)
    assert outcome.executor == "ollama-coder" and not sonnet.jobs
    assert (project / "app" / "calc.py").read_text().startswith("# Calculator\n")
    assert not any(c["name"] == "tests" for c in outcome.meta()["checks"]["items"])


async def test_only_the_files_that_failed_run_again_without_the_edit(project):
    # A test file that logs each time it is collected: it must run with the edit, not again.
    log = project / "collected.log"
    (project / "tests" / "test_engines.py").write_text(
        f"{PATH}open({str(log)!r}, 'a').write('x')\nfrom app.engines import FastEngine\n\n\ndef test_it():\n    assert FastEngine\n"
    )
    unused = project / "app" / "unused.py"
    unused.write_text("X = 2\n")
    # app/unused.py is referenced by no test, so the whole suite runs; test_other is red already.
    reason = await failing_tests(project, ["app/unused.py"], without_edit=taken_out(unused, "X = 1\n"), request="set X")
    assert reason is None
    assert log.read_text() == "x"
