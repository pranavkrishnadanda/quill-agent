#!/usr/bin/env bash
# Uninstall the job-agent launchd agent on macOS.
set -euo pipefail

PLIST_LABEL="com.pranav.jobagent"
PLIST_PATH="${HOME}/Library/LaunchAgents/${PLIST_LABEL}.plist"

if [[ ! -f "${PLIST_PATH}" ]]; then
    echo "No launchd plist found at ${PLIST_PATH}; nothing to uninstall."
    exit 0
fi

echo "Unloading launchd agent: ${PLIST_LABEL}"
launchctl unload "${PLIST_PATH}" 2>/dev/null || true

echo "Removing plist: ${PLIST_PATH}"
rm -f "${PLIST_PATH}"

echo "Uninstalled ${PLIST_LABEL}."
