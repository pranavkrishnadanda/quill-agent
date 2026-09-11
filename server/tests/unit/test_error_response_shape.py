"""Unit tests for ErrorResponse model shape."""
from __future__ import annotations

import pytest
from pydantic import ValidationError

from job_agent_server.api.models import ErrorResponse


def test_error_response_error_only() -> None:
    resp = ErrorResponse(error="timeout")
    assert resp.error == "timeout"
    assert resp.detail is None


def test_error_response_with_detail() -> None:
    resp = ErrorResponse(error="x", detail="y")
    assert resp.error == "x"
    assert resp.detail == "y"


def test_error_response_missing_error_raises() -> None:
    with pytest.raises(ValidationError):
        ErrorResponse()  # type: ignore[call-arg]


def test_error_response_missing_error_with_detail_raises() -> None:
    with pytest.raises(ValidationError):
        ErrorResponse(detail="only detail")  # type: ignore[call-arg]
