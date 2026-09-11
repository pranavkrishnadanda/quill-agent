"""Integration test: since_seconds=3600 covers an email sent moments ago."""
from __future__ import annotations

import smtplib
from email.message import EmailMessage

import pytest

from job_agent_server.imap.connection import (
    close_imap_connection,
    open_imap_connection,
)
from job_agent_server.imap.search import search_recent_uids


def _send_mail(gm) -> None:
    msg = EmailMessage()
    msg["Subject"] = "today"
    msg["From"] = "a@example.com"
    msg["To"] = "testuser@localhost"
    msg.set_content("body")
    with smtplib.SMTP(gm.host, gm.smtp_port) as s:
        s.send_message(msg)


@pytest.mark.integration
@pytest.mark.timeout(15)
def test_search_recent_uids_since_one_hour_covers_just_sent(greenmail_clean) -> None:
    _send_mail(greenmail_clean)
    client = open_imap_connection(
        greenmail_clean.host,
        greenmail_clean.imap_port,
        greenmail_clean.user,
        greenmail_clean.password,
        use_ssl=False,
    )
    try:
        uids = search_recent_uids(client, "INBOX", 3600)
        assert len(uids) == 1
    finally:
        close_imap_connection(client)
