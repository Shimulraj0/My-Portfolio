"""Background memory maintenance (jcode: "opportunistic maintenance").

A thread periodically: decays stale memories toward their type half-life,
discovers links between co-similar memories, and infers shared tags. All
non-blocking and best-effort — never raises.
"""
from __future__ import annotations

import logging
import threading
from datetime import datetime, timezone
from typing import Optional

from .graph import MemoryGraph
from .maintenance import MaintenanceAgent, RetrievalContext
from .schema import MemoryEntry

log = logging.getLogger("jarvis.memory.background")

STALE_AMOUNT = 0.01
LINK_SAMPLE = 60


class BackgroundMaintenance:
    def __init__(self, graph: MemoryGraph, interval_seconds: float = 3600.0):
        self.graph = graph
        self.interval = interval_seconds
        self._agent = MaintenanceAgent(graph)
        self._thread: Optional[threading.Thread] = None
        self._stop = threading.Event()

    def start(self) -> None:
        if self._thread and self._thread.is_alive():
            return
        self._stop.clear()
        self._thread = threading.Thread(
            target=self._loop, daemon=True, name="jarvis-maintenance"
        )
        self._thread.start()

    def stop(self) -> None:
        self._stop.set()
        if self._thread:
            self._thread.join(timeout=2)

    def _loop(self) -> None:
        while not self._stop.is_set():
            try:
                self._pass()
            except Exception:  # pragma: no cover - maintenance never blocks
                log.exception("background maintenance pass failed")
            self._stop.wait(self.interval)

    def _pass(self) -> dict[str, int]:
        """One maintenance sweep. Returns counts of actions taken."""
        memories = list(self.graph.active_memories())
        decayed = self._decay_stale(memories)
        sample = memories[:LINK_SAMPLE]
        if len(sample) >= 2:
            self._agent.discover_links(sample)
        self._agent.infer_tags(RetrievalContext([], "", verified_memories=sample))
        return {"decayed": decayed, "scanned": len(memories), "links_considered": len(sample)}

    def _decay_stale(self, memories: list[MemoryEntry]) -> int:
        now = datetime.now(timezone.utc)
        count = 0
        for mem in memories:
            updated = _to_datetime(mem.updated_at)
            age_days = (now - updated).total_seconds() / 86400.0
            if age_days > mem.effective_half_life_days():
                self._agent.decay_confidence(mem, STALE_AMOUNT)
                count += 1
        return count


def _to_datetime(value) -> datetime:
    if isinstance(value, datetime):
        return value
    return datetime.fromisoformat(str(value).replace("Z", "+00:00"))
