"""Unit tests for pattern_matcher.matches_pattern."""
from __future__ import annotations

from job_agent_server.pattern_matcher import matches_pattern


def test_regex_hits_subject_only() -> None:
    assert matches_pattern("Job Opening at Acme", "recruiter@example.com", r"job opening") is True


def test_regex_hits_from_only() -> None:
    assert matches_pattern("Weekly newsletter", "jobs@company.com", r"jobs@") is True


def test_regex_hits_both() -> None:
    assert matches_pattern("Job alert", "jobs@company.com", r"job") is True


def test_regex_hits_neither() -> None:
    assert matches_pattern("Weekly newsletter", "news@company.com", r"jobs@") is False


def test_case_insensitive_match() -> None:
    assert matches_pattern("JOB Opening", "Recruiter@Example.COM", r"job opening") is True
    assert matches_pattern("Job Opening", "recruiter@example.com", r"JOB OPENING") is True


def test_invalid_regex_substring_fallback_matches_subject() -> None:
    # Unbalanced paren -> invalid regex; substring 'job(' should not appear literally,
    # so use a pattern that's invalid but whose literal is a substring.
    assert matches_pattern("This is a [Job] posting", "someone@x.com", "[Job") is True


def test_invalid_regex_substring_fallback_matches_from() -> None:
    assert matches_pattern("Newsletter", "jobs+alerts@company.com", "jobs+") is True


def test_invalid_regex_no_substring_match_returns_false() -> None:
    assert matches_pattern("Newsletter", "news@company.com", "[unmatched") is False


def test_none_subject() -> None:
    assert matches_pattern(None, "jobs@company.com", r"jobs@") is True
    assert matches_pattern(None, "news@company.com", r"jobs@") is False


def test_none_from() -> None:
    assert matches_pattern("Job Opening", None, r"job") is True
    assert matches_pattern("Newsletter", None, r"job") is False


def test_both_none() -> None:
    assert matches_pattern(None, None, r"anything") is False


def test_both_empty_strings() -> None:
    assert matches_pattern("", "", r"anything") is False


def test_empty_pattern_matches_nonempty() -> None:
    # Empty regex matches any string; empty substring is in any string.
    assert matches_pattern("hello", "world@x.com", "") is True


def test_empty_pattern_with_both_none() -> None:
    assert matches_pattern(None, None, "") is False
