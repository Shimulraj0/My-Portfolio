"""P0 exit criteria: memory graph protocol core behaves correctly.

Covers: node/edge schema, cascade retrieval (embedding seeds + BFS), supersede,
conflict detection, confidence decay/recency, feedback loop, and SQLite
round-trip persistence.
"""
from __future__ import annotations

import tempfile
from datetime import datetime, timedelta, timezone
from pathlib import Path

import pytest

from jarvis.core.memory import (
    EdgeKind,
    HashEmbedder,
    MemoryEntry,
    MemoryGraph,
    MemoryStore,
    MemoryType,
    Provenance,
    Scope,
)


def mem(content: str, **kw) -> MemoryEntry:
    defaults = dict(memory_type=MemoryType.FACT, provenance=Provenance.USER_STATED)
    defaults.update(kw)
    return MemoryEntry(content=content, **defaults)


def graph_with(*entries, threshold: float = 0.4) -> MemoryGraph:
    g = MemoryGraph(embedder=HashEmbedder(), similarity_threshold=threshold)
    for e in entries:
        g.add_memory(e)
    return g


# ---------------------------------------------------------------------------
# Storage & recall
# ---------------------------------------------------------------------------
class TestRecall:
    def test_recall_returns_most_similar(self):
        g = graph_with(mem("I love coffee"), mem("I prefer tea"), mem("My name is Shimul"))
        results = g.cascade_retrieve(query_text="coffee lover")
        assert results
        top, _ = results[0]
        assert top.content == "I love coffee"

    def test_recall_returns_nothing_when_below_threshold(self):
        g = graph_with(mem("quantum entanglement dynamics"))
        results = g.cascade_retrieve(query_text="pizza topping preferences")
        assert results == []


# ---------------------------------------------------------------------------
# Cascade retrieval: BFS over edges
# ---------------------------------------------------------------------------
class TestCascadeRetrieval:
    def test_bfs_follows_relates_to(self):
        g = MemoryGraph(embedder=HashEmbedder())
        a = mem("User works at Sparktech Agency", tags=["project:sparktech"])
        b = mem("Deploy uses Cloudflare Workers", tags=["project:sparktech"])
        c = mem("Cloudflare KV namespace is called VISITS")
        g.add_memory(a)
        g.add_memory(b)
        g.add_memory(c)
        g.relate(b.id, c.id, weight=0.9)  # c is only reachable via b

        results = g.cascade_retrieve(query_text="deploy cloudflare")
        ids = [m.id for m, _ in results]
        assert b.id in ids
        assert c.id in ids  # pulled in via BFS, not direct similarity

    def test_edge_decay_prefers_direct_hits(self):
        g = MemoryGraph(embedder=HashEmbedder())
        a = mem("planning a trip to Bangladesh")
        b = mem("Dhaka is the capital of Bangladesh")
        c = mem("Shimul lives in Dhaka")
        g.add_memory(a)
        g.add_memory(b)
        g.add_memory(c)
        g.relate(b.id, c.id, weight=0.8)

        results = g.cascade_retrieve(query_text="Dhaka capital")
        ids = [m.id for m, _ in results]
        # direct similarity hit ranked above the BFS-only neighbor
        assert ids.index(b.id) < ids.index(c.id)

    def test_active_only_surfaced(self):
        g = MemoryGraph(embedder=HashEmbedder())
        a = mem("old fact about API version 1")
        b = mem("old fact about API version 1")  # duplicate content
        g.add_memory(a)
        g.add_memory(b)
        g.supersede(a.id, b.id)
        results = g.cascade_retrieve(query_text="API version")
        ids = [m.id for m, _ in results]
        assert b.id in ids
        assert a.id not in ids
        assert a.active is False
        assert a.superseded_by == b.id


# ---------------------------------------------------------------------------
# Supersede & conflict detection
# ---------------------------------------------------------------------------
class TestLifecycle:
    def test_supersede_marks_old_inactive(self):
        g = MemoryGraph(embedder=HashEmbedder())
        a = mem("User's phone is +88015")
        b = mem("User's phone is +8801575204054")
        g.add_memory(a)
        g.add_memory(b)
        g.supersede(a.id, b.id)
        assert g.get_memory(a.id).active is False
        edge = g.out_edges(a.id)
        assert any(e.kind is EdgeKind.SUPERSEDES for e in edge)

    def test_detect_conflicts_creates_contradicts_edge(self):
        g = MemoryGraph(embedder=HashEmbedder())
        a = mem("user prefers VS Code")
        b = mem("user prefers IntelliJ")
        g.add_memory(a)
        g.add_memory(b)
        new = mem("user prefers VS Code")
        conflicts = g.detect_conflicts(new)
        assert len(conflicts) == 1
        assert conflicts[0].id == a.id
        # the *new* entry contradicts the existing conflicting memory
        assert any(
            e.kind is EdgeKind.CONTRADICTS and e.target == a.id for e in g.out_edges(new.id)
        )


# ---------------------------------------------------------------------------
# Confidence decay / recency / feedback
# ---------------------------------------------------------------------------
class TestConfidence:
    def test_confidence_decays_over_time(self):
        entry = mem("project uses PostgreSQL", memory_type=MemoryType.FACT, confidence=1.0)
        entry.created_at = (datetime.now(timezone.utc) - timedelta(days=30)).isoformat()
        assert entry.decayed_confidence() < 0.9

    def test_preference_decays_slower_than_fact(self):
        now = datetime.now(timezone.utc)
        fact = mem("project uses PostgreSQL", memory_type=MemoryType.FACT, confidence=1.0)
        pref = mem("user likes dark theme", memory_type=MemoryType.PREFERENCE, confidence=1.0)
        fact.created_at = (now - timedelta(days=60)).isoformat()
        pref.created_at = (now - timedelta(days=60)).isoformat()
        assert pref.decayed_confidence(now) > fact.decayed_confidence(now)

    def test_inferred_half_life_is_short(self):
        now = datetime.now(timezone.utc)
        inferred = mem(
            "guessing user likes blue",
            memory_type=MemoryType.PREFERENCE,
            provenance=Provenance.INFERRED,
            confidence=1.0,
        )
        inferred.created_at = (now - timedelta(days=10)).isoformat()
        assert inferred.decayed_confidence(now) < 0.5

    def test_on_used_strengthens(self):
        entry = mem("memory that gets used a lot")
        c0 = entry.confidence
        s0 = entry.strength
        entry.on_used(helpful=True)
        assert entry.strength == s0 + 1
        assert entry.confidence > c0
        assert entry.access_count == 1

    def test_recency_boost(self):
        entry = mem("recently accessed")
        fresh = entry.recency_boost()
        entry.last_accessed = (datetime.now(timezone.utc) - timedelta(days=10)).isoformat()
        stale = entry.recency_boost()
        assert fresh > stale


# ---------------------------------------------------------------------------
# Persistence round-trip
# ---------------------------------------------------------------------------
class TestPersistence:
    def test_store_round_trip_preserves_graph(self, tmp_path: Path):
        db = tmp_path / "mem.db"
        store = MemoryStore(db)
        g = MemoryGraph(embedder=HashEmbedder())
        a = mem("Shimul is a Flutter developer", tags=["#role", "#person:shimul"])
        b = mem("Shimul built TaskEase", tags=["#project:taskease", "#person:shimul"])
        g.add_memory(a)
        g.add_memory(b)
        g.relate(a.id, b.id, weight=0.9)

        for entry in g.memories():
            store.save_memory(entry)
        for edge in g.edges:
            store.save_edge(edge.kind, edge.source, edge.target, edge.weight)
        for name in {"#role", "#person:shimul", "#project:taskease"}:
            store.save_tag(__import__("jarvis.core.memory", fromlist=["Tag"]).Tag(name=name))

        loaded = store.load_graph(embedder=HashEmbedder())
        assert len(list(loaded.memories())) == 2
        ids = {m.id for m in loaded.memories()}
        assert {a.id, b.id} == ids
        results = loaded.cascade_retrieve(query_text="Flutter developer")
        assert results
        # embedding was persisted, so recall works without re-embedding
        assert all(m.embedding is not None for m in loaded.memories())
        store.close()

    def test_persistence_is_durable_across_instances(self, tmp_path: Path):
        db = tmp_path / "mem.db"
        s1 = MemoryStore(db)
        g = MemoryGraph(embedder=HashEmbedder())
        e = mem("remember to water the plants", memory_type=MemoryType.TASK)
        g.add_memory(e)
        s1.save_memory(e)
        s1.close()

        s2 = MemoryStore(db)
        g2 = s2.load_graph(embedder=HashEmbedder())
        assert [m.content for m in g2.memories()] == ["remember to water the plants"]
        s2.close()
