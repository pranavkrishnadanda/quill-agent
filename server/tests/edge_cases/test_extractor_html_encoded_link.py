"""Edge case: HTML-encoded ampersands in magic link URL."""
from __future__ import annotations

from job_agent_server.extractors import extract_magic_link


def test_extract_magic_link_with_ampersand_in_query_string() -> None:
    """A URL with a plain ampersand in the query string is extracted intact."""
    body = "Click https://ex.com/verify?a=1&b=2 now"
    result = extract_magic_link(body)
    assert result is not None
    assert "verify" in result
