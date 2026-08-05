"""jcode integration — invoke the jcode CLI (subprocess) for coding tasks.

jcode is the open-source Rust harness (https://jcode.sh/). The CLI is
interactive by default, so the exact non-interactive flags are configurable
(binary + args, overridable via env). If jcode is not installed the node
fails soft with a structured result.
"""
from __future__ import annotations

import logging
import os
import shutil
import subprocess
import time
from dataclasses import dataclass
from pathlib import Path
from typing import Optional

log = logging.getLogger("jarvis.jcode")

DEFAULT_ARGS = ["run", "--non-interactive"]


@dataclass
class JcodeResult:
    ok: bool
    output: str
    status: Optional[int] = None
    available: bool = True
    duration_ms: int = 0

    def to_dict(self) -> dict:
        return {
            "ok": self.ok,
            "output": self.output,
            "status": self.status,
            "available": self.available,
            "duration_ms": self.duration_ms,
        }


class JcodeClient:
    """Thin wrapper around the jcode binary."""

    def __init__(
        self,
        binary: Optional[str] = None,
        args: Optional[list[str]] = None,
        cwd: Optional[str | Path] = None,
        timeout: float = 900,
    ):
        self.binary = binary or os.environ.get("JARVIS_JCODE_BIN", "jcode")
        env_args = os.environ.get("JARVIS_JCODE_ARGS")
        self.args = list(args) if args is not None else (
            env_args.split() if env_args else DEFAULT_ARGS
        )
        self.cwd = str(cwd) if cwd else None
        self.timeout = timeout

    def available(self) -> bool:
        return shutil.which(self.binary) is not None

    def run_task(self, task: str, cwd: Optional[str | Path] = None) -> JcodeResult:
        command = [self.binary, *self.args, task]
        started = time.monotonic()
        try:
            proc = subprocess.run(
                command,
                cwd=str(cwd) if cwd else self.cwd,
                capture_output=True,
                text=True,
                timeout=self.timeout,
            )
            output = (proc.stdout or "") + (proc.stderr or "")
            return JcodeResult(
                ok=proc.returncode == 0,
                output=output.strip(),
                status=proc.returncode,
                duration_ms=int((time.monotonic() - started) * 1000),
            )
        except subprocess.TimeoutExpired:
            return JcodeResult(
                ok=False,
                output=f"jcode timed out after {self.timeout}s",
                duration_ms=int((time.monotonic() - started) * 1000),
            )
        except FileNotFoundError:
            return JcodeResult(
                ok=False,
                available=False,
                output="jcode CLI not found on PATH",
            )
