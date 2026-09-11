# Troubleshooting

Common failures encountered when running the job-agent-server and how to resolve them.

---

## 1. IMAP authentication fails

**Symptom**

```
imaplib.IMAP4.error: b'[AUTHENTICATIONFAILED] Invalid credentials (Failure)'
```

or `LOGIN failed`, `AUTHENTICATE failed`, HTTP 401 from the mail poller.

**Root cause**

Gmail (and most modern providers) require an **app-specific password** when 2FA is enabled. Regular account passwords are rejected by IMAP even when they work in the web UI. App passwords are also revoked automatically when:

- The account password is changed.
- 2FA is toggled off and on.
- Google detects "unusual activity" and forces a re-verification.
- The password has not been used for an extended period.

**Fix**

1. Sign in to <https://myaccount.google.com/apppasswords>.
2. Delete the old entry for `job-agent-server` (if present).
3. Generate a new 16-character app password. Copy it **without spaces**.
4. Update the secret store / env var:
   ```bash
   export JOB_AGENT_IMAP_PASSWORD='xxxxxxxxxxxxxxxx'
   ```
   or, in production, rotate the value in AWS Secrets Manager under
   `job-agent-server/imap/<account>` and restart the poller so it re-reads the secret.
5. Verify with a one-shot connect:
   ```bash
   .venv/bin/python -m job_agent_server.tools.imap_check --account <account>
   ```

**Do not** downgrade to plaintext passwords, disable 2FA, or embed the credential in code to "work around" this.

---

## 2. Port already in use

**Symptom**

```
OSError: [Errno 98] Address already in use
```

on startup of the API server (default `:8080`) or the local Greenmail bridge
(`:3025` IMAP, `:3143` IMAP, `:3465` SMTPS, `:3993` IMAPS).

**Root cause**

A previous server process, a stale test-suite container, or an unrelated
service is already bound to the port. `TIME_WAIT` sockets from a hard-killed
process can also hold the port for up to 60 seconds.

**Fix**

1. Identify the holder:
   ```bash
   ss -ltnp 'sport = :8080'
   # or
   lsof -iTCP:8080 -sTCP:LISTEN
   ```
2. If it is a stale job-agent-server process, stop it cleanly:
   ```bash
   kill -TERM <pid>       # SIGTERM first
   sleep 2
   kill -KILL <pid>       # only if it did not exit
   ```
3. If it is Greenmail, use the shared teardown (do not kill the container by
   hand — the integration fixtures manage its lifecycle):
   ```bash
   docker compose -f tests/integration/docker-compose.greenmail.yml down
   ```
4. Choose a different port only as a diagnostic, never as the permanent fix.
   Set `JOB_AGENT_HTTP_PORT` in the environment; the code binds whatever it
   is given.

---

## 3. Greenmail container down

**Symptom**

Integration tests fail during collection or in the `greenmail` fixture with:

```
ConnectionRefusedError: [Errno 111] Connection refused
```

or

```
docker: Error response from daemon: ... greenmail
```

**Root cause**

The shared Greenmail container defined for `tests/integration/` is not
running, exited unexpectedly, or the Docker daemon on the host is stopped.
The `greenmail` / `greenmail_clean` fixtures in
`tests/integration/conftest.py` expect the container to already be reachable
on the loopback ports listed above.

**Fix**

1. Confirm Docker is up:
   ```bash
   docker info >/dev/null
   ```
2. Check the container status:
   ```bash
   docker compose -f tests/integration/docker-compose.greenmail.yml ps
   ```
3. Start (or restart) it:
   ```bash
   docker compose -f tests/integration/docker-compose.greenmail.yml up -d
   ```
4. Wait for the IMAPS port to answer before re-running tests:
   ```bash
   until (echo > /dev/tcp/127.0.0.1/3993) 2>/dev/null; do sleep 1; done
   ```
5. If the container keeps exiting, inspect logs — a common cause is the
   host being out of memory (Greenmail's JVM needs ~256 MB):
   ```bash
   docker compose -f tests/integration/docker-compose.greenmail.yml logs --tail=100
   ```

Do **not** replace the Greenmail-backed integration tests with mocks. The
`greenmail_clean` fixture guarantees an empty mailbox per test; use it
instead of trying to reset state manually.

---

## 4. Gmail rate limit

**Symptom**

```
imaplib.IMAP4.abort: b'[LIMIT] IMAP command sent too fast'
```

or

```
[ALERT] Too many simultaneous connections. (Failure)
```

Poller latency spikes; some accounts stop receiving new mail events.

**Root cause**

Gmail enforces per-account IMAP limits (documented at
<https://support.google.com/mail/answer/7126229>):

- **~15 concurrent IMAP connections per account.**
- **~2,500 MB downloaded per day per account** via IMAP.
- Command bursts are throttled per connection.

Running multiple poller instances against the same account, or reconnecting
in a tight loop after failures, will trigger these limits. The account is
then locked out for several minutes to hours.

**Fix**

1. **Reduce concurrency to one connection per account.** The poller must
   hold a single long-lived IMAP session per account and use `IDLE`; do not
   spin up a new connection per fetch.
2. Add jittered exponential back-off on `[LIMIT]` / `[ALERT]` responses;
   never reconnect immediately on failure.
3. Prefer `UID FETCH` with `BODY.PEEK[]` and a `SINCE` filter to avoid
   re-downloading the same messages (which counts against the daily byte
   quota).
4. If you must scale horizontally, shard **by account**, not by message —
   two workers must never poll the same mailbox concurrently.
5. If the account is currently locked, stop all pollers for it and wait
   at least **1 hour** before retrying. Repeated hammering extends the
   lockout.

---

## 5. "Less secure app access" — red herring

**Symptom**

Search results and older Stack Overflow answers suggest enabling
"Less secure app access" in the Google account settings to make IMAP work.

**Reality**

Google **removed the "Less secure app access" toggle on 30 May 2022** for
all consumer accounts, and on 30 September 2024 for Workspace accounts.
The setting no longer exists and cannot be re-enabled. Any guide that tells
you to toggle it is out of date.

**What to do instead**

- Enable 2-Step Verification on the account.
- Generate an **App Password** (see section 1) and use that as the IMAP
  password.
- For Workspace accounts where the admin has disabled app passwords, the
  only supported path is **OAuth 2.0 (XOAUTH2)**. Configure the poller with
  a Google Cloud OAuth client and store the refresh token in Secrets
  Manager; the poller exchanges it for an access token on each connect.

Do not spend time hunting for the removed toggle, and do not file a bug
against the poller when the real cause is a missing app password or
missing OAuth grant.
