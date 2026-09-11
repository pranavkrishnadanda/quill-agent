"""Integration test: fetch_message_by_uid decodes a Unicode subject correctly."""
from __future__ import annotations

import smtplib
from email.message import EmailMessage

import pytest

from job_agent_server.imap.connection import (
    close_imap_connection,
    open_imap_connection,
)
from job_agent_server.imap.fetch import fetch_message_by_uid
from job_agent_server.imap.search import search_recent_uids


def _send_mail(
    gm,
    subject: str,
    body: str = "unicode body",
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
def test_fetch_message_by_uid_decodes_unicode_subject(greenmail_clean) -> None:
    subject = "Ölçüm 987654 açıklama"
    _send_mail(greenmail_clean, subject)

    client = open_imap_connection(
        greenmail_clean.host,
        greenmail_clean.imap_port,
        greenmail_clean.user,
        greenmail_clean.password,
        use_ssl=False,
    )
    try:
        client.select_folder("INBOX")
        uids = search_recent_uids(client, "INBOX", 3600)
        assert len(uids) == 1
        fetched_subject, _from_addr, _raw = fetch_message_by_uid(client, uids[0])
        assert "Ölçüm" in fetched_subject
        assert "987654" in fetched_subject
    finally:
        close_imap_connection(client)
