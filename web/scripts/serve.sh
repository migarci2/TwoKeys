#!/usr/bin/env bash
# Rebuild and (re)serve on PORT, killing whatever already holds it.
# `next start` silently leaves the previous server on the port, which serves a
# stale build and makes screenshots lie.
set -euo pipefail

PORT="${PORT:-3100}"
cd "$(dirname "$0")/.."

npm run build

for pid in $(ss -ltnp 2>/dev/null | grep ":${PORT}" | grep -oP 'pid=\K[0-9]+' | sort -u); do
  echo "killing stale server on :${PORT} (pid ${pid})"
  kill -9 "$pid" 2>/dev/null || true
done
sleep 1

(setsid npx next start -p "$PORT" >/tmp/twokeys-web-${PORT}.log 2>&1 </dev/null &)

for _ in $(seq 1 40); do
  if curl -sf -o /dev/null "http://localhost:${PORT}"; then
    echo "serving on http://localhost:${PORT}"
    exit 0
  fi
  sleep 1
done

echo "server did not come up; see /tmp/twokeys-web-${PORT}.log" >&2
exit 1
