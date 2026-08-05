"""Scheduler — cron-triggered flow execution.

Implements a minimal 5-field cron parser (``* * * * *`` = min hour dom mon dow)
supporting lists, ranges and steps. A background thread wakes periodically,
fires any flow whose cron matches the current minute, and spawns the run on
the workflow engine.
"""
from __future__ import annotations

import logging
import threading
from dataclasses import dataclass
from datetime import datetime
from typing import Optional

from .executor import WorkflowEngine
from .model import Flow

log = logging.getLogger("jarvis.workflows.scheduler")

_MIN, _HOUR, _DOM, _MON, _DOW = range(0, 5)


class CronError(ValueError):
    pass


def parse_field(spec: str, lo: int, hi: int) -> set[int]:
    spec = spec.strip()
    if spec == "*":
        return set(range(lo, hi + 1))
    values: set[int] = set()
    for part in spec.split(","):
        part = part.strip()
        if not part:
            raise CronError(f"empty field in {spec!r}")
        step = 1
        if "/" in part:
            part, _, step_s = part.partition("/")
            step = int(step_s)
            if step < 1:
                raise CronError("step must be >= 1")
        if part == "*":
            base = range(lo, hi + 1)
        elif "-" in part:
            start_s, _, end_s = part.partition("-")
            base = range(int(start_s), int(end_s) + 1)
        else:
            base = [int(part)]
        for v in base:
            if not (lo <= v <= hi):
                raise CronError(f"{v} out of range [{lo}, {hi}]")
            if (v - lo) % step == 0:
                values.add(v)
    return values


@dataclass(frozen=True)
class CronSchedule:
    expression: str
    _fields: tuple[frozenset[int], ...] = ()

    def __init__(self, expression: str):
        parts = expression.split()
        if len(parts) != 5:
            raise CronError(f"expected 5 fields, got {len(parts)} in {expression!r}")
        object.__setattr__(self, "expression", expression)
        object.__setattr__(
            self,
            "_fields",
            (
                frozenset(parse_field(parts[_MIN], 0, 59)),
                frozenset(parse_field(parts[_HOUR], 0, 23)),
                frozenset(parse_field(parts[_DOM], 1, 31)),
                frozenset(parse_field(parts[_MON], 1, 12)),
                frozenset(parse_field(parts[_DOW], 0, 6)),
            ),
        )

    def matches(self, dt: datetime) -> bool:
        mins, hours, doms, mons, dows = self._fields
        if dt.minute not in mins or dt.hour not in hours:
            return False
        if dt.month not in mons:
            return False
        if dt.isoweekday() % 7 not in dows:
            return False
        if dt.day not in doms:
            return False
        return True


class Scheduler:
    """Thread that fires cron flows against a workflow engine."""

    def __init__(self, engine: WorkflowEngine, interval_seconds: float = 30.0):
        self.engine = engine
        self.interval = interval_seconds
        self._flows: list[tuple[Flow, CronSchedule]] = []
        self._thread: Optional[threading.Thread] = None
        self._stop = threading.Event()

    def register(self, flow: Flow) -> None:
        cron = flow.params.get("cron")
        if not cron:
            raise CronError(f"flow {flow.id} has no cron in params")
        schedule = CronSchedule(str(cron))
        self._flows.append((flow, schedule))
        log.info("registered flow %s on cron %s", flow.id, cron)

    def start(self) -> None:
        if self._thread and self._thread.is_alive():
            return
        self._stop.clear()
        self._thread = threading.Thread(target=self._loop, daemon=True, name="jarvis-scheduler")
        self._thread.start()

    def stop(self) -> None:
        self._stop.set()
        if self._thread:
            self._thread.join(timeout=2)

    def due(self, now: Optional[datetime] = None) -> list[Flow]:
        now = now or datetime.now()
        return [flow for flow, schedule in self._flows if schedule.matches(now)]

    def _loop(self) -> None:
        while not self._stop.is_set():
            for flow in self.due():
                log.info("triggering flow %s", flow.id)
                try:
                    self.engine.run_sync(flow)
                except Exception:
                    log.exception("flow %s failed", flow.id)
            self._stop.wait(self.interval)
