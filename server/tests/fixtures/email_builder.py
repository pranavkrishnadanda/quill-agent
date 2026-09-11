"""Helpers for constructing RFC 5322 email messages for tests."""

from __future__ import annotations

from email.message import EmailMessage


def build_plaintext_email(
    *,
    subject: str,
    body: str,
    from_addr: str = "sender@example.com",
    to: str = "testuser@localhost",
) -> EmailMessage:
    """Build a simple text/plain email message."""
    msg = EmailMessage()
    msg["Subject"] = subject
    msg["From"] = from_addr
    msg["To"] = to
    msg.set_content(body)
    return msg


def build_multipart_email(
    *,
    subject: str,
    plain: str,
    html: str,
    from_addr: str = "sender@example.com",
    to: str = "testuser@localhost",
) -> EmailMessage:
    """Build a multipart/alternative email with plain and HTML parts."""
    msg = EmailMessage()
    msg["Subject"] = subject
    msg["From"] = from_addr
    msg["To"] = to
    msg.set_content(plain)
    msg.add_alternative(html, subtype="html")
    return msg
