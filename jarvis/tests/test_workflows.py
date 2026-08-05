"""P4 exit criteria: an example flow (cron -> memory recall -> TTS) runs headless."""
from __future__ import annotations

from datetime import datetime
from pathlib import Path

import pytest

from jarvis.core.agents import AgentContext, Jarvis
from jarvis.core.events import EventBus
from jarvis.core.memory import HashEmbedder, MemoryGraph, MemoryStore
from jarvis.core.memory.obsidian import MemoryVault, Vault
from jarvis.core.voice.tts import PiperTTS
from jarvis.core.workflows import (
    CronError,
    CronSchedule,
    Flow,
    FlowNode,
    FlowValidationError,
    Scheduler,
    WorkflowEngine,
    resolve_template,
)


@pytest.fixture
def agent_ctx(tmp_path: Path):
    graph = MemoryGraph(embedder=HashEmbedder())
    mv = MemoryVault(Vault(tmp_path / "vault"))
    store = MemoryStore(tmp_path / "mem.db")
    bus = EventBus()
    ctx = AgentContext(graph=graph, vault=mv, store=store, event_bus=bus)
    return ctx


class TestCron:
    def test_every_minute(self):
        sched = CronSchedule("* * * * *")
        assert sched.matches(datetime(2026, 8, 4, 9, 15))

    def test_hourly_at_minute_8(self):
        sched = CronSchedule("8 * * * *")
        assert sched.matches(datetime(2026, 8, 4, 9, 8))
        assert not sched.matches(datetime(2026, 8, 4, 9, 9))

    def test_daily_at_8am(self):
        sched = CronSchedule("0 8 * * *")
        assert sched.matches(datetime(2026, 8, 4, 8, 0))
        assert not sched.matches(datetime(2026, 8, 4, 8, 1))

    def test_lists_ranges_steps(self):
        sched = CronSchedule("*/15 9-17 * * 1-5")
        assert sched.matches(datetime(2026, 8, 3, 10, 30))  # Monday, 10:30
        assert not sched.matches(datetime(2026, 8, 2, 10, 30))  # Sunday

    def test_invalid_expression(self):
        with pytest.raises(CronError):
            CronSchedule("0 8 * *")
        with pytest.raises(CronError):
            CronSchedule("61 * * * *")


class TestTemplating:
    def test_node_output_reference(self):
        outputs = {"n2": {"reply": "morning briefing"}
}
        assert resolve_template("{{n2.reply}}", outputs, None) == "morning briefing"

    def test_scalar_output(self):
        outputs = {"n3": 42}
        assert resolve_template("answer: {{n3}}", outputs, None) == "answer: 42"

    def test_flow_input(self):
        outputs = {}
        assert resolve_template("{{input.user}}", outputs, {"user": "shimul"}) == "shimul"

    def test_nested_in_dict_and_missing_ok(self):
        outputs = {"n1": {"a": 1}}
        resolved = resolve_template({"b": "{{n1.a}}", "c": "{{nope.x}}"}, outputs, None)
        assert resolved == {"b": 1, "c": None}


class TestModel:
    def test_first_node_must_be_trigger(self):
        flow = Flow(
            id="f", name="f",
            nodes=[FlowNode("n1", "memory.recall")],
            connections={},
        )
        with pytest.raises(FlowValidationError):
            flow.validate()

    def test_dangling_connection_rejected(self):
        flow = Flow(
            id="f", name="f",
            nodes=[FlowNode("n1", "trigger.manual")],
            connections={"n1": {"out": ["ghost"]}},
        )
        with pytest.raises(FlowValidationError):
            flow.validate()


class TestExecutor:
    def test_linear_flow_with_branching(self):
        flow = Flow.from_dict({
            "id": "f1", "name": "Branch demo",
            "nodes": [
                {"id": "n1", "type": "trigger.manual", "params": {}},
                {"id": "n2", "type": "code", "params": {"source": "result = 5"}},
                {"id": "n3", "type": "if", "params": {"condition": "{{n2}} >= 5"}},
                {"id": "n4", "type": "code", "params": {"source": "result = 'big'"}},
                {"id": "n5", "type": "code", "params": {"source": "result = 'small'"}},
            ],
            "connections": {
                "n1": {"out": ["n2"]},
                "n2": {"out": ["n3"]},
                "n3": {"true": ["n4"], "false": ["n5"]},
            },
        })
        engine = WorkflowEngine()
        result = engine.run_sync(flow)
        assert result.outputs["n4"] == "big"
        assert "n5" not in result.outputs
        assert result.node_status["n4"] == "completed"
        assert result.node_status.get("n5") is None

    def test_events_emitted(self, agent_ctx):
        bus = EventBus()
        flow = Flow.from_dict({
            "id": "f2", "name": "Events",
            "nodes": [
                {"id": "t", "type": "trigger.manual", "params": {}},
                {"id": "c", "type": "code", "params": {"source": "result = 1"}},
            ],
            "connections": {"t": {"out": ["c"]}},
        })
        engine = WorkflowEngine(bus=bus)
        engine.run_sync(flow)
        types = {e["type"] for e in bus.drain()}
        assert {"node.pending", "node.running", "node.completed"} <= types

    def test_memory_recall_flow(self, agent_ctx):
        Jarvis(agent_ctx).run("remember that the deploy runs at 2am")
        flow = Flow.from_dict({
            "id": "f3", "name": "Recall",
            "nodes": [
                {"id": "t", "type": "trigger.manual", "params": {}},
                {"id": "m", "type": "memory.recall", "params": {"query": "deploy"}},
                {"id": "c", "type": "code", "params": {"source": "result = outputs['m'][0]['content']"}},
            ],
            "connections": {"t": {"out": ["m"]}, "m": {"out": ["c"]}},
        })
        engine = WorkflowEngine(agent=agent_ctx)
        result = engine.run_sync(flow)
        assert "2am" in result.outputs["c"]

    def test_retries_on_failure(self, monkeypatch):
        from jarvis.core.workflows import nodes as nodes_mod

        calls = {"n": 0}

        def flaky(params, ctx):
            calls["n"] += 1
            if calls["n"] < 2:
                raise ValueError("flaky")
            return "ok"

        monkeypatch.setitem(nodes_mod.NODES, "code", flaky)
        flow = Flow.from_dict({
            "id": "f4", "name": "Retry",
            "nodes": [
                {"id": "t", "type": "trigger.manual", "params": {}},
                {"id": "c", "type": "code", "params": {"retries": 2}},
            ],
            "connections": {"t": {"out": ["c"]}},
        })
        engine = WorkflowEngine()
        result = engine.run_sync(flow)
        assert calls["n"] == 2
        assert result.outputs["c"] == "ok"


class TestScheduler:
    def test_due_flows_by_cron(self):
        flow = Flow.from_dict({
            "id": "s1", "name": "Morning",
            "nodes": [{"id": "t", "type": "trigger.cron", "params": {"cron": "0 8 * * *"}}],
            "connections": {},
            "params": {"cron": "0 8 * * *"},
        })
        engine = WorkflowEngine()
        scheduler = Scheduler(engine)
        scheduler.register(flow)
        due = scheduler.due(datetime(2026, 8, 4, 8, 0))
        assert [f.id for f in due] == ["s1"]
        assert scheduler.due(datetime(2026, 8, 4, 8, 5)) == []

    def test_register_requires_cron(self):
        flow = Flow.from_dict({
            "id": "s2", "name": "No cron",
            "nodes": [{"id": "t", "type": "trigger.manual", "params": {}}],
            "connections": {},
        })
        with pytest.raises(CronError):
            Scheduler(WorkflowEngine()).register(flow)


class TestExampleFlow:
    def test_headless_cron_recall_tts_flow(self, agent_ctx):
        """The P4 exit-criteria example flow runs headless end to end."""
        Jarvis(agent_ctx).run("remember that piper speaks at 22050 hz")

        class FakeTTS:
            def __init__(self):
                self.spoken = []

            def synthesize(self, text):
                import io
                import wave

                buffer = io.BytesIO()
                with wave.open(buffer, "wb") as wav:
                    wav.setnchannels(1)
                    wav.setsampwidth(2)
                    wav.setframerate(22050)
                    wav.writeframes(b"\x00\x00" * 160)
                self.spoken.append(text)
                return buffer.getvalue()

        tts = FakeTTS()
        flow = Flow.from_dict({
            "id": "briefing", "name": "Morning Briefing",
            "nodes": [
                {"id": "t", "type": "trigger.cron", "params": {"cron": "0 8 * * *"}},
                {"id": "m", "type": "memory.recall", "params": {"query": "piper"}},
                {"id": "v", "type": "voice.tts", "params": {"text": "{{m}}"}},
            ],
            "connections": {"t": {"out": ["m"]}, "m": {"out": ["v"]}},
            "params": {"cron": "0 8 * * *"},
        })
        result = WorkflowEngine(agent=agent_ctx, tts=tts).run_sync(flow)
        assert result.node_status["m"] == "completed"
        assert result.node_status["v"] == "completed"
        assert "22050" in str(result.outputs["m"])
        assert tts.spoken
