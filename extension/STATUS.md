# Job Agent Extension — Status

## Overview
- **Version:** 0.1.0
- **Manifest:** Chrome MV3 (service worker background, content scripts, popup, options page)
- **Package:** `@job-agent/extension` (private)

## ATS Support
Content scripts are installed via `src/content/base.ts` (`installContentBridge`) for six portals:

| ATS         | Host match                                                        | Script                       |
| ----------- | ----------------------------------------------------------------- | ---------------------------- |
| Greenhouse  | `boards.greenhouse.io`, `job-boards.greenhouse.io`                | `src/content/greenhouse.ts`  |
| Lever       | `jobs.lever.co`                                                   | `src/content/lever.ts`       |
| Ashby       | `jobs.ashbyhq.com`                                                | `src/content/ashby.ts`       |
| Workday     | `*.myworkdayjobs.com`                                             | `src/content/workday.ts`     |
| LinkedIn    | `www.linkedin.com/jobs/*`                                         | `src/content/linkedin.ts`    |
| iCIMS       | `*.icims.com`                                                     | `src/content/icims.ts`       |

## Tests
- **Suite:** Vitest + jsdom
- **Test files:** 27 (see `tests/`)
  - `tests/lib/` — 9 (logger, storage, messaging, form-filler, otp-detector, queue-store, errors, retry, logger-sink)
  - `tests/background/` — 4 (server-client, queue, auto-verify, queue-processor)
  - `tests/content/` — 11 (base×greenhouse/lever/ashby/workday/linkedin/icims, applyFillPlan, workday/linkedin/icims detectors, otp)
  - `tests/popup/` — 2 (popup, queue-view)
  - `tests/options/` — 1
- **Total case count:** produced by Phase 6 verify (`bun run test`); this doc lists the file inventory only.

## Features Complete
- **Job queue** — `src/background/queue.ts` `JobQueue` (add/update/get/all/clear) persisted via `createStorage()`; UI in `src/popup/`.
- **Auto-verify** — background worker calls `VerificationServerClient` (`src/background/server-client.ts`) against the local verification server (`127.0.0.1:8787` / `localhost:8787`) with retry + structured error handling.
- **Fill-on-page** — content scripts detect fields (`detectFieldsFromDom`) and apply plans (`applyFillPlan` / `fillFieldsBySelector`); Anthropic-driven plan generation via `src/background/anthropic-client.ts`; resume payload from `src/lib/resume-store.ts`.
- **Popup UI** — `src/popup/popup.html` + queue view (per-job status, actions).
- **Options page** — `src/options/options.html` (open_in_tab) for API keys / resume / config.
- **OTP handling** — `src/lib/otp-detector.ts` with content-side integration.

## Known Gaps
- **Duplicated client code** — the extension still ships its own copies of client-shaped modules (`server-client`, `anthropic-client`, retry/error/logger helpers) that overlap with sibling packages in the monorepo. Consolidation into a shared package is pending.
- **Not on the Chrome Web Store** — install is unpacked/developer-mode only. Store listing draft lives at `docs/CHROME_STORE_LISTING.md` but has not been submitted.
- **Placeholder icons** — `icons/icon16.png`, `icons/icon48.png`, `icons/icon128.png` are stand-ins pending final art.

## Install
Unpacked developer install; full walkthrough in [`docs/INSTALL.md`](docs/INSTALL.md). Short form:

1. `bun install && bun run build` (produces `dist/`).
2. Chrome → `chrome://extensions` → enable Developer mode → **Load unpacked** → select `extension/dist`.
3. Open the extension's Options page and paste your Anthropic API key + resume.
4. Ensure the local verification server is running on `http://127.0.0.1:8787` before enabling auto-verify.
