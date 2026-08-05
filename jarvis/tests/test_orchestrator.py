"""P2 exit criteria: /api/chat streams agent steps; memory injected into context.

Covers: intent routing, memory write/recall through the LangGraph orchestrator,
Obsidian note search/create via the orchestrator, event bus emission, and
persistence round-trip through an agent turn.
"""
from __future__ import annotations

from pathlib import Path

import pytest

from jarvis.core.agents import (
    AgentContext,
    Jarvis,
    classify,
)
from jarvis.core.events import EventBus
from jarvis.core.memory import HashEmbedder, MemoryGraph, MemoryStore
from jarvis.core.memory.obsidian import MemoryVault, Vault


@pytest.fixture
def ctx(tmp_path: Path):
    graph = MemoryGraph(embedder=HashEmbedder())
    vault = Vault(tmp_path / "vault")
    mv = MemoryVault(vault)
    store = MemoryStore(tmp_path / "mem.db")
    bus = EventBus()
    ctx = AgentContext(graph=graph, vault=mv, store=store, event_bus=bus)
    return ctx, graph, bus, store


class TestClassify:
    def test_write_intents(self):
        assert classify("remember that I love coffee") == "memory_write"
        assert classify("don't forget my birthday") == "memory_write"

    def test_recall_intents(self):
        assert classify("what do you know about Shimul?") == "memory_recall"
        assert classify("recall the deployment steps") == "memory_recall"

    def test_obsidian_intents(self):
        assert classify("find a note about jcode") == "obsidian"
        assert classify("create a note: JARVIS ideas") == "obsidian"

    def test_default_intent(self):
        assert classify("hello jarvis") == "respond"


class TestOrchestrator:
    def test_remember_then_recall(self, ctx):
        agent_ctx, graph, bus, store = ctx
        jarvis = Jarvis(agent_ctx)
        out = jarvis.run("remember that the vault sync runs at midnight")
        assert out["intent"] == "memory_write"
        assert "I remembered" in out["reply"]
        assert len(list(graph.memories())) == 1

        out2 = jarvis.run("what do you know about the vault sync?")
        assert out2["intent"] == "memory_recall"
        assert "vault sync runs at midnight" in out2["reply"]

    def test_memory_persisted_to_store(self, ctx):
        agent_ctx, graph, bus, store = ctx
        jarvis = Jarvis(agent_ctx)
        jarvis.run("remember that the project uses LangGraph")
        jarvis.run("remember that the project uses Obsidian")
        store2 = MemoryStore(store.path)
        loaded = store2.load_graph(embedder=HashEmbedder())
        assert len(list(loaded.memories())) == 2
        store2.close()

    def test_obsidian_note_create_and_search(self, ctx):
        agent_ctx, graph, bus, store = ctx
        jarvis = Jarvis(agent_ctx)
        out = jarvis.run("create a note: JARVIS roadmap")
        assert out["intent"] == "obsidian"
        assert "Created note" in out["reply"]
        assert (Path(agent_ctx.vault.vault.root) / "JARVIS roadmap.md").exists()

        out2 = jarvis.run("find a note about roadmap")
        assert out2["intent"] == "obsidian"
        assert "JARVIS roadmap" in out2["reply"]

    def test_events_emitted_during_run(self, ctx):
        agent_ctx, graph, bus, store = ctx
        jarvis = Jarvis(agent_ctx)
        jarvis.run("remember that Shimul likes Flutter")
        events = bus.drain()
        types = {e["type"] for e in events}
        assert "agent.running" in types
        assert "memory.stored" in types
        assert "agent.completed" in types

    def test_async_stream_yields_updates(self, ctx):
        import asyncio

        agent_ctx, graph, bus, store = ctx
        jarvis = Jarvis(agent_ctx)

        async def collect():
            updates = []
            async for update in jarvis.astream("remember that I use Windows"):
                updates.append(update)
            return updates

        updates = asyncio.run(collect())
        assert updates
        assert "router" in updates[0]
