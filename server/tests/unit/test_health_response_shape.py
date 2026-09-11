from __future__ import annotations

import pytest
from pydantic import ValidationError

from job_agent_server.api.models import HealthResponse


def test_health_response_valid_payload_parses() -> None:
    resp = HealthResponse(status="ok", imap="connected")
    assert resp.status == "ok"
    assert resp.imap == "connected"


def test_health_response_missing_status_raises() -> None:
    with pytest.raises(ValidationError) as exc_info:
        HealthResponse(imap="connected")  # type: ignore[call-arg]
    assert any(err["loc"] == ("status",) for err in exc_info.value.errors())


def test_health_response_missing_imap_raises() -> None:
    with pytest.raises(ValidationError) as exc_info:
        HealthResponse(status="ok")  # type: ignore[call-arg]
    assert any(err["loc"] == ("imap",) for err in exc_info.value.errors())
