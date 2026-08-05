"""LangGraph orchestrator — routes intent to specialized agents.

State graph:

    START -> router -> { memory_write | memory_recall | obsidian | respond } -> END

Nodes emit execution events to the EventBus (agent.running / agent.step /
agent.completed) so the UI can animate J.A.R.V.I.S "thinking" and acting.
A pluggable ``ChatProvider`` supplies the actual language model; a rule-based
responder is used for offline tests and when no LLM is configured.
"""
from __future__ import annotations

import asyncio
import logging
from dataclasses import dataclass
from typing import Any, Callable, Optional, Protocol, TypedDict

from langchain_core.messages import AIMessage, BaseMessage, HumanMessage
from langgraph.graph import END, START, StateGraph
from langgraph.graph.message import add_messages
from typing_extensions import Annotated

from ..events import EventBus
from ..memory.maintenance import MaintenanceAgent, RetrievalContext
from .tools import AgentContext, note_search, note_write, recall, remember

log = logging.getLogger("jarvis.agents.orchestrator")

Intent = str
INTENT_MEMORY_WRITE = "memory_write"
INTENT_MEMORY_RECALL = "memory_recall"
INTENT_OBSIDIAN = "obsidian"
INTENT_RESPOND = "respond"


class JarvisState(TypedDict):
    messages: Annotated[list[BaseMessage], add_messages]
    intent: Intent
    memory_context: list[dict[str, Any]]
    notes: list[dict[str, Any]]
    reply: str


def empty_state(messages: list[BaseMessage]) -> dict[str, Any]:
    return {"messages": messages, "intent": "", "memory_context": [], "notes": [], "reply": ""}


class ChatProvider(Protocol):
    """Something that turns a conversation into assistant text."""

    def respond(
        self, messages: list[BaseMessage], memory_context: list[dict[str, Any]], notes: list[dict]
    ) -> str: ...


@dataclass
class RuleResponder:
    """Offline responder: echoes tool results in plain language."""

    def respond(
        self,
        messages: list[BaseMessage],
        memory_context: list[dict[str, Any]],
        notes: list[dict],
    ) -> str:
        last = messages[-1].content if messages else ""
        return _rule_reply(str(last), memory_context, notes)


# ---------------------------------------------------------------------------
# Intent classification (keyword-based; LLM router is a later upgrade)
# ---------------------------------------------------------------------------
WRITE_MARKERS = ("remember", "don't forget", "do not forget", "note that", "store this")
RECALL_MARKERS = ("what do you know", "recall", "remember about", "do you know", "who is", "what is")
OBSIDIAN_MARKERS = ("note", "obsidian", "vault", "write a note", "create a note", "find a note")


def classify(message: str) -> Intent:
    text = message.lower()
    if any(m in text for m in WRITE_MARKERS):
        return INTENT_MEMORY_WRITE
    if any(m in text for m in RECALL_MARKERS):
        return INTENT_MEMORY_RECALL
    if any(m in text for m in OBSIDIAN_MARKERS):
        return INTENT_OBSIDIAN
    return INTENT_RESPOND


# ---------------------------------------------------------------------------
# Nodes
# ---------------------------------------------------------------------------
class JarvisGraphBuilder:
    def __init__(
        self,
        ctx: AgentContext,
        chat_provider: Optional[ChatProvider] = None,
    ):
        self.ctx = ctx
        self.chat_provider = chat_provider or RuleResponder()
        self.bus = ctx.event_bus

    def build(self):
        g = StateGraph(JarvisState)

        g.add_node("router", self._router)
        g.add_node("memory_write", self._memory_write)
        g.add_node("memory_recall", self._memory_recall)
        g.add_node("obsidian", self._obsidian)
        g.add_node("respond", self._respond)

        g.add_edge(START, "router")
        g.add_conditional_edges(
            "router",
            lambda s: s["intent"],
            {
                INTENT_MEMORY_WRITE: "memory_write",
                INTENT_MEMORY_RECALL: "memory_recall",
                INTENT_OBSIDIAN: "obsidian",
                INTENT_RESPOND: "respond",
            },
        )
        for leaf in (
            "memory_write",
            "memory_recall",
            "obsidian",
            "respond",
        ):
            g.add_edge(leaf, END)
        return g.compile()

    # -- node implementations --------------------------------------------
    def _router(self, state: JarvisState) -> dict[str, Any]:
        last = state["messages"][-1].content if state["messages"] else ""
        return {"intent": classify(str(last))}

    def _memory_write(self, state: JarvisState) -> dict[str, Any]:
        self._running("memory")
        last = str(state["messages"][-1].content)
        content = _strip_marker(last)
        entry = remember(content, self.ctx)
        self._step("memory", f"Stored memory: {entry.content}")
        related = recall(content, self.ctx, k=3)
        if self.ctx.event_bus:
            self.ctx.event_bus.agent_done("memory", entry.content)
        return {
            "memory_context": [m.to_dict() for m, _ in related],
            "reply": f"Got it. I remembered: {entry.content}",
        }

    def _memory_recall(self, state: JarvisState) -> dict[str, Any]:
        self._running("memory")
        last = str(state["messages"][-1].content)
        query = _strip_marker(last)
        results = recall(query, self.ctx, k=5)
        memory_context = [m.to_dict() for m, _ in results]
        if results:
            maintenance = MaintenanceAgent(self.ctx.graph)
            maintenance.run(
                RetrievalContext(
                    query_embedding=self.ctx.graph.embedder.embed(query),
                    query_text=query,
                    verified_memories=[m for m, _ in results],
                    initial_hits=len(results),
                )
            )
        if self.ctx.event_bus:
            self.ctx.event_bus.agent_done("memory", f"{len(results)} memories recalled")
        return {
            "memory_context": memory_context,
            "reply": _format_recall(results) if results else "I don't have anything on that yet.",
        }

    def _obsidian(self, state: JarvisState) -> dict[str, Any]:
        self._running("obsidian")
        last = str(state["messages"][-1].content)
        notes: list[dict] = []
        reply = "No vault configured."
        try:
            if "write a note" in last.lower() or "create a note" in last.lower():
                title, _, body = last.partition(":")[2].partition("body=") if ":" in last else ("note", "", last)
                # "write a note: Title" / "create a note: Title: body"
                if "write a note:" in last.lower() or "create a note:" in last.lower():
                    rest = last.split(":", 1)[1].strip()
                    title, _, body = rest.partition(":")
                    path = note_write(title.strip(), body.strip(), self.ctx)
                    reply = f"Created note {title} at {path}"
            else:
                notes = note_search(_strip_marker(last), self.ctx)
                reply = _format_notes(notes) if notes else "No matching notes found."
        except Exception as exc:  # pragma: no cover
            log.exception("obsidian node failed")
            reply = f"Obsidian error: {exc}"
        if self.ctx.event_bus:
            self.ctx.event_bus.agent_done("obsidian", reply)
        return {"notes": notes, "reply": reply}

    def _respond(self, state: JarvisState) -> dict[str, Any]:
        self._running("assistant")
        reply = self.chat_provider.respond(
            state["messages"], state["memory_context"], state["notes"]
        )
        if self.ctx.event_bus:
            self.ctx.event_bus.agent_done("assistant", reply)
        return {"reply": reply}

    # -- event helpers ---------------------------------------------------
    def _running(self, agent: str) -> None:
        if self.bus:
            self.bus.agent_running(agent)

    def _step(self, agent: str, message: str) -> None:
        if self.bus:
            self.bus.agent_step(agent, message)


class Jarvis:
    """High-level facade over the compiled LangGraph."""

    def __init__(
        self,
        ctx: AgentContext,
        chat_provider: Optional[ChatProvider] = None,
        voice: Optional[Any] = None,
    ):
        self.ctx = ctx
        self.voice = voice
        self.builder = JarvisGraphBuilder(ctx, chat_provider)
        self.graph = self.builder.build()

    def run(self, message: str) -> dict[str, Any]:
        """Synchronous single-turn run; returns the final state."""
        state = empty_state([HumanMessage(content=message)])
        result = self.graph.invoke(state)
        if self.voice is not None and result.get("reply"):
            self.voice.speak(result["reply"])
        return result

    async def astream(self, message: str) -> Any:
        """Async stream of per-node updates (for SSE/WebSocket fan-out)."""
        state = empty_state([HumanMessage(content=message)])
        async for update in self.graph.astream(state, stream_mode="updates"):
            yield update


# ---------------------------------------------------------------------------
# reply formatting helpers
# ---------------------------------------------------------------------------
_CONNECTIVES = (
    "about", "that", "the", "a", "an", "of", "my", "me", "on", "for",
    "what", "is", "are", "were", "to", "i", "you",
)


def _strip_marker(text: str) -> str:
    """Strip a leading intent marker phrase and connective words.

    ``"remember that the vault sync runs at midnight"`` -> ``"vault sync runs
    at midnight"``. Content words (like ``vault``) are never touched.
    """
    text = text.strip()
    lowered = text.lower()
    for marker in sorted(
        WRITE_MARKERS + RECALL_MARKERS + OBSIDIAN_MARKERS, key=len, reverse=True
    ):
        if lowered.startswith(marker):
            text = text[len(marker):].strip(" .,:;")
            break
    while True:
        parts = text.split(" ", 1)
        if parts and parts[0].strip(" .,:;?").lower() in _CONNECTIVES:
            text = " ".join(parts[1:]).strip(" .,:;")
            continue
        break
    return text.strip(" .,:;?")


def _format_recall(results: list[tuple[Any, float]]) -> str:
    lines = []
    for mem, score in results:
        kind = mem.memory_type.value
        lines.append(f"- [{kind}] {mem.content} ({score:.2f})")
    return "Here's what I remember:\n" + "\n".join(lines)


def _format_notes(notes: list[dict]) -> str:
    return "Found notes:\n" + "\n".join(f"- {n['title']} ({n['path']})" for n in notes)


def _rule_reply(
    message: str, memory_context: list[dict[str, Any]], notes: list[dict]
) -> str:
    if memory_context:
        lines = [f"- {m['content']}" for m in memory_context[:3]]
        return "Based on what I know:\n" + "\n".join(lines)
    if notes:
        return "I found these notes: " + ", ".join(n["title"] for n in notes[:3])
    return "I'm here. I can remember things, search Obsidian notes, run automations, or just chat."
