"""Integration test: search_recent_uids returns [] on empty INBOX."""
from __future__ import annotations

import pytest

from job_agent_server.imap.connection import (
    close_imap_connection,
    open_imap_connection,
)
from job_agent_server.imap.search import search_recent_uids


@pytest.mark.integration
@pytest.mark.timeout(15)
def test_search_recent_uids_empty_inbox(greenmail_clean) -> None:
    client = open_imap_connection(
        greenmail_clean.host,
        greenmail_clean.imap_port,
        greenmail_clean.user,
        greenmail_clean.password,
        use_ssl=False,
    )
    try:
        result = search_recent_uids(client, "INBOX", 3600)
        assert result == []
    finally:
        close_imap_connection(client)
