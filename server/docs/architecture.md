# Job Agent Server — Architecture

A small FastAPI service that watches an IMAP mailbox and returns the most
recent verification code (or magic link) matching a caller-supplied regex.
Used by job-application agents to complete "check your email for a code"
flows without a human in the loop.

## Component diagram

```
                       +--------------------------+
   Agent / caller ---->|  FastAPI app (api/)      |
   Bearer token        |    - /health             |
                       |    - /verify-code        |
                       +-----------+--------------+
                                   |
                       +-----------v--------------+
                       |  verify_service          |
                       |  poll_for_verification() |
                       +-----------+--------------+
                                   |
              +--------------------+----------------------+
              |                    |                      |
      +-------v------+    +--------v--------+   +---------v---------+
      | imap.search  |    |  imap.fetch     |   |  pattern_matcher  |
      | UID SEARCH   |    |  BODY.PEEK[]    |   |  regex + magic    |
      | SINCE / NEW  |    |  RFC822 bytes   |   |  link extraction  |
      +-------+------+    +--------+--------+   +---------+---------+
              |                    |                      |
              +--------+-----------+                      |
                       |                                  |
              +--------v---------+               +--------v--------+
              | imap.connection  |               | email_decoder / |
              | imaplib SSL sock |               | extractors      |
              +--------+---------+               +-----------------+
                       |
                       v
              +-------------------+
              |  IMAP server      |
              |  (Gmail / Green-  |
              |   mail in tests)  |
              +-------------------+
```

Cross-cutting:
- `config.py` — Pydantic v2 `Settings` (env-loaded: host, port, user, app
  password, folder, bearer token).
- `auth.py` — constant-time bearer-token check for `/verify-code`.

## File layout

```
src/job_agent_server/
    __init__.py
    config.py             # Settings (pydantic BaseSettings-style)
    auth.py               # verify_bearer_token()
    email_decoder.py      # RFC 2047 / quoted-printable / base64 decoding
    extractors.py         # HTML-to-text, magic-link URL extraction
    pattern_matcher.py    # regex-driven code + link matching
    verify_service.py     # poll_for_verification() — the core loop
    imap/
        __init__.py
        connection.py     # open_imap_connection / close_imap_connection
        search.py         # UID SEARCH SINCE <date>, NEW, UNSEEN filters
        fetch.py          # UID FETCH BODY.PEEK[] -> raw bytes
    api/
        __init__.py
        server.py         # create_app() factory + module-level app
        models.py         # VerifyRequest / VerifyResponse / HealthResponse

tests/
    unit/                 # pure-python, no network
    integration/          # real IMAP via Greenmail (docker-compose.test.yml)
        conftest.py       # greenmail / greenmail_clean fixtures

docs/
    architecture.md       # this file
```

## Request flow — `POST /verify-code`

Request body (Pydantic `VerifyRequest`):
```
{
  "pattern": "\\b\\d{6}\\b",
  "since_seconds": 300,
  "timeout_seconds": 30,
  "poll_interval_seconds": 2
}
```

Step-by-step:

1. **HTTP entry** — `api/server.py::verify_code` receives the request.
   FastAPI validates the JSON into `VerifyRequest`.
2. **Auth** — `require_auth` dependency reads the `Authorization: Bearer …`
   header and calls `auth.verify_bearer_token()`. A mismatch returns
   `401 unauthorized`; the token comparison is constant-time.
3. **Settings** — `get_settings()` returns the injected `Settings` (test
   override) or loads from env (`load_settings()`).
4. **Connect** — `imap.connection.open_imap_connection()` opens an
   `imaplib.IMAP4_SSL` (or plain `IMAP4` when `imap_use_ssl=False`),
   logs in with the app password, and selects the configured folder.
   The connection is scoped to this single request (opened/closed in a
   `try/finally`) — no shared pool, so each request is isolated.
5. **Poll loop** — control passes to
   `verify_service.poll_for_verification(conn, folder, pattern,
   since_seconds, timeout_seconds, poll_interval_seconds)`.
   Until `timeout_seconds` elapses:
     a. `imap.search` issues `UID SEARCH SINCE <date>` (and/or NEW/UNSEEN)
        to get candidate UIDs newer than `now - since_seconds`.
     b. For each UID (newest first), `imap.fetch` runs
        `UID FETCH <uid> BODY.PEEK[]` to pull the raw RFC 822 bytes
        without setting the `\Seen` flag.
     c. `email_decoder` parses headers (RFC 2047) and body parts
        (quoted-printable, base64, charset).
     d. `extractors` flattens HTML to text and pulls candidate URLs.
     e. `pattern_matcher` runs the caller's regex against the decoded
        text/HTML/subject; if it matches, it also tries to identify a
        "magic link" URL near the match.
     f. On first match, returns a `VerificationResult(code, magic_link,
        subject, from_addr)`.
   If no message matches, `sleep(poll_interval_seconds)` and retry.
6. **Response** — the handler wraps the result in `VerifyResponse` and
   returns `200`. If the poll times out, it raises `HTTPException(408,
   "timeout")`. The IMAP connection is closed either way.

## `GET /health`

Opens and immediately closes an IMAP connection using the configured
credentials. Returns `{"status": "ok", "imap": "connected"}` on success
or `{"status": "ok", "imap": "error: <ExcType>"}` on failure — the
process is still healthy; only IMAP reachability degrades. No auth is
required so an external load balancer can probe it.

## Design notes

- **Stateless per-request IMAP** — simplifies error handling and avoids
  stale-connection bugs; the pattern-match latency dominates network
  setup for realistic `timeout_seconds` (5–30 s).
- **`BODY.PEEK[]`** — never marks user mail as read.
- **Regex supplied by caller** — the server is generic; the agent knows
  what a "code" looks like for the site it is signing into.
- **`since_seconds`** — bounds the SEARCH window so a busy inbox does
  not stream thousands of UIDs on every poll.
- **Pydantic v2 at the edge** — request/response models are the only
  contract the server exposes; internal functions pass typed values.
- **Tests** — unit tests exercise decoders/matchers with fixture bytes;
  integration tests drive a real IMAP server (Greenmail) via the
  `greenmail` / `greenmail_clean` fixtures in
  `tests/integration/conftest.py`.
