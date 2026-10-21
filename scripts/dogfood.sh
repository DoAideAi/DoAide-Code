#!/bin/bash
# Send one task to the local DoAide Code agent through its Tasks API and print the result.
# Usage: ./scripts/dogfood.sh "your task prompt here" [project path, default: this repo]
# DoAide writes any edit it keeps straight to the project; review with `git diff`.
set -euo pipefail

BASE_URL=${DOAIDE_URL:-http://127.0.0.1:3097}
ROOT=$(cd "$(dirname "$0")/.." && pwd)
PROMPT=${1:?usage: $0 \"task prompt\" [project path]}
PROJECT=${2:-$ROOT}

TOKEN=$(curl -fsS -X POST "$BASE_URL/api/auth/local" | jq -r .token) ||
  { echo "No local agent at $BASE_URL (is com.doaide.code-agent running?)" >&2; exit 1; }
BODY=$(jq -n --arg prompt "$PROMPT" --arg path "$PROJECT" '{prompt: $prompt, project_path: $path}')

OUT=$(mktemp)
trap 'rm -f "$OUT"' EXIT
CODE=$(curl -sS -o "$OUT" -w '%{http_code}' -X POST "$BASE_URL/api/v1/tasks" \
  -H "authorization: Bearer $TOKEN" -H 'content-type: application/json' -d "$BODY" --max-time 1800)

if ! jq -e . "$OUT" >/dev/null 2>&1; then
  echo "HTTP $CODE: $(cat "$OUT")" >&2
  exit 1
fi
if [ "$CODE" != 200 ] && [ "$(jq -r '.status // empty' "$OUT")" = "" ]; then
  echo "HTTP $CODE: $(jq -r '.detail // .' "$OUT")" >&2
  exit 1
fi
jq -r --arg code "$CODE" '
  "status:    \(.status) (HTTP \($code))",
  "model:     \(.executor) / \(.model // "-")\(if .free then " (free)" else "" end)",
  (if .escalated_from then "escalated: from \(.escalated_from.executor) / \(.escalated_from.model // "-"): \(.escalated_from.reason)" else empty end),
  "cost:      $\(.cost_usd)",
  "time:      \(.seconds)s",
  "checks:    \([.checks[]? | "\(if .ok then "✓" else "✗" end) \(.name): \(.detail)"] | join("; ") | if . == "" then "-" else . end)",
  (if .changes then "changes:   \(.changes.status // "-") \([.changes.files[]?.path] | join(", "))" else empty end),
  "",
  .answer' "$OUT"
[ "$(jq -r .status "$OUT")" = done ]
