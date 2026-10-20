#!/bin/bash
# Runs on the server after deploy.sh uploads the release tarballs to /opt/DoAide-Code.
set -euo pipefail
D=/opt/DoAide-Code
cd $D
tar -xzf release.tar.gz && rm release.tar.gz
rm -rf frontend/dist && mkdir -p frontend/dist && tar -xzf dist.tar.gz -C frontend/dist && rm dist.tar.gz
mkdir -p data
[ -f backend/.env ] || { [ -f env.new ] && mv env.new backend/.env; }
rm -f env.new
# The hosted server is only a sync hub: it relays prompts to the laptop agent.
grep -q '^DOAIDE_MODE=' backend/.env || echo 'DOAIDE_MODE=hub' >> backend/.env
chmod 600 backend/.env
[ -x .venv/bin/python ] || python3 -m venv .venv
.venv/bin/pip install -q --upgrade pip
.venv/bin/pip install -q ./backend
install -m 644 deploy/doaide-code-api.service deploy/doaide-code-web.service /etc/systemd/system/
systemctl daemon-reload
systemctl enable -q doaide-code-api doaide-code-web
systemctl restart doaide-code-api doaide-code-web
sleep 3
systemctl is-active doaide-code-api doaide-code-web
