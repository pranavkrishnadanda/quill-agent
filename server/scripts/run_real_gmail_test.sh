#!/usr/bin/env bash
set -euo pipefail
cd "$(dirname "$0")/.."
read -rp "Gmail address: " REAL_GMAIL_USER
read -rsp "App password (16 chars): " REAL_GMAIL_APP_PASSWORD; echo
export REAL_GMAIL_USER REAL_GMAIL_APP_PASSWORD
.venv/bin/pytest tests/e2e/test_e2e_real_gmail.py -v -s -m real_gmail
