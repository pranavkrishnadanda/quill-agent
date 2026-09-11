"""Integration test: multipart plaintext+html email preserves both parts in raw bytes."""
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


def _send_multipart(
    gm,
    subject: str,
    plain: str,
    html: str,
    from_addr: str = "sender@example.com",
    to: str = "testuser@localhost",
) -> None:
    msg = EmailMessage()
    msg["Subject"] = subject
    msg["From"] = from_addr
    msg["To"] = to
    msg.set_content(plain)
    msg.add_alternative(html, subtype="html")
    with smtplib.SMTP(gm.host, gm.smtp_port) as s:
        s.send_message(msg)


@pytest.mark.integration
@pytest.mark.timeout(20)
def test_fetch_multipart_raw_bytes_contain_plain_and_html(greenmail_clean) -> None:
    _send_multipart(
        greenmail_clean,
        subject="multipart test",
        plain="plain body 111222",
        html="<p>html body 111222</p>",
    )

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
        _subject, _from_addr, raw_bytes = fetch_message_by_uid(client, uids[0])
        assert isinstance(raw_bytes, bytes)
        assert b"plain body 111222" in raw_bytes
        assert b"html body" in raw_bytes
    finally:
        close_imap_connection(client)
