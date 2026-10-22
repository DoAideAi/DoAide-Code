from __future__ import annotations

from doaide_code.commands import is_command, run_command

USER = "owner@example.com"


def test_project_crud(store, tmp_path):
    project = store.add_project("alpha", str(tmp_path))
    assert project["name"] == "alpha"
    assert store.get_project("ALPHA")["id"] == project["id"]  # case-insensitive
    assert [p["name"] for p in store.list_projects()] == ["alpha"]
    assert store.remove_project("alpha") is True
    assert store.remove_project("alpha") is False


def test_active_project_cleared_when_removed(store, tmp_path):
    project = store.add_project("alpha", str(tmp_path))
    store.set_active_project(USER, project["id"])
    assert store.active_project(USER)["name"] == "alpha"
    store.remove_project("alpha")
    assert store.active_project(USER) is None


def test_messages_ordered_and_finished(store):
    session = store.create_session(USER)
    store.add_message(session["id"], "user", "first")
    reply = store.add_message(session["id"], "assistant", "", status="streaming")
    store.finish_message(reply["id"], "answer", "done", executor="ollama")
    rows = store.list_messages(session["id"])
    assert [r["content"] for r in rows] == ["first", "answer"]
    assert rows[1]["executor"] == "ollama" and rows[1]["status"] == "done"
    assert store.latest_session(USER)["id"] == session["id"]


def test_executor_stats_accumulate(store):
    store.record_executor("ollama", ok=True, elapsed_ms=100)
    store.record_executor("ollama", ok=False, elapsed_ms=50)
    (row,) = store.executor_stats()
    assert (row["calls"], row["failures"], row["total_ms"]) == (2, 1, 150)


def test_is_command():
    assert is_command("  /help")
    assert not is_command("explain /etc/hosts")


def test_add_switch_remove_project(store, tmp_path):
    a, b = tmp_path / "a", tmp_path / "b"
    a.mkdir()
    b.mkdir()
    result = run_command(store, USER, f"/add-project alpha {a}")
    assert result.project_changed and store.active_project(USER)["name"] == "alpha"
    run_command(store, USER, f"/add-project {b}")  # name defaults to folder name
    assert store.get_project("b")["path"] == str(b.resolve())
    assert store.active_project(USER)["name"] == "b"

    result = run_command(store, USER, "/switch-project alpha")
    assert result.project_changed and store.active_project(USER)["name"] == "alpha"

    listing = run_command(store, USER, "/projects").text
    assert "* alpha" in listing and "  b" in listing

    result = run_command(store, USER, "/remove-project alpha")
    assert result.project_changed and store.active_project(USER) is None


def test_add_project_validation(store, tmp_path):
    assert "Not a directory" in run_command(store, USER, f"/add-project x {tmp_path / 'missing'}").text
    assert "Project names" in run_command(store, USER, f"/add-project '../bad' {tmp_path}").text
    run_command(store, USER, f"/add-project dup {tmp_path}")
    assert "already exists" in run_command(store, USER, f"/add-project dup {tmp_path}").text
    assert "Usage" in run_command(store, USER, "/add-project").text


def test_paths_with_spaces_and_unknown_commands(store, tmp_path):
    spaced = tmp_path / "my project"
    spaced.mkdir()
    assert run_command(store, USER, f'/add-project spaced "{spaced}"').project_changed
    assert "No project named" in run_command(store, USER, "/switch-project nope").text
    assert "Unknown command" in run_command(store, USER, "/frobnicate").text
    assert run_command(store, USER, "/new").new_session


def test_add_project_by_path_makes_a_valid_name_from_any_folder(store, tmp_path):
    folder = tmp_path / "My App (v2)"
    folder.mkdir()
    result = run_command(store, USER, f'/add-project "{folder}"')
    assert "Added project 'My-App-v2'" in result.text and result.project_changed
    assert store.active_project(USER)["path"] == str(folder.resolve())
