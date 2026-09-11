"""Integration test: /health does not require Authorization header."""
from __future__ import annotations

import pytest
from fastapi.testclient import TestClient

from job_agent_server.api.server import create_app
from job_agent_server.config import Settings


@pytest.mark.integration
@pytest.mark.timeout(20)
def test_health_endpoint_does_not_require_authorization(greenmail) -> None:
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

    response = client.get("/health")

    assert response.status_code == 200
