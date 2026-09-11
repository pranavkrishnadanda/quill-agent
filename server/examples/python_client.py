"""Synchronous httpx-based example client for the job-agent-server.

Provides two convenience functions:

- :func:`check_health` - GET ``/health`` and return the parsed JSON body.
- :func:`request_verify_code` - POST ``/verify-code`` with a bearer token and
  a regex pattern, returning the parsed JSON body.

Run this module directly for a small demo::

    python examples/python_client.py http://localhost:8000 <token> '\\d{6}'
"""

from __future__ import annotations

import sys
from typing import Any

import httpx

DEFAULT_TIMEOUT_SECONDS: float = 30.0


def check_health(base_url: str) -> dict[str, Any]:
    """Call the server's ``/health`` endpoint and return the JSON payload.

    Args:
        base_url: Base URL of the job-agent-server (e.g. ``http://localhost:8000``).

    Returns:
        The parsed JSON response body as a dictionary.

    Raises:
        httpx.HTTPStatusError: If the server responds with a non-2xx status.
        httpx.HTTPError: On transport-level failures (timeouts, DNS, etc.).
    """
    url = f"{base_url.rstrip('/')}/health"
    with httpx.Client(timeout=DEFAULT_TIMEOUT_SECONDS) as client:
        response = client.get(url)
        response.raise_for_status()
        return response.json()


def request_verify_code(
    base_url: str,
    token: str,
    pattern: str,
    timeout_seconds: float,
) -> dict[str, Any]:
    """Request a verification code from the server via ``/verify-code``.

    Args:
        base_url: Base URL of the job-agent-server.
        token: Bearer token used for ``Authorization`` header.
        pattern: Regex pattern the server should match against inbound emails.
        timeout_seconds: Server-side wait budget (also used as HTTP timeout
            with a small buffer added).

    Returns:
        The parsed JSON response body as a dictionary.

    Raises:
        httpx.HTTPStatusError: If the server responds with a non-2xx status.
        httpx.HTTPError: On transport-level failures.
    """
    url = f"{base_url.rstrip('/')}/verify-code"
    headers = {
        "Authorization": f"Bearer {token}",
        "Content-Type": "application/json",
    }
    payload: dict[str, Any] = {
        "pattern": pattern,
        "timeout_seconds": timeout_seconds,
    }
    # Give the HTTP client a small buffer beyond the server-side wait budget
    # so the server can respond with a timeout error rather than the client
    # aborting first.
    http_timeout = timeout_seconds + 5.0
    with httpx.Client(timeout=http_timeout) as client:
        response = client.post(url, json=payload, headers=headers)
        response.raise_for_status()
        return response.json()


def _main(argv: list[str]) -> int:
    if len(argv) < 2:
        print("usage: python_client.py <base_url> [<token> <pattern>]", file=sys.stderr)
        return 2
    base_url = argv[1]
    health = check_health(base_url)
    print(f"health: {health}")
    if len(argv) >= 4:
        token = argv[2]
        pattern = argv[3]
        result = request_verify_code(base_url, token, pattern, timeout_seconds=30.0)
        print(f"verify-code: {result}")
    return 0


if __name__ == "__main__":
    raise SystemExit(_main(sys.argv))
