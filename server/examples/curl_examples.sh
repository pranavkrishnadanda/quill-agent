#!/usr/bin/env bash
# Example curl invocations for the job-agent-server HTTP API.
#
# Usage:
#   BASE_URL=http://localhost:8000 ./examples/curl_examples.sh
#
# Each example is self-contained; run them individually or as a sequence.

set -euo pipefail

BASE_URL="${BASE_URL:-http://localhost:8000}"

# 1) Health check — liveness probe, no body required.
echo "--- 1) GET /health ---"
curl -sS -X GET "${BASE_URL}/health" \
  -H 'Accept: application/json'
echo

# 2) Verify-code with defaults — waits for a verification email using the
#    server's default regex pattern and default timeout.
echo "--- 2) POST /verify-code (defaults) ---"
curl -sS -X POST "${BASE_URL}/verify-code" \
  -H 'Content-Type: application/json' \
  -H 'Accept: application/json' \
  -d '{
        "email": "candidate@example.com"
      }'
echo

# 3) Verify-code with a custom regex pattern — extract a 4-8 digit code
#    embedded in the email body (overrides the server default pattern).
echo "--- 3) POST /verify-code (custom pattern) ---"
curl -sS -X POST "${BASE_URL}/verify-code" \
  -H 'Content-Type: application/json' \
  -H 'Accept: application/json' \
  -d '{
        "email": "candidate@example.com",
        "pattern": "\\b(\\d{4,8})\\b"
      }'
echo

# 4) Verify-code with a short timeout — fail fast if no matching email
#    arrives within 5 seconds.
echo "--- 4) POST /verify-code (short timeout) ---"
curl -sS -X POST "${BASE_URL}/verify-code" \
  -H 'Content-Type: application/json' \
  -H 'Accept: application/json' \
  -d '{
        "email": "candidate@example.com",
        "timeout_seconds": 5
      }'
echo
