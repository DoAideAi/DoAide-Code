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
from .usage import sonnet_equivalent
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
    totals = {"tasks": 0, "free_tasks": 0, "tokens_in": 0, "tokens_out": 0, "cost_usd": 0.0, "saved_usd": 0.0, "escalated": 0}
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
            totals["saved_usd"] += sonnet_equivalent(tokens_in, tokens_out)
        escalated = isinstance(route.get("escalated_from"), dict)
        totals["escalated"] += int(escalated)
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
                "escalated": escalated,
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


# Model comparison: measured on this user's own tasks, not published benchmarks. Cost is what
# each task cost (Claude CLI's API-equivalent figure; Ollama is free). Quality is how often a
# model's answers passed DoAide's checks (complete, code parses, edits apply, on topic) and, for
# local models, how often their first try was good enough to show without escalating.
MIN_TASKS = 5


def _kind(route: dict[str, Any]) -> str:
    executor = str(route.get("executor") or "")
    return "local" if route.get("free") or executor.startswith("ollama") else "paid"


def model_comparison(store: Store, user_email: str, *, days: int = 30, now: float | None = None) -> dict:
    now = now or time.time()
    days = max(1, min(int(days), 365))
    rows: dict[str, dict[str, Any]] = defaultdict(
        lambda: {"answered": 0, "escalated": 0, "checked": 0, "passed": 0, "cost_usd": 0.0, "tokens": 0,
                 "elapsed_ms": [], "would_cost_usd": 0.0, "kind": "paid"}
    )
    for row in store.replies_since(user_email, now - days * 86400):
        try:
            meta = json.loads(row["meta"])
        except (TypeError, ValueError):
            continue
        route, usage = meta.get("route"), meta.get("usage") if isinstance(meta.get("usage"), dict) else {}
        if not isinstance(route, dict) or route.get("executor") in {None, "direct", "unknown"} or usage.get("cached"):
            continue
        r = rows[_label(route)]
        r["kind"] = _kind(route)
        r["answered"] += 1
        r["cost_usd"] += float(usage.get("cost_usd") or 0)
        r["tokens"] += int(usage.get("tokens_in") or 0) + int(usage.get("tokens_out") or 0)
        r["would_cost_usd"] += float(route.get("would_cost_usd") or 0)
        if route.get("elapsed_ms"):
            r["elapsed_ms"].append(int(route["elapsed_ms"]))
        checks = (meta.get("checks") or {}).get("items") if isinstance(meta.get("checks"), dict) else None
        if checks:
            r["checked"] += 1
            r["passed"] += all(c.get("ok") for c in checks)
        if isinstance(escalated := route.get("escalated_from"), dict) and escalated.get("executor"):
            # The local model tried first and its answer failed a check: a miss for that model.
            gave_up = rows[_label(escalated)]
            gave_up["kind"] = "local"
            gave_up["escalated"] += 1

    def rate(part: int, whole: int) -> float | None:
        return round(part / whole, 3) if whole else None

    models = []
    for label, r in rows.items():
        tries = r["answered"] + r["escalated"]
        times = sorted(r["elapsed_ms"])
        models.append(
            {
                "model": label,
                "kind": r["kind"],
                "tasks": r["answered"],
                "escalated": r["escalated"],
                # Local: answers good enough on the first try. Paid: answers that passed every check.
                "quality": rate(r["answered"], tries) if r["kind"] == "local" else rate(r["passed"], r["checked"]),
                "cost_per_task": round(r["cost_usd"] / r["answered"], 6) if r["answered"] else None,
                "tokens_per_task": r["tokens"] // r["answered"] if r["answered"] else None,
                "median_seconds": round(times[len(times) // 2] / 1000, 1) if times else None,
                "saved_usd": round(r["would_cost_usd"], 4),
                "enough_data": tries >= MIN_TASKS,
            }
        )
    paid = [m for m in models if m["kind"] == "paid" and m["cost_per_task"]]
    sonnet = next((m for m in paid if "sonnet" in m["model"]), None)
    baseline = sonnet["cost_per_task"] if sonnet else None
    for m in models:
        m["cost_vs_sonnet"] = round(m["cost_per_task"] / baseline, 2) if baseline and m["cost_per_task"] is not None else None
    models.sort(key=lambda m: (m["kind"] != "local", m["cost_per_task"] or 0, m["model"]))
    return {"days": days, "baseline": sonnet["model"] if sonnet else None, "models": models}
