# Security: Threat Model & Mitigations

This document describes the threat model for `job-agent-server` and the
mitigations that are enforced in code and configuration. The service is a
small local HTTP API that reads Gmail via IMAP and exposes classified job
messages to a local agent. It is **not** intended to be exposed to the public
Internet.

## 1. Trust Boundaries

| Boundary | Trusted | Untrusted |
| --- | --- | --- |
| Local loopback (127.0.0.1) | Agent process, developer shell | Anything else on the host |
| IMAP transport | `imap.gmail.com` cert-pinned via system CA | Network path |
| Mail content | Message metadata (headers, subject, snippet) | Message body, HTML, attachments, sender-controlled headers |
| Configuration | `.env` / OS keychain owned by the user | Process env vars from parent shells if leaked |

Anything crossing a boundary from the *untrusted* column MUST be validated
(Pydantic v2 at the edge) and MUST NOT be logged verbatim if it contains
secrets or PHI/PII.

## 2. Assets

1. **Gmail credentials** — App Password or OAuth refresh token. Highest value.
2. **Bearer token** — grants full API access to the local service.
3. **Mail contents** — classified job correspondence, may contain PII.
4. **Classifier state / cache** — lower value but leaks metadata about the
   user's job search.

## 3. Threats & Mitigations

### T1. Credential theft from disk or logs
- **Threat:** App Password or bearer token exfiltrated via log scraping,
  crash dumps, or shell history.
- **Mitigation:**
  - Secrets are read exclusively from environment variables or an OS
    keychain. They are NEVER interpolated into log records.
  - The structured logger has a redaction filter that masks any field
    matching `password`, `token`, `authorization`, `secret`, `api_key`.
  - `repr()` on the settings model returns `SecretStr('**********')` for
    every secret field (Pydantic v2 `SecretStr`).
  - `.env` files are `chmod 600` and listed in `.gitignore`.

### T2. Unauthorized local API access
- **Threat:** Another local process or a malicious browser page (via DNS
  rebinding) calls the API and reads mail.
- **Mitigation:**
  - The HTTP server binds to `127.0.0.1` only. `0.0.0.0` binding is
    rejected at startup with a fatal error.
  - Every non-health endpoint requires a `Authorization: Bearer <token>`
    header. The token is compared with `hmac.compare_digest` to prevent
    timing side-channels.
  - The `Host` header is validated against an allowlist
    (`localhost`, `127.0.0.1`) to defeat DNS rebinding.
  - CORS is disabled by default. If enabled, only explicit localhost
    origins are permitted; wildcard origins are rejected at config load.

### T3. IMAP transport interception
- **Threat:** Passive or active attacker on the network reads credentials
  or mail contents.
- **Mitigation:**
  - IMAP is opened with `imaplib.IMAP4_SSL` on port 993. Plaintext
    `IMAP4` is not permitted; the client factory raises on non-TLS.
  - TLS certificates are validated against the system trust store
    (`ssl.create_default_context()`); hostname verification is on.
  - Minimum TLS version is 1.2.
  - `STARTTLS`-downgrade is not attempted.

### T4. Credential type: App Password vs OAuth
- **App Password (default for personal Gmail):**
  - Pros: simple, works with `imaplib`, no browser dance.
  - Cons: long-lived, full mailbox access, revocable only via Google
    account UI. Requires 2FA on the Google account.
  - Mitigation: store in OS keychain, rotate every 90 days, document
    revocation procedure in the runbook.
- **OAuth 2.0 (recommended for Workspace / production):**
  - Pros: short-lived access tokens, scope-limited
    (`https://mail.google.com/`), revocable centrally, works with
    Workspace admin policies that forbid App Passwords.
  - Cons: requires refresh-token storage and a token-refresh loop; the
    refresh token itself becomes a high-value secret.
  - Mitigation: refresh tokens are stored in the OS keychain, never on
    disk in plaintext; access tokens are kept in memory only and never
    logged; on 401 from IMAP the client refreshes once and retries.
- The client is written against a `Credential` protocol so App Password
  and OAuth backends are interchangeable; production deployments SHOULD
  prefer OAuth.

### T5. Secrets in logs / error traces
- **Threat:** Bearer token or App Password ends up in a stack trace,
  request log, or metrics label.
- **Mitigation:**
  - Structured JSON logger with an allowlist of loggable fields. Request
    logs include method, path, status, latency, correlation id — NEVER
    headers or body.
  - Global exception handler strips `Authorization` and `Cookie` headers
    before logging the request context.
  - Test suite includes an assertion that scans captured log output for
    known-secret sentinel values after each auth-related test.

### T6. Malicious mail content
- **Threat:** A crafted message triggers a parser bug (header injection,
  MIME bomb, ReDoS, XXE) that crashes the service or leaks memory.
- **Mitigation:**
  - Message size cap enforced on `FETCH` (default 1 MiB); larger messages
    are truncated with a warning.
  - HTML bodies are not rendered; only a text snippet (first 2 KiB) is
    extracted and length-capped by Pydantic.
  - All parser regexes are anchored and bounded; no unbounded
    backtracking constructs.
  - No XML parsing on mail bodies.

### T7. Replay / CSRF against the local API
- **Mitigation:** the API is not cookie-authenticated, so CSRF is not
  applicable. Bearer tokens are single-purpose and rotated on process
  restart if `AGENT_TOKEN` is not pinned.

### T8. Resource exhaustion
- **Mitigation:**
  - Request size cap (256 KiB) at the HTTP layer.
  - IMAP fetches are paged and use bounded generators; no unbounded
    `list()` of message ids.
  - Per-endpoint rate limiting on the classifier route.

## 4. Non-Goals

- Multi-tenant use. The server assumes a single local user.
- Public Internet exposure. If reverse-proxied, an operator MUST add
  mTLS or an authenticating proxy in front; the built-in bearer token
  is not sufficient hardening for public exposure.
- Message-level encryption (S/MIME, PGP). Out of scope.

## 5. Operator Checklist

- [ ] `.env` is `chmod 600` and not committed.
- [ ] `AGENT_TOKEN` is at least 32 bytes of `secrets.token_urlsafe`.
- [ ] Gmail account has 2FA enabled.
- [ ] App Password is scoped to this machine and named accordingly, OR
      OAuth client is configured with the minimum `mail.google.com` scope.
- [ ] Server bind address is `127.0.0.1`.
- [ ] Log destination is a user-owned file (`chmod 600`) or `stdout`
      captured by a user-scoped supervisor.
- [ ] Credential rotation procedure is documented and tested.
