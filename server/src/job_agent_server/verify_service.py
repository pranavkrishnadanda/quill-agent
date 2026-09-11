from __future__ import annotations

import time
from dataclasses import dataclass

from job_agent_server.email_decoder import decode_email_body
from job_agent_server.extractors import extract_magic_link, extract_verification_code
from job_agent_server.imap.fetch import fetch_message_by_uid
from job_agent_server.imap.search import search_recent_uids
from job_agent_server.pattern_matcher import matches_pattern


@dataclass
class VerifyResult:
    code: str | None
    magic_link: str | None
    subject: str
    from_addr: str


def poll_for_verification(
    client: object,
    folder: str,
    pattern: str,
    since_seconds: int,
    timeout_seconds: int,
    poll_interval_seconds: float = 3.0,
) -> VerifyResult | None:
    """Poll IMAP folder for a verification email matching pattern.

    Loops until deadline, checking newest UIDs first. Returns first message
    whose subject/from matches pattern AND contains a code or magic link.
    Returns None if deadline passes with no match.
    """
    deadline = time.monotonic() + timeout_seconds
    seen: set[int] = set()
    while time.monotonic() < deadline:
        uids = search_recent_uids(client, folder, since_seconds)
        for uid in reversed(uids):
            if uid in seen:
                continue
            seen.add(uid)
            try:
                subject, from_addr, raw = fetch_message_by_uid(client, uid)
            except KeyError:
                continue
            if not matches_pattern(subject, from_addr, pattern):
                continue
            body = decode_email_body(raw)
            combined = (subject or "") + "\n" + (body or "")
            code = extract_verification_code(combined)
            link = extract_magic_link(combined)
            if code or link:
                return VerifyResult(code, link, subject, from_addr)
        time.sleep(poll_interval_seconds)
    return None
