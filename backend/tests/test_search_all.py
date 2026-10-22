"""Search across every conversation: GET /api/search and Store.search_all."""

from __future__ import annotations

from doaide_code.db import snippet

from .test_api import auth


def _seed(store, email="owner@example.com"):
    first = store.create_session(email, None)
    store.update_session(first["id"], title="Login bug")
    store.add_message(first["id"], "user", "why does LOGIN fail with 100% CPU?")
    store.add_message(first["id"], "assistant", "The login loop never exits.")
    store.add_message(first["id"], "system", "login command output")
    second = store.create_session(email, None)
    store.add_message(second["id"], "user", "rename snake_case vars")
    other = store.create_session("someone@else.com", None)
    store.add_message(other["id"], "user", "my login is secret")
    return first, second


def test_search_all_spans_conversations_skips_others_and_system(store):
    first, _ = _seed(store)
    rows = store.search_all("owner@example.com", "login")
    assert [r["role"] for r in rows] == ["assistant", "user"]  # newest first, no system rows
    assert {r["session_id"] for r in rows} == {first["id"]}
    assert rows[0]["session_title"] == "Login bug"


def test_like_wildcards_are_literal(store):
    _seed(store)
    assert [r["content"] for r in store.search_all("owner@example.com", "100%")] == ["why does LOGIN fail with 100% CPU?"]
    assert len(store.search_all("owner@example.com", "e_c")) == 1  # snake_case, not "e?c" anywhere
    # A lone % finds the one message with a percent sign, not every message.
    assert len(store.search_all("owner@example.com", "%")) == 1


def test_snippet_centres_on_the_match_on_one_line():
    text = "a" * 100 + "\nNEEDLE here\n" + "b" * 200
    out = snippet(text, "needle")
    assert out.startswith("…") and out.endswith("…") and "NEEDLE here" in out and "\n" not in out
    assert snippet("short needle", "needle") == "short needle"


def test_search_endpoint(client, token):
    with client.websocket_connect(f"/ws?token={token}") as ws:
        ws.receive_json()
        ws.send_json({"type": "send", "text": "what are decorators?"})
        while ws.receive_json()["type"] != "done":
            pass
    body = client.get("/api/search?q=decorators", headers=auth(token)).json()
    assert body["query"] == "decorators"
    assert [r["role"] for r in body["results"]] == ["user"]
    assert body["results"][0]["content"] == "what are decorators?" and body["results"][0]["session_id"]
    assert client.get("/api/search?q=%20d%20", headers=auth(token)).json()["results"] == []
    assert client.get("/api/search?q=decorators").status_code == 401
