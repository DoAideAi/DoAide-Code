# Doaide Code

A multi-model coding harness. You chat in one panel; a router picks the cheapest
executor that can handle each message and streams the answer back.

| Tier | Cost | Executor |
| --- | --- | --- |
| 0 | free | Ollama (`qwen3-coder`, falls back to the smallest installed coder model) |
| 1 | low | Codex CLI (`o4-mini`), Claude Haiku |
| 2 | medium | Claude Sonnet (Claude Code CLI) |
| 3 | high | Claude Opus (Claude Code CLI) |

If the chosen executor is unavailable or fails before it says anything, the
harness escalates to the next tier, then falls back to cheaper ones.

## Layout

```
backend/            FastAPI harness server (Python 3.11+)
  doaide_code/
    main.py         REST API, /ws chat socket, /sync relay, serves frontend/dist
    router.py       Router Brain (Jev -> Gemini -> keyword heuristics)
    chat.py         orchestration: commands, routing, fallback, persistence, fan-out
    executors/      ollama.py, claude_cli.py, codex_cli.py, jev.py (TypeSafe SDK)
    gemini.py       Gemini client for product LLM calls (routing fallback, titles)
    db.py           SQLite: projects, sessions, messages, executor_stats
    auth.py         JWT + Google Sign-In
    sync.py         cross-device relay hub
  tests/
frontend/           React 18 + Vite + Tailwind 3.4 + Zustand chat UI
legacy/             earlier single-file prototype, kept for reference
```

## Run

```bash
# backend
cd backend
uv venv -p 3.12 .venv && uv pip install -p .venv -e ".[dev]"

# frontend (built once; FastAPI serves frontend/dist)
cd ../frontend && npm install && npm run build

# start the harness on :3097
cd ../backend && .venv/bin/doaide-code
```

Open http://127.0.0.1:3097. For UI work, `npm run dev` in `frontend/` serves on
:3098 and proxies `/api`, `/ws` and `/sync` to :3097.

Executors use what is installed locally: `ollama serve` with a coder model,
`claude` (signed in), and `codex` (signed in). API-key variables are removed
from the CLI environments so they run on your subscription logins.

## Routing

1. **Jev** asks TypeSafe `system_one` two typed questions: a `Choice` over
   tiers and a `Score` of complexity. A low-confidence choice defers to the
   complexity score.
2. If Jev has no key or fails, **Gemini** classifies with a JSON schema.
3. Offline, **keyword heuristics** decide.

## Chat commands

```
/add-project <name> <path>   register a folder (or /add-project <path>)
/remove-project <name>
/switch-project <name>       executors run with this folder as their working dir
/projects   /new   /help
```

## Cross-device sync

Every event (user message, stream deltas, completion, status) is fanned out to
all sockets of the same user. Desktop browsers use `/ws` (read-write). Screens
narrower than 768px use `/sync`, which is read-only, and hide the input bar.

Auth: a loopback browser gets a JWT from `POST /api/auth/local` as
`DOAIDE_OWNER_EMAIL`. Other devices sign in with Google (`POST /api/auth/google`)
and receive a JWT. Set `DOAIDE_OWNER_EMAIL` to your Google address so both
devices share one chat. Requests that carry proxy forwarding headers never get a
local token. Set `DOAIDE_REQUIRE_SSO=1` when exposing the server.

## Configuration

| Variable | Default |
| --- | --- |
| `DOAIDE_HOST` / `DOAIDE_PORT` | `127.0.0.1` / `3097` |
| `DOAIDE_DB` | `~/.doaide-code/doaide.db` |
| `OLLAMA_URL` / `DOAIDE_OLLAMA_MODEL` | `http://localhost:11434` / `qwen3-coder` |
| `DOAIDE_CODEX_MODEL` | `o4-mini` |
| `DOAIDE_CLAUDE_HAIKU_MODEL` / `_SONNET_MODEL` / `_OPUS_MODEL` | `haiku` / `claude-sonnet-4-5-20250514` / `opus` |
| `DOAIDE_CLI_TIMEOUT` | `600` seconds |
| `GEMINI_API_KEY` (or `GEMINI_API_KEY_FILE`) | read from `$DOAIDE_KEYS_DIR/gemini_api_key[.txt]` |
| `DOAIDE_GEMINI_MODEL` | `gemini-3.5-flash-lite` |
| `TYPESAFE_API_KEY` (or `TYPESAFE_API_KEY_FILE`) | read from `$DOAIDE_KEYS_DIR/typesafe_api_key.txt` |
| `DOAIDE_JWT_SECRET` | random per process (set it to keep sessions across restarts) |
| `GOOGLE_CLIENT_ID`, `DOAIDE_ALLOWED_EMAILS` | unset |
| `DOAIDE_OWNER_EMAIL` | `local` |
| `DOAIDE_REQUIRE_SSO`, `DOAIDE_OFFLINE_ROUTER` | off |

Keys stay on the server. The frontend only receives the public Google client ID.

## Tests

```bash
cd backend && .venv/bin/pytest -q
cd frontend && npm test
```
