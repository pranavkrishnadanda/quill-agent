"""Integration test: invalid request body returns 422."""
from __future__ import annotations

import pytest
from fastapi.testclient import TestClient

from job_agent_server.api.server import create_app
from job_agent_server.config import Settings


@pytest.mark.integration
@pytest.mark.timeout(15)
def test_verify_code_with_negative_since_seconds_returns_422(greenmail) -> None:
    token = "b" * 32
    settings = Settings(
        imap_host="127.0.0.1",
        imap_port=greenmail.imap_port,
        imap_user=greenmail.user,
        imap_app_password=greenmail.password,
        imap_folder="INBOX",
        imap_use_ssl=False,
        auth_token=token,
    )
    app = create_app(settings_override=settings)
    client = TestClient(app)

    response = client.post(
        "/verify-code",
        headers={"Authorization": f"Bearer {token}"},
        json={"since_seconds": -5},
    )

    assert response.status_code == 422
