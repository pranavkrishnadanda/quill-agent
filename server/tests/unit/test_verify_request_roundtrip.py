from job_agent_server.api.models import VerifyRequest


def test_verify_request_json_roundtrip_equals_original() -> None:
    r1 = VerifyRequest(
        pattern="foo",
        since_seconds=100,
        timeout_seconds=10,
        poll_interval_seconds=1.0,
    )
    r2 = VerifyRequest.model_validate_json(r1.model_dump_json())
    assert r1 == r2
