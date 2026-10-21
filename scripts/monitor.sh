#!/bin/bash
# Summarise how the local DoAide Code agent has been answering: recent replies from the
# conversation (GET /api/session) and the agent log, flagging errors, refusals, incomplete
# answers, escalations, failed checks and slow replies.
# Usage: ./scripts/monitor.sh [number of recent replies, default 10]
set -euo pipefail

BASE_URL=${DOAIDE_URL:-http://127.0.0.1:3097}
LOG=${DOAIDE_AGENT_LOG:-$HOME/.doaide-code/logs/agent.log}
COUNT=${1:-10}
SLOW=${DOAIDE_SLOW_SECONDS:-30}

TOKEN=$(curl -fsS -X POST "$BASE_URL/api/auth/local" | jq -r .token) ||
  { echo "No local agent at $BASE_URL (is com.doaide.code-agent running?)" >&2; exit 1; }

echo "== Last $COUNT replies =="
curl -fsS "$BASE_URL/api/session" -H "authorization: Bearer $TOKEN" | jq -r --argjson n "$COUNT" --argjson slow "$SLOW" '
  def refusal: test("(?i)\\b(i (do not|don.t|cannot|can.t) (have access|access|see|read)|as an ai|i.m unable to|please (provide|share|paste))");
  def incomplete: test("(?i)(not (shown|visible|included) in the (provided |given )?(snippet|context|code)|other files (are )?not shown|i can only see|limited view)");
  .messages as $all
  | [range(0; $all | length) | select($all[.].role == "assistant") | {m: $all[.], ask: ($all[. - 1].content // "")}]
  | .[-$n:][]
  | .m as $m | ($m.meta.route // {}) as $r | (($r.elapsed_ms // 0) / 1000) as $s
  | ([ (if $m.status == "error" or $m.status == "interrupted" then "ERROR(\($m.status))" else empty end),
       (if $m.status == "stopped" then "STOPPED" else empty end),
       (if $r.escalated_from then "ESCALATED(\($r.escalated_from.model // $r.escalated_from.executor): \($r.escalated_from.reason))" else empty end),
       (($m.meta.checks.items // [])[] | select(.ok == false) | "CHECK-FAILED(\(.name): \(.detail | .[0:120]))"),
       (if $s > $slow then "SLOW(\($s | floor)s)" else empty end),
       (if ($m.content | refusal) then "REFUSAL" else empty end),
       (if $r.free and ($m.content | incomplete) then "INCOMPLETE" else empty end),
       (if $r.executor == "direct" and any(($r.reasons // [])[]; test("not found|unknown|no such"; "i")) then "DIRECT(\($r.reasons | join("; ")))" else empty end),
       (if ($m.content | length) == 0 and $m.status == "done" then "EMPTY" else empty end)
     ]) as $issues
  | "\(if ($issues | length) > 0 then "✗" else "✓" end) \($r.model // $r.executor // "-") · $\($m.meta.usage.cost_usd // 0) · \($s)s · \($r.kind // "-") · \(.ask | gsub("\\s+"; " ") | .[0:70])"
    + (if ($issues | length) > 0 then "\n    " + ($issues | join("\n    ")) else "" end)'

echo
echo "== Agent log ($LOG, last 400 lines) =="
if [ ! -f "$LOG" ]; then
  echo "no log file"
  exit 0
fi
RECENT=$(tail -n 400 "$LOG")
problems=$(printf '%s\n' "$RECENT" | grep -E "^(ERROR|WARNING|CRITICAL)|Traceback|Exception" | grep -v "keepalive ping timeout" | sort | uniq -c | sort -rn | head -15 || true)
echo "Errors and warnings:"; echo "${problems:-  none}"
echo "Escalations:"
printf '%s\n' "$RECENT" | grep -oE "escalating from [a-z0-9-]+: .{0,100}" | sed -E 's/\(tests\/[^)]*\)/(…)/' | sort | uniq -c | sort -rn | head -10 || echo "  none"
echo "Local model timings:"
printf '%s\n' "$RECENT" | grep -oE "[a-z0-9.-]+:[0-9.]+b: load [0-9.]+s, read [0-9]+ tokens in [0-9.]+s, wrote [0-9]+ in [0-9.]+s" |
  sed -E 's/: load [0-9.]+s, read / /; s/ tokens in / /; s/s, wrote / /; s/ in / /; s/s$//' |
  awk -v slow="$SLOW" '{m=$1; n[m]++; t=$3+$5; s[m]+=t; if (t>mx[m]) mx[m]=t; if (t>slow) sl[m]++}
    END {if (!length(n)) print "  none"; for (m in n) printf "  %s: %d calls, avg %.1fs, max %.0fs, %d over %ss\n", m, n[m], s[m]/n[m], mx[m], sl[m], slow}'
