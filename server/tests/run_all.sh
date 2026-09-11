#!/usr/bin/env bash
set -euo pipefail
cd "$(dirname "$0")/.."
docker compose -f docker-compose.test.yml up -d
trap 'docker compose -f docker-compose.test.yml down -v' EXIT
uv run pytest -v
