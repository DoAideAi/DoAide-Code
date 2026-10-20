#!/bin/bash
# Build locally, upload a git archive plus the built frontend, and set up the server.
# Usage: deploy/deploy.sh   (DOAIDE_ENV_FILE=path uploads a fresh .env for a first deploy)
set -euo pipefail
HOST=${DOAIDE_DEPLOY_HOST:-root@89.167.8.178}
KEY=${DOAIDE_DEPLOY_KEY:-/Users/dev/projects/keys/hetzner_deploy_ed25519}
SSH=(ssh -i "$KEY" -o IdentitiesOnly=yes "$HOST")
ROOT=$(git -C "$(dirname "$0")" rev-parse --show-toplevel)
OUT=$(mktemp -d)
(cd "$ROOT/frontend" && npm install --silent && npm run build)
git -C "$ROOT" archive --format=tar.gz -o "$OUT/release.tar.gz" HEAD
COPYFILE_DISABLE=1 tar --no-xattrs -czf "$OUT/dist.tar.gz" -C "$ROOT/frontend/dist" .
files=("$OUT/release.tar.gz" "$OUT/dist.tar.gz")
[ -n "${DOAIDE_ENV_FILE:-}" ] && { cp "$DOAIDE_ENV_FILE" "$OUT/env.new"; files+=("$OUT/env.new"); }
"${SSH[@]}" mkdir -p /opt/DoAide-Code
scp -i "$KEY" -o IdentitiesOnly=yes "${files[@]}" "$HOST:/opt/DoAide-Code/"
# Unpack the setup script from this release first so the newest version runs.
"${SSH[@]}" "cd /opt/DoAide-Code && tar -xzf release.tar.gz deploy/remote-setup.sh && bash deploy/remote-setup.sh"
"${SSH[@]}" bash /opt/DoAide-Code/deploy/caddy-add-block.sh
rm -rf "$OUT"
