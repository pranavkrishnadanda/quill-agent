"""E2E: boot server on free port, GET /health returns 200 with imap=connected."""

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
def test_e2e_health_endpoint_reports_imap_connected(greenmail: object) -> None:
    settings = Settings(
        imap_host="127.0.0.1",
        imap_port=greenmail.imap_port,  # type: ignore[attr-defined]
        imap_user=greenmail.user,  # type: ignore[attr-defined]
        imap_app_password=greenmail.password,  # type: ignore[attr-defined]
        imap_folder="INBOX",
        imap_use_ssl=False,
        auth_token="a" * 32,
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
    t = threading.Thread(target=server.run, daemon=True)
    t.start()

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
        r = httpx.get(f"{base_url}/health")
        assert r.status_code == 200
        assert r.json()["imap"] == "connected"
    finally:
        server.should_exit = True
        time.sleep(0.5)
