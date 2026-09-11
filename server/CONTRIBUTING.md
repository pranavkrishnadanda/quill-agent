# Contributing to job-agent-server

Thanks for contributing. This document describes how to set up, test, and land
changes on the `job-agent-server` project.

## Prerequisites

- Python 3.12+
- Docker (for the Greenmail integration test container)
- `make` and `git`

## Project setup

The project uses a local virtualenv checked in at `.venv/`. The package is
installed in editable mode.

```bash
# Create/refresh the virtualenv
uv venv --python 3.12
# uv manages pip itself
uv pip install -e ".[dev]"
```

Always use the project interpreter and tools directly — never rely on shell
`PATH` resolution:

- Interpreter: `./.venv/bin/python`
- Test runner: `uv run pytest`
- Linter: `./.venv/bin/ruff`
- Type checker: `./.venv/bin/pyrefly` (or `./.venv/bin/mypy`)

## Running tests

The suite is split into three layers.

### Unit tests (fast, no I/O)

```bash
uv run pytest tests/unit -q
```

Unit tests must not touch the network, filesystem outside `tmp_path`, or any
external service. Use real objects — **no mocks**. Construct Pydantic models,
in-memory adapters, and fake ports directly.

### Integration tests (real Greenmail)

Integration tests share a single Greenmail SMTP/IMAP container per session,
exposed through the `greenmail` and `greenmail_clean` fixtures defined in
`tests/integration/conftest.py`.

```bash
uv run pytest tests/integration -q
```

- Use `greenmail_clean` when your test needs an empty mailbox.
- Never spin up your own Greenmail — reuse the fixture.
- Never mock the SMTP/IMAP client in an integration test.

### Full suite

```bash
uv run pytest -q
```

### Coverage

```bash
uv run pytest --cov=job_agent_server --cov-report=term-missing
```

New code should keep coverage at or above 90%.

## Code style

We use [ruff](https://docs.astral.sh/ruff/) as the sole formatter and linter.

```bash
# Auto-fix and format
./.venv/bin/ruff check --fix .
./.venv/bin/ruff format .

# Verify (CI runs this)
./.venv/bin/ruff check .
./.venv/bin/ruff format --check .
```

House rules:

- **Type hints on every function signature.** No exceptions.
- **Pydantic v2 models** for every request/response, config, and boundary
  payload. `model_config = ConfigDict(strict=True, extra="forbid")` where
  appropriate.
- **Parameterized SQL only.** Never build SQL with f-strings or `.format()`.
- **No bare `except:`** and no silent exception swallowing.
- **Structured logging** — never log secrets, credentials, PII, or PHI.
- **Context managers** for all connections, files, and sockets.
- No `# type: ignore`, `# noqa`, or `eslint-disable`-style escape hatches
  without a one-line comment explaining why.

## Type checking

```bash
./.venv/bin/pyrefly check
```

The tree must be clean before you open a PR.

## TDD workflow

All production code is written test-first:

1. **Red** — write the failing test, run it, confirm it fails for the right
   reason.
2. **Green** — write the minimum code to make it pass.
3. **Refactor** — clean up while keeping every test green.

Test-after is not acceptable. If a change genuinely cannot be tested, say so
in the PR description and explain why.

## Commit style

We follow [Conventional Commits](https://www.conventionalcommits.org/):

```
<type>(<scope>): <short summary>

<optional body — what and why, wrapped at 72 chars>

<optional footer — refs, breaking-change notes>
```

Common types:

- `feat` — new user-facing capability
- `fix` — bug fix
- `refactor` — code change with no behavior change
- `test` — test-only changes
- `docs` — documentation only
- `chore` — tooling, deps, CI
- `perf` — performance improvement
- `build` — build system or dependency updates

Rules:

- Keep the subject line under 72 characters, imperative mood
  ("add", not "added"/"adds").
- One logical change per commit. Split unrelated changes.
- Reference the ticket in the footer (`Refs: JAS-123`) when applicable.
- Never commit secrets, `.env` files, or generated artifacts.

## Branching

- Branch from `main`: `git checkout -b <type>/<short-slug>`
  (e.g. `feat/imap-idle-listener`).
- Rebase (do not merge) `main` into your branch before opening a PR.
- Never force-push to `main`.

## Pull request checklist

Before requesting review, confirm every item:

- [ ] Root cause addressed — not a symptom patched.
- [ ] Test added or updated for every behavior change.
- [ ] `uv run pytest -q` passes locally (output pasted in the PR).
- [ ] `./.venv/bin/ruff check .` and `./.venv/bin/ruff format --check .`
      are clean.
- [ ] `./.venv/bin/pyrefly check` is clean.
- [ ] All function signatures fully type-annotated.
- [ ] Pydantic v2 models used at every external boundary.
- [ ] No new mocks in unit tests; integration tests use the shared
      `greenmail` / `greenmail_clean` fixtures.
- [ ] No hardcoded secrets, credentials, or PII in code, tests, or logs.
- [ ] SQL is parameterized (no string interpolation).
- [ ] Public functions/classes have docstrings.
- [ ] `CHANGELOG.md` updated when the change is user-visible.
- [ ] PR description explains **what** changed and **why**, links to the
      ticket, and notes any migrations, feature flags, or rollout steps.

## Reporting security issues

Do **not** open a public issue for security bugs. Email
`security@oovacha.com` with details and a reproducer.
