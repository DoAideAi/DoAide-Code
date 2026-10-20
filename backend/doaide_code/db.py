"""SQLite storage: projects, sessions, messages, and executor stats."""

from __future__ import annotations

import json
import sqlite3
import threading
import time
import uuid
from pathlib import Path
from typing import Any

SCHEMA = """
CREATE TABLE IF NOT EXISTS projects (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    name TEXT NOT NULL UNIQUE COLLATE NOCASE,
    path TEXT NOT NULL,
    created_at REAL NOT NULL
);
CREATE TABLE IF NOT EXISTS sessions (
    id TEXT PRIMARY KEY,
    user_email TEXT NOT NULL,
    project_id INTEGER REFERENCES projects(id) ON DELETE SET NULL,
    title TEXT,
    created_at REAL NOT NULL,
    updated_at REAL NOT NULL
);
CREATE TABLE IF NOT EXISTS messages (
    id TEXT PRIMARY KEY,
    session_id TEXT NOT NULL REFERENCES sessions(id) ON DELETE CASCADE,
    role TEXT NOT NULL CHECK (role IN ('user', 'assistant', 'system')),
    content TEXT NOT NULL,
    executor TEXT,
    tier INTEGER,
    status TEXT NOT NULL DEFAULT 'done',
    created_at REAL NOT NULL,
    -- JSON: per-reply extras shown in the UI (token usage, proposed changes).
    meta TEXT
);
CREATE INDEX IF NOT EXISTS idx_messages_session ON messages(session_id, created_at);
-- One row per model call (chat, MCP, routing) for cost reporting.
CREATE TABLE IF NOT EXISTS usage_log (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    created_at REAL NOT NULL,
    source TEXT NOT NULL,
    executor TEXT,
    model TEXT,
    tokens_in INTEGER NOT NULL DEFAULT 0,
    tokens_out INTEGER NOT NULL DEFAULT 0,
    cost_usd REAL NOT NULL DEFAULT 0,
    cached INTEGER NOT NULL DEFAULT 0
);
CREATE INDEX IF NOT EXISTS idx_usage_time ON usage_log(created_at);
CREATE TABLE IF NOT EXISTS executor_stats (
    executor TEXT PRIMARY KEY,
    calls INTEGER NOT NULL DEFAULT 0,
    failures INTEGER NOT NULL DEFAULT 0,
    total_ms INTEGER NOT NULL DEFAULT 0,
    last_used REAL
);
CREATE TABLE IF NOT EXISTS user_state (
    user_email TEXT PRIMARY KEY,
    active_project_id INTEGER REFERENCES projects(id) ON DELETE SET NULL
);
-- Hub mode: prompts waiting for (or running on) the user's laptop agent. The id is the
-- assistant reply message that will hold the answer.
CREATE TABLE IF NOT EXISTS pending_jobs (
    id TEXT PRIMARY KEY REFERENCES messages(id) ON DELETE CASCADE,
    user_email TEXT NOT NULL,
    session_id TEXT NOT NULL,
    text TEXT NOT NULL,
    created_at REAL NOT NULL
);
-- Laptop-side preferences (for example the default workspace folder).
CREATE TABLE IF NOT EXISTS settings (
    key TEXT PRIMARY KEY,
    value TEXT NOT NULL
);
-- Long-lived sign-ins: browsers trade a refresh token for short access JWTs, and the
-- laptop agent and remote MCP clients authenticate with one directly. They never expire;
-- deleting the row revokes it. Only a SHA-256 hash is stored.
CREATE TABLE IF NOT EXISTS refresh_tokens (
    token_hash TEXT PRIMARY KEY,
    user_email TEXT NOT NULL,
    name TEXT NOT NULL DEFAULT '',
    scope TEXT NOT NULL CHECK (scope IN ('user', 'agent', 'mcp')),
    created_at REAL NOT NULL,
    last_used REAL
);
-- Hub mode: what the laptop last reported (projects live on the laptop, not the hub).
CREATE TABLE IF NOT EXISTS remote_state (
    user_email TEXT PRIMARY KEY,
    project TEXT
);
"""


class Store:
    """Thread-safe wrapper around one SQLite connection."""

    def __init__(self, path: Path | str):
        self.path = str(path)
        if str(path) != ":memory:":
            Path(path).parent.mkdir(parents=True, exist_ok=True)
        self._conn = sqlite3.connect(str(path), check_same_thread=False)
        self._conn.row_factory = sqlite3.Row
        self._conn.execute("PRAGMA foreign_keys = ON")
        self._conn.execute("PRAGMA journal_mode = WAL")
        self._lock = threading.Lock()
        with self._lock:
            self._conn.executescript(SCHEMA)
            self._migrate()

    def _migrate(self) -> None:
        # Databases created before the 'mcp' token scope have a narrower CHECK; rebuild the table.
        row = self._conn.execute("SELECT sql FROM sqlite_master WHERE name = 'refresh_tokens'").fetchone()
        if row is not None and "'mcp'" not in row["sql"]:
            self._conn.executescript(
                """
                ALTER TABLE refresh_tokens RENAME TO refresh_tokens_old;
                """
                + SCHEMA
                + """
                INSERT INTO refresh_tokens SELECT * FROM refresh_tokens_old;
                DROP TABLE refresh_tokens_old;
                """
            )
        columns = {r["name"] for r in self._conn.execute("PRAGMA table_info(messages)").fetchall()}
        if "meta" not in columns:
            self._conn.execute("ALTER TABLE messages ADD COLUMN meta TEXT")
            self._conn.commit()

    def close(self) -> None:
        self._conn.close()

    def _exec(self, sql: str, params: tuple = ()) -> sqlite3.Cursor:
        with self._lock:
            cur = self._conn.execute(sql, params)
            self._conn.commit()
            return cur

    def _all(self, sql: str, params: tuple = ()) -> list[dict[str, Any]]:
        with self._lock:
            return [dict(row) for row in self._conn.execute(sql, params).fetchall()]

    def _one(self, sql: str, params: tuple = ()) -> dict[str, Any] | None:
        rows = self._all(sql, params)
        return rows[0] if rows else None

    # Projects

    def add_project(self, name: str, path: str) -> dict[str, Any]:
        self._exec("INSERT INTO projects (name, path, created_at) VALUES (?, ?, ?)", (name, path, time.time()))
        return self.get_project(name)  # type: ignore[return-value]

    def remove_project(self, name: str) -> bool:
        return self._exec("DELETE FROM projects WHERE name = ?", (name,)).rowcount > 0

    def get_project(self, name: str) -> dict[str, Any] | None:
        return self._one("SELECT * FROM projects WHERE name = ?", (name,))

    def get_project_by_id(self, project_id: int | None) -> dict[str, Any] | None:
        if project_id is None:
            return None
        return self._one("SELECT * FROM projects WHERE id = ?", (project_id,))

    def list_projects(self) -> list[dict[str, Any]]:
        return self._all("SELECT * FROM projects ORDER BY name")

    def set_active_project(self, user_email: str, project_id: int | None) -> None:
        self._exec(
            "INSERT INTO user_state (user_email, active_project_id) VALUES (?, ?) "
            "ON CONFLICT(user_email) DO UPDATE SET active_project_id = excluded.active_project_id",
            (user_email, project_id),
        )

    def active_project(self, user_email: str) -> dict[str, Any] | None:
        return self._one(
            "SELECT p.* FROM user_state u JOIN projects p ON p.id = u.active_project_id WHERE u.user_email = ?",
            (user_email,),
        )

    # Sessions

    def create_session(self, user_email: str, project_id: int | None = None, title: str | None = None) -> dict[str, Any]:
        now = time.time()
        session_id = uuid.uuid4().hex
        self._exec(
            "INSERT INTO sessions (id, user_email, project_id, title, created_at, updated_at) VALUES (?, ?, ?, ?, ?, ?)",
            (session_id, user_email, project_id, title, now, now),
        )
        return self.get_session(session_id)  # type: ignore[return-value]

    def get_session(self, session_id: str) -> dict[str, Any] | None:
        return self._one("SELECT * FROM sessions WHERE id = ?", (session_id,))

    def latest_session(self, user_email: str) -> dict[str, Any] | None:
        return self._one(
            "SELECT * FROM sessions WHERE user_email = ? ORDER BY updated_at DESC LIMIT 1", (user_email,)
        )

    def update_session(self, session_id: str, *, project_id: int | None = None, title: str | None = None) -> None:
        if project_id is not None:
            self._exec("UPDATE sessions SET project_id = ? WHERE id = ?", (project_id, session_id))
        if title is not None:
            self._exec("UPDATE sessions SET title = ? WHERE id = ?", (title, session_id))

    # Messages

    def add_message(
        self,
        session_id: str,
        role: str,
        content: str,
        *,
        executor: str | None = None,
        tier: int | None = None,
        status: str = "done",
        message_id: str | None = None,
    ) -> dict[str, Any]:
        message_id = message_id or uuid.uuid4().hex
        now = time.time()
        self._exec(
            "INSERT INTO messages (id, session_id, role, content, executor, tier, status, created_at) "
            "VALUES (?, ?, ?, ?, ?, ?, ?, ?)",
            (message_id, session_id, role, content, executor, tier, status, now),
        )
        self._exec("UPDATE sessions SET updated_at = ? WHERE id = ?", (now, session_id))
        return self._one("SELECT * FROM messages WHERE id = ?", (message_id,))  # type: ignore[return-value]

    def finish_message(
        self, message_id: str, content: str, status: str, executor: str | None = None, meta: dict | None = None
    ) -> None:
        self._exec(
            "UPDATE messages SET content = ?, status = ?, executor = COALESCE(?, executor) WHERE id = ?",
            (content, status, executor, message_id),
        )
        if meta:
            self.update_meta(message_id, meta)

    def update_meta(self, message_id: str, meta: dict) -> dict:
        """Merge keys into a message's meta JSON and return the result."""
        with self._lock:
            row = self._conn.execute("SELECT meta FROM messages WHERE id = ?", (message_id,)).fetchone()
            merged = {**(json.loads(row["meta"]) if row and row["meta"] else {}), **meta}
            self._conn.execute("UPDATE messages SET meta = ? WHERE id = ?", (json.dumps(merged), message_id))
            self._conn.commit()
        return merged

    def set_message_role(self, message_id: str, role: str) -> None:
        self._exec("UPDATE messages SET role = ? WHERE id = ?", (role, message_id))

    def get_message(self, message_id: str) -> dict[str, Any] | None:
        return self._one("SELECT * FROM messages WHERE id = ?", (message_id,))

    def set_message_tier(self, message_id: str, tier: int) -> None:
        self._exec("UPDATE messages SET tier = ? WHERE id = ?", (tier, message_id))

    def list_messages(self, session_id: str, limit: int = 200) -> list[dict[str, Any]]:
        rows = self._all(
            "SELECT * FROM messages WHERE session_id = ? ORDER BY created_at DESC, rowid DESC LIMIT ?",
            (session_id, limit),
        )
        return list(reversed(rows))

    # Settings

    def get_setting(self, key: str) -> str | None:
        row = self._one("SELECT value FROM settings WHERE key = ?", (key,))
        return row["value"] if row else None

    def set_setting(self, key: str, value: str | None) -> None:
        if value is None:
            self._exec("DELETE FROM settings WHERE key = ?", (key,))
        else:
            self._exec(
                "INSERT INTO settings (key, value) VALUES (?, ?) ON CONFLICT(key) DO UPDATE SET value = excluded.value",
                (key, value),
            )

    # Refresh tokens

    def add_refresh_token(self, token_hash: str, user_email: str, scope: str, name: str = "") -> None:
        self._exec(
            "INSERT INTO refresh_tokens (token_hash, user_email, name, scope, created_at) VALUES (?, ?, ?, ?, ?)",
            (token_hash, user_email, name, scope, time.time()),
        )

    def use_refresh_token(self, token_hash: str, scope: str) -> dict[str, Any] | None:
        row = self._one("SELECT * FROM refresh_tokens WHERE token_hash = ? AND scope = ?", (token_hash, scope))
        if row is not None:
            self._exec("UPDATE refresh_tokens SET last_used = ? WHERE token_hash = ?", (time.time(), token_hash))
        return row

    def delete_refresh_token(self, token_hash: str) -> bool:
        return self._exec("DELETE FROM refresh_tokens WHERE token_hash = ?", (token_hash,)).rowcount > 0

    # Hub job queue

    def add_job(self, job_id: str, user_email: str, session_id: str, text: str) -> None:
        self._exec(
            "INSERT INTO pending_jobs (id, user_email, session_id, text, created_at) VALUES (?, ?, ?, ?, ?)",
            (job_id, user_email, session_id, text, time.time()),
        )

    def next_job(self, user_email: str) -> dict[str, Any] | None:
        return self._one(
            "SELECT * FROM pending_jobs WHERE user_email = ? ORDER BY created_at, rowid LIMIT 1", (user_email,)
        )

    def list_jobs(self, user_email: str) -> list[dict[str, Any]]:
        return self._all("SELECT * FROM pending_jobs WHERE user_email = ? ORDER BY created_at, rowid", (user_email,))

    def delete_job(self, job_id: str) -> None:
        self._exec("DELETE FROM pending_jobs WHERE id = ?", (job_id,))

    def remote_project(self, user_email: str) -> str | None:
        row = self._one("SELECT project FROM remote_state WHERE user_email = ?", (user_email,))
        return row["project"] if row else None

    def set_remote_project(self, user_email: str, project: str | None) -> None:
        self._exec(
            "INSERT INTO remote_state (user_email, project) VALUES (?, ?) "
            "ON CONFLICT(user_email) DO UPDATE SET project = excluded.project",
            (user_email, project),
        )

    # Usage

    def record_usage(
        self,
        source: str,
        executor: str | None,
        model: str | None,
        tokens_in: int,
        tokens_out: int,
        cost_usd: float,
        *,
        cached: bool = False,
    ) -> None:
        self._exec(
            "INSERT INTO usage_log (created_at, source, executor, model, tokens_in, tokens_out, cost_usd, cached) "
            "VALUES (?, ?, ?, ?, ?, ?, ?, ?)",
            (time.time(), source, executor, model, tokens_in, tokens_out, cost_usd, int(cached)),
        )

    def usage_summary(self, since: float = 0) -> list[dict[str, Any]]:
        return self._all(
            "SELECT COALESCE(executor, source) AS executor, COUNT(*) AS calls, SUM(tokens_in) AS tokens_in, "
            "SUM(tokens_out) AS tokens_out, SUM(cost_usd) AS cost_usd, SUM(cached) AS cached "
            "FROM usage_log WHERE created_at >= ? GROUP BY COALESCE(executor, source) ORDER BY cost_usd DESC",
            (since,),
        )

    # Executor stats

    def record_executor(self, executor: str, *, ok: bool, elapsed_ms: int) -> None:
        self._exec(
            "INSERT INTO executor_stats (executor, calls, failures, total_ms, last_used) VALUES (?, 1, ?, ?, ?) "
            "ON CONFLICT(executor) DO UPDATE SET calls = calls + 1, failures = failures + excluded.failures, "
            "total_ms = total_ms + excluded.total_ms, last_used = excluded.last_used",
            (executor, 0 if ok else 1, elapsed_ms, time.time()),
        )

    def executor_stats(self) -> list[dict[str, Any]]:
        return self._all("SELECT * FROM executor_stats ORDER BY executor")
