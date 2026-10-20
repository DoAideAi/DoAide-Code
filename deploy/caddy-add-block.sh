#!/bin/bash
# Installs or updates the code.doaide.com block in the bind-mounted Caddyfile, following
# the same rules as /opt/caddy-apply.sh (validate first, never replace the inode, back up,
# then reload) without touching any other site or the pending blocks.
set -euo pipefail
F=/opt/knol/Caddyfile; B=/opt/DoAide-Code/deploy/code.doaide.com.caddy; C=/tmp/Caddyfile.code.candidate
# Drop any existing code.doaide.com block (and the blank lines just before it), then append ours.
awk 'skip { if ($0 == "}") skip = 0; next }
     /^code\.doaide\.com \{$/ { skip = 1; blank = 0; next }
     /^$/ { blank++; next }
     { for (; blank > 0; blank--) print ""; print }
     END { for (; blank > 0; blank--) print "" }' $F > $C
cat $B >> $C
cmp -s $F $C && { echo "code.doaide.com unchanged"; exit 0; }
docker cp $C knol-caddy:/tmp/Caddyfile.candidate
docker exec knol-caddy caddy validate --config /tmp/Caddyfile.candidate --adapter caddyfile 2>&1 | tail -1
hi=$(stat -c %i $F); ci=$(docker exec knol-caddy stat -c %i /etc/caddy/Caddyfile)
[ "$hi" = "$ci" ] || { echo "INODE SPLIT host=$hi ctr=$ci — not applying"; exit 1; }
cp $F /opt/backups/Caddyfile.pre-code.$(date +%Y%m%d-%H%M%S)
cat $C > $F  # rewrite in place: same inode, so the container's bind mount sees it
docker exec knol-caddy caddy reload --config /etc/caddy/Caddyfile --adapter caddyfile 2>&1 | tail -1
echo reloaded
