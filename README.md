# Quill Agent

Three-package monorepo that automates job-application form-filling with an AI agent kept safely on the human-in-the-loop side of the line.

```
job-agent/
├── server/       Python 3.12 · uv     · FastAPI service, IMAP verification-code polling
├── client/       TypeScript · bun     · Shared library (Anthropic wrapper + server client + form utilities)
└── extension/    TypeScript · bun     · Chrome MV3 extension (popup + options + content scripts)
```

The three parts are independent projects (own build, own tests, own manifest). They talk over the network — the extension calls the local server for verification codes; both use the client library shape (extension currently inlines a copy).

## Status at a glance

| Package | Language | Tooling | Tests | Typecheck | Build |
|---|---|---|---|---|---|
| `server/` | Python 3.12 | **uv** | ✅ 160 passing + 1 skipped (opt-in real-Gmail) | — | — |
| `client/` | TypeScript | **bun** | ✅ 31/31 | ✅ | ✅ ESM + CJS + DTS |
| `extension/` | TypeScript + Chrome MV3 | **bun** | ✅ 146/146 | ✅ | ✅ Vite |

**Total: 337 tests, 0 failing.**

## Prerequisites

Install once per machine:

```bash
# uv — Python package + venv manager
curl -LsSf https://astral.sh/uv/install.sh | sh

# bun — JS/TS runtime + package manager
curl -fsSL https://bun.sh/install | bash

# Docker (only needed to run the server test suite locally)
```

---

## `server/` — verification server (Python + FastAPI + uv)

Local helper that connects to Gmail via IMAP (App Password) and returns verification codes / magic links to the extension via HTTP.

- `POST /verify-code` polls the inbox for a matching email, extracts the 6-digit code or magic link, returns it
- `GET /health` reports IMAP connection status
- Bearer-token auth; localhost-only binding; audit-safe (no secrets in logs)
- Integration tested against **real IMAP + SMTP** (Greenmail in Docker)
- Opt-in `real-gmail` test runs against your actual inbox once you set env vars

Run locally:

```bash
cd server
uv venv --python 3.12
uv pip install -e . -r requirements-test.txt
cp .env.example .env    # fill IMAP_USER, IMAP_APP_PASSWORD, AUTH_TOKEN
docker compose -f docker-compose.test.yml up -d     # only for tests
uv run pytest                # 160 tests, ~50s
uv run uvicorn job_agent_server.api.server:app --port 8787
```

Run the opt-in real-Gmail smoke test:

```bash
bash scripts/run_real_gmail_test.sh   # prompts for creds interactively
```

Full docs: [`server/README.md`](server/README.md), [`server/STATUS.md`](server/STATUS.md), [`server/docs/`](server/docs/).

---

## `client/` — shared TypeScript library (bun)

Framework-agnostic pieces reusable by the extension, a future CLI, or a future web app.

- `AnthropicClient` — form-fill + job-fit scoring via `@anthropic-ai/sdk`
- `VerificationServerClient` — thin fetch wrapper over the `server/` HTTP API
- `ResumeSchema` — Zod schema for a strict resume shape
- `detectFormFields()` — regex-based DOM field detector
- `deterministicFill()` — safe-first pass for obvious fields (name, email, phone, linkedin)

Run locally:

```bash
cd client
bun install
bun run test        # 31 tests, <1s
bun run typecheck
bun run build       # outputs dist/index.{js,cjs,d.ts}
```

---

## `extension/` — Chrome MV3 extension (TypeScript + bun)

The browser-side glue. Popup, options page, background service worker, content scripts for **Greenhouse, Lever, Ashby, Workday, LinkedIn Easy Apply, iCIMS**.

- Popup: fill this tab · auto-fill verification code · check server health · fetch code · open options · open queue
- Options: server URL + auth token + Anthropic API key + saved resume JSON
- Background: routes messages, holds a persisted job queue, talks to Anthropic + verification server
- Content scripts: detect form fields on ATS pages + apply fill plans + find OTP fields
- Queue mode: paste a list of URLs, extension opens each in a new tab, fills each, leaves them at the review step

Run locally:

```bash
cd extension
bun install
cp .env.example .env
bun run test        # 146 tests
bun run typecheck
bun run build       # outputs dist/
# then in Chrome: chrome://extensions → Developer mode → Load unpacked → point at dist/
```

Full docs: [`extension/README.md`](extension/README.md), [`extension/docs/INSTALL.md`](extension/docs/INSTALL.md), [`extension/docs/ARCHITECTURE.md`](extension/docs/ARCHITECTURE.md), [`extension/docs/PRIVACY.md`](extension/docs/PRIVACY.md).

---

## Design principles

- **Human stays in the loop.** The extension fills forms and stops before submit. You review each application and hit Submit yourself.
- **Only what's legal.** No CAPTCHA-solving, no auth-scheme bypasses, no anti-bot evasion. If a site actively prohibits automated fills, we don't fill.
- **Deterministic beats LLM where possible.** Obvious fields (name, email, phone, linkedin) are filled from your resume without touching Claude. Only ambiguous fields and long-form questions go to the model.
- **Fail-closed.** Every LLM write is validated against a schema before it lands anywhere real. The server pattern of "extractor + validator + fallback = none" carries into the extension.

## What still needs to be built

- Extension currently duplicates a small amount of type/client code that lives in `client/`. Next step is to point `extension/package.json` at the local client package and delete the inlined copies.
- No cross-package end-to-end test yet (extension → server → real Gmail). Each package is proven in isolation; the opt-in real-Gmail server test is the closest we have.
- Chrome Web Store submission is drafted (`extension/docs/CHROME_STORE_LISTING.md`) but not filed.
