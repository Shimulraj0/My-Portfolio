"""WebSocket fan-out — bridges the in-process EventBus to connected clients.

Events are produced synchronously (often on worker threads), so each
connection owns an asyncio.Queue that its listener fills with
``loop.call_soon_threadsafe``.
"""
from __future__ import annotations

import asyncio
import logging
from dataclasses import dataclass
from typing import Any

from ..core.events import EventBus

log = logging.getLogger("jarvis.api.hub")


@dataclass
class Connection:
    queue: asyncio.Queue
    closed: bool = False

    def push(self, event: dict[str, Any]) -> None:
        if self.closed:
            return
        try:
            loop = asyncio.get_running_loop()
        except RuntimeError:
            loop = asyncio.get_event_loop()
        loop.call_soon_threadsafe(self.queue.put_nowait, event)


class Hub:
    def __init__(self, bus: EventBus):
        self._bus = bus
        self._connections: list[Connection] = []

    def connect(self) -> Connection:
        conn = Connection(asyncio.Queue())
        self._connections.append(conn)
        self._bus.subscribe(conn.push)
        log.debug("client connected (%d total)", len(self._connections))
        return conn

    def disconnect(self, conn: Connection) -> None:
        conn.closed = True
        if conn in self._connections:
            self._connections.remove(conn)
        log.debug("client disconnected (%d total)", len(self._connections))

    @property
    def clients(self) -> int:
        return len(self._connections)
