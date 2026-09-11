"""Security test: Settings must reject an AUTH_TOKEN shorter than 32 chars."""
from __future__ import annotations

import pytest
from pydantic import ValidationError

from job_agent_server.config import Settings


def test_settings_rejects_short_auth_token() -> None:
    with pytest.raises(ValidationError):
        Settings(
            imap_host="h",
            imap_user="u",
            imap_app_password="p",
            auth_token="short",
        )
