"""Page load and session switches send only the latest messages, not the whole conversation."""

from __future__ import annotations

from doaide_code.chat import SNAPSHOT_MESSAGES, ChatService
from doaide_code.relay import RelayService
from doaide_code.router import RouterBrain
from doaide_code.sync import SyncHub

OWNER = "owner@example.com"


def fill(store, session_id: str, count: int) -> list[str]:
    return [store.add_message(session_id, "user" if i % 2 == 0 else "assistant", f"#{i}")["id"] for i in range(count)]


def test_local_snapshot_sends_only_the_latest_messages(store):
    chat = ChatService(store, RouterBrain([]), SyncHub())
    ids = fill(store, chat.current_session(OWNER)["id"], 40)
    messages = chat.snapshot(OWNER)["messages"]
    assert len(messages) == SNAPSHOT_MESSAGES <= 15
    assert [m["id"] for m in messages] == ids[-SNAPSHOT_MESSAGES:]  # oldest first, newest last


def test_hub_snapshot_sends_only_the_latest_messages(store):
    relay = RelayService(store, SyncHub())
    ids = fill(store, relay.current_session(OWNER)["id"], 40)
    assert [m["id"] for m in relay.snapshot(OWNER)["messages"]] == ids[-SNAPSHOT_MESSAGES:]


def test_a_short_conversation_is_sent_whole(store):
    chat = ChatService(store, RouterBrain([]), SyncHub())
    ids = fill(store, chat.current_session(OWNER)["id"], 3)
    assert [m["id"] for m in chat.snapshot(OWNER)["messages"]] == ids


def test_session_messages_endpoint_is_paged(client, token):
    headers = {"Authorization": f"Bearer {token}"}
    session_id = client.post("/api/sessions", headers=headers).json()["id"]
    fill(client.app.state.store, session_id, 30)
    body = client.get(f"/api/sessions/{session_id}/messages", headers=headers).json()
    assert len(body["messages"]) == 20 and body["has_more"]


def test_snapshot_says_whether_older_messages_remain(store):
    chat = ChatService(store, RouterBrain([]), SyncHub())
    session_id = chat.current_session(OWNER)["id"]
    fill(store, session_id, SNAPSHOT_MESSAGES)
    assert chat.snapshot(OWNER)["has_more"] is False
    fill(store, session_id, 1)
    assert chat.snapshot(OWNER)["has_more"] is True
    assert RelayService(store, SyncHub()).snapshot(OWNER)["has_more"] is True


def test_earlier_pages_walk_back_to_the_first_message(store):
    session_id = store.create_session(OWNER)["id"]
    ids = fill(store, session_id, 25)
    page, more = store.message_page(session_id, 10)
    assert [m["id"] for m in page] == ids[15:] and more
    page, more = store.message_page(session_id, 10, before=page[0]["id"])
    assert [m["id"] for m in page] == ids[5:15] and more
    page, more = store.message_page(session_id, 10, before=page[0]["id"])
    assert [m["id"] for m in page] == ids[:5] and not more


def test_earlier_messages_with_the_same_timestamp_are_not_skipped(store, monkeypatch):
    monkeypatch.setattr("doaide_code.db.time.time", lambda: 1000.0)
    session_id = store.create_session(OWNER)["id"]
    ids = fill(store, session_id, 6)
    assert [m["id"] for m in store.list_messages(session_id, 10, before=ids[3])] == ids[:3]


def test_before_an_unknown_or_foreign_message_returns_nothing(store):
    mine, theirs = store.create_session(OWNER)["id"], store.create_session("other@example.com")["id"]
    fill(store, mine, 3)
    foreign = fill(store, theirs, 3)
    assert store.list_messages(mine, 10, before="nope") == []
    assert store.list_messages(mine, 10, before=foreign[-1]) == []


def test_session_messages_endpoint_pages_back(client, token):
    headers = {"Authorization": f"Bearer {token}"}
    session_id = client.post("/api/sessions", headers=headers).json()["id"]
    ids = fill(client.app.state.store, session_id, 30)
    url = f"/api/sessions/{session_id}/messages"
    body = client.get(url, params={"before": ids[10], "limit": 4}, headers=headers).json()
    assert [m["id"] for m in body["messages"]] == ids[6:10] and body["has_more"]
    body = client.get(url, params={"before": ids[3]}, headers=headers).json()
    assert [m["id"] for m in body["messages"]] == ids[:3] and not body["has_more"]
    other = client.get("/api/sessions/nope/messages", headers=headers)
    assert other.status_code == 404
