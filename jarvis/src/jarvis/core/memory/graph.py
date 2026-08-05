"""In-memory memory graph with cascade retrieval.

Implements jcode's graph-based memory model:

- Nodes: Memory, Tag, Cluster, Note
- Edges: HasTag, InCluster, RelatesTo (weighted), Supersedes, Contradicts,
  DerivedFrom, References
- Retrieval: embedding similarity search seeds the traversal, then a BFS
  walks typed edges with per-edge weight and depth decay (cascade retrieval).
"""
from __future__ import annotations

import math
from collections import deque
from dataclasses import dataclass, field
from typing import Any, Iterable, Optional

from .embeddings import Embedder, HashEmbedder, cosine_similarity
from .schema import (
    CONFLICT_SIMILARITY,
    EDGE_DECAY,
    EDGE_WEIGHTS,
    MAX_DEPTH,
    MAX_INITIAL_HITS,
    MAX_RESULTS,
    SIMILARITY_THRESHOLD,
    Cluster,
    EdgeKind,
    MemoryEntry,
    MemoryType,
    NoteRef,
    Provenance,
    Scope,
    Tag,
    now_utc,
)


@dataclass
class GraphNode:
    id: str
    kind: str  # "memory" | "tag" | "cluster" | "note"
    data: Optional[Any] = None
    embedding: Optional[list[float]] = None


@dataclass
class GraphEdge:
    source: str
    target: str
    kind: EdgeKind
    weight: float = 1.0

    def to_dict(self) -> dict[str, Any]:
        return {
            "source": self.source,
            "target": self.target,
            "kind": self.kind.value,
            "weight": round(self.weight, 4),
        }


class MemoryGraph:
    """A directed graph of memories, tags, clusters and notes."""

    def __init__(
        self,
        embedder: Optional[Embedder] = None,
        similarity_threshold: float = SIMILARITY_THRESHOLD,
        max_initial_hits: int = MAX_INITIAL_HITS,
        max_depth: int = MAX_DEPTH,
        max_results: int = MAX_RESULTS,
        edge_decay: float = EDGE_DECAY,
    ):
        self.embedder: Embedder = embedder or HashEmbedder()
        self.similarity_threshold = similarity_threshold
        self.max_initial_hits = max_initial_hits
        self.max_depth = max_depth
        self.max_results = max_results
        self.edge_decay = edge_decay

        self.nodes: dict[str, GraphNode] = {}
        self.edges: list[GraphEdge] = []
        self._out: dict[str, list[GraphEdge]] = {}

        # indexes
        self._memory_ids: set[str] = set()
        self._tag_ids: dict[str, str] = {}  # tag name -> node id
        self._note_ids: dict[str, str] = {}  # note id -> node id

    # ------------------------------------------------------------------
    # Node creation
    # ------------------------------------------------------------------
    def add_memory(self, entry: MemoryEntry) -> str:
        if entry.id in self.nodes:
            self.nodes[entry.id].data = entry
        else:
            self.nodes[entry.id] = GraphNode(id=entry.id, kind="memory", data=entry)
            self._memory_ids.add(entry.id)
        if entry.embedding is None and entry.content:
            entry.embedding = self.embedder.embed(entry.content)
        self.nodes[entry.id].embedding = entry.embedding

        for tag_name in entry.tags:
            tag_id = self.upsert_tag(Tag(name=tag_name))
            self.add_edge(entry.id, tag_id, EdgeKind.HAS_TAG)
        return entry.id

    def upsert_tag(self, tag: Tag) -> str:
        if tag.name in self._tag_ids:
            node_id = self._tag_ids[tag.name]
            existing = self.nodes[node_id].data
            if isinstance(existing, Tag):
                existing.count = tag.count
            return node_id
        node_id = f"tag:{tag.name}"
        self._tag_ids[tag.name] = node_id
        self.nodes[node_id] = GraphNode(id=node_id, kind="tag", data=tag)
        return node_id

    def add_cluster(self, cluster: Cluster) -> str:
        if cluster.id in self.nodes:
            self.nodes[cluster.id].data = cluster
        else:
            self.nodes[cluster.id] = GraphNode(id=cluster.id, kind="cluster", data=cluster)
        if cluster.centroid is not None:
            self.nodes[cluster.id].embedding = cluster.centroid
        return cluster.id

    def add_note(self, note: NoteRef) -> str:
        if note.id in self.nodes and self.nodes[note.id].kind == "memory":
            node_id = note.id  # backing note of a memory: reuse the memory node
        elif note.id in self._note_ids:
            node_id = self._note_ids[note.id]
        else:
            node_id = note.id
            self._note_ids[note.id] = node_id
            self.nodes[node_id] = GraphNode(id=node_id, kind="note", data=note)
        for target in note.wikilinks:
            self.add_edge(node_id, f"note:{target}", EdgeKind.REFERENCES)
        return node_id

    # ------------------------------------------------------------------
    # Edges
    # ------------------------------------------------------------------
    def add_edge(
        self,
        source: str,
        target: str,
        kind: EdgeKind,
        weight: Optional[float] = None,
    ) -> GraphEdge:
        if source not in self.nodes:
            self.nodes[source] = GraphNode(id=source, kind="unknown")
        if target not in self.nodes:
            self.nodes[target] = GraphNode(id=target, kind="unknown")
        w = weight if weight is not None else EDGE_WEIGHTS.get(kind, 0.5)
        edge = GraphEdge(source=source, target=target, kind=kind, weight=w)
        self.edges.append(edge)
        self._out.setdefault(source, []).append(edge)
        return edge

    def relate(self, a: str, b: str, weight: float = 0.7) -> None:
        """Create a weighted semantic link between two memory ids."""
        self.add_edge(a, b, EdgeKind.RELATES_TO, weight)

    def out_edges(self, node_id: str) -> list[GraphEdge]:
        return list(self._out.get(node_id, []))

    def memories(self) -> Iterable[MemoryEntry]:
        for node_id in self._memory_ids:
            node = self.nodes[node_id]
            if isinstance(node.data, MemoryEntry):
                yield node.data

    def get_memory(self, memory_id: str) -> Optional[MemoryEntry]:
        node = self.nodes.get(memory_id)
        if node is not None and isinstance(node.data, MemoryEntry):
            return node.data
        return None

    def active_memories(self) -> list[MemoryEntry]:
        return [m for m in self.memories() if m.active]

    # ------------------------------------------------------------------
    # Supersede / conflict handling
    # ------------------------------------------------------------------
    def supersede(self, old_id: str, new_id: str) -> None:
        """Mark ``old`` inactive and record a Supersedes edge old -> new."""
        old = self.get_memory(old_id)
        new = self.get_memory(new_id)
        if old is not None and new is not None:
            old.active = False
            old.superseded_by = new_id
            old.updated_at = now_utc()
        self.add_edge(old_id, new_id, EdgeKind.SUPERSEDES)

    def detect_conflicts(self, entry: MemoryEntry) -> list[MemoryEntry]:
        """Find active memories that contradict a new entry (near-duplicates)."""
        if entry.embedding is None:
            entry.embedding = self.embedder.embed(entry.content)
        conflicts: list[MemoryEntry] = []
        for mem in self.active_memories():
            if mem.id == entry.id:
                continue
            if mem.embedding is None:
                mem.embedding = self.embedder.embed(mem.content)
            sim = cosine_similarity(entry.embedding, mem.embedding)
            if sim >= CONFLICT_SIMILARITY:
                conflicts.append(mem)
                self.add_edge(entry.id, mem.id, EdgeKind.CONTRADICTS, sim)
        return conflicts

    # ------------------------------------------------------------------
    # Retrieval
    # ------------------------------------------------------------------
    def similarity_search(
        self,
        query_embedding: list[float],
        k: Optional[int] = None,
        threshold: Optional[float] = None,
    ) -> list[tuple[str, float]]:
        """Top-k memory nodes by embedding cosine similarity."""
        k = k or self.max_initial_hits
        threshold = threshold if threshold is not None else self.similarity_threshold
        scored: list[tuple[str, float]] = []
        for mem in self.active_memories():
            emb = mem.embedding
            if emb is None:
                emb = self.embedder.embed(mem.content)
            score = cosine_similarity(query_embedding, emb)
            if score >= threshold:
                scored.append((mem.id, score))
        scored.sort(key=lambda t: t[1], reverse=True)
        return scored[:k]

    def cascade_retrieve(
        self,
        query_text: Optional[str] = None,
        query_embedding: Optional[list[float]] = None,
        max_results: Optional[int] = None,
        max_initial_hits: Optional[int] = None,
        max_depth: Optional[int] = None,
    ) -> list[tuple[MemoryEntry, float]]:
        """Cascade retrieval: embedding hits seed a BFS over typed edges.

        Scores decay with traversal depth (jcode: ``edge_weight * 0.7^depth``).
        """
        emb = query_embedding
        if emb is None and query_text is not None:
            emb = self.embedder.embed(query_text)
        if emb is None:
            return []

        max_results = max_results or self.max_results
        max_depth = max_depth or self.max_depth
        initial_hits = self.similarity_search(emb, k=max_initial_hits or self.max_initial_hits)
        visited: set[str] = set()
        candidates: list[tuple[str, float, int]] = []
        queue: deque[tuple[str, int]] = deque()

        for node_id, score in initial_hits:
            queue.append((node_id, 0))
            candidates.append((node_id, score, 0))

        while queue:
            node_id, depth = queue.popleft()
            if depth >= self.max_depth or node_id in visited:
                continue
            visited.add(node_id)
            for edge in self.out_edges(node_id):
                neighbor = edge.target
                if neighbor in visited:
                    continue
                decayed = edge.weight * (self.edge_decay ** (depth + 1))
                if neighbor in self._memory_ids:
                    candidates.append((neighbor, decayed, depth + 1))
                queue.append((neighbor, depth + 1))

        # Dedupe keeping the best score, then rank with decay + recency.
        best: dict[str, float] = {}
        for node_id, score, _ in candidates:
            best[node_id] = max(best.get(node_id, 0.0), score)
        ranked: list[tuple[str, float]] = sorted(
            best.items(), key=lambda t: t[1], reverse=True
        )

        results: list[tuple[MemoryEntry, float]] = []
        for node_id, score in ranked:
            mem = self.get_memory(node_id)
            if mem is None or not mem.active:
                continue
            boost = mem.recency_boost()
            results.append((mem, score * boost))
        results.sort(key=lambda t: t[1], reverse=True)
        return results[: self.max_results]

    # ------------------------------------------------------------------
    # Diagnostics
    # ------------------------------------------------------------------
    def to_dict(self) -> dict[str, Any]:
        return {
            "nodes": [
                {"id": n.id, "kind": n.kind, "data": _node_data(n.data)}
                for n in self.nodes.values()
            ],
            "edges": [e.to_dict() for e in self.edges],
        }


def _node_data(data: Any) -> Any:
    if isinstance(data, (MemoryEntry, Tag, Cluster, NoteRef)):
        return data.to_dict()
    return None
