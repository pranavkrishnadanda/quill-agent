"""Integration test: fetch_message_by_uid returns from_addr as local@host."""
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


def _send(gm, from_addr: str) -> None:
    msg = EmailMessage()
    msg["Subject"] = "hello"
    msg["From"] = from_addr
    msg["To"] = "testuser@localhost"
    msg.set_content("body")
    with smtplib.SMTP(gm.host, gm.smtp_port) as s:
        s.send_message(msg)


@pytest.mark.integration
@pytest.mark.timeout(20)
def test_fetch_returns_from_addr_local_at_host(greenmail_clean) -> None:
    _send(greenmail_clean, "sender@example.com")
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
        _subject, from_addr, _raw = fetch_message_by_uid(client, uids[0])
        assert from_addr == "sender@example.com"
    finally:
        close_imap_connection(client)
