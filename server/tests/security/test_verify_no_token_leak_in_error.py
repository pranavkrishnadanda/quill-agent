"""Security test: verify_bearer_token must not leak the expected token."""
from __future__ import annotations

from job_agent_server.auth import verify_bearer_token


def test_verify_bearer_token_returns_false_without_leaking_expected_token() -> None:
    expected_token: str = "correct-token-of-min-length-32-xxxxxx"
    result: bool = verify_bearer_token("Bearer wrong", expected_token)
    assert result is False
