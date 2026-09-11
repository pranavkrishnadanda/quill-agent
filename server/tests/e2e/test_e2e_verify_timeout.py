"""E2E: /verify-code returns 408 when no matching email arrives before timeout."""

from __future__ import annotations

import socket
import threading
import time

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


@pytest.mark.timeout(30)
@pytest.mark.e2e
@pytest.mark.integration
def test_e2e_verify_code_returns_408_when_no_email(greenmail_clean: object) -> None:
    token = "b" * 32
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

    try:
        response = httpx.post(
            f"{base_url}/verify-code",
            headers={"Authorization": f"Bearer {token}"},
            json={
                "pattern": "verify",
                "timeout_seconds": 3,
                "poll_interval_seconds": 1.0,
            },
            timeout=10.0,
        )
        assert response.status_code == 408
    finally:
        server.should_exit = True
        time.sleep(0.5)
