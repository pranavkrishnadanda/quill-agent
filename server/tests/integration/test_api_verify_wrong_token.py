"""Integration test: POST /verify-code with wrong Bearer token returns 401."""
from __future__ import annotations

import pytest
from fastapi.testclient import TestClient

from job_agent_server.api.server import create_app
from job_agent_server.config import Settings


@pytest.mark.integration
@pytest.mark.timeout(15)
def test_verify_code_with_wrong_bearer_token_returns_401(greenmail) -> None:
    settings = Settings(
        imap_host="127.0.0.1",
        imap_port=greenmail.imap_port,
        imap_user=greenmail.user,
        imap_app_password=greenmail.password,
        imap_folder="INBOX",
        imap_use_ssl=False,
        auth_token="a" * 32,
    )
    app = create_app(settings_override=settings)
    client = TestClient(app)

    response = client.post(
        "/verify-code",
        headers={"Authorization": "Bearer wrong-token"},
        json={"timeout_seconds": 3, "poll_interval_seconds": 1.0},
    )

    assert response.status_code == 401
