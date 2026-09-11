"""Integration test: close_imap_connection on a connected client does not raise."""
from __future__ import annotations

import pytest

from job_agent_server.imap.connection import (
    close_imap_connection,
    open_imap_connection,
)


@pytest.mark.integration
@pytest.mark.timeout(15)
def test_close_imap_connection_does_not_raise(greenmail) -> None:
    client = open_imap_connection(
        greenmail.host,
        greenmail.imap_port,
        greenmail.user,
        greenmail.password,
        use_ssl=False,
    )
    close_imap_connection(client)
