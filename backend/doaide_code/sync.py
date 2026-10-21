"""Cross-device relay: every chat event for a user fans out to all of that user's sockets.

On the laptop, MirrorHub also forwards the local conversation to the hosted hub (for the phone)."""

from __future__ import annotations

import asyncio
import contextlib
from collections import defaultdict
from collections.abc import Awaitable, Callable
from typing import Any, Protocol


class Socket(Protocol):
    async def send_json(self, data: Any) -> None: ...


class SyncHub:
    def __init__(self) -> None:
        self._sockets: dict[str, set[Socket]] = defaultdict(set)
        self._lock = asyncio.Lock()

    async def join(self, user_email: str, socket: Socket) -> None:
        async with self._lock:
            self._sockets[user_email].add(socket)

    async def leave(self, user_email: str, socket: Socket) -> None:
        async with self._lock:
            self._sockets[user_email].discard(socket)
            if not self._sockets[user_email]:
                del self._sockets[user_email]

    def count(self, user_email: str) -> int:
        return len(self._sockets.get(user_email, ()))

    async def publish(self, user_email: str, event: dict[str, Any]) -> None:
        async with self._lock:
            targets = list(self._sockets.get(user_email, ()))
        dead = []
        for socket in targets:
            try:
                await socket.send_json(event)
            except Exception:
                dead.append(socket)
        for socket in dead:
            with contextlib.suppress(Exception):
                await self.leave(user_email, socket)


# Local chat events the hub mirrors for the user's other devices. A snapshot only happens on /new
# (the conversation was cleared), so it travels as a small "cleared" event.
MIRRORED = {"message", "delta", "done", "changes", "project", "status"}


class MirrorHub(SyncHub):
    """The laptop's sync hub: local sockets get every event at once (no server round trip), and
    the conversation is mirrored to the hosted hub through `uplink` so the phone sees it too."""

    def __init__(self) -> None:
        super().__init__()
        # Set while the agent is connected to the hub; events are not queued while it is not.
        self.uplink: Callable[[dict[str, Any]], Awaitable[None]] | None = None

    async def publish(self, user_email: str, event: dict[str, Any]) -> None:
        await super().publish(user_email, event)
        kind = event.get("type")
        if self.uplink is None or (kind not in MIRRORED and kind != "snapshot"):
            return
        mirrored = {"type": "cleared"} if kind == "snapshot" else event
        with contextlib.suppress(Exception):
            await self.uplink({"type": "mirror", "event": mirrored})

    async def publish_local(self, user_email: str, event: dict[str, Any]) -> None:
        """Local sockets only: for events that came from the hub (prompts sent from the phone)."""
        await super().publish(user_email, event)
