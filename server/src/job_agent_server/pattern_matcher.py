"""Pattern matching against email subject and from address.

Supports regex patterns with a case-insensitive substring fallback when the
supplied pattern is not a valid regular expression.
"""
from __future__ import annotations

import re


def matches_pattern(
    subject: str | None,
    from_addr: str | None,
    pattern: str,
) -> bool:
    """Return True if ``pattern`` matches ``subject`` or ``from_addr``.

    The pattern is first compiled as a case-insensitive regular expression and
    tested against each non-empty field with ``re.search``. If compilation
    fails, both fields are checked with a case-insensitive substring match.
    Returns False when both fields are None/empty or nothing matches.

    Args:
        subject: The email subject line, or None.
        from_addr: The sender address, or None.
        pattern: A regex or literal substring to search for.

    Returns:
        True on any match; False otherwise.
    """
    fields: list[str] = [f for f in (subject, from_addr) if f]
    if not fields:
        return False

    try:
        compiled = re.compile(pattern, re.IGNORECASE)
    except re.error:
        needle = pattern.casefold()
        return any(needle in f.casefold() for f in fields)

    return any(compiled.search(f) is not None for f in fields)
