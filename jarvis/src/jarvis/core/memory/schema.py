"""Memory graph protocol — schema (node / edge / entry models).

Mirrors jcode's memory architecture: MemoryEntry carries classification
(memory_type, scope), source tracking (provenance), lifecycle (confidence,
strength, access_count) and trust status, exactly as in jcode's
docs/MEMORY_ARCHITECTURE.md.
"""
from __future__ import annotations

import uuid
from dataclasses import dataclass, field
from datetime import datetime, timezone
from enum import Enum
from typing import Any, Optional


def now_utc() -> str:
    """Current UTC time as an ISO-8601 string."""
    return datetime.now(timezone.utc).isoformat()


def new_id(prefix: str) -> str:
    """Generate a short unique id like ``mem_ab12cd34ef56``."""
    return f"{prefix}_{uuid.uuid4().hex[:12]}"


class MemoryType(str, Enum):
    FACT = "fact"
    PREFERENCE = "preference"
    PROCEDURE = "procedure"
    CORRECTION = "correction"
    NEGATIVE = "negative"
    EVENT = "event"
    TASK = "task"


class Scope(str, Enum):
    GLOBAL = "global"
    PROJECT = "project"
    SESSION = "session"


class Provenance(str, Enum):
    USER_STATED = "user_stated"
    USER_CORRECTED = "user_corrected"
    OBSERVED = "observed"
    INFERRED = "inferred"
    EXTRACTED = "extracted"


class EdgeKind(str, Enum):
    HAS_TAG = "has_tag"
    IN_CLUSTER = "in_cluster"
    RELATES_TO = "relates_to"
    SUPERSEDES = "supersedes"
    CONTRADICTS = "contradicts"
    DERIVED_FROM = "derived_from"
    REFERENCES = "references"


# --------------------------------------------------------------------------
# Decay / trust model (from jcode MEMORY_ARCHITECTURE.md)
# --------------------------------------------------------------------------

# Confidence half-life in days per memory type.
HALF_LIFE_DAYS: dict[MemoryType, float] = {
    MemoryType.CORRECTION: 365.0,
    MemoryType.NEGATIVE: 365.0,
    MemoryType.PREFERENCE: 90.0,
    MemoryType.PROCEDURE: 60.0,
    MemoryType.FACT: 30.0,
    MemoryType.EVENT: 30.0,
    MemoryType.TASK: 30.0,
}

# Provenance is used as a trust weight multiplier.
TRUST_WEIGHT: dict[Provenance, float] = {
    Provenance.USER_STATED: 1.0,
    Provenance.USER_CORRECTED: 1.0,
    Provenance.OBSERVED: 0.8,
    Provenance.EXTRACTED: 0.7,
    Provenance.INFERRED: 0.6,
}

# Inferred provenance gets a much shorter half-life (jcode: 7 days).
INFERRED_HALF_LIFE_DAYS = 7.0

# Default edge strength used when traversing the graph (jcode defaults).
EDGE_WEIGHTS: dict[EdgeKind, float] = {
    EdgeKind.HAS_TAG: 0.8,
    EdgeKind.IN_CLUSTER: 0.6,
    EdgeKind.SUPERSEDES: 0.9,
    EdgeKind.DERIVED_FROM: 0.5,
    EdgeKind.CONTRADICTS: 0.3,
    EdgeKind.REFERENCES: 0.7,
    EdgeKind.RELATES_TO: 0.5,  # typically overridden by the edge's own weight
}

# Retrieval defaults (jcode defaults).
SIMILARITY_THRESHOLD = 0.4
MAX_INITIAL_HITS = 10
MAX_DEPTH = 2
MAX_RESULTS = 10
EDGE_DECAY = 0.7

# Confidence half-life for the *similarity-conflict* detection.
CONFLICT_SIMILARITY = 0.9


@dataclass
class MemoryEntry:
    """A single memory. Mirrors jcode's MemoryEntry schema."""

    content: str
    memory_type: MemoryType = MemoryType.FACT
    scope: Scope = Scope.GLOBAL
    provenance: Provenance = Provenance.USER_STATED
    confidence: float = 0.9
    strength: int = 1
    id: str = field(default_factory=lambda: new_id("mem"))
    tags: list[str] = field(default_factory=list)
    note_id: Optional[str] = None
    superseded_by: Optional[str] = None
    active: bool = True
    created_at: str = field(default_factory=now_utc)
    updated_at: str = field(default_factory=now_utc)
    last_accessed: str = field(default_factory=now_utc)
    access_count: int = 0
    embedding: Optional[list[float]] = None

    # ------------------------------------------------------------------
    # Serialization
    # ------------------------------------------------------------------
    def to_dict(self) -> dict[str, Any]:
        return {
            "id": self.id,
            "content": self.content,
            "memory_type": self.memory_type.value,
            "scope": self.scope.value,
            "provenance": self.provenance.value,
            "confidence": round(self.confidence, 4),
            "strength": self.strength,
            "tags": list(self.tags),
            "note_id": self.note_id,
            "superseded_by": self.superseded_by,
            "active": self.active,
            "created_at": self.created_at,
            "updated_at": self.updated_at,
            "last_accessed": self.last_accessed,
            "access_count": self.access_count,
            "embedding": self.embedding,
        }

    @classmethod
    def from_dict(cls, data: dict[str, Any]) -> "MemoryEntry":
        return cls(
            id=data["id"],
            content=data["content"],
            memory_type=MemoryType(data["memory_type"]),
            scope=Scope(data["scope"]),
            provenance=Provenance(data["provenance"]),
            confidence=float(data.get("confidence", 0.9)),
            strength=int(data.get("strength", 1)),
            tags=list(data.get("tags", [])),
            note_id=data.get("note_id"),
            superseded_by=data.get("superseded_by"),
            active=bool(data.get("active", True)),
            created_at=data.get("created_at", now_utc()),
            updated_at=data.get("updated_at", now_utc()),
            last_accessed=data.get("last_accessed", now_utc()),
            access_count=int(data.get("access_count", 0)),
            embedding=data.get("embedding"),
        )

    # ------------------------------------------------------------------
    # Decay / trust math
    # ------------------------------------------------------------------
    def effective_half_life_days(self) -> float:
        if self.provenance is Provenance.INFERRED:
            return INFERRED_HALF_LIFE_DAYS
        return HALF_LIFE_DAYS.get(self.memory_type, 30.0)

    def trust_weight(self) -> float:
        return TRUST_WEIGHT.get(self.provenance, 0.6)

    def _age_days(self, now: datetime) -> float:
        created = datetime.fromisoformat(self.created_at)
        if created.tzinfo is None:
            created = created.replace(tzinfo=timezone.utc)
        delta = now - created
        return max(0.0, delta.total_seconds() / 86400.0)

    def decayed_confidence(self, now: Optional[datetime] = None) -> float:
        """Confidence decays with age, recovers slightly with use (jcode formula)."""
        now = now or datetime.now(timezone.utc)
        age_days = self._age_days(now)
        half_life = self.effective_half_life_days()
        decay = (1 + 0.1 * (self.access_count + 1) ** 0.5)  # small use bonus
        return min(
            1.0,
            self.confidence
            * (2.0 ** (-age_days / half_life))
            * decay
            * self.trust_weight(),
        )

    def recency_boost(self, now: Optional[datetime] = None) -> float:
        """Boost for recently-accessed memories: 1 + 0.5·e^(−hours/24)."""
        now = now or datetime.now(timezone.utc)
        last = datetime.fromisoformat(self.last_accessed)
        if last.tzinfo is None:
            last = last.replace(tzinfo=timezone.utc)
        hours = max(0.0, (now - last).total_seconds() / 3600.0)
        return 1.0 + 0.5 * (2.0 ** (-hours / 24.0))

    def on_used(self, helpful: bool = True) -> None:
        """Feedback loop: strengthen or weaken based on use."""
        self.access_count += 1
        self.last_accessed = now_utc()
        if helpful:
            self.strength += 1
            self.confidence = min(1.0, self.confidence + 0.05)
        else:
            self.confidence = max(0.0, self.confidence - 0.1)
        self.updated_at = now_utc()


@dataclass
class Tag:
    name: str
    description: str = ""
    count: int = 0

    def to_dict(self) -> dict[str, Any]:
        return {"name": self.name, "description": self.description, "count": self.count}

    @classmethod
    def from_dict(cls, data: dict[str, Any]) -> "Tag":
        return cls(
            name=data["name"],
            description=data.get("description", ""),
            count=int(data.get("count", 0)),
        )


@dataclass
class Cluster:
    id: str = field(default_factory=lambda: new_id("clu"))
    label: str = ""
    centroid: Optional[list[float]] = None
    member_count: int = 0

    def to_dict(self) -> dict[str, Any]:
        return {
            "id": self.id,
            "label": self.label,
            "centroid": self.centroid,
            "member_count": self.member_count,
        }

    @classmethod
    def from_dict(cls, data: dict[str, Any]) -> "Cluster":
        return cls(
            id=data.get("id", new_id("clu")),
            label=data.get("label", ""),
            centroid=data.get("centroid"),
            member_count=int(data.get("member_count", 0)),
        )


@dataclass
class NoteRef:
    """An Obsidian note that backs one or more memories."""

    id: str
    path: str  # vault-relative path
    title: str
    wikilinks: list[str] = field(default_factory=list)
    tags: list[str] = field(default_factory=list)

    def to_dict(self) -> dict[str, Any]:
        return {
            "id": self.id,
            "path": self.path,
            "title": self.title,
            "wikilinks": list(self.wikilinks),
            "tags": list(self.tags),
        }

    @classmethod
    def from_dict(cls, data: dict[str, Any]) -> "NoteRef":
        return cls(
            id=data["id"],
            path=data["path"],
            title=data.get("title", ""),
            wikilinks=list(data.get("wikilinks", [])),
            tags=list(data.get("tags", [])),
        )
