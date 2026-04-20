#!/bin/sh
set -eu
cd /app

LOCK=/app/package-lock.json
STAMP=/app/node_modules/.prescribe-lock-sha256

if [ ! -f "$LOCK" ]; then
  echo "error: $LOCK not found" >&2
  exit 1
fi

SUM=$(sha256sum "$LOCK" | awk '{print $1}')
# Reinstall when the lockfile changed, on first run, or when node_modules is out of sync
# (e.g. anonymous Docker volume kept a stale tree while the lockfile checksum matched).
stamp_ok=false
if [ -f "$STAMP" ] && [ "$(cat "$STAMP")" = "$SUM" ]; then
  stamp_ok=true
fi
deps_ok=true
if [ ! -x /app/node_modules/.bin/vite ]; then
  deps_ok=false
fi
if [ ! -d /app/node_modules/@mui/material ]; then
  deps_ok=false
fi
# Anonymous node_modules volume can mask an incomplete install (directory exists but
# subpath packages are missing). Deep imports like @mui/material/Alert require these files.
if [ ! -f /app/node_modules/@mui/material/Alert/index.js ] &&
  [ ! -f /app/node_modules/@mui/material/Alert/index.mjs ]; then
  deps_ok=false
fi
if [ "$stamp_ok" != true ] || [ "$deps_ok" != true ]; then
  echo "Installing npm dependencies (package-lock.json changed, first run, or incomplete node_modules)..."
  npm ci
  echo "$SUM" > "$STAMP"
fi

exec npm run dev -- --host 0.0.0.0
