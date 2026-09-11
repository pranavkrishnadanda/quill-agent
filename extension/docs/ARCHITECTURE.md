# Job Agent Extension — Architecture

Chrome MV3 extension that detects job-application forms on supported ATS
sites (Greenhouse, Lever, Ashby, and generic hosts), fills them with a
stored resume + LLM-generated answers, and queues verification through a
local companion server. This document describes the moving pieces, the
message contract between them, on-disk state, and the security posture.

---

## 1. Component overview

```
                         ┌──────────────────────────────┐
                         │        Popup (UI)            │
                         │  src/popup/*.{ts,html,css}   │
                         │  - Resume upload / status    │
                         │  - Queue view                │
                         │  - Manual "Detect / Fill"    │
                         └──────────────┬───────────────┘
                                        │ chrome.runtime.sendMessage
                                        │   (typed via src/lib/messaging.ts)
                                        ▼
┌────────────────────────────────────────────────────────────────────────┐
│                       Background Service Worker                        │
│                       src/background/index.ts                          │
│                                                                        │
│   ┌───────────────┐   ┌─────────────────────┐   ┌──────────────────┐   │
│   │  JobQueue     │   │ AnthropicClient     │   │ VerificationSrv  │   │
│   │  queue.ts     │   │ anthropic-client.ts │   │ server-client.ts │   │
│   │  (chrome.     │   │  → api.anthropic    │   │  → 127.0.0.1     │   │
│   │   storage)    │   │    .com (HTTPS)     │   │    (localhost)   │   │
│   └───────────────┘   └─────────────────────┘   └──────────────────┘   │
└──────────────┬───────────────────────────────────────┬─────────────────┘
               │ chrome.tabs.sendMessage               │
               │  { type: DETECT | FILL | SUBMIT_DRY } │
               ▼                                       │
    ┌────────────────────────────────┐                 │
    │      Content Script            │                 │
    │  src/content/{greenhouse,      │                 │
    │    lever, ashby, generic}.ts   │                 │
    │  → installContentBridge(host)  │                 │
    │    from src/content/base.ts    │                 │
    │  - detectFieldsFromDom()       │                 │
    │  - applyFillPlan()             │                 │
    └────────────────┬───────────────┘                 │
                     │ DOM read / write                │
                     ▼                                 │
              ┌──────────────┐                         │
              │  Job page    │                         │
              │  (ATS form)  │◄────────────────────────┘
              └──────────────┘         (never auto-submits;
                                        user clicks Submit)
```

### Message flow (happy path)

1. User opens the popup on a job page.
2. Popup sends `DETECT` to background; background forwards it to the
   active tab's content script via `chrome.tabs.sendMessage`.
3. Content script runs `detectFieldsFromDom()` and returns
   `DetectedField[]` back through the background to the popup.
4. Popup requests `FILL`. Background:
   - Loads the stored resume from `chrome.storage.local`
     (`resume-store.ts`).
   - Asks `AnthropicClient` to draft answers for free-text fields not
     already covered by the resume.
   - Builds a `FillPlan` and dispatches `FILL` to the content script.
5. Content script calls `applyFillPlan(plan)` which uses
   `fillFieldsBySelector` to write values into the DOM. The plan is
   applied but the form is **not** submitted.
6. On user confirmation, background enqueues a verification job
   (`JobQueue.add`) and posts it to the local verification server
   (`VerificationServerClient`) for out-of-band review.

All cross-context messages are typed and go through
`src/lib/messaging.ts` (`sendToBackground`, `onMessage`) so the popup,
background, and content scripts share one contract.

---

## 2. File layout

```
extension/
├── manifest.json                  MV3 manifest (host_permissions, action, sw)
├── src/
│   ├── background/
│   │   ├── index.ts               Service worker entry; wires messaging
│   │   ├── queue.ts               JobQueue: add/update/get/all/clear
│   │   ├── server-client.ts       VerificationServerClient (localhost)
│   │   └── anthropic-client.ts    AnthropicClient (api.anthropic.com)
│   ├── content/
│   │   ├── base.ts                installContentBridge + shared detect/fill
│   │   ├── greenhouse.ts          host-specific bridge
│   │   ├── lever.ts               host-specific bridge
│   │   ├── ashby.ts               host-specific bridge
│   │   └── generic.ts             fallback bridge for unknown hosts
│   ├── popup/
│   │   ├── index.html
│   │   ├── main.ts                UI wiring, calls sendToBackground
│   │   └── styles.css
│   ├── lib/
│   │   ├── logger.ts              createLogger(scope)
│   │   ├── storage.ts             createStorage() — typed chrome.storage
│   │   ├── messaging.ts           sendToBackground, onMessage, types
│   │   ├── form-filler.ts         fillFieldsBySelector (DOM writes)
│   │   └── resume-store.ts        loadStoredResume / saveStoredResume
│   └── types/                     shared DetectedField, FillPlan, JobRecord
├── tests/                         Vitest + jsdom
├── docs/
│   └── ARCHITECTURE.md            (this file)
└── package.json
```

Content scripts are declared in `manifest.json` per host with matching
`js` entries pointing to the compiled `content/<host>.js`. Each host
file is a thin wrapper:

```ts
import { installContentBridge } from './base.js';
installContentBridge('greenhouse');
```

All detection/fill logic lives in `base.ts` so per-host divergence stays
data-driven (selectors, quirks) rather than duplicated code paths.

---

## 3. Storage schema (`chrome.storage.local`)

Accessed exclusively through `src/lib/storage.ts` (`createStorage()`),
which provides a typed facade over `chrome.storage.local`. Keys:

| Key                     | Shape                                     | Owner              | Notes |
|-------------------------|-------------------------------------------|--------------------|-------|
| `resume:v1`             | `{ text: string; fileName: string; updatedAt: number; sha256: string }` | `resume-store.ts`  | The user's resume text extracted from PDF/DOCX upload. |
| `profile:v1`            | `{ fullName; email; phone; links: {label,url}[]; location }` | popup / background | Structured contact fields prefilled into forms. |
| `settings:v1`           | `{ serverUrl: string; serverToken: string; anthropicKey: string; model: string; autoFill: boolean }` | popup              | Never logged; `serverUrl` locked to `http://127.0.0.1:*`. |
| `queue:v1`              | `JobRecord[]` — `{ id; url; host; title; status: 'pending'\|'filled'\|'verified'\|'error'; createdAt; updatedAt; fields?: FillPlan; error?: string }` | `queue.ts`         | Bounded; oldest trimmed after `MAX_QUEUE` (see `queue.ts`). |
| `detect-cache:v1`       | `Record<urlHash, { fields: DetectedField[]; at: number }>` | background         | Short-TTL cache of last detection per URL. |
| `log:v1`                | ring buffer of `{ level; scope; msg; at }` | `logger.ts`        | Dev-only; disabled in production build. |

Rules:
- Only `storage.ts` reads/writes these keys — no other module touches
  `chrome.storage.*` directly.
- All keys carry a `:v1` suffix to allow forward migration.
- The Anthropic API key and server bearer token are held in
  `settings:v1`; they are **never** written to logs, the queue, or
  `detect-cache:v1`.
- `chrome.storage.sync` is not used — everything is local to the
  device.

---

## 4. Security posture

**Bearer-token for the local server.**
`VerificationServerClient` attaches an `Authorization: Bearer <token>`
header on every request. The token is generated on first run and stored
in `settings:v1.serverToken`; the companion server rejects requests
without it. This prevents other localhost processes (or a malicious
page's `fetch` if it ever escaped CSP) from driving the server.

**Localhost-only verification server.**
The `serverUrl` in `settings:v1` is validated to match
`^http://127\.0\.0\.1(:\d+)?/?$`. Any other origin is refused before a
request is made. `manifest.json` `host_permissions` mirror this so the
service worker cannot even reach a non-loopback address for
verification traffic. The only remote host the extension talks to is
`https://api.anthropic.com` (Anthropic API), and only from the
background service worker — never from a content script.

**No auto-submit, ever.**
Content scripts implement `applyFillPlan` but deliberately do **not**
click submit buttons, dispatch synthetic `submit` events, or call
`form.submit()`. The DOM writes stop at populating fields; the human
reviews and submits. This is enforced by:
- `form-filler.ts` operating on field elements only (no `<button>` or
  `<form>` targets in its selector allow-list).
- A unit test asserting that after `applyFillPlan` runs, no
  `submit` event fires and no button with `type="submit"` was
  activated.
- The background never sending a `SUBMIT` message type — only
  `DETECT`, `FILL`, and `SUBMIT_DRY_RUN` (which returns a preview
  payload).

**Content Security Policy.**
`manifest.json` sets an MV3 `content_security_policy.extension_pages`
of `script-src 'self'; object-src 'self'`. No `eval`, no remote script
loads, no inline scripts in the popup.

**Least-privilege permissions.**
`permissions` are limited to `storage`, `activeTab`, and `scripting`;
`host_permissions` list only the supported ATS domains plus
`http://127.0.0.1/*`. `tabs` is intentionally omitted — the popup uses
`activeTab` to reach the current job page and nothing else.

**PII handling.**
Resume text and profile data live only in `chrome.storage.local` on
the user's device. They are sent to `api.anthropic.com` only when the
user triggers a fill that needs a generated answer, and only the
minimum context (the field prompt + relevant resume snippets) is
included. Nothing is sent to the verification server other than the
`JobRecord` metadata the user has explicitly queued.
