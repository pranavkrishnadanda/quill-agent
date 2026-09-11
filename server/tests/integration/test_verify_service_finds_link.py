"""Integration: poll_for_verification returns VerifyResult with magic_link."""
from __future__ import annotations

import smtplib
from email.message import EmailMessage

import pytest

from job_agent_server.imap.connection import (
    close_imap_connection,
    open_imap_connection,
)
from job_agent_server.verify_service import poll_for_verification


def _send(gm, subject: str, body: str) -> None:
    msg = EmailMessage()
    msg["Subject"] = subject
    msg["From"] = "sender@example.com"
    msg["To"] = "testuser@localhost"
    msg.set_content(body)
    with smtplib.SMTP(gm.host, gm.smtp_port) as s:
        s.send_message(msg)


@pytest.mark.integration
@pytest.mark.timeout(20)
def test_poll_for_verification_returns_magic_link(greenmail_clean) -> None:
    _send(
        greenmail_clean,
        "Please verify",
        "Click https://example.com/verify?t=abc",
    )
    client = open_imap_connection(
        greenmail_clean.host,
        greenmail_clean.imap_port,
        greenmail_clean.user,
        greenmail_clean.password,
        use_ssl=False,
    )
    try:
        result = poll_for_verification(
            client=client,
            folder="INBOX",
            pattern="verify",
            since_seconds=3600,
            timeout_seconds=15,
            poll_interval_seconds=1.0,
        )
    finally:
        close_imap_connection(client)

    assert result is not None
    assert result.magic_link is not None
    assert "verify?t=abc" in result.magic_link
