from job_agent_server.imap.connection import open_imap_connection
import pytest


@pytest.mark.timeout(10)
@pytest.mark.integration
def test_unreachable_raises() -> None:
    with pytest.raises(ConnectionError):
        open_imap_connection("127.0.0.1", 1, "u", "p", use_ssl=False)
