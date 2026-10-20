"""Slash commands typed into the chat box."""

from __future__ import annotations

import re
import shlex
import sqlite3
from dataclasses import dataclass
from pathlib import Path

from .db import Store

NAME_RE = re.compile(r"^[A-Za-z0-9][A-Za-z0-9._-]{0,63}$")

HELP = """Commands:
/add-project <name> <path>   register a project folder (name optional: /add-project <path>)
/remove-project <name>       unregister a project (files are untouched)
/switch-project <name>       make a project active for this chat
/projects                    list registered projects
/new                         start a new chat session
/help                        show this help"""


@dataclass
class CommandResult:
    text: str
    project_changed: bool = False
    new_session: bool = False


def is_command(text: str) -> bool:
    return text.lstrip().startswith("/")


def _format_projects(store: Store, active_id: int | None) -> str:
    projects = store.list_projects()
    if not projects:
        return "No projects yet. Add one with /add-project <name> <path>."
    return "\n".join(f"{'*' if p['id'] == active_id else ' '} {p['name']}  {p['path']}" for p in projects)


def run_command(store: Store, user_email: str, text: str) -> CommandResult:
    try:
        parts = shlex.split(text.strip())
    except ValueError as exc:
        return CommandResult(f"Could not parse command: {exc}")
    cmd, args = parts[0].lower(), parts[1:]
    active = store.active_project(user_email)

    if cmd == "/help":
        return CommandResult(HELP)
    if cmd == "/projects":
        return CommandResult(_format_projects(store, active["id"] if active else None))
    if cmd == "/new":
        return CommandResult("Started a new session.", new_session=True)

    if cmd == "/add-project":
        if len(args) == 1:
            name, raw_path = Path(args[0]).expanduser().name, args[0]
        elif len(args) == 2:
            name, raw_path = args
        else:
            return CommandResult("Usage: /add-project <name> <path>")
        if not NAME_RE.match(name):
            return CommandResult("Project names use letters, digits, '.', '_' or '-' (max 64 chars).")
        path = Path(raw_path).expanduser().resolve()
        if not path.is_dir():
            return CommandResult(f"Not a directory: {path}")
        try:
            project = store.add_project(name, str(path))
        except sqlite3.IntegrityError:
            return CommandResult(f"A project named '{name}' already exists.")
        store.set_active_project(user_email, project["id"])
        return CommandResult(f"Added project '{name}' at {path} and switched to it.", project_changed=True)

    if cmd == "/remove-project":
        if len(args) != 1:
            return CommandResult("Usage: /remove-project <name>")
        if not store.remove_project(args[0]):
            return CommandResult(f"No project named '{args[0]}'.")
        changed = bool(active and active["name"].lower() == args[0].lower())
        return CommandResult(f"Removed project '{args[0]}'. Files on disk were not touched.", project_changed=changed)

    if cmd == "/switch-project":
        if len(args) != 1:
            return CommandResult("Usage: /switch-project <name>")
        project = store.get_project(args[0])
        if project is None:
            return CommandResult(f"No project named '{args[0]}'.\n{_format_projects(store, None)}")
        store.set_active_project(user_email, project["id"])
        return CommandResult(f"Switched to '{project['name']}'.", project_changed=True)

    return CommandResult(f"Unknown command {cmd}.\n{HELP}")
