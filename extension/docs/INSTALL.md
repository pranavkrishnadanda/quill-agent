# Install Guide

End-user guide for installing and using the Job Agent Chrome extension.

## Prerequisites

- **Google Chrome** 120 or newer (any Chromium-based browser that supports Manifest V3 will also work: Edge, Brave, Arc).
- **Anthropic API key** — needed for the LLM-driven field mapping. Create one at <https://console.anthropic.com/>.
- **Resume** — plain text or Markdown you are comfortable pasting into the Options page. It is stored locally in `chrome.storage.local` and never uploaded except to Anthropic when a fill is requested.
- **Verification server (optional)** — the companion server issues short-lived codes that let the extension confirm a submission before it is sent. If you do not plan to run the server, you can skip verification (the extension will still fill fields, it just will not gate submit on a code).

## 1. Load the unpacked extension

1. Build the extension once:
   ```
   bun install
   bun run build
   ```
   The output lands in `extension/dist/`.
2. Open `chrome://extensions` in Chrome.
3. Toggle **Developer mode** on (top-right).
4. Click **Load unpacked** and select the `extension/dist/` directory.
5. The Job Agent icon should appear in the toolbar. Pin it via the puzzle-piece menu for easier access.

## 2. Initial setup (Options page)

1. Right-click the toolbar icon and choose **Options** (or click the icon and choose the gear).
2. Fill in each section and click **Save** at the bottom:
   - **Resume** — paste your resume text. Keep it under ~10k characters for best LLM latency.
   - **Anthropic API key** — starts with `sk-ant-`. Stored locally; used only for outbound calls to `api.anthropic.com`.
   - **Verification server URL** (optional) — e.g. `http://localhost:8787`. Leave blank to disable verification.
   - **Verification token** (optional) — the bearer token the server expects.
3. A green "Saved" banner confirms values are persisted.

## 3. First-use walkthrough (Greenhouse)

1. Open any Greenhouse-hosted application, e.g. `https://boards.greenhouse.io/<company>/jobs/<id>`.
2. Click the Job Agent toolbar icon. The popup shows the detected host (`greenhouse`) and a **Detect fields** button.
3. Click **Detect fields**. The extension scans the DOM and lists inputs it can fill (name, email, work history, custom questions).
4. Click **Plan fill**. The background worker sends the field list plus your resume to Anthropic and returns a fill plan.
5. Review the proposed values in the popup, then click **Apply**. Fields are populated in-place.
6. If a verification server is configured, click **Request code**, enter the code the server displays, then click **Submit**. Otherwise submit the form manually.

Lever and Ashby pages work the same way — the popup will show `lever` or `ashby` as the host.

## Troubleshooting

### The toolbar icon does not appear
- Re-check `chrome://extensions`: the Job Agent card should be **Enabled** with no red error banner.
- If there is an error banner, click **Errors** to view it. The most common cause is a stale `dist/` — rebuild with `bun run build` and click the reload arrow on the extension card.
- Pin the icon via the puzzle-piece menu in Chrome's toolbar.

### "No fields detected" on a supported host
- Some Greenhouse/Lever/Ashby forms load asynchronously. Wait until the form is fully visible, then click **Detect fields** again.
- Confirm the page URL matches a supported host pattern (see `manifest.json` `content_scripts.matches`). Embedded iframes on a company career page may not match; open the underlying job URL directly.
- Open DevTools → Console and look for `[content:<host>]` log lines. `detectFieldsFromDom returned 0` means the selectors in `src/content/base.ts` did not match — capture the page HTML and file an issue.

### "Server unreachable" when requesting a verification code
- Confirm the server is running and reachable from your browser: `curl <server-url>/health`.
- The URL in Options must include the scheme (`http://` or `https://`). A bare hostname will fail.
- If the server uses HTTPS with a self-signed certificate, visit the URL once in a normal tab and accept the certificate so Chrome trusts it for background requests.
- Check the extension's service worker console: `chrome://extensions` → Job Agent → **Service worker** → Console. Look for `[server-client]` errors.

### Anthropic call fails with 401 / 403
- The API key is missing, malformed, or revoked. Re-paste it in Options and Save.
- The key must have permission for the `claude-*` model configured in `src/background/anthropic-client.ts`.

### Fields fill with wrong values
- The LLM plan is only as good as the resume you provided. Expand the resume with the missing details (e.g. add graduation dates, work authorization) and try again.
- You can always edit fields manually after **Apply** — the extension does not lock them.
