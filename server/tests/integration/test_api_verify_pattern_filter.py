"""Integration test: POST /verify-code with non-matching subject returns 408."""
from __future__ import annotations

import smtplib
from email.message import EmailMessage

import pytest
from fastapi.testclient import TestClient

from job_agent_server.api.server import create_app
from job_agent_server.config import Settings


def _send_mail(
    gm,
    subject: str,
    body: str,
    from_addr: str = "sender@example.com",
    to: str = "testuser@localhost",
) -> None:
    msg = EmailMessage()
    msg["Subject"] = subject
    msg["From"] = from_addr
    msg["To"] = to
    msg.set_content(body)
    with smtplib.SMTP(gm.host, gm.smtp_port) as s:
        s.send_message(msg)


@pytest.mark.integration
@pytest.mark.timeout(10)
def test_verify_code_non_matching_subject_returns_408(greenmail_clean) -> None:
    _send_mail(greenmail_clean, "Marketing news", "606060")

    token = "c" * 32
    settings = Settings(
        imap_host="127.0.0.1",
        imap_port=greenmail_clean.imap_port,
        imap_user=greenmail_clean.user,
        imap_app_password=greenmail_clean.password,
        imap_folder="INBOX",
        imap_use_ssl=False,
        auth_token=token,
    )
    app = create_app(settings_override=settings)
    client = TestClient(app)

    response = client.post(
        "/verify-code",
        headers={"Authorization": f"Bearer {token}"},
        json={
            "pattern": "verify",
            "timeout_seconds": 3,
            "poll_interval_seconds": 1.0,
        },
    )

    assert response.status_code == 408
