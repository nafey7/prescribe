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
if [ ! -f "$STAMP" ] || [ "$(cat "$STAMP")" != "$SUM" ]; then
  echo "Installing npm dependencies (package-lock.json changed or first run)..."
  npm ci
  echo "$SUM" > "$STAMP"
fi

exec npm run dev -- --host 0.0.0.0
