"""Obsidian vault integration.

The vault is the human-readable source of truth for J.A.R.V.I.S knowledge:

- A ``MemoryEntry`` maps to ``vault/Memories/<id>.md`` — YAML frontmatter
  carries the memory schema, the body carries the content.
- ``[[wikilinks]]`` in notes map to ``references`` edges in the memory graph.
- ``#tags`` (frontmatter or inline) map to ``has_tag`` edges.
- Obsidian's graph view therefore renders the memory graph live.
- Notes the user edits/creates in Obsidian are re-ingested on ``rescan()``.
"""
from __future__ import annotations

import re
from pathlib import Path
from typing import Any, Iterable, Optional

import yaml

from .graph import EdgeKind, MemoryGraph
from .schema import (
    MemoryEntry,
    MemoryType,
    NoteRef,
    Provenance,
    Scope,
    Tag,
    new_id,
    now_utc,
)

MEMORIES_DIR = "Memories"
WIKILINK_RE = re.compile(r"\[\[([^\]|#]+)(?:#[^\]|]*)?(?:\|[^\]]*)?\]\]")
INLINE_TAG_RE = re.compile(r"(?<![\w/])#([\w\-/:]+)")

# Obsidian frontmatter keys for a memory note.
FRONTMATTER_KEYS = (
    "id",
    "type",
    "scope",
    "provenance",
    "confidence",
    "strength",
    "created",
    "updated",
    "active",
    "tags",
    "links",
    "superseded_by",
)


class Vault:
    """Thin wrapper around an Obsidian vault directory."""

    def __init__(self, root: str | Path):
        self.root = Path(root)
        self.memories_dir = self.root / MEMORIES_DIR
        self.memories_dir.mkdir(parents=True, exist_ok=True)

    # ------------------------------------------------------------------
    # Note CRUD
    # ------------------------------------------------------------------
    def iter_notes(self) -> Iterable[Path]:
        yield from self.root.rglob("*.md")

    def read_note(self, path: str | Path) -> tuple[dict[str, Any], str]:
        """Return ``(frontmatter, body)`` for a markdown note."""
        text = Path(path).read_text(encoding="utf-8")
        return parse_frontmatter(text)

    def write_note(
        self,
        path: str | Path,
        frontmatter: dict[str, Any],
        body: str,
    ) -> Path:
        p = Path(path)
        p.parent.mkdir(parents=True, exist_ok=True)
        fm = yaml.safe_dump(frontmatter, sort_keys=False, allow_unicode=True).strip()
        p.write_text(f"---\n{fm}\n---\n\n{body.strip()}\n", encoding="utf-8")
        return p

    def delete_note(self, path: str | Path) -> None:
        Path(path).unlink(missing_ok=True)

    # ------------------------------------------------------------------
    # Memory note helpers
    # ------------------------------------------------------------------
    def memory_note_path(self, memory_id: str) -> Path:
        return self.memories_dir / f"{memory_id}.md"

    def note_title(self, path: Path) -> str:
        return path.stem


def parse_frontmatter(text: str) -> tuple[dict[str, Any], str]:
    """Split markdown into ``(frontmatter dict, body)``.

    Handles YAML between leading ``---`` fences; returns ``({}, text)`` when
    no frontmatter is present.
    """
    if not text.startswith("---"):
        return {}, text
    end = text.find("\n---", 3)
    if end == -1:
        return {}, text
    fm_text = text[3:end]
    body = text[end + 4 :].lstrip("\n")
    try:
        fm = yaml.safe_load(fm_text) or {}
    except yaml.YAMLError:
        return {}, text
    if not isinstance(fm, dict):
        return {}, text
    return fm, body


def extract_wikilinks(body: str) -> list[str]:
    """All distinct [[wikilink]] targets in a note body."""
    return list(dict.fromkeys(WIKILINK_RE.findall(body)))


def extract_inline_tags(body: str) -> list[str]:
    """All inline ``#tag`` mentions (excluding frontmatter)."""
    return list(dict.fromkeys(INLINE_TAG_RE.findall(body)))


class MemoryVault:
    """Bidirectional sync between the memory graph and the Obsidian vault."""

    def __init__(self, vault: Vault):
        self.vault = vault

    # ------------------------------------------------------------------
    # Memory -> note
    # ------------------------------------------------------------------
    def export_memory(self, entry: MemoryEntry) -> Path:
        """Write a memory as an Obsidian note under ``vault/Memories/``."""
        fm: dict[str, Any] = {
            "id": entry.id,
            "type": entry.memory_type.value,
            "scope": entry.scope.value,
            "provenance": entry.provenance.value,
            "confidence": round(entry.confidence, 4),
            "strength": entry.strength,
            "created": entry.created_at,
            "updated": entry.updated_at,
            "active": entry.active,
            "tags": list(entry.tags),
            "links": _wikilink_targets(entry),
        }
        if entry.superseded_by:
            fm["superseded_by"] = entry.superseded_by
        body = entry.content
        return self.vault.write_note(self.vault.memory_note_path(entry.id), fm, body)

    def export_many(self, entries: Iterable[MemoryEntry]) -> list[Path]:
        return [self.export_memory(e) for e in entries]

    # ------------------------------------------------------------------
    # Note -> memory
    # ------------------------------------------------------------------
    def import_note(self, path: str | Path, embedder=None) -> MemoryEntry:
        """Read an Obsidian note into a MemoryEntry (inferring missing fields)."""
        p = Path(path)
        fm, body = self.vault.read_note(p)
        content = body.strip() or fm.get("content", "")
        entry = MemoryEntry(
            id=fm.get("id") or new_id("mem"),
            content=content,
            memory_type=MemoryType(fm.get("type", "fact")),
            scope=Scope(fm.get("scope", "global")),
            provenance=Provenance(fm.get("provenance", "user_stated")),
            confidence=float(fm.get("confidence", 0.9)),
            strength=int(fm.get("strength", 1)),
            tags=_coerce_list(fm.get("tags", [])) + extract_inline_tags(content),
            note_id=p.stem,
            superseded_by=fm.get("superseded_by"),
            active=bool(fm.get("active", True)),
            created_at=fm.get("created", now_utc()),
            updated_at=fm.get("updated", now_utc()),
            last_accessed=now_utc(),
        )
        if embedder is not None:
            entry.embedding = embedder.embed(content)
        return entry

    # ------------------------------------------------------------------
    # Graph <-> vault sync
    # ------------------------------------------------------------------
    def push_graph(self, graph: MemoryGraph) -> list[Path]:
        """Export every active memory in the graph to the vault."""
        return self.export_many(graph.active_memories())

    def pull_notes(self, graph: MemoryGraph) -> list[MemoryEntry]:
        """Ingest every memory note in the vault back into the graph."""
        entries: list[MemoryEntry] = []
        for path in self.vault.memories_dir.glob("*.md"):
            entry = self.import_note(path, embedder=graph.embedder)
            graph.add_memory(entry)
            graph.add_note(self._note_ref(path, entry, body_only=False))
            entries.append(entry)
        return entries

    def build_note_refs(self, graph: MemoryGraph) -> None:
        """Create Note nodes + ``references`` edges from every note's wikilinks.

        A note that is the backing note of a memory (``vault/Memories/<id>.md``)
        is *not* duplicated as a separate node — its wikilinks and tags become
        edges on the memory node itself.
        """
        for path in self.vault.iter_notes():
            _, body = self.vault.read_note(path)
            stem = path.stem
            if graph.get_memory(stem) is not None:
                node_id = stem
            else:
                note = NoteRef(
                    id=stem,
                    path=str(path.relative_to(self.vault.root)),
                    title=stem,
                    wikilinks=extract_wikilinks(body),
                    tags=extract_inline_tags(body) + self._fm_tags(path),
                )
                node_id = graph.add_note(note)
                for tag in note.tags:
                    graph.add_edge(node_id, graph.upsert_tag(Tag(name=tag)), EdgeKind.HAS_TAG)
            for link in extract_wikilinks(body):
                graph.add_edge(node_id, f"note:{link}", EdgeKind.REFERENCES)
            for tag in extract_inline_tags(body) + self._fm_tags(path):
                graph.add_edge(node_id, graph.upsert_tag(Tag(name=tag)), EdgeKind.HAS_TAG)

    def sync_from_vault(self, graph: MemoryGraph) -> None:
        """Full rescan: ingest memory notes, then refresh note links."""
        self.pull_notes(graph)
        self.build_note_refs(graph)

    # ------------------------------------------------------------------
    def _note_ref(self, path: Path, entry: MemoryEntry, body_only: bool) -> NoteRef:
        _, body = self.vault.read_note(path)
        return NoteRef(
            id=path.stem,
            path=str(path.relative_to(self.vault.root)),
            title=path.stem,
            wikilinks=extract_wikilinks(body),
            tags=list(entry.tags),
        )

    def _fm_tags(self, path: Path) -> list[str]:
        fm, _ = self.vault.read_note(path)
        return _coerce_list(fm.get("tags", []))


def _wikilink_targets(entry: MemoryEntry) -> list[str]:
    """Links to surface in a memory note (from tags like ``person:shimul``)."""
    targets: list[str] = []
    for tag in entry.tags:
        if ":" in tag and tag.startswith(("person:", "project:", "topic:")):
            targets.append(tag.split(":", 1)[1])
    return targets


def _coerce_list(value: Any) -> list[str]:
    if value is None:
        return []
    if isinstance(value, str):
        return [value]
    return [str(v) for v in value]
