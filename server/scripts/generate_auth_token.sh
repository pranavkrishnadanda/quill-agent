#!/usr/bin/env bash
set -euo pipefail
TOKEN="$(openssl rand -hex 32)"
echo "$TOKEN"
echo "Paste the above value into your .env file as: AUTH_TOKEN=<token>" >&2
