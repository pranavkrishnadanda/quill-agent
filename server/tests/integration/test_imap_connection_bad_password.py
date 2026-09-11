from __future__ import annotations

import pytest

from job_agent_server.imap.connection import open_imap_connection


@pytest.mark.timeout(15)
@pytest.mark.integration
def test_wrong_password_raises(greenmail) -> None:
    with pytest.raises(ConnectionError):
        open_imap_connection(
            greenmail.host,
            greenmail.imap_port,
            greenmail.user,
            "wrong-password",
            use_ssl=False,
        )
