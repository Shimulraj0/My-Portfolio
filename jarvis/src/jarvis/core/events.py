"""Execution event bus.

Every agent step and workflow node emits a structured event here. The API
layer fans these out over WebSocket so the UI can animate execution; local
listeners (logging, maintenance) subscribe directly.
"""
from __future__ import annotations

import json
import logging
from collections.abc import Callable
from dataclasses import dataclass, field
from typing import Any

log = logging.getLogger("jarvis.events")

Listener = Callable[[dict[str, Any]], None]


@dataclass
class Event:
    type: str
    data: dict[str, Any] = field(default_factory=dict)

    def to_dict(self) -> dict[str, Any]:
        return {"type": self.type, **self.data}


class EventBus:
    """In-process pub/sub bus for execution events."""

    def __init__(self) -> None:
        self._listeners: list[Listener] = []
        self._history: list[dict[str, Any]] = []

    def subscribe(self, listener: Listener) -> None:
        self._listeners.append(listener)

    def emit(self, event_type: str, **data: Any) -> None:
        event = Event(event_type, data).to_dict()
        self._history.append(event)
        if len(self._history) > 10_000:
            self._history = self._history[-5_000:]
        for listener in self._listeners:
            try:
                listener(event)
            except Exception:  # pragma: no cover - listeners must not break flow
                log.exception("event listener failed for %s", event_type)

    def drain(self) -> list[dict[str, Any]]:
        """Consume and clear the buffered history (for tests)."""
        events, self._history = self._history, []
        return events

    def clear(self) -> None:
        self._history = []

    # convenience emitters ------------------------------------------------
    def agent_running(self, agent: str) -> None:
        self.emit("agent.running", agent=agent)

    def agent_step(self, agent: str, message: str) -> None:
        self.emit("agent.step", agent=agent, message=message)

    def agent_done(self, agent: str, summary: str) -> None:
        self.emit("agent.completed", agent=agent, summary=summary)

    def memory_recalled(self, memory_ids: list[str]) -> None:
        self.emit("memory.recalled", ids=memory_ids)

    def memory_stored(self, memory_id: str, content: str) -> None:
        self.emit("memory.stored", id=memory_id, content=content)

    def note_event(self, action: str, path: str) -> None:
        self.emit("note." + action, path=path)

    def to_json(self) -> str:
        return json.dumps(self._history)


def log_listener(event: dict[str, Any]) -> None:
    log.debug("%s %s", event["type"], event.get("data", {}))
