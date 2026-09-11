"""Security smoke test: verify_bearer_token uses constant-time comparison."""
from __future__ import annotations

import inspect

from job_agent_server.auth import verify_bearer_token


def test_verify_bearer_token_uses_constant_time_comparison() -> None:
    """verify_bearer_token must use hmac.compare_digest to avoid timing attacks."""
    src = inspect.getsource(verify_bearer_token)
    assert "compare_digest" in src, (
        "verify_bearer_token must use hmac.compare_digest for constant-time comparison"
    )
