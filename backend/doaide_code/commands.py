"""Slash commands typed into the chat box."""

from __future__ import annotations

import json
import re
import shlex
import time
import sqlite3
from dataclasses import dataclass
from pathlib import Path

from .changes import apply_record, undo_record
from .db import Store
from .files import FileAccessError
from .workspace import DEFAULT_WORKSPACE, set_workspace, workspace_path

NAME_RE = re.compile(r"^[A-Za-z0-9][A-Za-z0-9._-]{0,63}$")

HELP = """Commands:
/add-project <name> <path>   register a project folder (name optional: /add-project <path>)
/add-project <name>          create <workspace>/<name> and register it
/remove-project <name>       unregister a project (files are untouched)
/switch-project <name>       make a project active for this chat
/projects                    list registered projects
/workspace [<path>|reset]    show or change the default workspace folder
/undo [<id>]                 restore files DoAide changed (latest change if no id)
/models                      which models and CLIs this laptop can use (detected, not guessed)
/model [<name>|auto]         show or choose the model tried first (auto: cheapest that passes)
/usage                       tokens and cost today, this week, and this month
/new                         clear the chat and start over
/help                        show this help"""


@dataclass
class CommandResult:
    text: str
    project_changed: bool = False
    new_session: bool = False
    # (message id, updated summary) when a changeset was applied or discarded.
    changes: tuple[str | None, dict] | None = None


def resolve_changeset(
    store: Store, changeset_id: str | None, verb: str, status: str = "pending"
) -> tuple[dict | None, str | None]:
    row = store.get_changeset(changeset_id) if changeset_id else store.latest_changeset(status)
    if row is None:
        return None, f"No changes with id {changeset_id}." if changeset_id else f"No {status} changes to {verb}."
    if row["status"] != status:
        return None, f"Changes {row['id']} were already {row['status']}."
    return row, None


def apply_changes(store: Store, changeset_id: str | None = None) -> CommandResult:
    row, error = resolve_changeset(store, changeset_id, "apply")
    if row is None:
        return CommandResult(error or "")
    try:
        paths = apply_record(json.loads(row["record"]))
    except (ValueError, FileAccessError, OSError) as exc:
        return CommandResult(f"Not applied: {exc}")
    summary = store.set_changeset_status(row["id"], "applied")
    return CommandResult(f"Applied {len(paths)} file(s): {', '.join(paths)}", changes=(row["message_id"], summary))


def undo_changes(store: Store, changeset_id: str | None = None) -> CommandResult:
    """Restore the files an applied changeset wrote (the latest if no id)."""
    row, error = resolve_changeset(store, changeset_id, "undo", status="applied")
    if row is None:
        return CommandResult(error or "")
    try:
        paths = undo_record(json.loads(row["record"]))
    except (ValueError, FileAccessError, OSError) as exc:
        return CommandResult(f"Not undone: {exc}")
    summary = store.set_changeset_status(row["id"], "undone")
    return CommandResult(f"Undid changes to {len(paths)} file(s): {', '.join(paths)}", changes=(row["message_id"], summary))


def discard_changes(store: Store, changeset_id: str | None = None) -> CommandResult:
    row, error = resolve_changeset(store, changeset_id, "discard")
    if row is None:
        return CommandResult(error or "")
    summary = store.set_changeset_status(row["id"], "discarded")
    return CommandResult(f"Discarded changes {row['id']}.", changes=(row["message_id"], summary))


def is_command(text: str) -> bool:
    return text.lstrip().startswith("/")


def is_model_choice(text: str) -> bool:
    """`/model [name|auto]` sets the router's choice, so the chat and the agent answer it too."""
    parts = text.split()
    return bool(parts) and parts[0].lower() == "/model"


def is_models_command(text: str) -> bool:
    """`/models` needs the router's detector, so the chat and the agent answer it, not run_command."""
    parts = text.strip().split()
    return bool(parts) and parts[0].lower() in {"/models", "/status"}


def _format_projects(store: Store, active_id: int | None) -> str:
    projects = store.list_projects()
    if not projects:
        return "No projects yet. Add one with /add-project <name> <path>."
    return "\n".join(f"{'*' if p['id'] == active_id else ' '} {p['name']}  {p['path']}" for p in projects)


def format_usage(store: Store) -> str:
    now = time.time()
    lines = []
    for label, days in (("Today", 1), ("7 days", 7), ("30 days", 30)):
        rows = store.usage_summary(now - days * 86400)
        cost = sum(r["cost_usd"] or 0 for r in rows)
        tokens = sum((r["tokens_in"] or 0) + (r["tokens_out"] or 0) for r in rows)
        lines.append(f"{label:<8} ${cost:.4f}  {tokens:,} tokens  {sum(r['calls'] for r in rows)} calls")
    month = store.usage_summary(now - 30 * 86400)
    if month:
        lines.append("")
        lines += [
            f"{r['executor']:<14} ${r['cost_usd'] or 0:.4f}  {(r['tokens_in'] or 0) + (r['tokens_out'] or 0):,} tokens"
            + (f"  ({r['cached']} cached)" if r["cached"] else "")
            for r in month
        ]
    return "\n".join(lines)


def _looks_like_path(arg: str) -> bool:
    return "/" in arg or "\\" in arg or arg.startswith(("~", "."))


def run_command(store: Store, user_email: str, text: str, *, workspace: str = DEFAULT_WORKSPACE) -> CommandResult:
    """Run a slash command. `workspace` is the configured default workspace folder."""
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
    if cmd == "/undo":
        return undo_changes(store, args[0] if args else None)
    if cmd in {"/apply", "/discard"}:
        if len(args) > 1:
            return CommandResult(f"Usage: {cmd} [<id>]")
        return (apply_changes if cmd == "/apply" else discard_changes)(store, args[0] if args else None)
    if cmd == "/usage":
        return CommandResult(format_usage(store))
    if cmd == "/new":
        return CommandResult("Started a new session.", new_session=True)

    if cmd == "/workspace":
        if not args:
            return CommandResult(f"Workspace: {workspace_path(store, workspace)}")
        if len(args) != 1:
            return CommandResult("Usage: /workspace [<path>|reset]")
        if args[0].lower() == "reset":
            set_workspace(store, None)
            return CommandResult(f"Workspace reset to {workspace_path(store, workspace)}.")
        try:
            path = set_workspace(store, args[0])
        except ValueError as exc:
            return CommandResult(str(exc))
        return CommandResult(f"Workspace set to {path}.")

    if cmd == "/add-project":
        root = workspace_path(store, workspace)
        create = False
        if len(args) == 1 and not _looks_like_path(args[0]):
            # A bare name: a new folder inside the workspace.
            name, path, create = args[0], root / args[0], True
        elif len(args) == 1:
            path = Path(args[0]).expanduser()
            # Named after the folder, made valid: "My App" becomes "My-App".
            name = re.sub(r"[^A-Za-z0-9._-]+", "-", path.resolve().name).strip("-.")[:64] or "project"
        elif len(args) == 2:
            name, path = args[0], Path(args[1]).expanduser()
        else:
            return CommandResult("Usage: /add-project <name> <path>")
        if not NAME_RE.match(name):
            return CommandResult("Project names use letters, digits, '.', '_' or '-' (max 64 chars).")
        # Relative paths are relative to the workspace, not to wherever the server started.
        path = (path if path.is_absolute() else root / path).resolve()
        if create:
            path.mkdir(parents=True, exist_ok=True)
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
