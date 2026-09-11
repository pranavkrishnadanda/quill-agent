"""Edge case: a 12-digit run must not yield a 6-digit verification code."""
from __future__ import annotations

from job_agent_server.extractors import extract_verification_code


def test_extract_verification_code_ignores_digits_inside_longer_run() -> None:
    # A 12-digit order number should not be mistaken for a 6-digit code.
    assert extract_verification_code("Order 123456789012 shipped") is None
