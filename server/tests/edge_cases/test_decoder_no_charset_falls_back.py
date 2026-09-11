from email.message import EmailMessage

from job_agent_server.email_decoder import decode_email_body


def test_decode_email_body_without_explicit_charset_returns_text() -> None:
    msg = EmailMessage()
    msg.set_content("hello world")
    out = decode_email_body(msg.as_bytes())
    assert "hello" in out
