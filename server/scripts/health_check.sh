#!/usr/bin/env bash
# Health check: curl the /health endpoint and exit non-zero on non-200.
set -euo pipefail

PORT="${SERVER_PORT:?SERVER_PORT must be set}"
HOST="${SERVER_HOST:-127.0.0.1}"
URL="http://${HOST}:${PORT}/health"

http_code="$(curl -sS -o /dev/null -w '%{http_code}' --max-time 5 "${URL}" || echo "000")"

if [[ "${http_code}" != "200" ]]; then
    echo "health check FAILED: ${URL} returned ${http_code}" >&2
    exit 1
fi

echo "health check OK: ${URL} returned 200"
exit 0
