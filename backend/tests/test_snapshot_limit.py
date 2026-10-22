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


def test_session_messages_endpoint_is_limited(client, token):
    headers = {"Authorization": f"Bearer {token}"}
    session_id = client.post("/api/sessions", headers=headers).json()["id"]
    fill(client.app.state.store, session_id, 30)
    body = client.get(f"/api/sessions/{session_id}/messages", headers=headers).json()
    assert len(body["messages"]) == SNAPSHOT_MESSAGES
