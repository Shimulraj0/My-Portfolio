"""DAG executor — runs flows with branching, parallelism, retries, timeouts.

Emits execution events (node.pending / node.running / edge.flow /
node.completed) on the bus so the UI can animate the run.
"""
from __future__ import annotations

import asyncio
import logging
import re
import uuid
from dataclasses import dataclass, field
from typing import Any, Optional

from ..events import EventBus
from .model import Flow
from .nodes import ExecContext, NODES, is_async

log = logging.getLogger("jarvis.workflows.executor")

TOKEN = re.compile(r"\{\{\s*([^}]+?)\s*\}\}")


@dataclass
class ExecutionResult:
    flow_id: str
    execution_id: str
    outputs: dict[str, Any]
    node_status: dict[str, str] = field(default_factory=dict)
    error: Optional[Exception] = None


def resolve_template(value: Any, outputs: dict[str, Any], flow_input: Any) -> Any:
    """Render ``{{nodeId}}`` / ``{{nodeId.field}}`` / ``{{input.x}}`` in params."""
    if isinstance(value, str):
        if not TOKEN.search(value):
            return value
        def _lookup(expr: str) -> Any:
            expr = expr.strip()
            root, *rest = expr.split(".")
            if root == "input":
                current = flow_input
            else:
                current = outputs.get(root) if isinstance(outputs, dict) else None
            for part in rest:
                if isinstance(current, dict):
                    current = current.get(part)
                elif isinstance(current, list):
                    try:
                        current = current[int(part)]
                    except (ValueError, IndexError):
                        return None
                else:
                    return None
            return current

        def _replace(match: re.Match) -> str:
            resolved = _lookup(match.group(1))
            if isinstance(resolved, (dict, list)):
                return str(resolved)
            return "" if resolved is None else str(resolved)

        full = value.strip()
        if TOKEN.fullmatch(full):
            return _lookup(full[2:-2])
        return TOKEN.sub(_replace, value)
    if isinstance(value, dict):
        return {k: resolve_template(v, outputs, flow_input) for k, v in value.items()}
    if isinstance(value, list):
        return [resolve_template(v, outputs, flow_input) for v in value]
    return value


class WorkflowEngine:
    def __init__(
        self,
        bus: Optional[EventBus] = None,
        agent: Optional[Any] = None,
        tts: Optional[Any] = None,
        chat_provider: Optional[Any] = None,
    ):
        self.bus = bus
        self.agent = agent
        self.tts = tts
        self.chat_provider = chat_provider

    async def run(self, flow: Flow, flow_input: Any = None, execution_id: Optional[str] = None) -> ExecutionResult:
        flow.validate()
        execution_id = execution_id or f"exec_{uuid.uuid4().hex[:8]}"
        outputs: dict[str, Any] = {}
        status: dict[str, str] = {}

        remaining: dict[str, int] = {n.id: 0 for n in flow.nodes}
        for src, conn in flow.connections.items():
            targets = self._all_targets(conn)
            for tgt in targets:
                remaining[tgt] = remaining.get(tgt, 0) + 1

        blocked: set[str] = set()
        done: set[str] = set()
        ready: list[str] = [n.id for n in flow.nodes if remaining[n.id] == 0]

        while True:
            batch = [nid for nid in ready if nid not in done and nid not in blocked]
            if not batch:
                break
            await asyncio.gather(*[self._run_node(flow, nid, execution_id, outputs, flow_input, status) for nid in batch])
            for nid in batch:
                done.add(nid)
            # resolve out-edges for the completed batch
            for nid in batch:
                node = flow.node(nid)
                conn = flow.connections.get(nid, {})
                chosen = self._chosen_targets(flow, nid, outputs[nid])
                all_targets = self._all_targets(conn)
                for tgt in all_targets:
                    remaining[tgt] -= 1
                    if tgt in chosen:
                        if remaining[tgt] == 0 and tgt not in blocked:
                            ready.append(tgt)
                    else:
                        self._block(flow, tgt, remaining, blocked)
            ready = [nid for nid in ready if nid not in done and nid not in blocked]

        error = status.get("__error__")
        return ExecutionResult(
            flow_id=flow.id,
            execution_id=execution_id,
            outputs=outputs,
            node_status=status,
            error=error,
        )

    def run_sync(self, flow: Flow, flow_input: Any = None) -> ExecutionResult:
        return asyncio.run(self.run(flow, flow_input))

    # -- internals ----------------------------------------------------------
    def _all_targets(self, conn: dict) -> list[str]:
        targets: list[str] = []
        for key in ("out", "true", "false"):
            targets += conn.get(key, [])
        return targets

    def _chosen_targets(self, flow: Flow, nid: str, output: Any) -> list[str]:
        conn = flow.connections.get(nid, {})
        if "out" in conn:
            return conn["out"]
        if "true" in conn or "false" in conn:
            branch = "true" if bool(output) else "false"
            return conn.get(branch, [])
        return []

    def _block(self, flow: Flow, nid: str, remaining: dict, blocked: set[str]) -> None:
        if nid in blocked:
            return
        blocked.add(nid)
        conn = flow.connections.get(nid, {})
        for tgt in self._all_targets(conn):
            remaining[tgt] = remaining.get(tgt, 0) - 1
            self._block(flow, tgt, remaining, blocked)

    async def _run_node(self, flow: Flow, nid: str, execution_id: str, outputs: dict, flow_input: Any, status: dict) -> None:
        node = flow.node(nid)
        ctx = ExecContext(
            flow=flow,
            node=node,
            outputs=outputs,
            flow_input=flow_input,
            bus=self.bus,
            agent=self.agent,
            tts=self.tts,
            chat_provider=self.chat_provider,
            execution_id=execution_id,
        )
        if self.bus:
            self.bus.emit("node.pending", executionId=execution_id, flowId=flow.id, nodeId=nid)
            self.bus.emit("node.running", executionId=execution_id, nodeId=nid, progress=0.4)
        params = resolve_template(node.params, outputs, flow_input)
        retries = int(params.pop("retries", 0))
        timeout = float(params.pop("timeout", 60))
        try:
            for attempt in range(retries + 1):
                try:
                    if is_async(node.type):
                        result = await asyncio.wait_for(NODES[node.type](params, ctx), timeout)
                    else:
                        result = await asyncio.wait_for(asyncio.to_thread(NODES[node.type], params, ctx), timeout)
                    break
                except Exception as exc:
                    if attempt >= retries:
                        raise
                    log.warning("node %s attempt %d failed: %s; retrying", nid, attempt + 1, exc)
                    await asyncio.sleep(0.5 * (2 ** attempt))
            outputs[nid] = result
            status[nid] = "completed"
            if self.bus:
                self.bus.emit("node.completed", executionId=execution_id, nodeId=nid, output=_jsonable(result))
        except Exception as exc:
            status[nid] = "error"
            status["__error__"] = exc
            log.exception("node %s failed", nid)
            if self.bus:
                self.bus.emit("node.error", executionId=execution_id, nodeId=nid, error=str(exc))


def _jsonable(value: Any) -> Any:
    if value is None or isinstance(value, (str, int, float, bool)):
        return value
    if isinstance(value, dict):
        return {k: _jsonable(v) for k, v in value.items()}
    if isinstance(value, (list, tuple)):
        return [_jsonable(v) for v in value]
    return repr(value)
