# job-agent-extension

Chrome MV3 extension. Automates job-application form-filling using Claude + a local verification server (../job-agent-server). Load in Chrome via chrome://extensions → Load unpacked → point at ./dist after `bun run build`.

## Quick start

```bash
bun install
bun run build
# then in Chrome: chrome://extensions → Developer mode → Load unpacked → select ./dist
bun run test
bun run dev   # watch mode
```

## Architecture

- `src/background/` — MV3 service worker; orchestrates Claude calls and talks to the local verification server at `http://localhost:*` (see `../job-agent-server`).
- `src/content/` — injected into job-application pages; detects form fields and applies fills.
- `src/popup/` — extension popup UI for triggering runs and inspecting status.
- `src/lib/` — shared utilities (messaging, schema, storage).

## Requirements

- Node 20+ or Bun 1.3+
- The companion `job-agent-server` running locally for verification/RAG lookups.
- A Claude API key configured in the popup settings (stored via `chrome.storage.local`).
