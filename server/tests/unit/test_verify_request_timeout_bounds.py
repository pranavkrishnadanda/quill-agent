from __future__ import annotations

import pytest
from pydantic import ValidationError

from job_agent_server.api.models import VerifyRequest


@pytest.mark.parametrize("value", [1, 60, 300])
def test_verify_request_timeout_seconds_accepts_valid_bound(value: int) -> None:
    req = VerifyRequest(timeout_seconds=value)
    assert req.timeout_seconds == value


@pytest.mark.parametrize("value", [0, -1, 301])
def test_verify_request_timeout_seconds_rejects_out_of_range(value: int) -> None:
    with pytest.raises(ValidationError):
        VerifyRequest(timeout_seconds=value)
