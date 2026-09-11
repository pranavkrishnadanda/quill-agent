"""Edge case: empty regex pattern behavior in matches_pattern."""
from __future__ import annotations

from job_agent_server.pattern_matcher import matches_pattern


def test_matches_pattern_empty_pattern_matches_any_non_none_string() -> None:
    assert matches_pattern("hello", "a@b", "") is True


def test_matches_pattern_empty_pattern_with_none_inputs_is_false() -> None:
    assert matches_pattern(None, None, "") is False
