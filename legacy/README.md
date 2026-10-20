# Doaide Code

A local-first coding chat for working with the files in a selected project
folder. Doaide Code routes requests automatically: routine questions and small
changes start on a local Ollama model; broad code changes go to Codex CLI; and
architecture, security, or review requests go to Claude Code CLI. If a chosen
provider fails, Doaide tries the next available model. A request can explicitly
ask for GPT/Codex or Claude when needed.

## Start

Requirements: Python 3.10+ and [Ollama](https://ollama.com/download). Pull at
least one local model and start the app:

```bash
ollama pull qwen2.5-coder:7b
python3 server.py
```

Open [http://127.0.0.1:8765](http://127.0.0.1:8765). The project folder defaults
to `~/doiade-code-workspace` (created automatically if needed); use **Choose
folder** to select another. Set `DOAIDE_WORKSPACE` to override the default. The
app sends up to 20 supported source files and 24,000 characters as context.
When you request a change, the assistant may write up to 8 supported source
files directly into the project folder. Review changes in your editor or
version control. Chat mode does not execute project code or run tests.
The current chat is saved in this browser's local storage, so it survives
refreshes in the same browser profile.

### Automatic model routing

Doaide Code uses the official local coding CLIs, not provider API keys:

```bash
# GPT through your ChatGPT plan
npm install -g @openai/codex
codex login

# Claude through your Claude plan
npm install -g @anthropic-ai/claude-code
claude auth login
```

Restart Doaide Code after installation or login. The app checks which providers
are available and chooses a route for each request. It removes API-key
environment variables from these CLI processes, so they use the saved CLI
sign-in instead of accidentally billing API usage. Codex runs with a read-only
sandbox; Doaide applies only the file edits returned in the chat. The Claude
CLI is run with its tools disabled for the same reason. A cloud route sends the
selected project context to that provider, and subscription plan limits still
apply.

If Claude reports an invalid OAuth token, refresh the subscription login with
`env -u ANTHROPIC_API_KEY claude auth login`, then use the refresh button in
Doaide Code.

## Settings

| Environment variable | Default |
| --- | --- |
| `DOAIDE_HOST` | `127.0.0.1` |
| `DOAIDE_PORT` | `8765` |
| `DOAIDE_WORKSPACE` | `~/doiade-code-workspace` |
| `OLLAMA_URL` | `http://127.0.0.1:11434` |
| `SMALL_MODEL` | Auto-select smallest coding-oriented local model |
| `BIG_MODEL` | Auto-select next larger local model (legacy check workflow) |
| `DOAIDE_CLI_TIMEOUT` | 300 seconds |

The browser app binds to localhost by default. Keep it on localhost unless
access controls are configured.
