from __future__ import annotations

import pytest
from pydantic import ValidationError

from job_agent_server.api.models import VerifyResponse


def test_verify_response_code_only() -> None:
    r = VerifyResponse(code="123", subject="s", from_addr="a@b")
    assert r.code == "123"
    assert r.magic_link is None
    assert r.subject == "s"
    assert r.from_addr == "a@b"


def test_verify_response_link_only() -> None:
    r = VerifyResponse(magic_link="https://x", subject="s", from_addr="a@b")
    assert r.magic_link == "https://x"
    assert r.code is None


def test_verify_response_both() -> None:
    r = VerifyResponse(code="1", magic_link="https://x", subject="s", from_addr="a@b")
    assert r.code == "1"
    assert r.magic_link == "https://x"


def test_verify_response_missing_subject_raises() -> None:
    with pytest.raises(ValidationError):
        VerifyResponse(code="1", from_addr="a@b")  # type: ignore[call-arg]


def test_verify_response_missing_from_addr_raises() -> None:
    with pytest.raises(ValidationError):
        VerifyResponse(code="1", subject="s")  # type: ignore[call-arg]
