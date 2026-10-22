// The code templates library (/tools/code-templates): pre-built starting points for the patterns
// people write over and over. Everything is static and runs in the page; Copy puts the code on
// the clipboard, and each card links into the AI tools for a walkthrough.

export const TEMPLATE_CATEGORIES = ['All', 'React', 'JavaScript', 'Python', 'API', 'SQL', 'Go', 'HTML']

export const TEMPLATES = [
  {
    id: 'react-component',
    name: 'React functional component',
    category: 'React',
    language: 'JavaScript',
    description: 'A typed-props component with state, an effect and an accessible loading state.',
    code: `import { useEffect, useState } from 'react'

export default function UserCard({ userId, onSelect }) {
  const [user, setUser] = useState(null)
  const [error, setError] = useState(null)

  useEffect(() => {
    let active = true
    fetch(\`/api/users/\${userId}\`)
      .then((r) => (r.ok ? r.json() : Promise.reject(new Error(\`HTTP \${r.status}\`))))
      .then((data) => active && setUser(data))
      .catch((e) => active && setError(e.message))
    return () => {
      active = false
    }
  }, [userId])

  if (error) return <p role="alert">Could not load user: {error}</p>
  if (!user) return <p aria-busy="true">Loading…</p>
  return (
    <button type="button" onClick={() => onSelect(user)}>
      <strong>{user.name}</strong>
      <span>{user.email}</span>
    </button>
  )
}`,
  },
  {
    id: 'react-hook',
    name: 'React custom hook (useFetch)',
    category: 'React',
    language: 'JavaScript',
    description: 'A reusable data-fetching hook with loading, error and abort on unmount.',
    code: `import { useEffect, useState } from 'react'

export function useFetch(url) {
  const [data, setData] = useState(null)
  const [error, setError] = useState(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const controller = new AbortController()
    setLoading(true)
    setError(null)
    fetch(url, { signal: controller.signal })
      .then((r) => (r.ok ? r.json() : Promise.reject(new Error(\`HTTP \${r.status}\`))))
      .then(setData)
      .catch((e) => e.name !== 'AbortError' && setError(e))
      .finally(() => setLoading(false))
    return () => controller.abort()
  }, [url])

  return { data, error, loading }
}`,
  },
  {
    id: 'express-api',
    name: 'Express REST API',
    category: 'API',
    language: 'JavaScript',
    description: 'A small Express router with validation, async error handling and the usual CRUD routes.',
    code: `import express from 'express'

const app = express()
app.use(express.json())

const todos = new Map()
let nextId = 1

app.get('/todos', (req, res) => {
  res.json([...todos.values()])
})

app.post('/todos', (req, res) => {
  const { title } = req.body ?? {}
  if (typeof title !== 'string' || !title.trim()) {
    return res.status(400).json({ error: 'title is required' })
  }
  const todo = { id: nextId++, title: title.trim(), done: false }
  todos.set(todo.id, todo)
  res.status(201).json(todo)
})

app.patch('/todos/:id', (req, res) => {
  const todo = todos.get(Number(req.params.id))
  if (!todo) return res.status(404).json({ error: 'not found' })
  Object.assign(todo, { done: Boolean(req.body?.done) })
  res.json(todo)
})

app.use((err, req, res, next) => {
  console.error(err)
  res.status(500).json({ error: 'internal error' })
})

app.listen(3000, () => console.log('listening on :3000'))`,
  },
  {
    id: 'fetch-retry',
    name: 'fetch with timeout and retry',
    category: 'JavaScript',
    language: 'JavaScript',
    description: 'A fetch wrapper that times out, retries transient failures with backoff, and throws rich errors.',
    code: `export async function fetchJson(url, { retries = 3, timeoutMs = 10_000, ...init } = {}) {
  let lastError
  for (let attempt = 0; attempt < retries; attempt++) {
    const controller = new AbortController()
    const timer = setTimeout(() => controller.abort(), timeoutMs)
    try {
      const resp = await fetch(url, { ...init, signal: controller.signal })
      if (resp.status >= 500 || resp.status === 429) {
        throw new Error(\`retryable HTTP \${resp.status}\`)
      }
      if (!resp.ok) throw new Error(\`HTTP \${resp.status} for \${url}\`)
      return await resp.json()
    } catch (e) {
      lastError = e
      if (e.name !== 'AbortError' && !String(e.message).startsWith('retryable')) throw e
      await new Promise((r) => setTimeout(r, 2 ** attempt * 500))
    } finally {
      clearTimeout(timer)
    }
  }
  throw lastError
}`,
  },
  {
    id: 'debounce-throttle',
    name: 'Debounce and throttle',
    category: 'JavaScript',
    language: 'JavaScript',
    description: 'The two rate-limiting helpers everyone re-implements, with trailing-call handling.',
    code: `export function debounce(fn, waitMs) {
  let timer
  return function debounced(...args) {
    clearTimeout(timer)
    timer = setTimeout(() => fn.apply(this, args), waitMs)
  }
}

export function throttle(fn, intervalMs) {
  let last = 0
  let trailing
  return function throttled(...args) {
    const now = Date.now()
    clearTimeout(trailing)
    if (now - last >= intervalMs) {
      last = now
      fn.apply(this, args)
    } else {
      trailing = setTimeout(() => {
        last = Date.now()
        fn.apply(this, args)
      }, intervalMs - (now - last))
    }
  }
}`,
  },
  {
    id: 'python-dataclass',
    name: 'Python class (dataclass)',
    category: 'Python',
    language: 'Python',
    description: 'A dataclass with validation, a computed property and a classmethod constructor.',
    code: `from dataclasses import dataclass, field
from datetime import date


@dataclass
class Invoice:
    number: str
    amount: float
    issued: date = field(default_factory=date.today)
    paid: bool = False

    def __post_init__(self):
        if self.amount <= 0:
            raise ValueError(f"amount must be positive, got {self.amount}")
        if not self.number.strip():
            raise ValueError("number is required")

    @property
    def gst(self) -> float:
        """18% GST on the base amount."""
        return round(self.amount * 0.18, 2)

    @classmethod
    def from_dict(cls, data: dict) -> "Invoice":
        return cls(
            number=data["number"],
            amount=float(data["amount"]),
            issued=date.fromisoformat(data.get("issued", date.today().isoformat())),
            paid=bool(data.get("paid", False)),
        )`,
  },
  {
    id: 'python-cli',
    name: 'Python CLI (argparse)',
    category: 'Python',
    language: 'Python',
    description: 'A command-line script with subcommands, typed arguments and exit codes.',
    code: `import argparse
import sys


def build_parser() -> argparse.ArgumentParser:
    parser = argparse.ArgumentParser(prog="tasks", description="Manage a todo list")
    sub = parser.add_subparsers(dest="command", required=True)

    add = sub.add_parser("add", help="add a task")
    add.add_argument("title")
    add.add_argument("--priority", type=int, choices=range(1, 4), default=2)

    done = sub.add_parser("done", help="mark a task done")
    done.add_argument("task_id", type=int)

    return parser


def main(argv: list[str] | None = None) -> int:
    args = build_parser().parse_args(argv)
    if args.command == "add":
        print(f"added {args.title!r} with priority {args.priority}")
    elif args.command == "done":
        print(f"task {args.task_id} done")
    return 0


if __name__ == "__main__":
    sys.exit(main())`,
  },
  {
    id: 'fastapi-endpoint',
    name: 'FastAPI endpoint',
    category: 'API',
    language: 'Python',
    description: 'A FastAPI app with a validated request model, path params and error responses.',
    code: `from fastapi import FastAPI, HTTPException
from pydantic import BaseModel, Field

app = FastAPI()

ITEMS: dict[int, dict] = {}


class ItemIn(BaseModel):
    name: str = Field(min_length=1, max_length=100)
    price: float = Field(gt=0)


@app.post("/items", status_code=201)
def create_item(item: ItemIn):
    item_id = len(ITEMS) + 1
    ITEMS[item_id] = {"id": item_id, **item.model_dump()}
    return ITEMS[item_id]


@app.get("/items/{item_id}")
def read_item(item_id: int):
    if item_id not in ITEMS:
        raise HTTPException(status_code=404, detail="item not found")
    return ITEMS[item_id]`,
  },
  {
    id: 'sql-crud',
    name: 'SQL table + CRUD',
    category: 'SQL',
    language: 'SQL',
    description: 'A table with constraints and the four statements you always need, parameterized.',
    code: `CREATE TABLE users (
  id BIGSERIAL PRIMARY KEY,
  email TEXT NOT NULL UNIQUE,
  name TEXT NOT NULL,
  active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Create
INSERT INTO users (email, name)
VALUES ($1, $2)
RETURNING id;

-- Read
SELECT id, email, name, created_at
FROM users
WHERE active = true
ORDER BY created_at DESC
LIMIT 20;

-- Update
UPDATE users
SET name = $2
WHERE id = $1
RETURNING id, name;

-- Delete (soft)
UPDATE users
SET active = false
WHERE id = $1;`,
  },
  {
    id: 'go-http',
    name: 'Go HTTP server',
    category: 'Go',
    language: 'Go',
    description: 'A net/http server with a JSON handler, graceful shutdown and sensible timeouts.',
    code: `package main

import (
	"context"
	"encoding/json"
	"log"
	"net/http"
	"os"
	"os/signal"
	"time"
)

func main() {
	mux := http.NewServeMux()
	mux.HandleFunc("GET /health", func(w http.ResponseWriter, r *http.Request) {
		w.Header().Set("Content-Type", "application/json")
		json.NewEncoder(w).Encode(map[string]string{"status": "ok"})
	})

	srv := &http.Server{
		Addr:         ":8080",
		Handler:      mux,
		ReadTimeout:  5 * time.Second,
		WriteTimeout: 10 * time.Second,
	}

	go func() {
		log.Println("listening on :8080")
		if err := srv.ListenAndServe(); err != http.ErrServerClosed {
			log.Fatal(err)
		}
	}()

	stop := make(chan os.Signal, 1)
	signal.Notify(stop, os.Interrupt)
	<-stop

	ctx, cancel := context.WithTimeout(context.Background(), 5*time.Second)
	defer cancel()
	srv.Shutdown(ctx)
}`,
  },
  {
    id: 'html-boilerplate',
    name: 'HTML5 page boilerplate',
    category: 'HTML',
    language: 'HTML',
    description: 'A minimal, valid page with viewport, SEO metas, and dark-mode-aware styles.',
    code: `<!doctype html>
<html lang="en">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <title>My Page</title>
  <meta name="description" content="One sentence for search engines." />
  <style>
    :root { color-scheme: light dark; }
    body {
      margin: 0 auto;
      max-width: 70ch;
      padding: 2rem 1rem;
      font-family: system-ui, sans-serif;
      line-height: 1.6;
    }
  </style>
</head>
<body>
  <header><h1>My Page</h1></header>
  <main>
    <p>Hello, world.</p>
  </main>
  <footer><small>&copy; 2026</small></footer>
</body>
</html>`,
  },
  {
    id: 'js-test',
    name: 'Unit test (Vitest/Jest)',
    category: 'JavaScript',
    language: 'JavaScript',
    description: 'A test file with setup, a happy path, an edge case and a mocked dependency.',
    code: `import { beforeEach, describe, expect, it, vi } from 'vitest'
import { fetchJson } from './fetchJson.js'

describe('fetchJson', () => {
  beforeEach(() => vi.restoreAllMocks())

  it('returns the parsed body on success', async () => {
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue({ ok: true, status: 200, json: async () => ({ id: 1 }) }))
    await expect(fetchJson('/api/items/1')).resolves.toEqual({ id: 1 })
  })

  it('throws on a non-OK status', async () => {
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue({ ok: false, status: 404, json: async () => ({}) }))
    await expect(fetchJson('/api/items/404', { retries: 1 })).rejects.toThrow('HTTP 404')
  })
})`,
  },
]

// The templates shown for a category pick plus a search phrase.
export function filterTemplates(category, query = '') {
  const q = query.trim().toLowerCase()
  return TEMPLATES.filter(
    (t) =>
      (category === 'All' || t.category === category) &&
      (!q || `${t.name} ${t.description} ${t.language} ${t.category}`.toLowerCase().includes(q)),
  )
}
