"""Integration test: sending one email yields one recent UID from IMAP search."""
from __future__ import annotations

import smtplib
from email.message import EmailMessage

import pytest

from job_agent_server.imap.connection import (
    close_imap_connection,
    open_imap_connection,
)
from job_agent_server.imap.search import search_recent_uids


def send_mail(
    gm,
    subject: str,
    body: str = "body",
    from_addr: str = "a@example.com",
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
def test_search_recent_uids_returns_single_uid(greenmail_clean) -> None:
    send_mail(greenmail_clean, "hi")
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
