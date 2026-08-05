"""Agent tool layer — the capabilities J.A.R.V.I.S agents and flow nodes use.

Tools operate on an ``AgentContext`` (graph + vault + store + event bus) so
they are fully testable and reusable by the workflow engine later.
"""
from __future__ import annotations

from dataclasses import dataclass
from pathlib import Path
from typing import Optional

from ..events import EventBus
from ..memory import (
    EdgeKind,
    MemoryEntry,
    MemoryGraph,
    MemoryStore,
    MemoryType,
    NoteRef,
)
from ..memory.obsidian import MemoryVault, Vault, extract_inline_tags, extract_wikilinks


@dataclass
class AgentContext:
    graph: MemoryGraph
    vault: Optional[MemoryVault] = None
    store: Optional[MemoryStore] = None
    event_bus: Optional[EventBus] = None


# ---------------------------------------------------------------------------
# Memory tools
# ---------------------------------------------------------------------------
def recall(query: str, ctx: AgentContext, k: int = 5) -> list[tuple[MemoryEntry, float]]:
    """Recall memories relevant to ``query`` via cascade retrieval."""
    results = ctx.graph.cascade_retrieve(query_text=query, max_results=k)
    if ctx.event_bus:
        ctx.event_bus.memory_recalled([m.id for m, _ in results])
    return results


def remember(
    content: str,
    ctx: AgentContext,
    memory_type: str = "fact",
    tags: Optional[list[str]] = None,
    persist: bool = True,
) -> MemoryEntry:
    """Store a new memory in the graph (and vault when available)."""
    entry = MemoryEntry(content=content, memory_type=MemoryType(memory_type), tags=list(tags or []))
    conflicts = ctx.graph.detect_conflicts(entry)
    ctx.graph.add_memory(entry)
    for existing in conflicts:
        ctx.graph.supersede(existing.id, entry.id)
    if persist and ctx.store:
        ctx.store.save_memory(entry)
    if ctx.vault:
        path = ctx.vault.export_memory(entry)
        entry.note_id = path.stem
    if ctx.event_bus:
        ctx.event_bus.memory_stored(entry.id, entry.content)
    return entry


# ---------------------------------------------------------------------------
# Obsidian tools
# ---------------------------------------------------------------------------
def note_search(query: str, ctx: AgentContext, limit: int = 10) -> list[dict]:
    """Search the vault for notes matching ``query`` (simple filename/body scan)."""
    if ctx.vault is None:
        return []
    q = query.lower()
    hits: list[dict] = []
    for path in ctx.vault.vault.iter_notes():
        fm, body = ctx.vault.vault.read_note(path)
        text = (path.stem + " " + body).lower()
        if q and q in text:
            hits.append(
                {
                    "path": str(path.relative_to(ctx.vault.vault.root)),
                    "title": path.stem,
                    "match": q,
                    "excerpt": body.strip()[:120],
                }
            )
    return hits[:limit]


def note_write(title: str, body: str, ctx: AgentContext) -> str:
    """Create/overwrite a note in the vault and wire its links into the graph."""
    if ctx.vault is None:
        raise RuntimeError("no vault configured")
    vault: Vault = ctx.vault.vault
    path = vault.root / f"{title}.md"
    fm = {"tags": extract_inline_tags(body)}
    vault.write_note(path, fm, body)
    note = NoteRef(
        id=title,
        path=str(path.relative_to(vault.root)),
        title=title,
        wikilinks=extract_wikilinks(body),
        tags=extract_inline_tags(body),
    )
    ctx.graph.add_note(note)
    if ctx.event_bus:
        ctx.event_bus.note_event("created", str(path))
    return str(path)
