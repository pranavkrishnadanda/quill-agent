from __future__ import annotations

from job_agent_server.api.models import VerifyRequest


def test_defaults() -> None:
    r = VerifyRequest()
    assert r.pattern == "verify|confirm|code|activate"
    assert r.since_seconds == 300
    assert r.timeout_seconds == 60
    assert r.poll_interval_seconds == 3.0
