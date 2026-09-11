#!/usr/bin/env bash
# Rotate the job-agent-server API token.
#
# Generates a new cryptographically-secure token, updates the JOB_AGENT_TOKEN
# entry in the project .env file (creating the file if needed), and prints a
# reminder to restart the server and update the browser extension.
#
# Usage: scripts/rotate_token.sh

set -euo pipefail

SCRIPT_DIR="$(cd -- "$(dirname -- "${BASH_SOURCE[0]}")" &> /dev/null && pwd)"
PROJECT_ROOT="$(cd -- "${SCRIPT_DIR}/.." &> /dev/null && pwd)"
ENV_FILE="${PROJECT_ROOT}/.env"
TOKEN_KEY="JOB_AGENT_TOKEN"

# Generate a URL-safe 48-byte token (~64 chars base64url, no padding).
NEW_TOKEN="$(python3 -c 'import secrets; print(secrets.token_urlsafe(48))')"

if [[ -z "${NEW_TOKEN}" ]]; then
  echo "ERROR: failed to generate token" >&2
  exit 1
fi

# Ensure .env exists.
if [[ ! -f "${ENV_FILE}" ]]; then
  touch "${ENV_FILE}"
  chmod 600 "${ENV_FILE}"
fi

TMP_FILE="$(mktemp "${ENV_FILE}.XXXXXX")"
trap 'rm -f "${TMP_FILE}"' EXIT

if grep -qE "^${TOKEN_KEY}=" "${ENV_FILE}"; then
  # Replace existing line without shell-interpolating the token value.
  awk -v key="${TOKEN_KEY}" -v val="${NEW_TOKEN}" '
    BEGIN { FS=OFS="=" }
    $1 == key { print key "=" val; next }
    { print }
  ' "${ENV_FILE}" > "${TMP_FILE}"
else
  cp "${ENV_FILE}" "${TMP_FILE}"
  printf '%s=%s\n' "${TOKEN_KEY}" "${NEW_TOKEN}" >> "${TMP_FILE}"
fi

mv "${TMP_FILE}" "${ENV_FILE}"
chmod 600 "${ENV_FILE}"
trap - EXIT

echo "Rotated ${TOKEN_KEY} in ${ENV_FILE}"
echo
echo "New token:"
echo "  ${NEW_TOKEN}"
echo
echo "REMINDERS:"
echo "  1. Restart the job-agent-server so it picks up the new token."
echo "  2. Update the browser extension configuration with the new token."
