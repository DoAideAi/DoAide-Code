from __future__ import annotations

from collections.abc import AsyncIterator, Iterator
from pathlib import Path

import pytest
from fastapi.testclient import TestClient

from doaide_code.auth import User, issue_token
from doaide_code.config import Settings
from doaide_code.db import Store
from doaide_code.executors import Executor, ExecutorError, Job
from doaide_code.main import create_app


class FakeExecutor(Executor):
    """Scripted executor: yields `chunks`, optionally failing before or after them."""

    def __init__(self, name: str, tier: int, chunks=("ok",), *, up=True, fail: str | None = None, fail_after=False):
        self.name, self.tier = name, tier
        self.chunks, self.up, self.fail, self.fail_after = list(chunks), up, fail, fail_after
        self.jobs: list[Job] = []

    async def available(self) -> bool:
        return self.up

    async def stream(self, job: Job) -> AsyncIterator[str]:
        self.jobs.append(job)
        if self.fail and not self.fail_after:
            raise ExecutorError(self.fail)
        for chunk in self.chunks:
            yield chunk
        if self.fail and self.fail_after:
            raise ExecutorError(self.fail)


@pytest.fixture
def anyio_backend():
    return "asyncio"


@pytest.fixture
def settings(tmp_path: Path, monkeypatch) -> Settings:
    monkeypatch.setenv("DOAIDE_KEYS_DIR", str(tmp_path / "no-keys"))
    for key in ("GEMINI_API_KEY", "TYPESAFE_API_KEY", "GOOGLE_CLIENT_ID", "DOAIDE_REQUIRE_SSO"):
        monkeypatch.delenv(key, raising=False)
    s = Settings()
    s.db_path = tmp_path / "test.db"
    s.frontend_dist = tmp_path / "no-dist"
    s.jwt_secret = "test-secret-" + "x" * 32
    s.gemini_api_key = ""
    s.typesafe_api_key = ""
    s.offline_router = True
    s.owner_email = "owner@example.com"
    # Never touch the real ~/doaide-code-workspace from tests.
    s.workspace = str(tmp_path / "workspace")
    return s


@pytest.fixture
def store(tmp_path: Path) -> Iterator[Store]:
    s = Store(tmp_path / "store.db")
    yield s
    s.close()


@pytest.fixture
def executors() -> list[FakeExecutor]:
    return [
        FakeExecutor("ollama", 0, ["Hello", " world"]),
        FakeExecutor("codex", 1, ["codex says hi"]),
        FakeExecutor("claude-sonnet", 2, ["sonnet answer"]),
        FakeExecutor("claude-opus", 3, ["opus answer"]),
    ]


@pytest.fixture
def client(settings: Settings, executors) -> Iterator[TestClient]:
    app = create_app(settings, executors=executors)
    with TestClient(app, client=("127.0.0.1", 50000)) as c:
        yield c


@pytest.fixture
def token(settings: Settings) -> str:
    return issue_token(settings, User(email="owner@example.com"))
