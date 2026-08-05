"""J.A.R.V.I.S command-line interface.

Headless entry points: run flows, list flows, start the cron scheduler.
"""
from __future__ import annotations

import argparse
import json
import logging
import signal
import sys
from pathlib import Path
from typing import Optional

from .core.workflows import Scheduler, WorkflowEngine

log = logging.getLogger("jarvis.cli")


def _load_flow(path: str):
    from .core.workflows import Flow

    return Flow.from_json(path)


def _cmd_flow_run(args: argparse.Namespace) -> int:
    flow = _load_flow(args.file)
    engine = WorkflowEngine()
    if args.input:
        flow_input = json.loads(args.input)
    else:
        flow_input = None
    result = engine.run_sync(flow, flow_input)
    print(json.dumps({"flow": flow.id, "status": {k: v for k, v in result.node_status.items() if k != "__error__"}, "outputs": result.outputs}, indent=2, default=str))
    return 1 if result.error else 0


def _cmd_flow_list(args: argparse.Namespace) -> int:
    directory = Path(args.dir)
    for path in sorted(directory.glob("*.json")):
        try:
            flow = _load_flow(str(path))
            print(f"{flow.id:24s} {flow.name}")
        except Exception as exc:
            print(f"{path.name:24s} (invalid: {exc})")
    return 0


def _cmd_schedule(args: argparse.Namespace) -> int:
    engine = WorkflowEngine()
    scheduler = Scheduler(engine)
    directory = Path(args.dir)
    for path in sorted(directory.glob("*.json")):
        flow = _load_flow(str(path))
        scheduler.register(flow)
    def _stop(_sig, _frame):
        scheduler.stop()
        sys.exit(0)
    signal.signal(signal.SIGINT, _stop)
    scheduler.start()
    print(f"scheduler running with {len(scheduler._flows)} flow(s); Ctrl+C to stop")
    signal.pause()
    return 0


def _cmd_chat(args: argparse.Namespace) -> int:
    from .core.agents import AgentContext, Jarvis
    from .core.memory import HashEmbedder, MemoryStore
    from .core.memory.obsidian import MemoryVault, Vault

    state_dir = Path(args.state).expanduser()
    mv = MemoryVault(Vault(state_dir / "vault"))
    store = MemoryStore(state_dir / "jarvis.db")
    graph = store.load_graph(embedder=HashEmbedder())
    jarvis = Jarvis(AgentContext(graph=graph, vault=mv, store=store))
    print("J.A.R.V.I.S. interactive (Ctrl+C to exit)")
    try:
        while True:
            message = input("> ").strip()
            if not message:
                continue
            result = jarvis.run(message)
            print(result["reply"])
    except (KeyboardInterrupt, EOFError):
        pass
    finally:
        store.close()
    return 0


def main(argv: Optional[list[str]] = None) -> int:
    parser = argparse.ArgumentParser(prog="jarvis", description="J.A.R.V.I.S local-first assistant")
    sub = parser.add_subparsers(dest="command", required=True)

    flow = sub.add_parser("flow", help="workflow commands")
    flow_sub = flow.add_subparsers(dest="action", required=True)
    flow_run = flow_sub.add_parser("run", help="run a flow file headless")
    flow_run.add_argument("file")
    flow_run.add_argument("--input", help="JSON payload for the flow input")
    flow_run.set_defaults(func=_cmd_flow_run)
    flow_list = flow_sub.add_parser("list", help="list flows in a directory")
    flow_list.add_argument("dir")
    flow_list.set_defaults(func=_cmd_flow_list)

    sched = sub.add_parser("schedule", help="run the cron scheduler")
    sched_sub = sched.add_subparsers(dest="action", required=True)
    sched_start = sched_sub.add_parser("start")
    sched_start.add_argument("dir", help="directory of flow JSON files")
    sched_start.set_defaults(func=_cmd_schedule)

    chat = sub.add_parser("chat", help="interactive text chat")
    chat.add_argument("--state", default="~/.jarvis")
    chat.set_defaults(func=_cmd_chat)

    logging.basicConfig(level=logging.WARNING)
    args = parser.parse_args(argv)
    try:
        return args.func(args)
    except Exception as exc:
        print(f"error: {exc}", file=sys.stderr)
        return 1


if __name__ == "__main__":
    raise SystemExit(main())
