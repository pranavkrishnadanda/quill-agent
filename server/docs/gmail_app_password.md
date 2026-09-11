# Gmail App Password Setup

The job-agent-server connects to Gmail over IMAP using an **App Password**, not
your regular Google account password. App Passwords are 16-character tokens
that bypass interactive login and are the only supported way to authenticate
IMAP clients against a Google account that has 2-Step Verification enabled.

## Prerequisites

- A Google account (personal `@gmail.com` or Workspace).
- Ability to enable 2-Step Verification. For Workspace accounts, your admin
  must allow App Passwords (some organizations disable them by policy — if
  the App Passwords page is missing, contact your admin).

## Step 1 — Enable 2-Step Verification (2FA)

App Passwords are only available on accounts with 2FA turned on.

1. Open <https://myaccount.google.com/security>.
2. Under **How you sign in to Google**, click **2-Step Verification**.
3. Click **Get started** and follow the prompts:
   - Confirm your password.
   - Add a phone number or authenticator app as the second factor.
   - Complete the verification code challenge.
4. Confirm the page now shows **2-Step Verification: On**.

## Step 2 — Generate an App Password

1. Go directly to <https://myaccount.google.com/apppasswords>.
   (This page only loads once 2FA is enabled. If it 404s, re-check Step 1.)
2. Re-enter your Google password if prompted.
3. In the **App name** field, enter a descriptive label, e.g.
   `job-agent-server`.
4. Click **Create**.
5. Google shows a **16-character password** in a yellow box, formatted as
   four groups of four characters separated by spaces
   (e.g. `abcd efgh ijkl mnop`).
6. Copy the password **now** — Google will not show it again. If you lose it,
   revoke and generate a new one.

## Step 3 — Store the App Password

1. Open the job-agent-server `.env` file (or your secrets manager entry).
2. Paste the password into `IMAP_APP_PASSWORD` **without the spaces**:

   ```env
   IMAP_HOST=imap.gmail.com
   IMAP_PORT=993
   IMAP_USERNAME=you@gmail.com
   IMAP_APP_PASSWORD=abcdefghijklmnop
   ```

3. Ensure `.env` is listed in `.gitignore`. Never commit App Passwords to
   version control, log them, or paste them into chat transcripts.

## Step 4 — Verify

Run the IMAP connection smoke test:

```bash
.venv/bin/python -m job_agent_server.cli imap-check
```

A successful run prints the selected mailbox and message count. If you see
`AUTHENTICATIONFAILED`, the most common causes are:

- Spaces left inside the App Password value.
- 2FA was disabled after the password was generated (this invalidates all
  existing App Passwords).
- The Workspace admin has disabled App Passwords.
- The wrong `IMAP_USERNAME` (must be the full email address).

## Revoking an App Password

To rotate or revoke:

1. Return to <https://myaccount.google.com/apppasswords>.
2. Click the trash icon next to the `job-agent-server` entry.
3. Generate a new one and update `IMAP_APP_PASSWORD`.

Revoke immediately if the value is ever exposed (committed, logged, or
shared). Revocation takes effect within seconds.

## References

- Google: <https://support.google.com/accounts/answer/185833>
- Google: <https://support.google.com/mail/answer/7126229> (IMAP settings)
