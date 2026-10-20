"""Cross-device relay: every chat event for a user fans out to all of that user's sockets."""

from __future__ import annotations

import asyncio
import contextlib
from collections import defaultdict
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
