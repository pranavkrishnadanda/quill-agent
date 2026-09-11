"""Integration test: IMAP connection succeeds against Greenmail."""
from __future__ import annotations

import pytest

from job_agent_server.imap.connection import (
    close_imap_connection,
    open_imap_connection,
)


@pytest.mark.integration
@pytest.mark.timeout(15)
def test_open_close_ok(greenmail) -> None:
    client = open_imap_connection(
        greenmail.host,
        greenmail.imap_port,
        greenmail.user,
        greenmail.password,
        use_ssl=False,
    )
    folders = client.list_folders()
    assert isinstance(folders, list)
    close_imap_connection(client)
