"""Integration test: poll_for_verification returns the newest matching email."""
from __future__ import annotations

import smtplib
import time
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
@pytest.mark.timeout(20)
def test_poll_for_verification_returns_newest_match(greenmail_clean) -> None:
    _send_mail(greenmail_clean, "Verify", "111111")
    time.sleep(1)
    _send_mail(greenmail_clean, "Verify", "222222")

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
            timeout_seconds=10,
            poll_interval_seconds=1.0,
        )
        assert result is not None
        assert result.code == "222222"
    finally:
        close_imap_connection(conn)
