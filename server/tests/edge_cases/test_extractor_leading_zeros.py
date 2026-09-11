"""Edge case: verification codes with leading zeros must be preserved."""
from __future__ import annotations

from job_agent_server.extractors import extract_verification_code


def test_extract_verification_code_preserves_leading_zeros_single() -> None:
    assert extract_verification_code("Your code: 001234") == "001234"


def test_extract_verification_code_preserves_all_zeros() -> None:
    assert extract_verification_code("code 000000 confirmed") == "000000"
