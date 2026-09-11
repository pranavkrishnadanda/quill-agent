# Job Agent Server — API Reference

Base URL (local dev): `http://127.0.0.1:8000`

All endpoints return `application/json` unless otherwise noted. Requests that carry a body must set `Content-Type: application/json`.

---

## GET /health

Lightweight liveness probe. Returns the current service status and version. Safe to call at high frequency (used by load balancers and uptime checks).

### Request

- Method: `GET`
- Path: `/health`
- Headers: none required
- Body: none
- Query params: none

### Response — `200 OK`

Schema:

| Field     | Type   | Description                                  |
|-----------|--------|----------------------------------------------|
| `status`  | string | Always `"ok"` when the process is healthy.   |
| `version` | string | Semver of the running build (e.g. `1.2.3`).  |
| `uptime_s`| number | Seconds since process start.                 |

Example body:

```json
{
  "status": "ok",
  "version": "1.2.3",
  "uptime_s": 1284.7
}
```

### Error responses

| Status | Meaning                                                    |
|--------|------------------------------------------------------------|
| `503`  | Service is up but a dependency (DB, mail) is unreachable.  |

### Curl examples

1. Basic health check:

```bash
curl -sS http://127.0.0.1:8000/health
```

2. Include response headers and status line:

```bash
curl -sS -i http://127.0.0.1:8000/health
```

3. Use as a shell gate (exit non-zero if not healthy):

```bash
curl -fsS http://127.0.0.1:8000/health > /dev/null && echo "healthy" || echo "unhealthy"
```

---

## POST /verify-code

Verifies a one-time email confirmation code that was previously sent to the user. On success, the user's email is marked verified and a short-lived session token is issued.

### Request

- Method: `POST`
- Path: `/verify-code`
- Headers:
  - `Content-Type: application/json` (required)
  - `X-Request-Id: <uuid>` (optional; echoed in the response for tracing)

Body schema (Pydantic v2):

| Field    | Type   | Required | Constraints                                    | Description                                  |
|----------|--------|----------|------------------------------------------------|----------------------------------------------|
| `email`  | string | yes      | RFC 5322, max 254 chars, lower-cased on ingest | Email address the code was sent to.          |
| `code`   | string | yes      | exactly 6 digits, `^[0-9]{6}$`                 | One-time verification code.                  |

Example body:

```json
{
  "email": "user@example.com",
  "code": "482913"
}
```

### Response — `200 OK`

| Field         | Type    | Description                                             |
|---------------|---------|---------------------------------------------------------|
| `verified`    | boolean | `true` when the code matched and was consumed.          |
| `email`       | string  | Canonical (lower-cased) email that was verified.        |
| `session_token` | string | Opaque token, valid for 24h. Use as bearer token.       |
| `expires_at`  | string  | ISO 8601 UTC timestamp of session expiry.               |

Example body:

```json
{
  "verified": true,
  "email": "user@example.com",
  "session_token": "sess_5b2f...c1e9",
  "expires_at": "2026-09-11T14:32:07Z"
}
```

### Error responses

| Status | `error.code`         | Meaning                                                    |
|--------|----------------------|------------------------------------------------------------|
| `400`  | `invalid_payload`    | Body failed schema validation (missing/invalid fields).    |
| `401`  | `code_mismatch`      | Code does not match the outstanding code for this email.   |
| `404`  | `no_pending_code`    | No verification code has been issued for this email.       |
| `410`  | `code_expired`       | Code was correct but its TTL elapsed.                      |
| `429`  | `too_many_attempts`  | Rate limit exceeded; retry after `Retry-After` seconds.    |

Error body shape:

```json
{
  "error": {
    "code": "code_mismatch",
    "message": "The code provided does not match."
  }
}
```

### Curl examples

1. Happy path:

```bash
curl -sS -X POST http://127.0.0.1:8000/verify-code \
  -H 'Content-Type: application/json' \
  -d '{"email":"user@example.com","code":"482913"}'
```

2. With a request ID for correlation in logs:

```bash
curl -sS -X POST http://127.0.0.1:8000/verify-code \
  -H 'Content-Type: application/json' \
  -H "X-Request-Id: $(uuidgen)" \
  -d '{"email":"user@example.com","code":"482913"}'
```

3. Show HTTP status and headers (useful when debugging `429`/`Retry-After`):

```bash
curl -sS -i -X POST http://127.0.0.1:8000/verify-code \
  -H 'Content-Type: application/json' \
  -d '{"email":"user@example.com","code":"000000"}'
```
