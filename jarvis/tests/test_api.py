"""P5 exit criteria: flows run via the API while /ws/events streams events."""
from __future__ import annotations

import asyncio
import json
from pathlib import Path

import pytest
from fastapi.testclient import TestClient

from jarvis.api import Runtime, create_app


@pytest.fixture
def client(tmp_path: Path):
    runtime = Runtime(tmp_path / "state", flow_dir=tmp_path / "flows")
    app = create_app(runtime)
    return TestClient(app)


def make_flow(flow_id: str = "demo") -> dict:
    return {
        "id": flow_id,
        "name": "Demo",
        "nodes": [
            {"id": "t", "type": "trigger.manual", "params": {}},
            {"id": "c", "type": "code", "params": {"source": "result = {'answer': 42}"}},
        ],
        "connections": {"t": {"out": ["c"]}},
    }


class TestHealthAndMemory:
    def test_health(self, client):
        resp = client.get("/api/health")
        assert resp.status_code == 200
        assert resp.json()["status"] == "ok"

    def test_write_and_query_memory(self, client):
        resp = client.post("/api/memory", json={"content": "Shimul likes Rust"})
        assert resp.status_code == 200
        assert resp.json()["content"] == "Shimul likes Rust"

        resp = client.get("/api/memory", params={"q": "Rust"})
        assert resp.json()["count"] == 1

    def test_memory_graph(self, client):
        client.post("/api/memory", json={"content": "A fact"})
        graph = client.get("/api/memory/graph").json()
        assert "nodes" in graph and "edges" in graph
        assert any(n["data"].get("content") == "A fact" for n in graph["nodes"])


class TestChat:
    def test_chat_streams_events(self, client):
        resp = client.post("/api/chat", json={"message": "remember that the build runs at noon"})
        assert resp.status_code == 200
        events = []
        for line in resp.text.splitlines():
            if line.startswith("data: "):
                events.append(json.loads(line[6:]))
        types = {e["type"] for e in events}
        assert "started" in types
        assert "step" in types
        done = [e for e in events if e["type"] == "done"]
        assert done and "noon" in done[0]["reply"]

    def test_voice_command(self, client):
        resp = client.post(
            "/api/voice/command", json={"text": "remember that I use neovim"}
        )
        assert resp.status_code == 200
        assert resp.json()["intent"] == "memory_write"


class TestFlows:
    def test_flow_crud_and_run(self, client):
        created = client.post("/api/flows", json=make_flow()).json()
        assert created["id"] == "demo"

        listed = client.get("/api/flows").json()
        assert len(listed) == 1

        run = client.post("/api/flows/demo/run", json={}).json()
        assert run["status"]["c"] == "completed"
        assert run["outputs"]["c"]["answer"] == 42

        deleted = client.delete("/api/flows/demo")
        assert deleted.status_code == 200
        assert client.get("/api/flows").json() == []

    def test_run_missing_flow(self, client):
        assert client.post("/api/flows/nope/run", json={}).status_code == 404

    def test_notes_search(self, client):
        client.post("/api/voice/command", json={"text": "create a note: API checklist"})
        resp = client.get("/api/notes", params={"q": "checklist"})
        assert resp.status_code == 200


class TestWebSocket:
    def test_events_stream_on_flow_run(self, client):
        client.post("/api/flows", json=make_flow())
        required = {"node.pending", "node.running", "node.completed"}
        with client.websocket_connect("/ws/events") as ws:
            client.post("/api/flows/demo/run", json={})
            seen = set()
            for _ in range(20):
                event = ws.receive_json()
                seen.add(event["type"])
                if required <= seen:
                    break
            assert required <= seen
