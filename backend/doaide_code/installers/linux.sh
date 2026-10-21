#!/bin/bash
# DoAide Code laptop setup for Linux. Run it once (double-click and "Run", or `bash` it): it
# installs the agent into ~/.doaide-code and adds a systemd user service that starts it now
# and at every login. Generated for @@OWNER_EMAIL@@; it holds a personal agent token and
# deletes itself when done.
set -euo pipefail

BASE_URL=@@BASE_URL@@
HUB_URL=@@HUB_URL@@
HUB_TOKEN=@@HUB_TOKEN@@
OWNER_EMAIL=@@OWNER_EMAIL@@
PKG_NAME=@@PKG_NAME@@
SERVICE=doaide-code-agent
DIR="$HOME/.doaide-code"
UNIT_DIR="${XDG_CONFIG_HOME:-$HOME/.config}/systemd/user"
SELF="$0"

step() { printf '\n\033[1m%s\033[0m\n' "$*"; }
fail() {
  printf '\n\033[31mSetup did not finish: %s\033[0m\n' "$*"
  printf 'Nothing is broken. Download the installer again to retry.\n'
  [ -t 0 ] && read -r -p "Press Enter to close. " _ || true
  exit 1
}
trap 'fail "a step failed (line $LINENO)"' ERR

printf '\033[1mDoAide Code\033[0m: setting up this computer for %s\n' "$OWNER_EMAIL"
command -v systemctl >/dev/null || fail "this installer needs systemd (systemctl)"
command -v curl >/dev/null || fail "please install curl first"
mkdir -p "$DIR/bin" "$DIR/logs" "$UNIT_DIR"
chmod 700 "$DIR"

step "1/5  Getting the Python installer (uv)..."
UV=$(command -v uv || true)
if [ -z "$UV" ]; then
  UV="$DIR/bin/uv"
  if [ ! -x "$UV" ]; then
    curl -LsSf https://astral.sh/uv/install.sh |
      env UV_INSTALL_DIR="$DIR/bin" UV_NO_MODIFY_PATH=1 INSTALLER_NO_MODIFY_PATH=1 sh >/dev/null
  fi
fi

step "2/5  Downloading the DoAide Code agent..."
PKG="$DIR/$PKG_NAME"
curl -fsSL -H "Authorization: Bearer $HUB_TOKEN" "$BASE_URL/api/v1/setup/agent-package" -o "$PKG" ||
  fail "could not download the agent from $BASE_URL"

step "3/5  Installing (the first time this can take a minute)..."
[ -x "$DIR/venv/bin/python" ] || "$UV" venv --quiet --python 3.12 "$DIR/venv"
"$UV" pip install --quiet --python "$DIR/venv/bin/python" --reinstall-package doaide-code "$PKG"
AGENT="$DIR/venv/bin/doaide-code"
[ -x "$AGENT" ] || fail "the agent was not installed"

step "4/5  Getting Ollama, for free local answers..."
# Optional: Claude Code or Codex can answer without it, so a failure here only warns.
OLLAMA_MODEL=qwen2.5-coder:7b
ollama_up() { curl -fsS http://127.0.0.1:11434/api/version >/dev/null 2>&1; }
install_ollama() {
  fresh=""
  if ! command -v ollama >/dev/null 2>&1; then
    fresh=1
    # Ollama's own installer: asks for your password (sudo) and adds a systemd service.
    curl -fsSL https://ollama.com/install.sh | sh || return 1
    command -v ollama >/dev/null 2>&1 || return 1
  fi
  if ! ollama_up; then
    (nohup ollama serve >>"$DIR/logs/ollama.log" 2>&1 &)
    for _ in $(seq 1 30); do ollama_up && break; sleep 1; done
    ollama_up || return 1
  fi
  # A new install, or one with no models yet, gets the small coder model (about 5 GB).
  if [ -n "$fresh" ] || [ -z "$(ollama list 2>/dev/null | tail -n +2)" ]; then
    echo "Downloading $OLLAMA_MODEL (about 5 GB; the first time this takes a while)..."
    ollama pull "$OLLAMA_MODEL" || return 1
  fi
}
install_ollama ||
  printf '\033[33mCould not set up Ollama; DoAide Code will use Claude Code or Codex. Install it from https://ollama.com later.\033[0m\n'

step "5/5  Starting the agent and turning on start-at-login..."
# systemd starts services with a bare PATH; give the agent the one your shell uses.
LOGIN_PATH=$("${SHELL:-/bin/bash}" -ilc 'printf "%s" "$PATH"' </dev/null 2>/dev/null | tail -n 1 || true)
AGENT_PATH="${LOGIN_PATH:+$LOGIN_PATH:}$HOME/.local/bin:/usr/local/bin:/usr/bin:/bin"
umask 077
cat >"$DIR/agent.env" <<ENV
DOAIDE_HUB_URL=$HUB_URL
DOAIDE_HUB_TOKEN=$HUB_TOKEN
DOAIDE_OWNER_EMAIL=$OWNER_EMAIL
PATH=$AGENT_PATH
PYTHONUNBUFFERED=1
ENV
cat >"$UNIT_DIR/$SERVICE.service" <<UNIT
[Unit]
Description=DoAide Code laptop agent
After=network-online.target

[Service]
EnvironmentFile=$DIR/agent.env
WorkingDirectory=$HOME
ExecStart="$AGENT" agent
Restart=always
RestartSec=10
StandardOutput=append:$DIR/logs/agent.log
StandardError=append:$DIR/logs/agent.log

[Install]
WantedBy=default.target
UNIT
systemctl --user daemon-reload
systemctl --user enable "$SERVICE" >/dev/null 2>&1
systemctl --user restart "$SERVICE"

printf 'Waiting for your computer to connect'
online=""
for _ in $(seq 1 30); do
  if curl -fsS -H "Authorization: Bearer $HUB_TOKEN" "$BASE_URL/api/v1/setup/status" 2>/dev/null |
    grep -q '"agent_online":true'; then
    online=1
    break
  fi
  printf '.'
  sleep 1
done
echo

trap - ERR
rm -f "$SELF" || true  # it contains your agent token
if [ -n "$online" ]; then
  printf '\n\033[32m✔ All set! This computer is connected to DoAide Code.\033[0m\n'
  printf 'It starts by itself whenever you log in.\n'
else
  printf '\n\033[33m✔ Installed.\033[0m The agent is starting and will connect in a moment.\n'
  printf 'If it does not, the log is at %s\n' "$DIR/logs/agent.log"
fi
command -v xdg-open >/dev/null && xdg-open "$BASE_URL" >/dev/null 2>&1 &
[ -t 0 ] && sleep 5
exit 0
