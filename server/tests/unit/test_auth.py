"""Unit tests for bearer token verification."""
from __future__ import annotations

from job_agent_server.auth import verify_bearer_token


EXPECTED = "s3cr3t-t0ken-ABC_123"


def test_valid_bearer_token_returns_true() -> None:
    assert verify_bearer_token(f"Bearer {EXPECTED}", EXPECTED) is True


def test_wrong_token_returns_false() -> None:
    assert verify_bearer_token("Bearer wrong-token", EXPECTED) is False


def test_none_header_returns_false() -> None:
    assert verify_bearer_token(None, EXPECTED) is False


def test_empty_string_header_returns_false() -> None:
    assert verify_bearer_token("", EXPECTED) is False


def test_wrong_scheme_basic_returns_false() -> None:
    assert verify_bearer_token("Basic xyz", EXPECTED) is False


def test_no_space_separator_returns_false() -> None:
    assert verify_bearer_token(f"Bearer{EXPECTED}", EXPECTED) is False


def test_extra_whitespace_returns_false() -> None:
    # Two spaces between scheme and token — malformed.
    assert verify_bearer_token(f"Bearer  {EXPECTED}", EXPECTED) is False


def test_leading_whitespace_returns_false() -> None:
    assert verify_bearer_token(f" Bearer {EXPECTED}", EXPECTED) is False


def test_trailing_whitespace_in_token_returns_false() -> None:
    assert verify_bearer_token(f"Bearer {EXPECTED} ", EXPECTED) is False


def test_scheme_lowercase_bearer_returns_true() -> None:
    assert verify_bearer_token(f"bearer {EXPECTED}", EXPECTED) is True


def test_scheme_uppercase_BEARER_returns_true() -> None:
    assert verify_bearer_token(f"BEARER {EXPECTED}", EXPECTED) is True


def test_scheme_mixed_case_bEaReR_returns_true() -> None:
    assert verify_bearer_token(f"bEaReR {EXPECTED}", EXPECTED) is True


def test_unicode_token_valid_returns_true() -> None:
    token = "tokéén-中文-\U0001f600"
    assert verify_bearer_token(f"Bearer {token}", token) is True


def test_unicode_token_mismatch_returns_false() -> None:
    token = "tokéén-中文"
    assert verify_bearer_token(f"Bearer {token}x", token) is False


def test_special_characters_token_returns_true() -> None:
    token = "abc!@#$%^&*()_+-=[]{}|;:,.<>/?`~"
    assert verify_bearer_token(f"Bearer {token}", token) is True


def test_scheme_only_no_token_returns_false() -> None:
    assert verify_bearer_token("Bearer", EXPECTED) is False


def test_scheme_with_trailing_space_no_token_returns_false() -> None:
    assert verify_bearer_token("Bearer ", EXPECTED) is False


def test_empty_expected_token_with_matching_empty_returns_false() -> None:
    # "Bearer " with empty token is malformed (no token present).
    assert verify_bearer_token("Bearer ", "") is False
