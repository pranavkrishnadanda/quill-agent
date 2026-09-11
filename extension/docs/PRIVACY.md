# Privacy Policy

_Last updated: 2026-09-10_

This Chrome extension helps you apply to jobs faster by auto-filling application forms on supported career sites (Greenhouse, Lever, Ashby). We take a minimal-data approach: your information stays on your machine unless it is strictly needed to perform an action you asked for.

## What we store

All data the extension keeps is stored in `chrome.storage.local` on your own device. Nothing is written to a remote server we control. Specifically, we store:

- **Your resume JSON.** A structured copy of your resume (name, contact info, work history, education, skills). You provide this yourself by uploading or pasting it into the extension.
- **Your Anthropic API key.** Used to call Anthropic's Claude API on your behalf so the extension can map your resume fields to the fields of a specific application form.
- **Your verification API token.** A short token issued by the local verification server (see below) so the extension can prove it is you when fetching one-time verification codes from your email inbox.
- **A local job queue.** A list of jobs you have applied to or queued, plus their status. This never leaves your browser.

## What we do not do

- **No analytics.** We do not run Google Analytics, Segment, Mixpanel, PostHog, Sentry, or any similar SDK.
- **No telemetry.** The extension does not phone home. It does not report usage, crashes, page visits, or feature adoption to us or to anyone else.
- **No ad networks.** No third-party trackers, pixels, or advertising identifiers.
- **No selling or sharing.** We never sell, rent, or share your data with third parties for marketing.

## Where your data goes when you use the extension

Two outbound network calls are made, and only when you trigger an action that requires them:

1. **Anthropic (`api.anthropic.com`)** — When you ask the extension to fill an application form, the relevant parts of your resume and the detected form fields are sent to Anthropic's Claude API, using the API key you configured. Anthropic's own terms and privacy policy apply to that request. You can review or revoke your key at any time in the Anthropic console.
2. **`http://localhost:8787`** — A verification server that runs on your own machine. The extension queries it to retrieve one-time email verification codes so that logins and application confirmations complete without manual copy-paste. Traffic never leaves your computer.

No other network destinations are contacted by the extension.

## Clearing your data

You can remove everything the extension has stored at any time:

1. Open `chrome://extensions`.
2. Find this extension.
3. Click **Remove**, or click **Details -> Site settings** and clear storage.

Uninstalling the extension deletes all locally stored data (resume, API key, token, and job queue). There is nothing for us to delete on our end, because we never had a copy.

## Changes

If this policy ever changes, the updated version will ship with the extension and the "Last updated" date above will change. Meaningful changes will be called out in the extension's release notes.

## Contact

Questions about this policy can be sent to the maintainer listed in the extension's repository README.
