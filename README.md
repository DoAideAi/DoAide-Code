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
    mcp_server.py   `doaide-code mcp`: MCP server (stdio) exposing laptop tools to Claude
    router.py       Router Brain (local keyword heuristics)
    changes.py      edit blocks -> diff preview, checks, /apply
    chat.py         orchestration: commands, routing, fallback, persistence, fan-out
    executors/      ollama.py, claude_cli.py, codex_cli.py (all local, no API keys)
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

Everything runs on the laptop: tier 0 is Ollama (free), tier 1 Codex CLI / Claude
Haiku, tier 2 Claude Sonnet, tier 3 Claude Opus, all on your own subscription logins.
Local keyword heuristics pick the tier; the router tries that tier, escalates, then
falls back down. No API keys are used.

## Code changes: preview, then apply

Models answer with SEARCH/REPLACE edit blocks and never write files. Each answer's
blocks become a changeset: per-file diffs shown under the reply, quick checks (syntax,
ruff) on the result, and one automatic repair round if they fail. Nothing is written
until **Apply** in the UI, `/apply [<id>]`, or the MCP `apply_changes` tool; applying
refuses if a file changed since the preview. Every reply also shows its tokens and cost.

## Chat commands

```
/add-project <name> <path>   register a folder (or /add-project <path>)
/add-project <name>          create ~/doaide-code-workspace/<name> and register it
/workspace [<path>|reset]    show or change the default workspace folder
/remove-project <name>
/switch-project <name>       executors run with this folder as their working dir
/apply [<id>]   /discard [<id>]   proposed changes (latest pending if no id)
/usage                       tokens and cost today, this week, and this month
/projects   /new   /help
```

## Workspace

On the laptop, projects and files live under `~/doaide-code-workspace` by default
(`DOAIDE_WORKSPACE` changes the default). `/workspace <path>` switches it, and the
choice is saved in the laptop's local database (`settings` table). `/workspace reset`
goes back to the default. Prompts with no active project run in the workspace,
`/add-project <name>` creates `<workspace>/<name>`, and relative project paths are
resolved inside the workspace. In local mode, `GET`/`PUT /api/settings` reads and
writes the same value.

## Interface

Kept minimal: a top bar (project pill and status dot), the conversation, and the
input box. On desktop widths, one toggle opens a file tree and a read-only code
viewer for the active project (or the workspace). Both refresh after every answer,
so you can see what the executors changed. Phones show only the conversation and
the input box. On the hub, file listings are fetched from the laptop over its agent
connection; nothing is read from the server's disk.

## Sign-in

Sign in once per device. Login returns a short-lived access token (1 day,
`DOAIDE_JWT_TTL`) and a refresh token that never expires. The browser silently
trades the refresh token for new access tokens, including when the socket reports
an expired token. Refresh tokens are stored hashed in SQLite.
`POST /api/auth/logout {refresh_token}` revokes one, and removing an email from
`DOAIDE_ALLOWED_EMAILS` revokes that account's tokens on next use. The laptop
agent token from **Connect laptop** is the same kind of never-expiring, revocable
token, scoped to `/agent` only.

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
3. Click **Connect laptop** to get an agent token (never expires, revocable), then on the laptop run:

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

## MCP server (Claude → DoAide Code → laptop)

`doaide-code mcp` runs DoAide Code as a [Model Context Protocol](https://modelcontextprotocol.io)
server on the laptop. Claude (Desktop / Cowork / Claude Code) launches it as a
subprocess and talks JSON-RPC over stdin/stdout, so no network port is opened. Coding
work Claude dispatches runs on this laptop and the results go back to Claude.

| Tool | What it does |
| --- | --- |
| `get_status` | laptop online, which local LLMs are available, workspace, projects |
| `execute_code` | hand a coding task to the local executors (cheapest capable model; may edit files) |
| `read_file` / `write_file` / `edit_file` | file operations (edit = exact text replacement) |
| `run_command` | shell command in the project (stdin closed, timeout, output capped at 100 KB) |
| `list_files` | list a folder, optionally recursive (skips `.git`, `node_modules`, venvs) |
| `search_code` | literal or regex search with an optional file glob |

Every tool works inside the active project, or `~/doaide-code-workspace` when none is
active, or a registered project passed as `project`. Paths that resolve outside that
root (`..`, absolute paths elsewhere, symlinks) are refused. Read-only tools are marked
`readOnlyHint`, and writing tools are marked `destructiveHint`, so clients can ask
before running them. `execute_code` returns proposed edits as a diff preview under
`changes`; `apply_changes` / `discard_changes` write or drop them. The product itself
makes no LLM API calls.

**Claude Code**

```bash
claude mcp add doaide-code --scope user \
  -e DOAIDE_OWNER_EMAIL=you@example.com \
  -- /path/to/Doaide-Code/backend/.venv/bin/doaide-code mcp
```

**Claude Desktop / Cowork** (`~/Library/Application Support/Claude/claude_desktop_config.json`)

```json
{
  "mcpServers": {
    "doaide-code": {
      "command": "/path/to/Doaide-Code/backend/.venv/bin/doaide-code",
      "args": ["mcp"],
      "env": { "DOAIDE_OWNER_EMAIL": "you@example.com" }
    }
  }
}
```

Use the same `DOAIDE_OWNER_EMAIL` as the desktop app and agent, so the MCP server sees
the same active project. It reads the same local database (`DOAIDE_DB`).

**Remote (cloud sessions, Dispatch)**

The hub exposes the same tools at `POST https://code.doaide.com/api/v1/mcp/relay`: a
stateless MCP endpoint (Streamable HTTP with JSON responses) that forwards each JSON-RPC
request over the laptop agent's `/agent` socket and returns the laptop's answer. It
needs `doaide-code agent` running on the laptop (503 otherwise). Authenticate with
`Authorization: Bearer <token>`, using either a browser access token or a never-expiring
MCP token from `POST /api/mcp-token`; agent tokens are refused. Supported methods are
`initialize`, `ping`, `tools/list` and `tools/call`; notifications get 202. A call waits
up to about 30 minutes, and requests are capped at 2 MB.

Every relayed `tools/call` shows up in the DoAide Code UI (web and phone) in a
"Claude Code" conversation: the instruction the client sent, then the laptop's reply,
with `execute_code` output streaming in live and its diff preview, usage and cost when
it finishes. Calls within 30 minutes of each other share a conversation; the switcher
in the top bar lists every conversation (Claude Code ones are marked).

## Configuration

| Variable | Default |
| --- | --- |
| `DOAIDE_MODE` | `local` (runs executors) or `hub` (sync server only) |
| `DOAIDE_HUB_URL` / `DOAIDE_HUB_TOKEN` | laptop agent: `wss://code.doaide.com/agent` / unset |
| `DOAIDE_WORKSPACE` | `~/doaide-code-workspace` (default; `/workspace` overrides it per laptop) |
| `DOAIDE_HOST` / `DOAIDE_PORT` | `127.0.0.1` / `3097` |
| `DOAIDE_DB` | `~/.doaide-code/doaide.db` |
| `OLLAMA_URL` / `DOAIDE_OLLAMA_MODEL` | `http://localhost:11434` / `qwen3-coder` |
| `DOAIDE_CODEX_MODEL` | `o4-mini` |
| `DOAIDE_CLAUDE_HAIKU_MODEL` / `_SONNET_MODEL` / `_OPUS_MODEL` | `haiku` / `sonnet` / `opus` |
| `DOAIDE_CLI_TIMEOUT` | `600` seconds |
| `DOAIDE_JWT_SECRET` | random per process (set it so access tokens survive restarts; refresh tokens survive regardless) |
| `GOOGLE_CLIENT_ID`, `DOAIDE_ALLOWED_EMAILS` | unset |
| `DOAIDE_OWNER_EMAIL` | `local` |
| `DOAIDE_DISABLE_CODEX_CLI`, `DOAIDE_DISABLE_CLAUDE_CLI` | off |
| `DOAIDE_CACHE_TTL` | `86400` seconds (0 disables the response cache) |
| `DOAIDE_REQUIRE_SSO` | off |

No LLM keys are needed. The frontend only receives the public Google client ID.

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
