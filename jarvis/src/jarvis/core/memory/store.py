"""SQLite persistence for the memory graph.

Embeddings are stored as JSON blobs and similarity search runs in memory
(sqlite-vec integration is a later optimization; the protocol contract is
unchanged). Pure stdlib, no dependencies.

Thread-safe: LangGraph runs graph nodes on a worker thread, so the connection
is created with ``check_same_thread=False`` and all access is guarded by a
re-entrant lock.
"""
from __future__ import annotations

import json
import sqlite3
import threading
from pathlib import Path
from typing import Any, Optional

from .embeddings import Embedder, HashEmbedder
from .graph import EdgeKind, MemoryGraph
from .schema import Cluster, MemoryEntry, NoteRef, Tag

_SCHEMA = """
CREATE TABLE IF NOT EXISTS memories (
    id            TEXT PRIMARY KEY,
    content       TEXT NOT NULL,
    memory_type   TEXT NOT NULL,
    scope         TEXT NOT NULL,
    provenance    TEXT NOT NULL,
    confidence    REAL NOT NULL,
    strength      INTEGER NOT NULL DEFAULT 1,
    tags_json     TEXT NOT NULL DEFAULT '[]',
    note_id       TEXT,
    superseded_by TEXT,
    active        INTEGER NOT NULL DEFAULT 1,
    created_at    TEXT NOT NULL,
    updated_at    TEXT NOT NULL,
    last_accessed TEXT NOT NULL,
    access_count  INTEGER NOT NULL DEFAULT 0,
    embedding_json TEXT
);
CREATE TABLE IF NOT EXISTS tags (
    name        TEXT PRIMARY KEY,
    description TEXT NOT NULL DEFAULT '',
    count       INTEGER NOT NULL DEFAULT 0
);
CREATE TABLE IF NOT EXISTS clusters (
    id            TEXT PRIMARY KEY,
    label         TEXT NOT NULL DEFAULT '',
    centroid_json TEXT,
    member_count  INTEGER NOT NULL DEFAULT 0
);
CREATE TABLE IF NOT EXISTS notes (
    id         TEXT PRIMARY KEY,
    path       TEXT NOT NULL,
    title      TEXT NOT NULL DEFAULT '',
    links_json TEXT NOT NULL DEFAULT '[]',
    tags_json  TEXT NOT NULL DEFAULT '[]'
);
CREATE TABLE IF NOT EXISTS edges (
    source TEXT NOT NULL,
    target TEXT NOT NULL,
    kind   TEXT NOT NULL,
    weight REAL NOT NULL DEFAULT 1.0,
    PRIMARY KEY (source, target, kind)
);
"""


class MemoryStore:
    """Persists MemoryEntries, tags, clusters, notes and edges to SQLite."""

    def __init__(self, path: str | Path):
        self.path = str(path)
        Path(self.path).parent.mkdir(parents=True, exist_ok=True)
        self._conn = sqlite3.connect(self.path, check_same_thread=False)
        self._lock = threading.RLock()
        self._conn.row_factory = sqlite3.Row
        with self._lock:
            self._conn.executescript(_SCHEMA)
            self._conn.commit()

    # ------------------------------------------------------------------
    # Locked helpers
    # ------------------------------------------------------------------
    def _execute(self, sql: str, params: tuple = ()) -> None:
        with self._lock:
            self._conn.execute(sql, params)
            self._conn.commit()

    def _query(self, sql: str, params: tuple = ()) -> list[Any]:
        with self._lock:
            return self._conn.execute(sql, params).fetchall()

    # ------------------------------------------------------------------
    # Memories
    # ------------------------------------------------------------------
    def save_memory(self, entry: MemoryEntry) -> None:
        self._execute(
            """
            INSERT INTO memories (
                id, content, memory_type, scope, provenance, confidence,
                strength, tags_json, note_id, superseded_by, active,
                created_at, updated_at, last_accessed, access_count,
                embedding_json
            ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
            ON CONFLICT(id) DO UPDATE SET
                content=excluded.content,
                memory_type=excluded.memory_type,
                scope=excluded.scope,
                provenance=excluded.provenance,
                confidence=excluded.confidence,
                strength=excluded.strength,
                tags_json=excluded.tags_json,
                note_id=excluded.note_id,
                superseded_by=excluded.superseded_by,
                active=excluded.active,
                updated_at=excluded.updated_at,
                last_accessed=excluded.last_accessed,
                access_count=excluded.access_count,
                embedding_json=excluded.embedding_json
            """,
            (
                entry.id,
                entry.content,
                entry.memory_type.value,
                entry.scope.value,
                entry.provenance.value,
                entry.confidence,
                entry.strength,
                json.dumps(entry.tags),
                entry.note_id,
                entry.superseded_by,
                1 if entry.active else 0,
                entry.created_at,
                entry.updated_at,
                entry.last_accessed,
                entry.access_count,
                json.dumps(entry.embedding) if entry.embedding else None,
            ),
        )

    def delete_memory(self, memory_id: str) -> None:
        self._execute("DELETE FROM memories WHERE id = ?", (memory_id,))
        self._execute(
            "DELETE FROM edges WHERE source = ? OR target = ?", (memory_id, memory_id)
        )

    # ------------------------------------------------------------------
    # Tags / clusters / notes / edges
    # ------------------------------------------------------------------
    def save_tag(self, tag: Tag) -> None:
        self._execute(
            """
            INSERT INTO tags (name, description, count) VALUES (?, ?, ?)
            ON CONFLICT(name) DO UPDATE SET
                description=excluded.description, count=excluded.count
            """,
            (tag.name, tag.description, tag.count),
        )

    def save_cluster(self, cluster: Cluster) -> None:
        self._execute(
            """
            INSERT INTO clusters (id, label, centroid_json, member_count)
            VALUES (?, ?, ?, ?)
            ON CONFLICT(id) DO UPDATE SET
                label=excluded.label,
                centroid_json=excluded.centroid_json,
                member_count=excluded.member_count
            """,
            (
                cluster.id,
                cluster.label,
                json.dumps(cluster.centroid) if cluster.centroid else None,
                cluster.member_count,
            ),
        )

    def save_note(self, note: NoteRef) -> None:
        self._execute(
            """
            INSERT INTO notes (id, path, title, links_json, tags_json)
            VALUES (?, ?, ?, ?, ?)
            ON CONFLICT(id) DO UPDATE SET
                path=excluded.path, title=excluded.title,
                links_json=excluded.links_json, tags_json=excluded.tags_json
            """,
            (note.id, note.path, note.title, json.dumps(note.wikilinks), json.dumps(note.tags)),
        )

    def save_edge(self, edge_kind: EdgeKind, source: str, target: str, weight: float) -> None:
        self._execute(
            """
            INSERT INTO edges (source, target, kind, weight) VALUES (?, ?, ?, ?)
            ON CONFLICT(source, target, kind) DO UPDATE SET weight=excluded.weight
            """,
            (source, target, edge_kind.value, weight),
        )

    # ------------------------------------------------------------------
    # Loading
    # ------------------------------------------------------------------
    def load_graph(self, embedder: Optional[Embedder] = None) -> MemoryGraph:
        graph = MemoryGraph(embedder=embedder or HashEmbedder())

        for row in self._query("SELECT * FROM memories"):
            entry = MemoryEntry.from_dict(
                {
                    "id": row["id"],
                    "content": row["content"],
                    "memory_type": row["memory_type"],
                    "scope": row["scope"],
                    "provenance": row["provenance"],
                    "confidence": row["confidence"],
                    "strength": row["strength"],
                    "tags": json.loads(row["tags_json"]),
                    "note_id": row["note_id"],
                    "superseded_by": row["superseded_by"],
                    "active": bool(row["active"]),
                    "created_at": row["created_at"],
                    "updated_at": row["updated_at"],
                    "last_accessed": row["last_accessed"],
                    "access_count": row["access_count"],
                    "embedding": _load_json(row["embedding_json"]),
                }
            )
            graph.add_memory(entry)

        for row in self._query("SELECT * FROM tags"):
            graph.upsert_tag(
                Tag(
                    name=row["name"],
                    description=row["description"],
                    count=row["count"],
                )
            )

        for row in self._query("SELECT * FROM clusters"):
            graph.add_cluster(
                Cluster(
                    id=row["id"],
                    label=row["label"],
                    centroid=_load_json(row["centroid_json"]),
                    member_count=row["member_count"],
                )
            )

        for row in self._query("SELECT * FROM notes"):
            graph.add_note(
                NoteRef(
                    id=row["id"],
                    path=row["path"],
                    title=row["title"],
                    wikilinks=json.loads(row["links_json"]),
                    tags=json.loads(row["tags_json"]),
                )
            )

        for row in self._query("SELECT * FROM edges"):
            graph.add_edge(
                row["source"],
                row["target"],
                EdgeKind(row["kind"]),
                weight=row["weight"],
            )

        return graph

    def close(self) -> None:
        with self._lock:
            self._conn.close()


def _load_json(value: Any) -> Optional[Any]:
    if value is None:
        return None
    return json.loads(value)
