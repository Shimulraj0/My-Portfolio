"""P6: jcode CLI integration + background memory maintenance."""
from __future__ import annotations

from datetime import datetime, timedelta, timezone
from pathlib import Path

import pytest

from jarvis.core.jcode import JcodeClient, JcodeResult
from jarvis.core.memory import HashEmbedder, MemoryGraph
from jarvis.core.memory.background import BackgroundMaintenance
from jarvis.core.memory.schema import MemoryEntry, MemoryType, now_utc


def hours_ago(hours: float) -> str:
    return (datetime.now(timezone.utc) - timedelta(hours=hours)).isoformat()


class TestJcodeClient:
    def test_not_installed_fails_soft(self):
        client = JcodeClient(binary="definitely-not-a-real-binary")
        result = client.run_task("hello")
        assert not result.ok
        assert not result.available
        assert "not installed" in result.output.lower() or "not found" in result.output.lower()

    def test_run_task_invokes_binary(self, tmp_path, monkeypatch):
        calls = {}

        def fake_run(command, cwd=None, capture_output=True, text=True, timeout=900):
            calls["command"] = list(command)
            calls["cwd"] = cwd

            class Proc:
                returncode = 0
                stdout = "found 3 issues\n"
                stderr = ""

            return Proc()

        monkeypatch.setattr("jarvis.core.jcode.subprocess.run", fake_run)
        client = JcodeClient(binary="jcode", args=["run", "--non-interactive"])
        result = client.run_task("review the api", cwd=str(tmp_path))
        assert result.ok
        assert result.output == "found 3 issues"
        assert calls["command"][:3] == ["jcode", "run", "--non-interactive"]
        assert calls["command"][3] == "review the api"
        assert calls["cwd"] == str(tmp_path)

    def test_timeout_reported(self, monkeypatch):
        import subprocess

        def timeout_run(*args, **kwargs):
            raise subprocess.TimeoutExpired("jcode", timeout=5)

        monkeypatch.setattr("jarvis.core.jcode.subprocess.run", timeout_run)
        client = JcodeClient(binary="jcode", timeout=5)
        result = client.run_task("x")
        assert not result.ok
        assert "timed out" in result.output


class TestBackgroundMaintenance:
    def make_graph(self, tmp_path: Path, age_hours: float):
        graph = MemoryGraph(embedder=HashEmbedder())
        entry = MemoryEntry(
            content="the pipeline deploys at 3am",
            memory_type=MemoryType.FACT,
            embedding=graph.embedder.embed("the pipeline deploys at 3am"),
        )
        entry.created_at = hours_ago(age_hours)
        entry.updated_at = hours_ago(age_hours)
        graph.add_memory(entry)
        return graph, entry

    def test_decays_stale_memories(self, tmp_path):
        graph, entry = self.make_graph(tmp_path, age_hours=100 * 24)  # ~100 days
        service = BackgroundMaintenance(graph)
        counts = service._pass()
        assert counts["decayed"] == 1
        assert entry.confidence < 0.9

    def test_fresh_memories_untouched(self, tmp_path):
        graph, entry = self.make_graph(tmp_path, age_hours=1)
        service = BackgroundMaintenance(graph)
        counts = service._pass()
        assert counts["decayed"] == 0
        assert entry.confidence == 0.9

    def test_run_never_raises_on_empty(self, tmp_path):
        graph = MemoryGraph(embedder=HashEmbedder())
        service = BackgroundMaintenance(graph)
        assert service._pass() == {"decayed": 0, "scanned": 0, "links_considered": 0}
