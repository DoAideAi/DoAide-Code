"""Per-task metrics: one JSON line per answered prompt (chat, phone, Tasks API) in
~/.doaide-code/metrics.jsonl, and the same summary for GET /api/v1/tasks/history.

A line: ts, prompt (first 100 characters), executor, model, cost_usd, response_time_seconds,
validation_result ("passed", or "failed: " and the failing checks), escalated, status, source.
"""

from __future__ import annotations

import datetime
import json
import logging
import os
from pathlib import Path
from typing import Any

log = logging.getLogger(__name__)

METRICS_FILE = Path(os.environ.get("DOAIDE_METRICS_FILE", str(Path.home() / ".doaide-code" / "metrics.jsonl")))
PROMPT_CHARS = 100


def validation_result(checks: list[dict[str, Any]]) -> str:
    failed = [str(c.get("name") or "check") for c in checks if not c.get("ok")]
    return f"failed: {', '.join(failed)}" if failed else "passed"


def summary(meta: dict[str, Any]) -> dict[str, Any]:
    """Model, cost, time, checks and escalation from a reply's meta (as stored, or Outcome.meta())."""
    route = meta.get("route") or {}
    usage = meta.get("usage") or {}
    elapsed_ms = route.get("elapsed_ms")
    return {
        "executor": route.get("executor"),
        "model": route.get("model"),
        "cost_usd": round(float(usage.get("cost_usd") or 0), 6),
        "response_time_seconds": round(elapsed_ms / 1000, 2) if elapsed_ms is not None else None,
        "validation_result": validation_result((meta.get("checks") or {}).get("items", [])),
        "escalated": bool(route.get("escalated_from")),
    }


def log_task(prompt: str, meta: dict[str, Any], *, status: str, source: str) -> None:
    """Append one task's line; a disk problem is logged, never raised into the task."""
    row = {
        "timestamp": datetime.datetime.now(datetime.UTC).isoformat(),
        "prompt": prompt[:PROMPT_CHARS],
        **summary(meta),
        "status": status,
        "source": source,
    }
    try:
        METRICS_FILE.parent.mkdir(parents=True, exist_ok=True)
        with METRICS_FILE.open("a") as fh:
            fh.write(json.dumps(row) + "\n")
    except OSError as exc:
        log.warning("could not write %s: %s", METRICS_FILE, exc)
