#!/bin/bash
# Appends code.doaide.com to the bind-mounted Caddyfile, following the same rules as
# /opt/caddy-apply.sh (validate first, never replace the inode, back up, then reload)
# but without touching the other pending blocks.
set -euo pipefail
F=/opt/knol/Caddyfile; B=/opt/DoAide-Code/deploy/code.doaide.com.caddy; C=/tmp/Caddyfile.code.candidate
grep -q '^code\.doaide\.com {' $F && { echo "code.doaide.com already present"; exit 0; }
cat $F $B > $C
docker cp $C knol-caddy:/tmp/Caddyfile.candidate
docker exec knol-caddy caddy validate --config /tmp/Caddyfile.candidate --adapter caddyfile 2>&1 | tail -2
hi=$(stat -c %i $F); ci=$(docker exec knol-caddy stat -c %i /etc/caddy/Caddyfile)
[ "$hi" = "$ci" ] || { echo "INODE SPLIT host=$hi ctr=$ci — not applying"; exit 1; }
cp $F /opt/backups/Caddyfile.pre-code.$(date +%Y%m%d-%H%M%S)
cat $B >> $F
docker exec knol-caddy caddy reload --config /etc/caddy/Caddyfile --adapter caddyfile 2>&1 | tail -2
echo reloaded
