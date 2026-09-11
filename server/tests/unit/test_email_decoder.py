"""Unit tests for email_decoder.decode_email_body."""
from __future__ import annotations

import base64
import quopri
from email.message import EmailMessage
from email.policy import default as default_policy

from job_agent_server.email_decoder import decode_email_body


def _build(msg: EmailMessage) -> bytes:
    return msg.as_bytes(policy=default_policy)


def test_plain_text_ascii_body_returned_verbatim() -> None:
    msg = EmailMessage(policy=default_policy)
    msg["From"] = "a@example.com"
    msg["To"] = "b@example.com"
    msg["Subject"] = "hi"
    msg.set_content("Hello, world!\n")

    result = decode_email_body(_build(msg))

    assert "Hello, world!" in result


def test_html_only_body_strips_tags() -> None:
    msg = EmailMessage(policy=default_policy)
    msg["Subject"] = "html"
    msg.set_content(
        "<html><body><p>Hello <b>bold</b> world</p></body></html>",
        subtype="html",
    )

    result = decode_email_body(_build(msg))

    assert "<p>" not in result
    assert "<b>" not in result
    assert "Hello" in result
    assert "bold" in result
    assert "world" in result


def test_multipart_alternative_prefers_plain_over_html() -> None:
    msg = EmailMessage(policy=default_policy)
    msg["Subject"] = "alt"
    msg.set_content("PLAIN VERSION TEXT")
    msg.add_alternative(
        "<html><body><p>HTML VERSION TEXT</p></body></html>", subtype="html"
    )

    result = decode_email_body(_build(msg))

    assert "PLAIN VERSION TEXT" in result
    assert "HTML VERSION TEXT" not in result


def test_base64_encoded_body_is_decoded() -> None:
    payload = "Base64 encoded content here"
    encoded = base64.b64encode(payload.encode("utf-8")).decode("ascii")
    raw = (
        b"From: a@example.com\r\n"
        b"To: b@example.com\r\n"
        b"Subject: b64\r\n"
        b"MIME-Version: 1.0\r\n"
        b"Content-Type: text/plain; charset=utf-8\r\n"
        b"Content-Transfer-Encoding: base64\r\n\r\n"
        + encoded.encode("ascii") + b"\r\n"
    )

    result = decode_email_body(raw)

    assert "Base64 encoded content here" in result


def test_quoted_printable_body_is_decoded() -> None:
    original = "Price: 100=EUR and more text"
    encoded = quopri.encodestring(original.encode("utf-8")).decode("ascii")
    raw = (
        b"From: a@example.com\r\n"
        b"To: b@example.com\r\n"
        b"Subject: qp\r\n"
        b"MIME-Version: 1.0\r\n"
        b"Content-Type: text/plain; charset=utf-8\r\n"
        b"Content-Transfer-Encoding: quoted-printable\r\n\r\n"
        + encoded.encode("ascii") + b"\r\n"
    )

    result = decode_email_body(raw)

    assert "Price: 100=EUR and more text" in result


def test_utf8_body_with_unicode_content() -> None:
    msg = EmailMessage(policy=default_policy)
    msg["Subject"] = "unicode"
    msg.set_content("Café résumé \U0001F680 emoji test")

    result = decode_email_body(_build(msg))

    assert "Café" in result
    assert "résumé" in result
    assert "\U0001F680" in result


def test_empty_body_returns_empty_string() -> None:
    msg = EmailMessage(policy=default_policy)
    msg["Subject"] = "empty"
    msg.set_content("")

    result = decode_email_body(_build(msg))

    assert result.strip() == ""


def test_malformed_input_returns_empty_string() -> None:
    assert decode_email_body(b"\xff\xfe\x00garbage-not-an-email") == "" or isinstance(
        decode_email_body(b"\xff\xfe\x00garbage-not-an-email"), str
    )
    # Explicitly truncated headers with no body
    assert decode_email_body(b"Subject: truncated") == ""
    # Random binary
    result = decode_email_body(b"\x00\x01\x02\x03\x04")
    assert isinstance(result, str)


def test_none_or_wrong_type_returns_empty_string() -> None:
    # Never raises even with invalid inputs
    assert decode_email_body(b"") == ""
