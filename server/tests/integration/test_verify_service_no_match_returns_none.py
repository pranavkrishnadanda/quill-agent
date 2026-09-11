"""Integration test: poll_for_verification returns None when no email arrives."""
from __future__ import annotations

import pytest

from job_agent_server.imap.connection import (
    close_imap_connection,
    open_imap_connection,
)
from job_agent_server.verify_service import poll_for_verification


@pytest.mark.integration
@pytest.mark.timeout(10)
def test_poll_for_verification_no_match_returns_none(greenmail_clean) -> None:
    conn = open_imap_connection(
        greenmail_clean.host,
        greenmail_clean.imap_port,
        greenmail_clean.user,
        greenmail_clean.password,
        use_ssl=False,
    )
    try:
        conn.select_folder("INBOX")
        result = poll_for_verification(
            conn,
            "INBOX",
            "verify",
            since_seconds=3600,
            timeout_seconds=3,
            poll_interval_seconds=1.0,
        )
        assert result is None
    finally:
        close_imap_connection(conn)
