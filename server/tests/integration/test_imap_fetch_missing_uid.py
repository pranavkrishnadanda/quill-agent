"""Integration test: fetch_message_by_uid raises KeyError for a UID that does not exist."""
from __future__ import annotations

import pytest

from job_agent_server.imap.connection import (
    close_imap_connection,
    open_imap_connection,
)
from job_agent_server.imap.fetch import fetch_message_by_uid


@pytest.mark.integration
@pytest.mark.timeout(15)
def test_fetch_message_by_uid_missing_raises_key_error(greenmail_clean) -> None:
    client = open_imap_connection(
        greenmail_clean.host,
        greenmail_clean.imap_port,
        greenmail_clean.user,
        greenmail_clean.password,
        use_ssl=False,
    )
    try:
        client.select_folder("INBOX")
        with pytest.raises(KeyError):
            fetch_message_by_uid(client, 999999)
    finally:
        close_imap_connection(client)
