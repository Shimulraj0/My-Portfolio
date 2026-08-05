"""Node registry — every node type in the flow engine.

A node is a plain function ``run(params, ctx) -> Any`` registered under a type
name. ``ctx`` is an :class:`ExecContext` exposing prior outputs, the flow
input, the event bus, and optionally the J.A.R.V.I.S agent context.
"""
from __future__ import annotations

import asyncio
import json
import urllib.request
from dataclasses import dataclass
from typing import Any, Optional

from ..events import EventBus
from .model import Flow, FlowNode


@dataclass
class ExecContext:
    flow: Flow
    node: FlowNode
    outputs: dict[str, Any]
    flow_input: Any
    bus: Optional[EventBus] = None
    agent: Optional[Any] = None  # AgentContext (graph/vault/store)
    tts: Optional[Any] = None
    chat_provider: Optional[Any] = None
    execution_id: str = ""

    def emit(self, type_: str, **extra: Any) -> None:
        if self.bus:
            self.bus.emit(type_, executionId=self.execution_id, flowId=self.flow.id, nodeId=self.node.id, **extra)


# ---------------------------------------------------------------------------
# trigger nodes (pass through)
# ---------------------------------------------------------------------------
def _trigger_pass(params: dict[str, Any], ctx: ExecContext) -> Any:
    return ctx.flow_input


# ---------------------------------------------------------------------------
# agent / memory nodes
# ---------------------------------------------------------------------------
def _agent_langgraph(params: dict[str, Any], ctx: ExecContext) -> Any:
    from ..agents.orchestrator import Jarvis

    if ctx.agent is None:
        raise RuntimeError("agent.langgraph requires a J.A.R.V.I.S agent context")
    jarvis = Jarvis(ctx.agent, chat_provider=ctx.chat_provider)
    result = jarvis.run(str(params.get("prompt", "")))
    return {"reply": result["reply"], "intent": result.get("intent")}


def _memory_recall(params: dict[str, Any], ctx: ExecContext) -> Any:
    from ..agents.tools import recall

    if ctx.agent is None:
        raise RuntimeError("memory.recall requires an agent context")
    return [m.to_dict() for m, _ in recall(str(params.get("query", "")), ctx.agent, k=params.get("k", 5))]


def _memory_remember(params: dict[str, Any], ctx: ExecContext) -> Any:
    from ..agents.tools import remember

    if ctx.agent is None:
        raise RuntimeError("memory.remember requires an agent context")
    entry = remember(str(params.get("content", "")), ctx.agent)
    return entry.to_dict()


def _llm(params: dict[str, Any], ctx: ExecContext) -> str:
    if ctx.chat_provider is None:
        raise RuntimeError("llm node requires a chat provider")
    prompt = str(params.get("prompt", ""))
    return ctx.chat_provider.respond([], [], [])


# ---------------------------------------------------------------------------
# obsidian nodes
# ---------------------------------------------------------------------------
def _obsidian_read(params: dict[str, Any], ctx: ExecContext) -> list[dict]:
    from ..agents.tools import note_search

    if ctx.agent is None:
        raise RuntimeError("obsidian.read requires an agent context")
    return note_search(str(params.get("query", "")), ctx.agent)


def _obsidian_write(params: dict[str, Any], ctx: ExecContext) -> dict:
    from ..agents.tools import note_write

    if ctx.agent is None:
        raise RuntimeError("obsidian.write requires an agent context")
    path = note_write(str(params.get("title", "")), str(params.get("body", "")), ctx.agent)
    return {"path": str(path)}


# ---------------------------------------------------------------------------
# http node (stdlib)
# ---------------------------------------------------------------------------
def _http(params: dict[str, Any], ctx: ExecContext) -> dict:
    url = str(params.get("url", ""))
    method = str(params.get("method", "GET"))
    headers = params.get("headers", {})
    body = params.get("body")
    data = json.dumps(body).encode() if isinstance(body, (dict, list)) else (body.encode() if body else None)
    request = urllib.request.Request(url, data=data, method=method, headers=headers)
    with urllib.request.urlopen(request, timeout=params.get("timeout", 10)) as resp:
        raw = resp.read().decode("utf-8", errors="replace")
        try:
            parsed = json.loads(raw)
        except json.JSONDecodeError:
            parsed = raw
        return {"status": resp.status, "headers": dict(resp.headers), "body": parsed}


# ---------------------------------------------------------------------------
# control-flow nodes
# ---------------------------------------------------------------------------
def _code(params: dict[str, Any], ctx: ExecContext) -> Any:
    namespace: dict[str, Any] = {
        "outputs": ctx.outputs,
        "input": ctx.flow_input,
        "json": json,
    }
    exec(str(params.get("source", "")), namespace)
    return namespace.get(params.get("var", "result"))


def _if(params: dict[str, Any], ctx: ExecContext) -> bool:
    condition = str(params.get("condition", ""))
    return _eval_condition(condition)


def _eval_condition(condition: str) -> bool:
    lowered = condition.strip().lower()
    if lowered in ("true", "1", "yes", "on"):
        return True
    if lowered in ("false", "0", "no", "off", ""):
        return False
    return bool(eval(condition, {"__builtins__": {}}, {}))


async def _delay(params: dict[str, Any], ctx: ExecContext) -> Any:
    await asyncio.sleep(float(params.get("seconds", 1)))
    return None


# ---------------------------------------------------------------------------
# voice nodes
# ---------------------------------------------------------------------------
def _voice_tts(params: dict[str, Any], ctx: ExecContext) -> bytes:
    if ctx.tts is None:
        from ..voice.tts import PiperTTS

        ctx.tts = PiperTTS()
    wav = ctx.tts.synthesize(str(params.get("text", "")))
    if params.get("play"):
        ctx.tts.play(wav)
    return wav


def _voice_stt(params: dict[str, Any], ctx: ExecContext) -> str:
    from ..voice.stt import Transcriber

    return Transcriber().transcribe_file(str(params.get("file", "")))


# ---------------------------------------------------------------------------
# ui / jcode nodes
# ---------------------------------------------------------------------------
def _notify_ui(params: dict[str, Any], ctx: ExecContext) -> None:
    ctx.emit(
        "ui.card",
        title=str(params.get("title", "")),
        message=str(params.get("message", "")),
    )


def _jcode_run(params: dict[str, Any], ctx: ExecContext) -> dict:
    from ..jcode import JcodeClient

    task = str(params.get("task", ""))
    if not task:
        raise RuntimeError("jcode.run requires a task")
    client = JcodeClient()
    result = client.run_task(task, cwd=params.get("cwd"))
    return result.to_dict()


NODES: dict[str, Any] = {
    "trigger.cron": _trigger_pass,
    "trigger.manual": _trigger_pass,
    "trigger.webhook": _trigger_pass,
    "trigger.voice": _trigger_pass,
    "agent.langgraph": _agent_langgraph,
    "memory.recall": _memory_recall,
    "memory.remember": _memory_remember,
    "llm": _llm,
    "obsidian.read": _obsidian_read,
    "obsidian.write": _obsidian_write,
    "http": _http,
    "code": _code,
    "if": _if,
    "delay": _delay,
    "voice.tts": _voice_tts,
    "voice.stt": _voice_stt,
    "notify.ui": _notify_ui,
    "jcode.run": _jcode_run,
}


def is_async(node_type: str) -> bool:
    return asyncio.iscoroutinefunction(NODES[node_type])
