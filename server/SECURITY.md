# Security Policy

## Reporting a Vulnerability

If you discover a security vulnerability in `job-agent-server`, please report it
responsibly. **Do not open a public GitHub issue for security problems.**

Instead, email the maintainers at:

    security@example.com

Please include:

- A clear description of the vulnerability and its impact.
- Steps to reproduce (proof-of-concept, affected endpoints, payloads).
- The affected version, commit SHA, or deployment.
- Your name / handle for credit (optional).

If you require encrypted communication, request our PGP key in your first email
and we will provide it out of band.

## Supported Versions

Security fixes are provided for the `main` branch and the most recent tagged
release. Older releases are not supported.

## Coordinated Disclosure Timeline

We follow a coordinated disclosure process:

| Day       | Action                                                              |
|-----------|---------------------------------------------------------------------|
| Day 0     | Report received. Automated acknowledgement sent.                    |
| Day 1-2   | Human acknowledgement, triage begins. Severity assigned (CVSS v3.1).|
| Day 7     | Initial assessment shared with reporter (confirmed / needs info).   |
| Day 30    | Target date for a fix in `main` for High/Critical issues.           |
| Day 60    | Target date for a fix for Medium issues.                            |
| Day 90    | Public disclosure and CVE (if applicable), whichever comes first.   |

We may extend the disclosure window by mutual agreement with the reporter when
a fix requires broader coordination (upstream dependencies, downstream users).

## Scope

In scope:

- Authentication, authorization, and session handling.
- Input validation, injection (SQL, command, template, header).
- Secret handling and credential storage.
- Email ingestion, parsing, and outbound delivery paths.
- Supply-chain issues in declared dependencies.

Out of scope:

- Findings that require physical access to a maintainer's machine.
- Denial of service via unrealistic traffic volume against a self-hosted node.
- Reports generated solely by automated scanners without a working PoC.
- Social engineering of maintainers or users.

## Safe Harbor

We will not pursue legal action against researchers who:

- Make a good-faith effort to comply with this policy.
- Avoid privacy violations, data destruction, and service disruption.
- Give us reasonable time to remediate before public disclosure.

Thank you for helping keep `job-agent-server` and its users safe.
