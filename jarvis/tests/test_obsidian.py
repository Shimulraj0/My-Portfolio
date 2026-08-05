"""P1 exit criteria: memories round-trip to/from the Obsidian vault.

Covers: frontmatter parse/serialize, memory -> note export, note -> memory
import, wikilink/tag extraction, graph <-> vault sync.
"""
from __future__ import annotations

from pathlib import Path

from jarvis.core.memory import HashEmbedder, MemoryEntry, MemoryGraph, MemoryType, Provenance
from jarvis.core.memory.obsidian import (
    MemoryVault,
    Vault,
    extract_inline_tags,
    extract_wikilinks,
    parse_frontmatter,
)


def mem(content: str, **kw) -> MemoryEntry:
    defaults = dict(memory_type=MemoryType.FACT, provenance=Provenance.USER_STATED)
    defaults.update(kw)
    return MemoryEntry(content=content, **defaults)


class TestFrontmatter:
    def test_parse_frontmatter_basic(self):
        text = "---\nid: mem_abc\ntype: preference\n---\n\nUser likes dark mode\n"
        fm, body = parse_frontmatter(text)
        assert fm["id"] == "mem_abc"
        assert fm["type"] == "preference"
        assert body == "User likes dark mode\n"

    def test_parse_no_frontmatter(self):
        fm, body = parse_frontmatter("just some notes\n")
        assert fm == {}
        assert body == "just some notes\n"

    def test_extract_wikilinks_and_tags(self):
        body = "See [[Shimul]] and [[Project/Sparktech|the agency]] #role #person:shimul"
        assert extract_wikilinks(body) == ["Shimul", "Project/Sparktech"]
        assert extract_inline_tags(body) == ["role", "person:shimul"]


class TestRoundTrip:
    def test_export_memory_creates_note(self, tmp_path: Path):
        vault = Vault(tmp_path / "vault")
        mv = MemoryVault(vault)
        e = mem("Shimul is a Flutter developer", tags=["#person:shimul", "#role"])
        path = mv.export_memory(e)
        assert path.exists()
        fm, body = vault.read_note(path)
        assert fm["id"] == e.id
        assert fm["type"] == "fact"
        assert fm["confidence"] == e.confidence
        assert body.strip() == e.content

    def test_import_note_restores_entry(self, tmp_path: Path):
        vault = Vault(tmp_path / "vault")
        mv = MemoryVault(vault)
        e = mem("User prefers 4-space indentation", memory_type=MemoryType.PREFERENCE)
        path = mv.export_memory(e)
        imported = mv.import_note(path, embedder=HashEmbedder())
        assert imported.id == e.id
        assert imported.content == e.content
        assert imported.memory_type is MemoryType.PREFERENCE
        assert imported.embedding is not None

    def test_update_note_preserves_id(self, tmp_path: Path):
        vault = Vault(tmp_path / "vault")
        mv = MemoryVault(vault)
        e = mem("old version")
        path = mv.export_memory(e)
        e.content = "new version"
        mv.export_memory(e)
        fm, body = vault.read_note(path)
        assert fm["id"] == e.id
        assert body.strip() == "new version"


class TestGraphSync:
    def test_pull_creates_references_edges(self, tmp_path: Path):
        vault = Vault(tmp_path / "vault")
        (vault.root / "Memories").mkdir(parents=True, exist_ok=True)
        # a memory note that links to a freeform note
        note = vault.write_note(
            vault.memories_dir / "mem_x.md",
            {"id": "mem_x", "type": "fact", "tags": ["person:shimul"]},
            "Shimul built [[TaskEase]] #flutter",
        )
        mv = MemoryVault(vault)
        g = MemoryGraph(embedder=HashEmbedder())
        mv.pull_notes(g)
        assert g.get_memory("mem_x") is not None
        # the freeform note exists in the graph as a node
        assert "TaskEase" in g.nodes or "note:TaskEase" in g.nodes

    def test_build_note_refs_links_wikilinks(self, tmp_path: Path):
        vault = Vault(tmp_path / "vault")
        vault.write_note(vault.root / "Alpha.md", {}, "links to [[Beta]]")
        vault.write_note(vault.root / "Beta.md", {}, "has nothing")
        g = MemoryGraph(embedder=HashEmbedder())
        MemoryVault(vault).build_note_refs(g)
        alpha_ref = g.nodes["Alpha"]
        assert any(e.kind.value == "references" and e.target == "note:Beta" for e in g.out_edges("Alpha"))

    def test_push_graph_writes_all_active(self, tmp_path: Path):
        vault = Vault(tmp_path / "vault")
        g = MemoryGraph(embedder=HashEmbedder())
        a = mem("fact one")
        b = mem("fact two")
        c = mem("old fact three")
        g.add_memory(a)
        g.add_memory(b)
        g.add_memory(c)
        g.supersede(c.id, b.id)  # c becomes inactive
        mv = MemoryVault(vault)
        paths = mv.push_graph(g)
        assert len(paths) == 2
        assert not (vault.memories_dir / f"{c.id}.md").exists()

    def test_sync_from_vault_round_trips(self, tmp_path: Path):
        vault = Vault(tmp_path / "vault")
        mv = MemoryVault(vault)
        e = mem("Remember my birthday is in January", tags=["#event"])
        mv.export_memory(e)

        g = MemoryGraph(embedder=HashEmbedder())
        mv.sync_from_vault(g)
        recall = g.cascade_retrieve(query_text="birthday january")
        assert recall
        assert recall[0][0].content == e.content
