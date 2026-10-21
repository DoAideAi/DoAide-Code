"""Usage dashboard: tokens, cost and which model handled each task, from the replies' meta.

Every reply stores its usage and route (the executor and model that answered), so the report
works the same on the hub and on a local server, and includes MCP-relayed tasks. Claude CLI
costs are the API-equivalent amounts Claude Code reports (subscription runs are not billed per
token); Ollama, direct answers and cache hits are free. "Saved" prices the free tasks' tokens at
Claude Sonnet rates: what they would have cost had they gone to the default paid model.
"""

from __future__ import annotations

import json
import time
from collections import defaultdict
from typing import Any

from .db import Store

# Claude Sonnet list price per 1M tokens (input, output): the comparison for "saved".
SONNET_RATES = (3.00, 15.00)
RECENT_TASKS = 40


def _label(route: dict[str, Any]) -> str:
    executor = route.get("executor") or "unknown"
    if executor == "direct":
        return "No model (direct)"
    model = route.get("model")
    return f"{executor} · {model}" if model and model not in executor else executor


def usage_report(store: Store, user_email: str, *, days: int = 7, tz_offset_min: int = 0, now: float | None = None) -> dict:
    """Totals, a per-day series (local days via `tz_offset_min`, as JS getTimezoneOffset gives
    it), a per-model breakdown and the most recent tasks."""
    now = now or time.time()
    days = max(1, min(int(days), 90))
    shift = -tz_offset_min * 60

    def day_of(ts: float) -> str:
        return time.strftime("%Y-%m-%d", time.gmtime(ts + shift))

    # From local midnight `days - 1` days ago, so totals and the daily series cover the same span.
    today_start = (now + shift) // 86400 * 86400 - shift
    since = today_start - (days - 1) * 86400
    daily = {day_of(now - i * 86400): {"tasks": 0, "free_tasks": 0, "tokens": 0, "cost_usd": 0.0} for i in range(days)}
    models: dict[str, dict[str, Any]] = defaultdict(
        lambda: {"tasks": 0, "tokens_in": 0, "tokens_out": 0, "cost_usd": 0.0, "free": True}
    )
    totals = {"tasks": 0, "free_tasks": 0, "tokens_in": 0, "tokens_out": 0, "cost_usd": 0.0, "saved_usd": 0.0}
    recent: list[dict[str, Any]] = []

    for row in store.replies_since(user_email, since):
        try:
            meta = json.loads(row["meta"])
        except (TypeError, ValueError):
            continue
        usage, route = meta.get("usage"), meta.get("route")
        if not isinstance(usage, dict) and not isinstance(route, dict):
            continue  # changes-only updates, notices
        usage = usage if isinstance(usage, dict) else {}
        route = route if isinstance(route, dict) else {"executor": "unknown"}
        tokens_in, tokens_out = int(usage.get("tokens_in") or 0), int(usage.get("tokens_out") or 0)
        cost = float(usage.get("cost_usd") or 0)
        free = bool(route.get("free")) or bool(usage.get("cached")) or (cost == 0 and route.get("executor") == "direct")
        label = _label(route)

        totals["tasks"] += 1
        totals["tokens_in"] += tokens_in
        totals["tokens_out"] += tokens_out
        totals["cost_usd"] += cost
        if free:
            totals["free_tasks"] += 1
            totals["saved_usd"] += (tokens_in * SONNET_RATES[0] + tokens_out * SONNET_RATES[1]) / 1e6
        m = models[label]
        m["tasks"] += 1
        m["tokens_in"] += tokens_in
        m["tokens_out"] += tokens_out
        m["cost_usd"] += cost
        m["free"] = m["free"] and free
        d = daily.get(day_of(row["created_at"]))
        if d is not None:
            d["tasks"] += 1
            d["free_tasks"] += int(free)
            d["tokens"] += tokens_in + tokens_out
            d["cost_usd"] += cost
        checks = (meta.get("checks") or {}).get("items") if isinstance(meta.get("checks"), dict) else None
        recent.append(
            {
                "id": row["id"],
                "created_at": row["created_at"],
                "prompt": (row["prompt"] or "")[:120],
                "source": row["source"] or "chat",
                "model": label,
                "tier": route.get("tier"),
                "kind": route.get("kind"),
                "tokens": tokens_in + tokens_out,
                "cost_usd": round(cost, 6),
                "free": free,
                "checks_ok": all(c.get("ok") for c in checks) if checks else None,
                "status": row["status"],
            }
        )

    share = totals["free_tasks"] / totals["tasks"] if totals["tasks"] else 0.0
    by_model = sorted(
        ({"model": k, **v, "cost_usd": round(v["cost_usd"], 6)} for k, v in models.items()),
        key=lambda m: (-m["tasks"], m["model"]),
    )
    return {
        "days": days,
        "totals": {
            **totals,
            "cost_usd": round(totals["cost_usd"], 6),
            "saved_usd": round(totals["saved_usd"], 4),
            "free_share": round(share, 3),
        },
        "headline": headline(totals["tasks"], share),
        "daily": [{"date": k, **v, "cost_usd": round(v["cost_usd"], 6)} for k, v in sorted(daily.items())],
        "by_model": by_model,
        "recent": list(reversed(recent[-RECENT_TASKS:])),
    }


def headline(tasks: int, free_share: float) -> str:
    if not tasks:
        return "No tasks yet in this period."
    return f"Free local models and direct answers handled {round(free_share * 100)}% of {tasks} tasks at no cost."
