"""Integration test: poll_for_verification returns None when subject does not match pattern."""
from __future__ import annotations

import smtplib
from email.message import EmailMessage

import pytest

from job_agent_server.imap.connection import (
    close_imap_connection,
    open_imap_connection,
)
from job_agent_server.verify_service import poll_for_verification


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
def test_poll_for_verification_returns_none_when_subject_does_not_match(
    greenmail_clean,
) -> None:
    _send_mail(greenmail_clean, "Newsletter monthly", "123456")

    conn = open_imap_connection(
        greenmail_clean.host,
        greenmail_clean.imap_port,
        greenmail_clean.user,
        greenmail_clean.password,
        use_ssl=False,
    )
    try:
        conn.select_folder("INBOX")
        result = poll_for_verification(
            conn,
            "INBOX",
            "verify",
            since_seconds=3600,
            timeout_seconds=3,
            poll_interval_seconds=1.0,
        )
        assert result is None
    finally:
        close_imap_connection(conn)
