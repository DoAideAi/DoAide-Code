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
    main.py         REST API, /ws chat socket, /sync relay, /agent (hub), serves frontend/dist
    relay.py        hub mode: stores + queues prompts, relays them to the laptop agent
    agent.py        laptop agent: `doaide-code agent`, runs relayed prompts locally
    runner.py       one prompt through the executors with fallback (laptop only)
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

## Cross-device sync (hub + laptop agent)

The hosted server at code.doaide.com runs in **hub mode** (`DOAIDE_MODE=hub`). It
stores conversations and syncs them between devices, and it runs no models or LLM
calls. All code execution happens on your laptop:

```
phone / laptop browser ──/ws──▶ hub (code.doaide.com) ◀──/agent── laptop agent
                                 stores + queues                  Ollama / Claude / Codex
```

1. Sign in at code.doaide.com from any device. Every device can read and send.
2. Prompts are saved and queued on the hub. While the laptop is offline the status
   dot is gray and a banner says so.
3. Click **Connect laptop** to get a long-lived agent token, then on the laptop run:

   ```bash
   cd backend
   DOAIDE_HUB_URL=wss://code.doaide.com/agent DOAIDE_HUB_TOKEN=<token> .venv/bin/doaide-code agent
   ```

   The agent connects out to the hub (no inbound port needed), runs one prompt at
   a time with the local executors and project registry, and streams the answer
   back to every device. Slash commands such as `/add-project` run on the laptop,
   because the project folders live there. `/new` is handled by the hub.

If no executor is available, the laptop reports that as the answer. The hub never
checks for executors. If the laptop disconnects mid-answer, that reply is marked as
failed and the next prompt waits for it to reconnect.

Running `doaide-code` without `agent` is still a self-contained **local mode**: the
same server runs the executors itself, for single-machine use at
http://127.0.0.1:3097.

Auth: a loopback browser in local mode gets a JWT from `POST /api/auth/local` as
`DOAIDE_OWNER_EMAIL`. Other devices sign in with Google (`POST /api/auth/google`).
Set `DOAIDE_OWNER_EMAIL` to your Google address on the laptop so its project
registry belongs to the same account. Requests that carry proxy forwarding headers
never get a local token. Agent tokens (`POST /api/agent-token`) only work on
`/agent`, and browser tokens never work there.

## Configuration

| Variable | Default |
| --- | --- |
| `DOAIDE_MODE` | `local` (runs executors) or `hub` (sync server only) |
| `DOAIDE_HUB_URL` / `DOAIDE_HUB_TOKEN` | laptop agent: `wss://code.doaide.com/agent` / unset |
| `DOAIDE_AGENT_TTL` | `7776000` seconds (90 days) |
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

## Deploy

Production runs at https://code.doaide.com on the shared Hetzner box. Caddy
(`knol-caddy` container) sends `/api/*`, `/ws` and `/sync` to the API on
`172.18.0.1:3097` and everything else to the static frontend on
`172.18.0.1:3098`. Both are systemd units (`deploy/*.service`).

```bash
deploy/deploy.sh                              # redeploy (keeps the server .env and data/)
DOAIDE_ENV_FILE=/path/to/env deploy/deploy.sh # first deploy: also uploads backend/.env
```

The script builds the frontend, uploads a `git archive` of `HEAD` plus
`frontend/dist`, installs the backend into `/opt/DoAide-Code/.venv`, restarts
both units and appends `deploy/code.doaide.com.caddy` to the Caddyfile once.
