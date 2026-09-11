"""Pure extractors for verification codes and magic links from email bodies.

No I/O, no side effects. Safe to call on arbitrary untrusted text.
"""
from __future__ import annotations

import re
from typing import Final

__all__ = ["extract_verification_code", "extract_magic_link"]

# Preferred digit length first, then fallbacks. Word boundaries prevent
# matching digits embedded inside longer numeric sequences.
_CODE_LENGTHS: Final[tuple[int, ...]] = (6, 4, 5, 7, 8)

_DEFAULT_KEYWORDS: Final[tuple[str, ...]] = (
    "verify",
    "confirm",
    "activate",
    "validate",
)

# URL matcher — greedy up to whitespace or angle brackets. Trailing
# punctuation is stripped separately below.
_URL_RE: Final[re.Pattern[str]] = re.compile(
    r"https?://[^\s<>\"']+",
    re.IGNORECASE,
)

# Trailing characters we strip from a URL match. These are almost always
# document punctuation, not part of the link.
_STRIP_TRAILING: Final[str] = ".,!?;:)]}>\"'"


def extract_verification_code(text: str) -> str | None:
    """Return the first best-fit verification code found in ``text``.

    Prefers 6-digit codes. Falls back through 4, 5, 7, and 8-digit codes
    in that order if no 6-digit code is present. Uses word boundaries so
    that digits embedded inside longer numeric sequences (order ids,
    reference numbers) are not matched.

    Args:
        text: Arbitrary text (may include HTML, unicode, punctuation).

    Returns:
        The matched code as a string, or ``None`` if no code was found.
    """
    if not text:
        return None
    for length in _CODE_LENGTHS:
        pattern = re.compile(rf"(?<!\d)\d{{{length}}}(?!\d)")
        match = pattern.search(text)
        if match:
            return match.group(0)
    return None


def extract_magic_link(
    text: str,
    keywords: list[str] | None = None,
) -> str | None:
    """Return the first http(s) URL whose text contains one of ``keywords``.

    Keyword matching is case-insensitive against the URL string itself.
    Surrounding angle brackets, quotes, whitespace, and trailing
    punctuation (``.,!?;:)]}>``\'"``) are stripped from the returned URL.

    Args:
        text: Arbitrary text (may include HTML, unicode, punctuation).
        keywords: Substrings to look for inside the URL. When ``None``,
            defaults to ``["verify", "confirm", "activate", "validate"]``.

    Returns:
        The first matching URL, cleaned, or ``None`` if none match.
    """
    if not text:
        return None
    kw = tuple(k.lower() for k in (keywords if keywords is not None else _DEFAULT_KEYWORDS))
    if not kw:
        return None

    for raw in _URL_RE.findall(text):
        cleaned = raw.rstrip(_STRIP_TRAILING)
        # Strip a single leading angle bracket residue if any snuck in
        # (the regex excludes < > already, but be defensive).
        cleaned = cleaned.strip("<>").strip()
        if not cleaned:
            continue
        lowered = cleaned.lower()
        if any(k in lowered for k in kw):
            return cleaned
    return None
