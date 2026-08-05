"""n8n-style flow model — nodes + connections, validated."""
from __future__ import annotations

import json
from dataclasses import dataclass, field
from pathlib import Path
from typing import Any, Optional

Connections = dict[str, dict[str, Any]]


class FlowValidationError(ValueError):
    pass


@dataclass
class FlowNode:
    id: str
    type: str
    params: dict[str, Any] = field(default_factory=dict)


@dataclass
class Flow:
    id: str
    name: str
    nodes: list[FlowNode]
    connections: Connections
    params: dict[str, Any] = field(default_factory=dict)

    def node(self, node_id: str) -> FlowNode:
        for node in self.nodes:
            if node.id == node_id:
                return node
        raise KeyError(node_id)

    def node_ids(self) -> set[str]:
        return {n.id for n in self.nodes}

    def out_edges(self, node_id: str) -> list[str]:
        """Chosen-target semantics of a node's outgoing edges.

        A node's connection is either ``{"out": [...]}`` (always taken) or a
        branch map like ``{"true": [...], "false": [...]}`` (one taken, the
        rest pruned). Returns the full edge structure for the executor.
        """
        conn = self.connections.get(node_id, {})
        return conn.get("out", conn)

    def validate(self) -> None:
        ids = self.node_ids()
        if not ids:
            raise FlowValidationError("flow has no nodes")
        if not self.nodes[0].type.startswith("trigger."):
            raise FlowValidationError(f"first node must be a trigger, got {self.nodes[0].type}")
        for node in self.nodes:
            if not node.id:
                raise FlowValidationError("node with empty id")
            if not node.type:
                raise FlowValidationError(f"node {node.id} missing type")
        for src, conn in self.connections.items():
            if src not in ids:
                raise FlowValidationError(f"connection from unknown node {src!r}")
            targets = conn.get("out", [])
            for branch in ("true", "false"):
                targets += conn.get(branch, [])
            for tgt in targets:
                if tgt not in ids:
                    raise FlowValidationError(
                        f"connection {src} -> {tgt!r} references unknown node"
                    )

    @classmethod
    def from_dict(cls, data: dict[str, Any]) -> "Flow":
        nodes = [FlowNode(n["id"], n["type"], n.get("params", {})) for n in data["nodes"]]
        flow = cls(
            id=data["id"],
            name=data.get("name", data["id"]),
            nodes=nodes,
            connections=data.get("connections", {}),
            params=data.get("params", {}),
        )
        flow.validate()
        return flow

    @classmethod
    def from_json(cls, path: str | Path) -> "Flow":
        raw = json.loads(Path(path).read_text(encoding="utf-8"))
        return cls.from_dict(raw)

    def to_dict(self) -> dict[str, Any]:
        return {
            "id": self.id,
            "name": self.name,
            "nodes": [
                {"id": n.id, "type": n.type, "params": n.params} for n in self.nodes
            ],
            "connections": self.connections,
            "params": self.params,
        }


def flow_input_for(flow: Flow, trigger_id: str, payload: Any = None) -> Any:
    """Payload that a trigger hands to the rest of the flow."""
    return payload if payload is not None else {}
