# J.A.R.V.I.S

Local-first personal AI assistant. Hears you, remembers (memory graph),
thinks (LangGraph agents), automates (n8n-style flows), lives in an Obsidian
vault, and shows animated execution in a web UI.

Architecture: see [ARCHITECTURE.md](ARCHITECTURE.md).

## Status

| Phase | Deliverable | Status |
|---|---|---|
| P0 | Memory graph protocol core (schema, graph, store, embeddings, cascade retrieval, maintenance) | ✅ done |
| P1 | Obsidian vault integration | ✅ done |
| P2 | LangGraph orchestrator + agents | ✅ done |
| P3 | Voice pipeline (wake, STT, TTS) | ✅ done |
| P4 | n8n-style workflow engine | ✅ done |
| P5 | Web UI + execution animation | ✅ done |
| P6 | jcode integration + polish | ✅ done |

## Run

```bash
# tests (74 pass)
python -m pytest

# headless flow run / chat CLI
python -m jarvis.cli flow run flows/morning-briefing.json
python -m jarvis.cli flow list flows
python -m jarvis.cli chat

# web UI + API  ->  http://127.0.0.1:8010
python run.py

# frontend dev (served via Vite proxy to :8010)
cd web && npm install && npm run dev
```

## Layout

```
src/jarvis/
  core/
    memory/     memory graph protocol + Obsidian sync + background maintenance
    agents/     LangGraph orchestrator + tools + voice agent
    voice/      wake word, faster-whisper STT, piper TTS
    workflows/  flow model, node registry, DAG executor, cron scheduler
    events.py   execution event bus (drives the UI animation)
    jcode.py    jcode CLI integration
  api/          FastAPI app, runtime, WebSocket fan-out
  cli.py        headless commands (flow run/list, schedule, chat)
flows/          example flow JSONs (morning-briefing)
web/            React + React Flow frontend (built to web/dist)
```

Optional extras: `pip install -e ".[embeddings,voice,agents,workflows,api,dev]"`.
