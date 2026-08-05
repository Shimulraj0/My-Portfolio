"""Dev launcher: python run.py  ->  http://127.0.0.1:8010  (override with JARVIS_PORT)"""
import os
import sys
from pathlib import Path

sys.path.insert(0, str(Path(__file__).parent / "src"))

import uvicorn

from jarvis.api import create_app

ROOT = Path(__file__).parent

if __name__ == "__main__":
    port = int(os.environ.get("JARVIS_PORT", "8010"))
    uvicorn.run(
        create_app(state_dir=str(ROOT / ".jarvis-state"), flow_dir=str(ROOT / "flows")),
        host="127.0.0.1",
        port=port,
    )
