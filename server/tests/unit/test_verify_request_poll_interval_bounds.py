from __future__ import annotations

import pytest
from pydantic import ValidationError

from job_agent_server.api.models import VerifyRequest


@pytest.mark.parametrize("value", [0.5, 3.0, 30.0])
def test_verify_request_poll_interval_valid_bounds_accepted(value: float) -> None:
    req = VerifyRequest(poll_interval_seconds=value)
    assert req.poll_interval_seconds == value


@pytest.mark.parametrize("value", [0.1, 0.0, 31.0])
def test_verify_request_poll_interval_out_of_bounds_rejected(value: float) -> None:
    with pytest.raises(ValidationError):
        VerifyRequest(poll_interval_seconds=value)
