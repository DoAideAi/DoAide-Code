"""Benchmark: cost, quality and speed of each model on the same small coding tasks.

Every run goes through DoAide's own pipeline (run_job: context selection, prompts, checks, the
silent repair round, and writing the files), in a throwaway copy of a tiny project, so what is
measured is what users get. Quality is real: the task's tests run against the files DoAide
wrote. Cost is what the executors report (Claude CLI's API-equivalent figure; Ollama is free).
Speed is the wall-clock time of the whole task.

    python -m doaide_code.benchmark                 # every available model, plus "auto" routing
    python -m doaide_code.benchmark --only ollama ollama-coder --repeat 2

"auto" is DoAide's real routing (try a free local model, escalate to Sonnet if its answer fails
checks); the others run one model alone. Paid models cost real (subscription) usage.
"""

from __future__ import annotations

import argparse
import asyncio
import json
import shutil
import statistics
import subprocess
import sys
import tempfile
import time
from dataclasses import dataclass
from pathlib import Path

from .config import Settings
from .db import Store
from .executors import Executor, Job, OllamaExecutor, build_executors
from .router import RouterBrain
from .runner import Outcome, run_job


@dataclass(frozen=True)
class Task:
    name: str
    prompt: str
    files: dict[str, str]
    # Runs in the project folder after DoAide's answer; exit status 0 means solved.
    test: str


TASKS: list[Task] = [
    Task(
        "fix-bug",
        "add() in calc.py subtracts; fix it.",
        {"calc.py": "def add(a, b):\n    return a - b\n"},
        "from calc import add\nassert add(2, 3) == 5 and add(-1, 1) == 0",
    ),
    Task(
        "implement",
        "Implement is_palindrome in text.py: ignore case and anything that is not a letter or digit.",
        {"text.py": "def is_palindrome(s: str) -> bool:\n    raise NotImplementedError\n"},
        "from text import is_palindrome as p\n"
        "assert p('A man, a plan, a canal: Panama') and p('') and p('No lemon, no melon')\n"
        "assert not p('hello') and not p('ab')",
    ),
    Task(
        "off-by-one",
        "paginate() in pages.py drops the last item of every page. Fix it.",
        {
            "pages.py": "def paginate(items, page, size):\n"
            '    """Items on 1-based page `page` of `size` items."""\n'
            "    start = (page - 1) * size\n"
            "    return items[start:start + size - 1]\n"
        },
        "from pages import paginate\nxs = list(range(10))\n"
        "assert paginate(xs, 1, 3) == [0, 1, 2] and paginate(xs, 4, 3) == [9] and paginate(xs, 5, 3) == []",
    ),
    Task(
        "parse",
        "Implement parse_duration in duration.py: '1h30m' -> 5400, '45s' -> 45, '2h' -> 7200, "
        "'1h2m3s' -> 3723 (seconds). Raise ValueError for anything else.",
        {"duration.py": "def parse_duration(text: str) -> int:\n    raise NotImplementedError\n"},
        "from duration import parse_duration as d\n"
        "assert d('1h30m') == 5400 and d('45s') == 45 and d('2h') == 7200 and d('1h2m3s') == 3723\n"
        "for bad in ('', 'abc', '5x'):\n"
        "    try:\n        d(bad)\n    except ValueError:\n        pass\n"
        "    else:\n        raise AssertionError(bad)",
    ),
    Task(
        "multi-file",
        "Rename get_user to fetch_user in users.py and update its caller in app.py.",
        {
            "users.py": "def get_user(user_id):\n    return {'id': user_id}\n",
            "app.py": "from users import get_user\n\n\ndef handler(user_id):\n    return get_user(user_id)['id']\n",
        },
        "import users, app\nassert not hasattr(users, 'get_user') and users.fetch_user(3) == {'id': 3}\n"
        "assert app.handler(7) == 7",
    ),
    Task(
        "explain",
        "In one sentence: what does merge() in lists.py return?",
        {"lists.py": "def merge(a, b):\n    out = []\n    while a and b:\n        out.append((a if a[0] <= b[0] else b).pop(0))\n"
         "    return out + a + b\n"},
        # Answers, not files: the reply must say it is sorted / merged in order. Checked in run_task.
        "",
    ),
]
EXPLAIN_WORDS = ("sorted", "order", "ascending", "merged")


@dataclass
class Result:
    model: str
    task: str
    passed: bool
    cost_usd: float
    seconds: float
    answered_by: str
    note: str = ""
    # Answered by a free local model (False for paid ones, whether or not they reported a cost).
    free: bool = False
    # Why "auto" left the local model, when it did.
    escalated: str = ""


def check(task: Task, root: Path, answer: str) -> tuple[bool, str]:
    """Whether DoAide's answer solved the task: its tests pass on the files it wrote."""
    if not task.test:
        ok = any(w in answer.lower() for w in EXPLAIN_WORDS)
        return ok, "" if ok else "answer does not say the result is sorted"
    proc = subprocess.run(
        [sys.executable, "-I", "-B", "-c", f"import sys; sys.path.insert(0, '.')\n{task.test}"],
        cwd=root, capture_output=True, text=True, timeout=30,
    )
    return proc.returncode == 0, (proc.stderr.strip().splitlines() or [""])[-1][:160]


async def run_task(name: str, router: RouterBrain, task: Task, store: Store, *, verbose: bool = False) -> Result:
    root = Path(tempfile.mkdtemp(prefix="doaide-bench-"))
    try:
        for path, content in task.files.items():
            (root / path).write_text(content)

        async def nop(_chunk: str) -> None:
            pass

        started = time.monotonic()
        outcome = await run_job(router, store, Job(task.prompt, cwd=root), Outcome(), nop)
        seconds = time.monotonic() - started
        passed, note = check(task, root, outcome.content)
        cost = outcome.usage.cost_usd if outcome.usage else 0.0
        escalated = ((outcome.route or {}).get("escalated_from") or {}).get("reason", "")
        if not passed and verbose:
            print(f"--- {name} {task.name} answer:\n{outcome.content}\n---", file=sys.stderr)
        free = bool((outcome.route or {}).get("free"))
        return Result(name, task.name, passed, cost, seconds, outcome.executor or "none", note, escalated, free)
    finally:
        shutil.rmtree(root, ignore_errors=True)


def contenders(settings: Settings) -> dict[str, RouterBrain]:
    """One router per model (that model alone), plus DoAide's real routing as "auto"."""
    executors = build_executors(settings)
    extra = OllamaExecutor(settings.ollama_url, "deepseek-coder-v2:16b", name="deepseek-coder-v2", tier=1, context_chars=14_000)
    alone: dict[str, Executor] = {e.name: e for e in [*executors, extra] if e.name != "claude-haiku"}
    routers = {name: RouterBrain([e], offline=True) for name, e in alone.items()}
    routers["auto"] = RouterBrain(executors, offline=True)
    return routers


def summarize(results: list[Result]) -> list[dict]:
    rows = []
    for model in dict.fromkeys(r.model for r in results):
        mine = [r for r in results if r.model == model]
        rows.append(
            {
                "model": model,
                "quality": sum(r.passed for r in mine) / len(mine),
                "cost_per_task": sum(r.cost_usd for r in mine) / len(mine),
                # Paid answers with no reported cost (Codex) make the cost unknown, not free.
                "cost_known": all(r.free or r.cost_usd > 0 for r in mine),
                "median_seconds": statistics.median(r.seconds for r in mine),
                "tasks": len(mine),
                "escalated": sum(1 for r in mine if model == "auto" and not r.answered_by.startswith("ollama")),
            }
        )
    return rows


def markdown(rows: list[dict]) -> str:
    lines = [
        "| Model | Quality (tests pass) | Cost / task | Speed (median) |",
        "| --- | --- | --- | --- |",
    ]
    for r in sorted(rows, key=lambda r: (-r["quality"], r["cost_per_task"], r["median_seconds"])):
        if not r.get("cost_known", True):
            cost = "not reported"
        else:
            cost = "free" if r["cost_per_task"] == 0 else f"${r['cost_per_task']:.3f}"
        name = f"**{r['model']}** ({r['escalated']} of {r['tasks']} escalated)" if r["model"] == "auto" else r["model"]
        lines.append(f"| {name} | {r['quality']:.0%} | {cost} | {r['median_seconds']:.1f}s |")
    return "\n".join(lines)


async def main_async(args: argparse.Namespace) -> None:
    settings = Settings()
    settings.cache_ttl = 0
    store = Store(Path(tempfile.mkdtemp(prefix="doaide-bench-db-")) / "bench.db")
    routers = contenders(settings)
    names = [n for n in routers if not args.only or n in args.only]
    results: list[Result] = []
    for name in names:
        executor = routers[name].executors[0]
        if name != "auto" and not await executor.available():
            print(f"skip {name}: not available", file=sys.stderr)
            continue
        for task in [t for t in TASKS if not args.tasks or t.name in args.tasks]:
            for _ in range(args.repeat):
                result = await run_task(name, routers[name], task, store, verbose=args.verbose)
                results.append(result)
                mark = "pass" if result.passed else f"FAIL {result.note}"
                if result.escalated:
                    mark += f" (escalated: {result.escalated})"
                print(f"{name:20} {task.name:11} {result.seconds:6.1f}s ${result.cost_usd:.4f} {mark}", file=sys.stderr)
    rows = summarize(results)
    if args.json:
        Path(args.json).write_text(json.dumps({"rows": rows, "results": [r.__dict__ for r in results]}, indent=2))
    print(markdown(rows))


def main() -> None:
    parser = argparse.ArgumentParser(description=__doc__, formatter_class=argparse.RawDescriptionHelpFormatter)
    parser.add_argument("--only", nargs="*", help="models to run (default: all available, plus auto)")
    parser.add_argument("--tasks", nargs="*", help="task names to run (default: all)")
    parser.add_argument("--repeat", type=int, default=1)
    parser.add_argument("--json", help="also write the raw results here")
    parser.add_argument("--verbose", action="store_true", help="print the answer of every failed task")
    asyncio.run(main_async(parser.parse_args()))


if __name__ == "__main__":
    main()
