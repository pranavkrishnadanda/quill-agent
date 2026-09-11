#!/usr/bin/env bash
# Install the job-agent-server launchd agent on macOS.
# Usage:
#   chmod +x scripts/install_launchd.sh
#   ./scripts/install_launchd.sh
#
# Copies the plist template to ~/Library/LaunchAgents with WorkingDirectory
# substituted to the current working directory, then loads it via launchctl.
set -euo pipefail

PLIST_NAME="com.oovacha.job-agent-server.plist"
SRC_PLIST="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)/launchd/${PLIST_NAME}"
DEST_DIR="${HOME}/Library/LaunchAgents"
DEST_PLIST="${DEST_DIR}/${PLIST_NAME}"
CWD="$(pwd)"

if [[ ! -f "${SRC_PLIST}" ]]; then
    echo "Error: source plist not found at ${SRC_PLIST}" >&2
    exit 1
fi

mkdir -p "${DEST_DIR}"

# Substitute WorkingDirectory placeholder with current pwd via here-doc sed script.
sed -f /dev/stdin "${SRC_PLIST}" > "${DEST_PLIST}" <<SED_SCRIPT
s|__WORKING_DIRECTORY__|${CWD}|g
SED_SCRIPT

chmod 644 "${DEST_PLIST}"

# Unload any prior version, then load the new one.
if launchctl list | grep -q "com.oovacha.job-agent-server"; then
    launchctl unload "${DEST_PLIST}" 2>/dev/null || true
fi
launchctl load "${DEST_PLIST}"

echo "Installed and loaded: ${DEST_PLIST}"
echo "WorkingDirectory set to: ${CWD}"
