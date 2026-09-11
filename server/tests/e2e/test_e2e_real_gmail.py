"""Opt-in E2E tests against a real Gmail account.

Requires environment variables:
    REAL_GMAIL_USER            - Gmail address (e.g. you@gmail.com)
    REAL_GMAIL_APP_PASSWORD    - 16-character app password

Run via scripts/run_real_gmail_test.sh (which prompts for credentials).
These tests are skipped at module load time when the vars are missing so
CI never accidentally hits the real Gmail servers.
"""

from __future__ import annotations

import os
import ssl

import pytest
from fastapi.testclient import TestClient
from imapclient import IMAPClient

_USER = os.environ.get("REAL_GMAIL_USER")
_PASSWORD = os.environ.get("REAL_GMAIL_APP_PASSWORD")

if not _USER or not _PASSWORD:
    pytest.skip(
        "REAL_GMAIL_USER / REAL_GMAIL_APP_PASSWORD not set; skipping real Gmail E2E",
        allow_module_level=True,
    )

# Narrow types for the checker after the skip above.
GMAIL_USER: str = _USER
GMAIL_PASSWORD: str = _PASSWORD

GMAIL_HOST = "imap.gmail.com"
GMAIL_PORT = 993


@pytest.mark.e2e
@pytest.mark.real_gmail
@pytest.mark.timeout(120)
def test_real_gmail_connection() -> None:
    """Confirm the supplied app password authenticates against real Gmail IMAP."""
    ctx = ssl.create_default_context()
    with IMAPClient(GMAIL_HOST, port=GMAIL_PORT, ssl=True, ssl_context=ctx) as client:
        client.login(GMAIL_USER, GMAIL_PASSWORD)
        client.select_folder("INBOX", readonly=True)
        # If we got here, auth + folder select worked.
        client.logout()


@pytest.mark.e2e
@pytest.mark.real_gmail
@pytest.mark.timeout(120)
def test_real_gmail_verify_code_via_server() -> None:
    """Point the server at real Gmail and call /verify-code.

    The human running this test must trigger a verification email in
    another tab within `timeout_seconds` so the poller can find it.
    """
    from job_agent_server.api.server import create_app
    from job_agent_server.config import Settings

    token = "r" * 32
    settings = Settings(
        imap_host=GMAIL_HOST,
        imap_port=GMAIL_PORT,
        imap_user=GMAIL_USER,
        imap_app_password=GMAIL_PASSWORD,
        imap_folder="INBOX",
        imap_use_ssl=True,
        auth_token=token,
        server_host="127.0.0.1",
        server_port=8765,
    )
    app = create_app(settings_override=settings)

    print("\n" + "=" * 70)
    print("REAL GMAIL E2E TEST")
    print("=" * 70)
    print(f"Watching {GMAIL_USER} INBOX for up to 90 seconds.")
    print("In ANOTHER TAB right now: trigger a verification email whose")
    print("subject or body matches the pattern 'verify|confirm|code'.")
    print("=" * 70, flush=True)

    with TestClient(app) as client:
        response = client.post(
            "/verify-code",
            headers={"Authorization": f"Bearer {token}"},
            json={
                "pattern": "verify|confirm|code",
                "timeout_seconds": 90,
                "poll_interval_seconds": 2.0,
            },
            timeout=120.0,
        )

    assert response.status_code == 200, (
        f"expected 200, got {response.status_code}: {response.text}"
    )
    payload = response.json()
    print(f"Server returned: {payload}")
    assert "code" in payload or "link" in payload, (
        f"response missing code/link: {payload}"
    )
