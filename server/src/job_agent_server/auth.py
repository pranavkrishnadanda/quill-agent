"""Bearer token authentication helpers.

Constant-time verification of ``Authorization: Bearer <token>`` headers.
"""
from __future__ import annotations

import hmac


def verify_bearer_token(authorization_header: str | None, expected_token: str) -> bool:
    """Verify an ``Authorization`` header value against an expected bearer token.

    Parses the header as ``Bearer <token>`` where the scheme is case-insensitive
    and separated from the token by exactly one ASCII space. The token is then
    compared to ``expected_token`` using :func:`hmac.compare_digest` to defeat
    timing attacks.

    Args:
        authorization_header: The raw value of the ``Authorization`` header, or
            ``None`` if the header is absent.
        expected_token: The server-side bearer token to compare against.

    Returns:
        ``True`` if the header is well-formed, uses the ``Bearer`` scheme, and
        carries a token that matches ``expected_token`` byte-for-byte.
        ``False`` in every other case (missing, empty, wrong scheme, malformed,
        or non-matching token).
    """
    if authorization_header is None or authorization_header == "":
        return False

    # Exactly one space separator: split on the first space, then reject any
    # remaining leading/trailing whitespace in either half.
    scheme, sep, token = authorization_header.partition(" ")
    if sep != " " or not token:
        return False

    if scheme.lower() != "bearer":
        return False

    # Reject extra whitespace: another leading space (token starts with space)
    # or trailing whitespace on the token.
    if token != token.strip() or token == "":
        return False

    # Constant-time comparison requires bytes.
    return hmac.compare_digest(token.encode("utf-8"), expected_token.encode("utf-8"))
