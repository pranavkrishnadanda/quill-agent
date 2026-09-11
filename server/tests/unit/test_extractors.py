"""Unit tests for extractors: verification codes and magic links.

No mocks. Pure input/output assertions on real strings.
"""
from __future__ import annotations

import pytest

from job_agent_server.extractors import (
    extract_magic_link,
    extract_verification_code,
)


# --------------------------------------------------------------------------
# extract_verification_code
# --------------------------------------------------------------------------


@pytest.mark.parametrize(
    ("text", "expected"),
    [
        # 1. Positive: standalone 6-digit code
        ("Your code is 123456. It expires in 5 minutes.", "123456"),
        # 2. Positive: prefer 6-digit over 4-digit when both present
        ("Backup pin 4321 and main code 987654 please", "987654"),
        # 3. Fallback: no 6-digit, take 4-digit
        ("Your PIN: 4321", "4321"),
        # 4. Fallback: no 6-digit, take 8-digit
        ("Activation number 12345678 valid today", "12345678"),
        # 5. Negative: no digits at all
        ("Welcome to our service, please continue.", None),
        # 6. Embedded-digits false positive must NOT match (order id 1234567890123)
        ("Order id 1234567890123 shipped.", None),
        # 7. HTML body with 6-digit code
        (
            "<html><body><p>Your code is <b>246810</b> today.</p></body></html>",
            "246810",
        ),
        # 8. Unicode text surrounding code
        ("Bonjour — votre code est 654321 – merci.", "654321"),
        # 9. Punctuation adjacency (parens/period)
        ("Confirm (055512) to proceed.", "055512"),
        # 10. Code-only body
        ("135790", "135790"),
        # 11. Longer digit run should not qualify as any code length
        ("Ref 123456789012345 only", None),
        # 12. Multiple 6-digit candidates: return first
        ("First 111111 then 222222", "111111"),
    ],
)
def test_extract_verification_code_cases(text: str, expected: str | None) -> None:
    assert extract_verification_code(text) == expected


# --------------------------------------------------------------------------
# extract_magic_link
# --------------------------------------------------------------------------


@pytest.mark.parametrize(
    ("text", "expected"),
    [
        # 13. Positive: plain verify link
        (
            "Click https://example.com/verify?token=abc to continue",
            "https://example.com/verify?token=abc",
        ),
        # 14. Positive: 'confirm' keyword, http scheme
        (
            "Please visit http://svc.io/confirm/xyz",
            "http://svc.io/confirm/xyz",
        ),
        # 15. Positive: uppercase keyword in URL
        (
            "Go to https://a.co/ACTIVATE/999 now",
            "https://a.co/ACTIVATE/999",
        ),
        # 16. HTML anchor href with angle brackets
        (
            'Tap <a href="https://x.io/validate?t=1">here</a>',
            "https://x.io/validate?t=1",
        ),
        # 17. Trailing punctuation to strip
        (
            "See https://example.com/verify/token1.",
            "https://example.com/verify/token1",
        ),
        # 18. Trailing paren + period
        (
            "(https://ex.com/confirm/a).",
            "https://ex.com/confirm/a",
        ),
        # 19. Wrapped in angle brackets
        (
            "Follow <https://ex.com/verify/z> please",
            "https://ex.com/verify/z",
        ),
        # 20. Multiple links: pick the first one containing a keyword
        (
            "Home https://ex.com/home then verify https://ex.com/verify/1",
            "https://ex.com/verify/1",
        ),
        # 21. Negative: URL without any keyword
        ("Visit https://ex.com/home for info", None),
        # 22. Negative: no URL at all
        ("Nothing to click here.", None),
        # 23. Unicode surrounding text
        (
            "Merci — https://ex.com/validate?x=1 – valide",
            "https://ex.com/validate?x=1",
        ),
        # 24. Custom keywords override defaults
        (
            "Enter https://ex.com/enroll/42 now",
            "https://ex.com/enroll/42",
        ),
        # 25. Link-only body
        (
            "https://ex.com/verify/only",
            "https://ex.com/verify/only",
        ),
        # 26. Quoted URL
        (
            "url='https://ex.com/confirm/q'",
            "https://ex.com/confirm/q",
        ),
    ],
)
def test_extract_magic_link_default_keywords(text: str, expected: str | None) -> None:
    # Case 24 uses a custom keyword; special-case it.
    if "enroll" in text:
        assert extract_magic_link(text, keywords=["enroll"]) == expected
    else:
        assert extract_magic_link(text) == expected


def test_extract_magic_link_custom_keywords_ignores_defaults() -> None:
    text = "verify link https://ex.com/verify/1 vs enroll https://ex.com/enroll/2"
    # With custom keywords, only 'enroll' matches
    assert extract_magic_link(text, keywords=["enroll"]) == "https://ex.com/enroll/2"


def test_extract_magic_link_case_insensitive_keyword_match() -> None:
    text = "Click https://ex.com/VeRiFy/token"
    assert extract_magic_link(text) == "https://ex.com/VeRiFy/token"
