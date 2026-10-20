"""The laptop's default workspace: where new projects go and where prompts run when no
project is active. Defaults to ~/doaide-code-workspace; `/workspace <path>` changes it
and the choice is kept in the local database's settings table."""

from __future__ import annotations

from pathlib import Path
from typing import Any

from .db import Store

DEFAULT_WORKSPACE = "~/doaide-code-workspace"
SETTING_KEY = "workspace"


def workspace_path(store: Store, default: str = DEFAULT_WORKSPACE) -> Path:
    return Path(store.get_setting(SETTING_KEY) or default).expanduser().resolve()


def ensure_workspace(store: Store, default: str = DEFAULT_WORKSPACE) -> Path:
    path = workspace_path(store, default)
    path.mkdir(parents=True, exist_ok=True)
    return path


def set_workspace(store: Store, raw: str | None) -> Path | None:
    """Set the workspace (created if missing); None restores the default. Raises ValueError."""
    if raw is None:
        store.set_setting(SETTING_KEY, None)
        return None
    path = Path(raw).expanduser().resolve()
    if path.exists() and not path.is_dir():
        raise ValueError(f"Not a directory: {path}")
    try:
        path.mkdir(parents=True, exist_ok=True)
    except OSError as exc:
        raise ValueError(f"Cannot create {path}: {exc.strerror}") from exc
    store.set_setting(SETTING_KEY, str(path))
    return path


def working_root(store: Store, user_email: str, default: str = DEFAULT_WORKSPACE) -> tuple[Path, str]:
    """Folder executors and the file browser use: the active project, else the workspace."""
    project: dict[str, Any] | None = store.active_project(user_email)
    if project and Path(project["path"]).is_dir():
        return Path(project["path"]), project["name"]
    return ensure_workspace(store, default), "workspace"
