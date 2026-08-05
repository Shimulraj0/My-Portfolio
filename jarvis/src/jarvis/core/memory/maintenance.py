"""Post-retrieval maintenance (jcode: "opportunistic maintenance").

After the memory agent serves memories to the main agent, it has valuable
context for background maintenance — link discovery, confidence boost/decay,
gap detection and tag inference — all non-blocking.
"""
from __future__ import annotations

import logging
from dataclasses import dataclass, field
from typing import Optional

from .embeddings import cosine_similarity
from .graph import EdgeKind, MemoryGraph
from .schema import MemoryEntry, now_utc

log = logging.getLogger("jarvis.memory.maintenance")

VERIFIED_LINK_BOOST = 0.05
REJECTED_DECAY = 0.02
LINK_MIN_SIMILARITY = 0.6


@dataclass
class RetrievalContext:
    query_embedding: list[float]
    query_text: str
    verified_memories: list[MemoryEntry] = field(default_factory=list)
    rejected_memories: list[MemoryEntry] = field(default_factory=list)
    initial_hits: int = 0


class MaintenanceAgent:
    """Runs background maintenance tasks after a retrieval."""

    def __init__(self, graph: MemoryGraph):
        self.graph = graph

    def run(self, ctx: RetrievalContext) -> None:
        """Run all maintenance tasks. Never raises; logs instead."""
        try:
            if len(ctx.verified_memories) >= 2:
                self.discover_links(ctx.verified_memories)
            for mem in ctx.verified_memories:
                self.boost_confidence(mem)
            for mem in ctx.rejected_memories:
                self.decay_confidence(mem, REJECTED_DECAY)
            if not ctx.verified_memories and ctx.initial_hits > 0:
                self.log_gap(ctx)
            self.infer_tags(ctx)
        except Exception:  # pragma: no cover - maintenance must never block
            log.exception("memory maintenance failed")

    def discover_links(self, verified: list[MemoryEntry]) -> None:
        """Strengthen RelatesTo edges between co-relevant memories."""
        for i in range(len(verified)):
            for j in range(i + 1, len(verified)):
                a, b = verified[i], verified[j]
                sim = cosine_similarity(
                    a.embedding or self.graph.embedder.embed(a.content),
                    b.embedding or self.graph.embedder.embed(b.content),
                )
                if sim >= LINK_MIN_SIMILARITY:
                    self.graph.add_edge(a.id, b.id, EdgeKind.RELATES_TO, sim)

    def boost_confidence(self, mem: MemoryEntry) -> None:
        mem.on_used(helpful=True)

    def decay_confidence(self, mem: MemoryEntry, amount: float) -> None:
        mem.access_count += 1
        mem.last_accessed = now_utc()
        mem.confidence = max(0.0, mem.confidence - amount)
        mem.updated_at = now_utc()

    def log_gap(self, ctx: RetrievalContext) -> None:
        """Context produced hits but none were verified — potential memory gap."""
        log.info("memory gap: query %r produced no verified memories", ctx.query_text)

    def infer_tags(self, ctx: RetrievalContext) -> None:
        """Infer a shared tag from multiple verified memories, if none exists."""
        verified = ctx.verified_memories
        if len(verified) < 2:
            return
        common = set(verified[0].tags)
        for mem in verified[1:]:
            common &= set(mem.tags)
        if not common and ctx.query_text.strip():
            inferred = f"topic:{_slug(ctx.query_text)}"
            for mem in verified:
                if inferred not in mem.tags:
                    mem.tags.append(inferred)
                    mem.updated_at = now_utc()


def _slug(text: str) -> str:
    keep = "".join(c if c.isalnum() else "-" for c in text.lower().strip())
    return keep.strip("-")[:40] or "unknown"
