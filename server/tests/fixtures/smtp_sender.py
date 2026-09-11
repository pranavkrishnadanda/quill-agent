"""SMTP helper for sending messages to the Greenmail test server."""
from __future__ import annotations

import smtplib
from email.message import EmailMessage
from typing import Any


def send_email(greenmail_info: Any, msg: EmailMessage) -> None:
    """Send an EmailMessage to the Greenmail SMTP server described by greenmail_info."""
    with smtplib.SMTP(greenmail_info.host, greenmail_info.smtp_port) as s:
        s.send_message(msg)
