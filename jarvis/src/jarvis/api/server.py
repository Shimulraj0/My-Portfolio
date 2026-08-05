"""FastAPI app — chat SSE, memory, flows, notes, and the /ws/events stream."""
from __future__ import annotations

import json
import logging
from pathlib import Path
from typing import Any, Optional

from fastapi import FastAPI, HTTPException, WebSocket, WebSocketDisconnect
from fastapi.responses import JSONResponse, StreamingResponse
from fastapi.staticfiles import StaticFiles

from ..core.agents.tools import note_search, recall, remember
from .hub import Hub
from .runtime import Runtime

log = logging.getLogger("jarvis.api.server")

root_dir = Path(__file__).resolve().parents[3]


def sse(event: str, data: Any) -> str:
    payload = {"type": event, **(data or {})}
    return f"event: {event}\ndata: {json.dumps(payload)}\n\n"


def create_app(runtime: Optional[Runtime] = None, state_dir: Optional[str] = None, flow_dir: Optional[str] = None) -> FastAPI:
    runtime = runtime or Runtime(state_dir or "~/.jarvis", flow_dir=flow_dir)
    hub = Hub(runtime.bus)
    app = FastAPI(title="J.A.R.V.I.S", version="0.1.0")
    app.state.runtime = runtime
    app.state.hub = hub

    @app.get("/api/health")
    def health() -> dict:
        return {"status": "ok", "memories": len(list(runtime.graph.memories())), "clients": hub.clients}

    @app.post("/api/chat")
    async def chat(body: dict) -> StreamingResponse:
        message = str(body.get("message", "")).strip()
        if not message:
            raise HTTPException(400, "message is required")

        async def events():
            yield sse("started", {"message": message})
            async for update in runtime.jarvis.astream(message):
                yield sse("step", {"update": update})
                for node_name, partial in update.items():
                    if isinstance(partial, dict) and partial.get("reply"):
                        yield sse("done", {"node": node_name, "reply": partial["reply"]})

        return StreamingResponse(events(), media_type="text/event-stream")

    @app.post("/api/voice/command")
    async def voice_command(body: dict) -> dict:
        text = str(body.get("text", body.get("command", ""))).strip()
        if not text:
            raise HTTPException(400, "text is required")
        result = runtime.jarvis.run(text)
        return {"intent": result.get("intent"), "reply": result.get("reply")}

    @app.get("/api/memory")
    def list_memory(q: str = "", k: int = 5) -> dict:
        results = recall(q or "", runtime.ctx, k=k) if q else []
        return {"count": len(results), "results": [m.to_dict() for m, _ in results]}

    @app.post("/api/memory")
    def write_memory(body: dict) -> dict:
        content = str(body.get("content", "")).strip()
        if not content:
            raise HTTPException(400, "content is required")
        entry = remember(content, runtime.ctx)
        return entry.to_dict()

    @app.get("/api/memory/graph")
    def memory_graph() -> dict:
        return runtime.graph.to_dict()

    @app.get("/api/flows")
    def list_flows() -> list[dict]:
        return runtime.list_flows()

    @app.post("/api/flows")
    def create_flow(body: dict) -> dict:
        try:
            return runtime.save_flow(body)
        except ValueError as exc:
            raise HTTPException(400, str(exc)) from exc

    @app.get("/api/flows/{flow_id}")
    def get_flow(flow_id: str) -> dict:
        try:
            return runtime.get_flow(flow_id).to_dict()
        except KeyError as exc:
            raise HTTPException(404, str(exc)) from exc

    @app.delete("/api/flows/{flow_id}")
    def delete_flow(flow_id: str) -> JSONResponse:
        try:
            runtime.delete_flow(flow_id)
        except KeyError as exc:
            raise HTTPException(404, str(exc)) from exc
        return JSONResponse({"deleted": flow_id})

    @app.post("/api/flows/{flow_id}/run")
    async def run_flow(flow_id: str, body: dict = {}) -> dict:
        try:
            flow = runtime.get_flow(flow_id)
        except KeyError as exc:
            raise HTTPException(404, str(exc)) from exc
        result = await runtime.engine.run(flow, flow_input=body.get("input"))
        if result.error:
            raise HTTPException(500, str(result.error))
        return {
            "executionId": result.execution_id,
            "status": {k: v for k, v in result.node_status.items() if k != "__error__"},
            "outputs": {k: _jsonable(v) for k, v in result.outputs.items()},
        }

    @app.get("/api/notes")
    def search_notes(q: str = "") -> dict:
        if not q:
            return {"count": 0, "results": []}
        return {"count": 0, "results": note_search(q, runtime.ctx)}

    @app.websocket("/ws/events")
    async def ws_events(websocket: WebSocket) -> None:
        await websocket.accept()
        conn = hub.connect()
        try:
            while True:
                event = await conn.queue.get()
                await websocket.send_json(event)
        except WebSocketDisconnect:
            hub.disconnect(conn)
        except Exception:
            hub.disconnect(conn)
            raise

    dist = root_dir / "web" / "dist"
    if dist.exists():
        app.mount("/", StaticFiles(directory=dist, html=True), name="ui")

    return app


def _jsonable(value: Any) -> Any:
    if value is None or isinstance(value, (str, int, float, bool)):
        return value
    if isinstance(value, dict):
        return {k: _jsonable(v) for k, v in value.items()}
    if isinstance(value, (list, tuple)):
        return [_jsonable(v) for v in value]
    return repr(value)
