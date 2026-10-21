#!/bin/bash
# DoAide Code laptop setup for macOS. Double-click to run: it installs the agent into
# ~/.doaide-code, registers a LaunchAgent so it starts now and at every login, then closes.
# Generated for @@OWNER_EMAIL@@; it holds a personal agent token and deletes itself when done.
set -euo pipefail

BASE_URL=@@BASE_URL@@
HUB_URL=@@HUB_URL@@
HUB_TOKEN=@@HUB_TOKEN@@
OWNER_EMAIL=@@OWNER_EMAIL@@
PKG_NAME=@@PKG_NAME@@
LABEL=com.doaide.code-agent
DIR="$HOME/.doaide-code"
PLIST="$HOME/Library/LaunchAgents/$LABEL.plist"
SELF="$0"

step() { printf '\n\033[1m%s\033[0m\n' "$*"; }
fail() {
  printf '\n\033[31mSetup did not finish: %s\033[0m\n' "$*"
  printf 'Nothing is broken. Close this window and download the installer again to retry.\n'
  read -r -p "Press Return to close this window. " _ || true
  exit 1
}
trap 'fail "a step failed (line $LINENO)"' ERR
xml() { printf '%s' "$1" | sed -e 's/&/\&amp;/g' -e 's/</\&lt;/g' -e 's/>/\&gt;/g'; }

clear
printf '\033[1mDoAide Code\033[0m: setting up this Mac for %s\n' "$OWNER_EMAIL"
mkdir -p "$DIR/bin" "$DIR/logs" "$HOME/Library/LaunchAgents"
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
# On PATH (Homebrew), or inside Ollama.app (the zip, which puts no command on PATH).
find_ollama() {
  command -v ollama && return
  for app in /Applications/Ollama.app "$HOME/Applications/Ollama.app"; do
    [ -x "$app/Contents/Resources/ollama" ] && echo "$app/Contents/Resources/ollama" && return
  done
  true
}
install_ollama() {
  OLLAMA=$(find_ollama)
  fresh=""
  if [ -z "$OLLAMA" ]; then
    fresh=1
    if command -v brew >/dev/null 2>&1; then
      brew install --cask ollama || return 1
    else
      APPS=/Applications
      [ -w "$APPS" ] || { APPS="$HOME/Applications"; mkdir -p "$APPS"; }
      curl -fL --progress-bar https://github.com/ollama/ollama/releases/latest/download/Ollama-darwin.zip \
        -o "$DIR/Ollama-darwin.zip" || return 1
      ditto -x -k "$DIR/Ollama-darwin.zip" "$APPS" || return 1
      rm -f "$DIR/Ollama-darwin.zip"
    fi
    OLLAMA=$(find_ollama)
    [ -n "$OLLAMA" ] || return 1
  fi
  # The app runs the server that the agent (and `ollama pull`) talk to.
  if ! ollama_up; then
    open -g -a Ollama >/dev/null 2>&1 || (nohup "$OLLAMA" serve >>"$DIR/logs/ollama.log" 2>&1 &)
    for _ in $(seq 1 30); do ollama_up && break; sleep 1; done
    ollama_up || return 1
  fi
  # A new install, or one with no models yet, gets the small coder model (about 5 GB).
  if [ -n "$fresh" ] || [ -z "$("$OLLAMA" list 2>/dev/null | tail -n +2)" ]; then
    echo "Downloading $OLLAMA_MODEL (about 5 GB; the first time this takes a while)..."
    "$OLLAMA" pull "$OLLAMA_MODEL" || return 1
  fi
  OLLAMA_DIR=$(dirname "$OLLAMA")
}
OLLAMA_DIR=""
install_ollama ||
  printf '\033[33mCould not set up Ollama; DoAide Code will use Claude Code or Codex. Install it from https://ollama.com later.\033[0m\n'

step "5/5  Starting the agent and turning on start-at-login..."
# launchd starts with a bare PATH; give the agent the one your shell uses so it finds
# claude, codex and ollama.
LOGIN_PATH=$(/bin/zsh -ilc 'printf "%s" "$PATH"' </dev/null 2>/dev/null | tail -n 1 || true)
AGENT_PATH="${LOGIN_PATH:+$LOGIN_PATH:}$HOME/.local/bin:/opt/homebrew/bin:/usr/local/bin:/usr/bin:/bin:/usr/sbin:/sbin"
# Ollama.app from the zip has its CLI inside the app, not on PATH.
AGENT_PATH="${AGENT_PATH}${OLLAMA_DIR:+:$OLLAMA_DIR}"
umask 077
cat >"$PLIST" <<PLIST
<?xml version="1.0" encoding="UTF-8"?>
<!DOCTYPE plist PUBLIC "-//Apple//DTD PLIST 1.0//EN" "http://www.apple.com/DTDs/PropertyList-1.0.dtd">
<plist version="1.0">
<dict>
  <key>Label</key><string>$LABEL</string>
  <key>ProgramArguments</key>
  <array><string>$(xml "$AGENT")</string><string>agent</string></array>
  <key>EnvironmentVariables</key>
  <dict>
    <key>DOAIDE_HUB_URL</key><string>$(xml "$HUB_URL")</string>
    <key>DOAIDE_HUB_TOKEN</key><string>$(xml "$HUB_TOKEN")</string>
    <key>DOAIDE_OWNER_EMAIL</key><string>$(xml "$OWNER_EMAIL")</string>
    <key>PATH</key><string>$(xml "$AGENT_PATH")</string>
    <key>PYTHONUNBUFFERED</key><string>1</string>
  </dict>
  <key>WorkingDirectory</key><string>$(xml "$HOME")</string>
  <key>RunAtLoad</key><true/>
  <key>KeepAlive</key><true/>
  <key>ThrottleInterval</key><integer>10</integer>
  <key>StandardOutPath</key><string>$(xml "$DIR/logs/agent.log")</string>
  <key>StandardErrorPath</key><string>$(xml "$DIR/logs/agent.log")</string>
</dict>
</plist>
PLIST
chmod 600 "$PLIST"
plutil -lint "$PLIST" >/dev/null || fail "the start-at-login file is invalid"

DOMAIN="gui/$(id -u)"
launchctl bootout "$DOMAIN/$LABEL" >/dev/null 2>&1 || true
loaded=""
for _ in 1 2 3 4 5; do
  if launchctl bootstrap "$DOMAIN" "$PLIST" >/dev/null 2>&1; then loaded=1; break; fi
  sleep 1
done
[ -n "$loaded" ] || launchctl load -w "$PLIST" || fail "macOS would not start the agent"
launchctl kickstart -k "$DOMAIN/$LABEL" >/dev/null 2>&1 || true

printf 'Waiting for your laptop to connect'
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

for tool in claude codex ollama; do
  PATH="$AGENT_PATH" command -v "$tool" >/dev/null 2>&1 || missing="${missing:-} $tool"
done

trap - ERR
rm -f "$SELF" || true  # it contains your agent token
if [ -n "$online" ]; then
  printf '\n\033[32m✔ All set! Your laptop is connected to DoAide Code.\033[0m\n'
  printf 'It starts by itself whenever you log in. You can close this window.\n'
  osascript -e 'display notification "Your laptop is connected." with title "DoAide Code"' >/dev/null 2>&1 || true
else
  printf '\n\033[33m✔ Installed.\033[0m The agent is starting and will connect in a moment.\n'
  printf 'If it does not, the log is at %s\n' "$DIR/logs/agent.log"
fi
[ -z "${missing:-}" ] || printf '\nNote: not found on this Mac:%s. Install at least one so DoAide Code can answer.\n' "$missing"
open "$BASE_URL" >/dev/null 2>&1 || true
sleep 6
(sleep 1; osascript -e 'tell application "Terminal" to close (every window whose name contains "DoAide-Code-Setup")' >/dev/null 2>&1) &
exit 0
