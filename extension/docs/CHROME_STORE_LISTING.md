# Chrome Web Store Listing — Job Agent

Submission draft for the Chrome Web Store developer dashboard. Copy each field
into the corresponding form on submission.

---

## Name

Job Agent — AI-assisted form fill

## Short Description

(Max 132 characters — current length: 128)

Human-in-the-loop AI helper that pre-fills job application forms on Greenhouse, Lever, Ashby, Workday, and other ATSes.

## Detailed Description

(~2000 characters)

Job Agent is a human-in-the-loop assistant that takes the tedium out of job
applications without ever taking the wheel away from you. Point it at a job
posting on a supported applicant tracking system (ATS), let it read the form,
and it will draft answers from your stored resume and profile. Every field is
staged in a review panel first — you inspect, edit, approve, or reject before a
single character lands in the real form.

What it does
- Detects form fields on the current application page (name, contact,
  work authorization, EEO, custom short-answer, and long-answer prompts).
- Generates a proposed fill plan from your local resume and profile, using
  your own Anthropic API key or an optional self-hosted verification server.
- Presents the plan in a side panel so you can review every value, tweak
  wording, and choose which fields to apply.
- Applies only the fields you approve, into the page you are already viewing.
- Keeps a per-job queue so you can pause, resume, and pick up where you left
  off across sessions.

Why human-in-the-loop
Job applications are high-stakes and highly personal. Auto-submitting on your
behalf risks sending answers you would never have written, tripping ATS
duplicate detection, or violating an employer's terms. Job Agent draws a hard
line: the extension proposes, you dispose. Nothing is submitted without an
explicit click from you inside the real form.

What Job Agent does NOT do
- It does not auto-submit applications. The final Submit button is always
  yours to press.
- It does not bypass CAPTCHAs, anti-bot checks, or rate limits. If a site
  blocks automation, Job Agent respects that block.
- It does not sell, share, or monetize your data. Your resume, profile, and
  answers stay in your browser's local storage (and, if you configure one,
  your own server). No third-party analytics, no ad networks, no trackers.
- It does not scrape job boards in the background. It only runs on tabs you
  open and activate.

Supported ATSes
- Greenhouse (boards.greenhouse.io, job-boards.greenhouse.io)
- Lever (jobs.lever.co)
- Ashby (jobs.ashbyhq.com)
- Workday (*.myworkdayjobs.com)
- Generic fallback for other HTML forms

Bring your own key. Open source. Audit-friendly.

## Category

Productivity

## Language

English (United States)

---

## Permissions Rationale

Provide the following justifications in the Chrome Web Store "Privacy
practices" tab.

### `storage`
Used to persist the user's resume, profile fields, per-job application queue,
and extension settings (API endpoint, model choice) in `chrome.storage.local`.
No data leaves the device through this permission.

### `activeTab`
Used to read the currently focused job application page when the user clicks
the extension's action icon or the "Detect fields" button in the side panel.
Access is scoped to the tab the user is actively looking at and is granted
only for that interaction.

### `scripting`
Used to inject the ATS-specific content script (`greenhouse.ts`, `lever.ts`,
`ashby.ts`, `workday.ts`, or the generic fallback) into the active tab so it
can detect form fields and apply approved values. Injection happens only after
the user opens the side panel on a supported host.

### `host_permissions`
Requested for the exact hostnames of supported ATSes:
- `https://boards.greenhouse.io/*`
- `https://job-boards.greenhouse.io/*`
- `https://jobs.lever.co/*`
- `https://jobs.ashbyhq.com/*`
- `https://*.myworkdayjobs.com/*`

These are required so the content script can read form structure and write
approved values back into the application form. No other hosts are accessed.

### Remote code
Job Agent does not execute remote code. All JavaScript is bundled with the
extension at build time. The only outbound network requests are:
1. To `api.anthropic.com` using the user's own API key, and
2. Optionally, to a user-configured verification server URL.

Both endpoints are user-configurable and can be disabled.

---

## Screenshots

Five 1280x800 PNG screenshots. Captions:

1. **Side panel review UI** — "Review every field before it fills. Nothing is
   submitted without you."
2. **Field detection on Greenhouse** — "Detects short-answer, long-answer, and
   EEO questions across supported ATSes."
3. **Resume and profile settings** — "Your resume stays in your browser. Bring
   your own Anthropic key."
4. **Per-job queue** — "Pause on one tab, resume on another. Your progress
   travels with you."
5. **Approve-and-apply flow** — "Approve individual fields; the real Submit
   button is always yours to click."

---

## Support & Legal

- Support email: `TODO@example.com`
- Privacy policy URL: `https://TODO.example.com/privacy`
- Homepage URL: `https://TODO.example.com`
- Single purpose description: "Assist users in filling out job application
  forms on supported applicant tracking systems, with human review of every
  proposed value before it is applied."

---

## Distribution

- Visibility: Public
- Regions: All regions
- Pricing: Free
