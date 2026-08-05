"""Application runtime — owns memory, agent, workflows, and flows on disk."""
from __future__ import annotations

import json
import logging
from pathlib import Path
from typing import Any, Optional

from ..core.agents import AgentContext, Jarvis
from ..core.events import EventBus
from ..core.memory import HashEmbedder, MemoryGraph, MemoryStore
from ..core.memory.obsidian import MemoryVault, Vault
from ..core.workflows import Flow, WorkflowEngine

log = logging.getLogger("jarvis.api.runtime")


class Runtime:
    def __init__(
        self,
        state_dir: str | Path,
        flow_dir: str | Path | None = None,
        embedder: Any = None,
    ):
        self.state_dir = Path(state_dir)
        self.state_dir.mkdir(parents=True, exist_ok=True)
        self.flow_dir = Path(flow_dir) if flow_dir else self.state_dir / "flows"
        self.flow_dir.mkdir(parents=True, exist_ok=True)

        self.bus = EventBus()
        self.store = MemoryStore(self.state_dir / "jarvis.db")
        self.graph = self.store.load_graph(embedder=embedder or HashEmbedder())
        self.vault = MemoryVault(Vault(self.state_dir / "vault"))
        self.ctx = AgentContext(
            graph=self.graph, vault=self.vault, store=self.store, event_bus=self.bus
        )
        self.jarvis = Jarvis(self.ctx)
        self.engine = WorkflowEngine(bus=self.bus, agent=self.ctx)

    # -- flows ------------------------------------------------------------
    def list_flows(self) -> list[dict[str, Any]]:
        flows = []
        for path in sorted(self.flow_dir.glob("*.json")):
            try:
                flow = Flow.from_json(path)
                flows.append(flow.to_dict())
            except Exception as exc:
                log.warning("skipping invalid flow %s: %s", path.name, exc)
        return flows

    def get_flow(self, flow_id: str) -> Flow:
        path = self.flow_dir / f"{flow_id}.json"
        if not path.exists():
            raise KeyError(f"flow {flow_id!r} not found")
        return Flow.from_json(path)

    def save_flow(self, data: dict[str, Any]) -> dict[str, Any]:
        flow = Flow.from_dict(data)
        path = self.flow_dir / f"{flow.id}.json"
        path.write_text(json.dumps(flow.to_dict(), indent=2), encoding="utf-8")
        return flow.to_dict()

    def delete_flow(self, flow_id: str) -> None:
        path = self.flow_dir / f"{flow_id}.json"
        if not path.exists():
            raise KeyError(f"flow {flow_id!r} not found")
        path.unlink()

    def close(self) -> None:
        self.store.close()
