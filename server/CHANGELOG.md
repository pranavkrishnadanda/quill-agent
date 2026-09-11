# Changelog

All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.1.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [0.1.0] - 2026-09-10

Initial release of the job-agent-server.

### Added

- **Health endpoint** (`GET /health`) reporting service status and version for
  liveness/readiness probes.
- **Verification-code endpoint** (`GET /verify-code`) that returns the most
  recent verification/one-time code extracted from inbound email, with
  filtering by sender and recency window.
- **IMAP polling worker** that connects to the configured IMAP server,
  incrementally fetches unseen messages, parses verification codes from
  subject and body, and persists them for retrieval via the API.
- **Bearer token authentication** middleware protecting all non-health
  endpoints; tokens are validated against configured server-side secrets
  using constant-time comparison to defend against timing attacks.
- **Structured JSON logging** with correlation IDs for request tracing.
- **Pydantic v2 configuration and response models** enforcing strict input
  validation at every boundary.

[0.1.0]: https://example.invalid/job-agent-server/releases/tag/v0.1.0
