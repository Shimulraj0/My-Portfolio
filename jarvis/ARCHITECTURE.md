# J.A.R.V.I.S — Architecture & Spec (v0.1)

> Status: **Approved 2026-08-04** — P0 (memory graph core) in progress
> Platform: **Local-first** (runs on this machine, no cloud dependency)
> Inspired by: **jcode** (open-source Rust agent harness — durable semantic memory graph, background tasks with live progress cards, swarms, SDK)

### Locked decisions

- **TTS**: Piper (offline) ✓
- **Vault**: dedicated `portfolio/jarvis/vault/` ✓

---

## 1. Vision

J.A.R.V.I.S is a personal AI assistant that:

- **Hears you** — wake word + speech-to-text, and **speaks back** via text-to-speech.
- **Remembers** — a durable memory **graph** (people, projects, facts, preferences, procedures) that auto-recalls relevant context, mirroring jcode's memory architecture.
- **Thinks** — LangGraph orchestrates specialized agents (memory, automation, voice, notes, coding).
- **Acts** — an **n8n-style automation engine** runs flows: triggers → nodes → branches → actions, with real-time **animated execution** in a web UI.
- **Lives in Obsidian** — the Obsidian vault is the knowledge brain: notes are memories, [[wikilinks]] are graph edges, and Obsidian's graph view is the memory visualizer.
- **Codes with jcode** — can launch jcode (via its SDK) as a sub-agent for coding tasks inside a flow.

## 2. Principles

1. **Local-first** — models (embeddings, STT, TTS) run locally where feasible. No mandatory cloud.
2. **Memory is a graph** — retrieval = embedding similarity + graph traversal (cascade retrieval), exactly like jcode.
3. **Obsidian is the source of truth for human knowledge** — J.A.R.V.I.S writes what it learns into the vault as notes the user can read/edit.
4. **Everything is observable** — every agent step and flow node streams a structured event to the UI for animation.
5. **Flows are data** — automation flows are JSON (nodes + edges), versionable, runnable headless or interactively.

## 3. Tech Stack

| Layer | Choice | Why |
|---|---|---|
| Language | Python 3.12 | LangGraph/LangChain ecosystem |
| Agent orchestration | LangGraph | Stateful graphs, checkpointing, streaming |
| Memory store | SQLite + `sqlite-vec` | Local, zero-server, vector search built-in |
| Embeddings | `sentence-transformers` all-MiniLM-L6-v2 | Local, ~384-d, mirrors jcode's embedder |
| Speech-to-text | `faster-whisper` (base/small) | Local, fast, accurate |
| Text-to-speech | `piper` (+ optional `edge-tts`) | Local, offline voices |
| Wake word | `openWakeWord` / Porcupine | Local, low-latency "Jarvis" wake |
| Audio I/O | `sounddevice` | PortAudio binding |
| Workflow engine | Custom DAG executor (JSON flows) | n8n-style semantics, full control |
| API/WS | FastAPI + uvicorn + WebSocket | Streaming events for animation |
| UI | Vite + React + **React Flow** | Node-graph canvas with animated edges/nodes (n8n uses the same visual language via Vue Flow) |
| Knowledge base | **Obsidian vault** (markdown) | Human-readable memories, graph view, freeform notes |
| Coding sub-agent | **jcode** (Rust SDK / CLI) | Optional coding/tool-use inside flows |

## 4. Repository Layout

```
portfolio/jarvis/
├── ARCHITECTURE.md          # this document
├── README.md
├── pyproject.toml           # Python deps + scripts
├── vault/                   # Obsidian vault (knowledge brain)
│   └── .obsidian/           # created by Obsidian
├── src/jarvis/
│   ├── __init__.py
│   ├── config.py            # paths, model choices, env
│   ├── core/
│   │   ├── memory/          # ★ memory graph protocol
│   │   │   ├── schema.py    #   node/edge models, memory types
│   │   │   ├── graph.py     #   in-memory graph + cascade retrieval
│   │   │   ├── store.py     #   SQLite + sqlite-vec persistence
│   │   │   ├── embeddings.py#   local embedder
│   │   │   ├── maintenance.py # post-retrieval maintenance
│   │   │   └── obsidian.py  #   vault <-> memory sync
│   │   ├── agents/          # LangGraph agents
│   │   │   ├── orchestrator.py
│   │   │   ├── memory_agent.py
│   │   │   ├── automation_agent.py
│   │   │   ├── obsidian_agent.py
│   │   │   └── voice_agent.py
│   │   ├── voice/
│   │   │   ├── wake.py      #   wake word listener
│   │   │   ├── stt.py       #   faster-whisper
│   │   │   └── tts.py       #   piper
│   │   ├── workflows/       # ★ n8n-style engine
│   │   │   ├── model.py     #   Flow/Node/Edge schema + validation
│   │   │   ├── nodes.py     #   node implementations
│   │   │   ├── executor.py  #   DAG executor, retries, streaming
│   │   │   └── registry.py  #   node type registry
│   │   └── events.py        # execution event bus (WebSocket + local)
│   ├── api/
│   │   ├── server.py        # FastAPI app
│   │   └── routes/          # memory, flows, voice, ws
│   └── ui/                  # Vite + React + React Flow (execution animation)
├── tests/
│   ├── test_memory_graph.py
│   ├── test_workflow_executor.py
│   └── ...
```

## 5. Memory Graph Protocol (★ core)

Mirrors jcode's memory architecture: **multi-layered, async, graph-based, cascade-retrieved**.

### 5.1 Node types

| Node | Description |
|---|---|
| **Memory** | Core entry: fact, preference, procedure, correction, negative, event, task |
| **Tag** | Explicit label (`#project:jarvis`, `#person:shimul`, `#preference`) |
| **Cluster** | Automatic grouping via embedding similarity |
| **Note** | Backed by an Obsidian note file (source-of-truth document) |

### 5.2 Edge types

| Edge | From → To | Meaning |
|---|---|---|
| `has_tag` | Memory → Tag | Memory carries this label |
| `in_cluster` | Memory → Cluster | Auto-assigned similarity group |
| `relates_to` | Memory → Memory | Semantic link, weight 0–1 |
| `supersedes` | Memory → Memory | Newer fact replaces older |
| `contradicts` | Memory → Memory | Conflicting info (both kept, flagged) |
| `derived_from` | Memory → Memory | Procedure derived from facts |
| `references` | Memory → Note | Backed by an Obsidian note / wikilink |

### 5.3 Memory entry schema (JSON)

```json
{
  "id": "mem_01...",
  "content": "User prefers 4-space indentation",
  "memory_type": "preference",
  "scope": "project",                 // global | project | session
  "provenance": "user_stated",        // user_stated|user_corrected|observed|inferred|extracted
  "confidence": 0.9,
  "strength": 3,                      // consolidation count
  "access_count": 12,
  "created_at": "...", "updated_at": "...", "last_accessed": "...",
  "tags": ["#preference", "#project:jarvis"],
  "note_id": "n_01...",               // optional Obsidian backing note
  "embedding": [0.013, ...]           // 384-d
}
```

### 5.4 Memory lifecycle

- **Write**: normalize → embed → detect conflicts (`contradicts`) → apply `supersedes` if a stronger/newer fact exists → persist → **sync to Obsidian** (write/update a note with YAML frontmatter).
- **Recall**: embed context → top-k cosine hits (threshold 0.4) → **BFS cascade** over `has_tag`/`in_cluster`/`relates_to` (depth 2, edge decay 0.7) → rank → inject into agent context.
- **Maintain** (background, non-blocking): strengthen links between co-relevant memories, boost/decay confidence, detect gaps, infer tags — same as jcode's post-retrieval maintenance.
- **Decay**: confidence decays per memory type (preference 90d half-life, fact 30d, inferred 7d, correction 365d). Recency boost: `1 + 0.5·e^(−hours/24)`.

### 5.5 Negative & procedural memories

- **Negative**: "Never do X" + trigger patterns; surfaced automatically when a pattern matches.
- **Procedure**: named steps with prerequisites and warnings → drives automation flows ("deploy" flow can be invoked from a memory).

### 5.6 Obsidian sync contract

Every memory with `note_id` maps to `vault/Memories/<id>.md`:

```markdown
---
id: mem_01...
type: preference
tags: [preference, project:jarvis]
confidence: 0.9
created: 2026-08-04
links: [[Some Note]], [[Another]]
---
User prefers 4-space indentation.
```

- [[wikilinks]] in notes ↔ `references` edges in the graph.
- Tags in notes ↔ `has_tag` edges.
- Obsidian's **graph view** is a live visualization of the memory graph.
- Two-way: notes edited in Obsidian are re-ingested on change (watcher).

## 6. Agent Layer (LangGraph)

A supervisor graph routes intent to sub-agents:

```
User/Voice → Orchestrator
  ├─ Memory Agent    (recall/remember, exposes memory tools)
  ├─ Automation Agent(trigger/status flows)
  ├─ Obsidian Agent  (search/create/edit notes)
  ├─ Voice Agent     (STT/TTS, wake word control)
  └─ Jcode Agent     (coding task → jcode SDK/CLI, optional)
```

- **Streaming**: LangGraph `.astream()` emits node names + messages → translated to execution events → UI.
- **Checkpointing**: LangGraph checkpointer (SQLite) so long multi-turn conversations survive restarts.
- **Tools**: each sub-agent exposes tools (memory.recall, memory.remember, flow.run, note.search...) used by the orchestrator and by automation flows.

## 7. Automation Engine (n8n-style)

### 7.1 Flow model (JSON)

```json
{
  "id": "flow_01",
  "name": "Morning Briefing",
  "nodes": [
    { "id": "n1", "type": "trigger.cron", "params": { "cron": "0 8 * * *" } },
    { "id": "n2", "type": "agent.langgraph", "params": { "agent": "memory", "prompt": "summarize my tasks" } },
    { "id": "n3", "type": "voice.tts", "params": { "text": "{{n2.output}}" } },
    { "id": "n4", "type": "notify.ui", "params": {} }
  ],
  "connections": {
    "n1": { "out": ["n2"] },
    "n2": { "out": ["n3", "n4"] }
  }
}
```

### 7.2 Node types (v1)

| Type | Purpose |
|---|---|
| `trigger.cron` / `trigger.manual` / `trigger.webhook` / `trigger.voice` | Start a flow |
| `agent.langgraph` | Invoke a J.A.R.V.I.S agent with a prompt (templated from upstream output) |
| `memory.recall` / `memory.remember` | Query / write to the memory graph |
| `llm` | Raw LLM call (via LangChain) |
| `obsidian.read` / `obsidian.write` | Note operations in the vault |
| `http` | Outbound request (webhook, API) |
| `code` | User-supplied Python/JS snippet (sandboxed) |
| `if` / `delay` | Branching + pacing |
| `voice.tts` / `voice.stt` | Speak an answer / transcribe audio |
| `notify.ui` | Push a card to the UI |
| `jcode.run` | Launch jcode for a coding task (optional) |

### 7.3 Executor

- Topological DAG execution; parallel branches run concurrently (asyncio).
- Per-node: input templating (`{{n.id.output.field}}`), retries with backoff, per-node timeout.
- Emits **execution events** on every transition → UI animation + logs.
- Runnable headless (`jarvis flow run flow_01`) or interactive.

## 8. Execution Animation

- FastAPI **WebSocket** `/ws/events` streams structured events:

```json
{ "type": "node.pending",  "executionId": "e1", "flowId": "flow_01", "nodeId": "n2" }
{ "type": "node.running",  "executionId": "e1", "nodeId": "n2", "progress": 0.4 }
{ "type": "edge.flow",     "executionId": "e1", "from": "n1", "to": "n2" }
{ "type": "node.completed","executionId": "e1", "nodeId": "n2", "output": {...} }
```

- React Flow renders: nodes pulse while running, edges animate (animated dashes) on data flow, progress bars in nodes, a live log/console panel, and memory-recall chips that pop in when the memory agent injects context.
- The same event bus drives agent "thinking" animation (jcode-style idle/thinking indicator) during LangGraph runs.

## 9. Voice Pipeline

```
Wake word ("Jarvis") → capture → faster-whisper STT → Orchestrator (LangGraph)
        → reply text → piper TTS → plays back
```

- Always-listening service with hotword; push-to-talk fallback.
- Voice agent also exposed as a flow node (`voice.stt`, `voice.tts`).
- Low-latency goals: wake < 150ms, STT < 1s for short commands (small model), TTS streamed as it's produced.

## 10. API Surface (v1)

| Method | Path | Purpose |
|---|---|---|
| POST | `/api/chat` | Text chat (streams SSE events) |
| POST | `/api/voice/command` | Send transcribed text |
| GET/POST | `/api/memory` | Query / write memories |
| GET | `/api/memory/graph` | Full graph (nodes+edges) for Obsidian-style viz |
| GET/POST/PUT/DELETE | `/api/flows` | Flow CRUD |
| POST | `/api/flows/:id/run` | Run a flow (streams events) |
| GET | `/api/notes` | Obsidian notes (search) |
| WS | `/ws/events` | Execution + agent events |

## 11. Phased Roadmap

| Phase | Deliverable | Exit criteria |
|---|---|---|
| **P0** | Memory graph protocol core (`schema`, `graph`, `store`, `embeddings`, cascade retrieval) | Unit tests pass; recall returns ranked, relevant memories |
| **P1** | Obsidian vault integration (bidirectional sync, frontmatter, wikilinks) | Memories round-trip to/from `vault/Memories/`; graph view shows links |
| **P2** | LangGraph orchestrator + agents (memory, obsidian) | `/api/chat` streams agent steps; memory injected into context |
| **P3** | Voice pipeline (wake, STT, TTS) + voice agent | Wake word → spoken reply round-trip |
| **P4** | n8n-style workflow engine (`model`, `nodes`, `executor`) | Example flow (cron → memory recall → TTS) runs headless |
| **P5** | Web UI + execution animation (React Flow + WS) | Run a flow in UI; nodes animate; logs stream |
| **P6** | jcode integration + polish | `jcode.run` node works; memory maintenance in background |

## 12. Decisions for Review

1. **STT model size**: `base` (~74M, faster) vs `small` (~244M, more accurate) — default `base`, switchable.
2. **TTS**: Piper (fully local, robotic-ish) vs `edge-tts` (natural, but network) — default Piper.
3. **Wake word engine**: `openWakeWord` (free) vs Porcupine (free tier, more accurate) — default openWakeWord.
4. **UI framework**: React + React Flow (rich) vs a lighter server-rendered canvas — default React + React Flow.
5. **Embeddings**: local `all-MiniLM-L6-v2` (384-d, fast, offline) — final.
6. **jcode integration**: via Rust SDK (needs jcode installed) vs CLI subprocess — default CLI subprocess first.
7. **Vault location**: `portfolio/jarvis/vault/` vs your existing personal vault — default dedicated `vault/`.
