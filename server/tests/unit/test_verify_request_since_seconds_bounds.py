from __future__ import annotations

import pytest
from pydantic import ValidationError

from job_agent_server.api.models import VerifyRequest


@pytest.mark.parametrize("value", [1, 300, 3600])
def test_verify_request_since_seconds_valid_values_construct(value: int) -> None:
    req = VerifyRequest(since_seconds=value)
    assert req.since_seconds == value


@pytest.mark.parametrize("value", [0, -1, 3601, 100000])
def test_verify_request_since_seconds_invalid_values_raise(value: int) -> None:
    with pytest.raises(ValidationError):
        VerifyRequest(since_seconds=value)
