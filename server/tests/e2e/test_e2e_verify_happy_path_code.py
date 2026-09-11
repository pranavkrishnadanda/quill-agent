"""E2E happy path: server boots, code arrives via SMTP, /verify-code returns it."""

from __future__ import annotations

import smtplib
import socket
import threading
import time
from email.message import EmailMessage

import httpx
import pytest
import uvicorn

from job_agent_server.api.server import create_app
from job_agent_server.config import Settings


def _free_port() -> int:
    s = socket.socket()
    s.bind(("127.0.0.1", 0))
    p: int = s.getsockname()[1]
    s.close()
    return p


def _send_mail_after_delay(host: str, smtp_port: int, delay: float) -> None:
    time.sleep(delay)
    msg = EmailMessage()
    msg["Subject"] = "Please verify — code 135790"
    msg["From"] = "sender@example.com"
    msg["To"] = "testuser@localhost"
    msg.set_content("Your code is 135790")
    with smtplib.SMTP(host, smtp_port) as s:
        s.send_message(msg)


@pytest.mark.timeout(45)
@pytest.mark.e2e
@pytest.mark.integration
def test_e2e_verify_happy_path_returns_code(greenmail_clean: object) -> None:
    token = "a" * 32
    settings = Settings(
        imap_host="127.0.0.1",
        imap_port=greenmail_clean.imap_port,  # type: ignore[attr-defined]
        imap_user=greenmail_clean.user,  # type: ignore[attr-defined]
        imap_app_password=greenmail_clean.password,  # type: ignore[attr-defined]
        imap_folder="INBOX",
        imap_use_ssl=False,
        auth_token=token,
        server_host="127.0.0.1",
        server_port=_free_port(),
    )
    app = create_app(settings_override=settings)
    config = uvicorn.Config(
        app,
        host=settings.server_host,
        port=settings.server_port,
        log_level="warning",
    )
    server = uvicorn.Server(config)
    server_thread = threading.Thread(target=server.run, daemon=True)
    server_thread.start()

    base_url = f"http://127.0.0.1:{settings.server_port}"
    deadline = time.monotonic() + 10
    started = False
    while time.monotonic() < deadline:
        try:
            r = httpx.get(f"{base_url}/health", timeout=1.0)
            if r.status_code == 200:
                started = True
                break
        except Exception:
            time.sleep(0.2)
    if not started:
        server.should_exit = True
        raise RuntimeError("server did not start")

    sender = threading.Thread(
        target=_send_mail_after_delay,
        args=(
            greenmail_clean.host,  # type: ignore[attr-defined]
            greenmail_clean.smtp_port,  # type: ignore[attr-defined]
            2.0,
        ),
        daemon=True,
    )
    sender.start()

    try:
        response = httpx.post(
            f"{base_url}/verify-code",
            headers={"Authorization": f"Bearer {token}"},
            json={
                "pattern": "verify",
                "timeout_seconds": 10,
                "poll_interval_seconds": 1.0,
            },
            timeout=15.0,
        )
        assert response.status_code == 200
        assert response.json()["code"] == "135790"
    finally:
        sender.join(timeout=5)
        server.should_exit = True
        time.sleep(0.5)
