#!/usr/bin/env bash
# quill.sh — one-shot setup + run for the Quill Agent monorepo.
#
# Usage:
#   ./quill.sh install    First-time setup: prereq check, .env creation, install all deps
#   ./quill.sh test       Run every test suite (server + client + extension)
#   ./quill.sh build      Build the client library + Chrome extension
#   ./quill.sh start      Start Greenmail (dev only) + verification server in background
#   ./quill.sh stop       Stop the verification server + Greenmail
#   ./quill.sh status     Show what's currently running
#   ./quill.sh doctor     Sanity-check everything
#   ./quill.sh all        install → test → build → start (one shot)
#   ./quill.sh help       Print this help
#
# Flags (apply to any command):
#   --no-tests            Skip running tests during 'install' and 'all'
#   --no-greenmail        Don't touch Docker/Greenmail (skip on machines without Docker)
#   --yes                 Assume defaults for interactive prompts (non-interactive)
#
# Environment:
#   The script keeps .env files inside server/ and extension/ — never in the repo root.
#   AUTH_TOKEN is generated fresh on first install if not present. Gmail/Anthropic secrets
#   are prompted for interactively unless --yes is passed (then they stay as placeholders).

set -euo pipefail

# ─────────────────────────────────────────────────────────────────────────────
# Config
# ─────────────────────────────────────────────────────────────────────────────
readonly REPO_ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
readonly SERVER_DIR="${REPO_ROOT}/server"
readonly CLIENT_DIR="${REPO_ROOT}/client"
readonly EXT_DIR="${REPO_ROOT}/extension"
readonly RUN_DIR="${REPO_ROOT}/.run"
readonly SERVER_PID_FILE="${RUN_DIR}/server.pid"
readonly SERVER_LOG_FILE="${RUN_DIR}/server.log"
readonly SERVER_PORT="${QUILL_SERVER_PORT:-8787}"

SKIP_TESTS=0
SKIP_GREENMAIL=0
ASSUME_YES=0

# ─────────────────────────────────────────────────────────────────────────────
# Pretty output (ANSI colors — degrade gracefully on non-TTY)
# ─────────────────────────────────────────────────────────────────────────────
if [ -t 1 ]; then
  C_BOLD='\033[1m'; C_DIM='\033[2m'; C_RED='\033[31m'; C_GRN='\033[32m'
  C_YLW='\033[33m'; C_BLU='\033[34m'; C_RST='\033[0m'
else
  C_BOLD=''; C_DIM=''; C_RED=''; C_GRN=''; C_YLW=''; C_BLU=''; C_RST=''
fi
step()  { printf "\n${C_BOLD}${C_BLU}▸ %s${C_RST}\n" "$*"; }
ok()    { printf "  ${C_GRN}✓${C_RST} %s\n" "$*"; }
warn()  { printf "  ${C_YLW}!${C_RST} %s\n" "$*"; }
fail()  { printf "  ${C_RED}✗${C_RST} %s\n" "$*" >&2; }
info()  { printf "  ${C_DIM}%s${C_RST}\n" "$*"; }
die()   { fail "$*"; exit 1; }

# ─────────────────────────────────────────────────────────────────────────────
# Prereq check
# ─────────────────────────────────────────────────────────────────────────────
check_prereq() {
  local name="$1" install_hint="$2"
  if command -v "$name" >/dev/null 2>&1; then
    ok "$name → $(command -v "$name")"
  else
    fail "$name not found"
    info "install: $install_hint"
    return 1
  fi
}

cmd_check_prereqs() {
  step "Checking prerequisites"
  local missing=0
  check_prereq uv   'curl -LsSf https://astral.sh/uv/install.sh | sh'   || missing=1
  check_prereq bun  'curl -fsSL https://bun.sh/install | bash'          || missing=1
  check_prereq python3 'install Python 3.12+ from python.org'           || missing=1
  if [ "$SKIP_GREENMAIL" -eq 0 ]; then
    check_prereq docker 'install Docker Desktop from docker.com'        || missing=1
  fi
  if [ "$missing" -ne 0 ]; then die "install the tools above, then re-run"; fi
}

# ─────────────────────────────────────────────────────────────────────────────
# .env generation
# ─────────────────────────────────────────────────────────────────────────────
gen_hex_32() {
  if command -v openssl >/dev/null 2>&1; then openssl rand -hex 32
  elif [ -r /dev/urandom ]; then head -c 32 /dev/urandom | od -An -tx1 | tr -d ' \n'; echo
  else python3 -c 'import secrets; print(secrets.token_hex(32))'
  fi
}

prompt_or_default() {
  local prompt="$1" default="$2" secret="${3:-0}" ans
  if [ "$ASSUME_YES" -eq 1 ]; then echo "$default"; return; fi
  if [ "$secret" = "1" ]; then read -srp "  $prompt [${default:-—}]: " ans; echo >&2
  else read -rp "  $prompt [${default:-—}]: " ans
  fi
  echo "${ans:-$default}"
}

write_server_env() {
  local target="${SERVER_DIR}/.env"
  if [ -f "$target" ]; then ok "server/.env already present — leaving alone"; return; fi
  step "Creating server/.env (bootstrap only — safe to edit later)"
  local gmail_user gmail_pass auth_token
  gmail_user=$(prompt_or_default "Gmail address" "your-email@gmail.com")
  gmail_pass=$(prompt_or_default "Gmail App Password (16 chars, hidden)" "xxxx-xxxx-xxxx-xxxx" 1)
  auth_token=$(gen_hex_32)
  cat > "$target" <<EOF
IMAP_HOST=imap.gmail.com
IMAP_PORT=993
IMAP_USER=${gmail_user}
IMAP_APP_PASSWORD=${gmail_pass}
IMAP_FOLDER=INBOX
SERVER_HOST=127.0.0.1
SERVER_PORT=${SERVER_PORT}
AUTH_TOKEN=${auth_token}
EOF
  chmod 600 "$target"
  ok "wrote $target (mode 600)"
  info "AUTH_TOKEN was generated — the extension needs the SAME value"
  echo "${auth_token}" > "${RUN_DIR}/.auth-token"  # sourced by extension .env setup
}

write_extension_env() {
  local target="${EXT_DIR}/.env"
  if [ -f "$target" ]; then ok "extension/.env already present — leaving alone"; return; fi
  step "Creating extension/.env (bootstrap only — safe to edit later)"
  local anthropic_key auth_token
  anthropic_key=$(prompt_or_default "Anthropic API key (or leave blank to skip and set later in Options UI)" "" 1)
  # Reuse the token the server just wrote (if we're in the same session)
  if [ -f "${RUN_DIR}/.auth-token" ]; then
    auth_token=$(cat "${RUN_DIR}/.auth-token")
  elif [ -f "${SERVER_DIR}/.env" ]; then
    auth_token=$(grep '^AUTH_TOKEN=' "${SERVER_DIR}/.env" | cut -d= -f2-)
  else
    auth_token=$(gen_hex_32)
  fi
  cat > "$target" <<EOF
VITE_VERIFICATION_SERVER_URL=http://127.0.0.1:${SERVER_PORT}
VITE_VERIFICATION_TOKEN=${auth_token}
VITE_ANTHROPIC_API_KEY=${anthropic_key}
EOF
  chmod 600 "$target"
  ok "wrote $target (mode 600)"
}

# ─────────────────────────────────────────────────────────────────────────────
# Install
# ─────────────────────────────────────────────────────────────────────────────
install_server() {
  step "Installing server (Python + uv)"
  cd "$SERVER_DIR"
  if [ ! -d .venv ]; then uv venv --python 3.12 >/dev/null; ok "created .venv"; else ok ".venv exists"; fi
  uv pip install -q -e . >/dev/null
  uv pip install -q -r requirements-test.txt >/dev/null
  ok "installed server + test deps"
}

install_client() {
  step "Installing client (TypeScript + bun)"
  cd "$CLIENT_DIR"
  bun install --silent 2>&1 | tail -1
  ok "installed client deps"
}

install_extension() {
  step "Installing extension (TypeScript + bun + Vite)"
  cd "$EXT_DIR"
  bun install --silent 2>&1 | tail -1
  ok "installed extension deps"
}

# ─────────────────────────────────────────────────────────────────────────────
# Greenmail (Docker) — dev IMAP+SMTP for tests
# ─────────────────────────────────────────────────────────────────────────────
greenmail_up() {
  [ "$SKIP_GREENMAIL" -eq 1 ] && { warn "skipping Greenmail (--no-greenmail)"; return; }
  step "Starting Greenmail (Docker) for tests"
  cd "$SERVER_DIR"
  docker compose -f docker-compose.test.yml up -d >/dev/null 2>&1 || die "docker compose failed"
  local tries=0
  while [ $tries -lt 30 ]; do
    if python3 -c "
import socket; s=socket.create_connection(('127.0.0.1',3143),timeout=1); s.settimeout(2)
g=s.recv(200); s.close(); assert g.startswith(b'* OK'), g" 2>/dev/null; then
      ok "Greenmail IMAP ready on :3143 (and SMTP on :3025)"
      return
    fi
    sleep 1; tries=$((tries+1))
  done
  die "Greenmail didn't become ready within 30s"
}

greenmail_down() {
  [ "$SKIP_GREENMAIL" -eq 1 ] && return
  step "Stopping Greenmail"
  cd "$SERVER_DIR"
  docker compose -f docker-compose.test.yml down -v >/dev/null 2>&1 || true
  ok "Greenmail stopped"
}

# ─────────────────────────────────────────────────────────────────────────────
# Server (uvicorn)
# ─────────────────────────────────────────────────────────────────────────────
server_start() {
  step "Starting verification server on http://127.0.0.1:${SERVER_PORT}"
  mkdir -p "$RUN_DIR"
  if [ -f "$SERVER_PID_FILE" ] && kill -0 "$(cat "$SERVER_PID_FILE")" 2>/dev/null; then
    ok "server already running (pid $(cat "$SERVER_PID_FILE"))"
    return
  fi
  cd "$SERVER_DIR"
  # Nohup so the server survives this shell exit; log everything to server.log
  nohup uv run uvicorn job_agent_server.api.server:app \
    --host 127.0.0.1 --port "$SERVER_PORT" \
    >"$SERVER_LOG_FILE" 2>&1 &
  echo $! > "$SERVER_PID_FILE"
  # Wait for /health
  local tries=0
  while [ $tries -lt 20 ]; do
    if curl -sf "http://127.0.0.1:${SERVER_PORT}/health" >/dev/null 2>&1; then
      ok "server up (pid $(cat "$SERVER_PID_FILE"), log: ${SERVER_LOG_FILE})"
      return
    fi
    sleep 0.5; tries=$((tries+1))
  done
  fail "server didn't respond within 10s — check $SERVER_LOG_FILE"
  return 1
}

server_stop() {
  if [ ! -f "$SERVER_PID_FILE" ]; then ok "no server pid file"; return; fi
  local pid; pid=$(cat "$SERVER_PID_FILE")
  if kill -0 "$pid" 2>/dev/null; then
    kill "$pid" || true
    sleep 1
    kill -9 "$pid" 2>/dev/null || true
    ok "server stopped (was pid $pid)"
  else
    ok "server not running (stale pid file)"
  fi
  rm -f "$SERVER_PID_FILE"
}

# ─────────────────────────────────────────────────────────────────────────────
# Test / Build
# ─────────────────────────────────────────────────────────────────────────────
cmd_test() {
  greenmail_up
  step "Server tests (uv run pytest)"
  cd "$SERVER_DIR" && uv run pytest -q
  step "Client tests (bun run test)"
  cd "$CLIENT_DIR" && bun run test
  step "Extension tests (bun run test)"
  cd "$EXT_DIR" && bun run test
  ok "all suites green"
}

cmd_build() {
  step "Building client (tsup)"
  cd "$CLIENT_DIR" && bun run build 2>&1 | tail -3
  step "Building extension (Vite + @crxjs)"
  cd "$EXT_DIR" && bun run build 2>&1 | tail -3
  ok "built — extension unpacked-load path: ${EXT_DIR}/dist"
}

# ─────────────────────────────────────────────────────────────────────────────
# Commands
# ─────────────────────────────────────────────────────────────────────────────
cmd_install() {
  cmd_check_prereqs
  mkdir -p "$RUN_DIR"
  write_server_env
  write_extension_env
  install_server
  install_client
  install_extension
  if [ "$SKIP_TESTS" -eq 0 ]; then cmd_test; fi
  cmd_build
  ok "install complete"
  print_next_steps
}

cmd_start() {
  greenmail_up
  server_start
  print_next_steps
}

cmd_stop() {
  server_stop
  greenmail_down
}

cmd_status() {
  step "Status"
  if [ -f "$SERVER_PID_FILE" ] && kill -0 "$(cat "$SERVER_PID_FILE")" 2>/dev/null; then
    ok "server: running (pid $(cat "$SERVER_PID_FILE"), port ${SERVER_PORT})"
  else
    warn "server: not running"
  fi
  if docker ps --format '{{.Names}}' 2>/dev/null | grep -q '^job-agent-greenmail-test$'; then
    ok "greenmail: running"
  else
    warn "greenmail: not running (dev-only, needed for tests)"
  fi
}

cmd_doctor() {
  cmd_check_prereqs
  cmd_status
  step "Curl /health"
  if curl -sf "http://127.0.0.1:${SERVER_PORT}/health" 2>/dev/null; then echo; ok "/health responded"
  else warn "/health unreachable"; fi
  step "Build artifacts"
  [ -f "${CLIENT_DIR}/dist/index.js" ] && ok "client/dist/index.js exists" || warn "client not built"
  [ -f "${EXT_DIR}/dist/manifest.json" ] && ok "extension/dist/manifest.json exists" || warn "extension not built"
}

cmd_all() {
  cmd_install
  cmd_start
}

print_next_steps() {
  printf "\n${C_BOLD}Next steps${C_RST}\n"
  info "1. Open Chrome → chrome://extensions → Developer mode ON → Load unpacked"
  info "2. Point at:  ${EXT_DIR}/dist"
  info "3. Click the Quill Agent icon → Options → paste your Anthropic key + resume JSON → Save"
  info "4. Navigate to a supported ATS (Greenhouse / Lever / Ashby / Workday / LinkedIn Easy Apply / iCIMS)"
  info "5. Click extension → 'Fill this tab' — review filled fields, then hit Submit yourself"
  info ""
  info "Server logs:   tail -f ${SERVER_LOG_FILE}"
  info "Stop server:   ./quill.sh stop"
  info "Run tests:     ./quill.sh test"
}

cmd_help() {
  sed -n '2,26p' "${BASH_SOURCE[0]}" | sed 's|^# \{0,1\}||'
}

# ─────────────────────────────────────────────────────────────────────────────
# Arg parsing
# ─────────────────────────────────────────────────────────────────────────────
CMD=""
while [ $# -gt 0 ]; do
  case "$1" in
    --no-tests) SKIP_TESTS=1; shift ;;
    --no-greenmail) SKIP_GREENMAIL=1; shift ;;
    --yes|-y) ASSUME_YES=1; shift ;;
    -h|--help|help) CMD="help"; shift ;;
    install|test|build|start|stop|status|doctor|all) CMD="$1"; shift ;;
    *) die "unknown argument: $1 (try: ./quill.sh help)" ;;
  esac
done
[ -z "$CMD" ] && CMD="help"

case "$CMD" in
  install) cmd_install ;;
  test) cmd_test ;;
  build) cmd_build ;;
  start) cmd_start ;;
  stop) cmd_stop ;;
  status) cmd_status ;;
  doctor) cmd_doctor ;;
  all) cmd_all ;;
  help) cmd_help ;;
esac
