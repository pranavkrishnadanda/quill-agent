"""IMAP recent-UID search helpers."""

from __future__ import annotations

from datetime import datetime, timedelta, timezone
from typing import Any


def search_recent_uids(client: Any, folder: str, since_seconds: int) -> list[int]:
    """Select ``folder`` and return UIDs of messages received since ``since_seconds`` ago.

    IMAP ``SEARCH SINCE`` has DATE (not datetime) granularity, so the window is
    widened to whole days: ``since_seconds`` up to 24h uses today's date; older
    windows subtract additional days accordingly.

    Args:
        client: An IMAPClient-compatible client exposing ``select_folder`` and ``search``.
        folder: Mailbox name to select (opened writable so flags can later be set).
        since_seconds: Look-back window in seconds; negative values are clamped to 0.

    Returns:
        A sorted-ascending list of integer UIDs; empty list when no messages match.
    """
    seconds = max(0, int(since_seconds))
    days_back = max(0, (seconds - 1) // 86400) if seconds > 0 else 0
    since_date = (datetime.now(tz=timezone.utc).date() - timedelta(days=days_back))

    client.select_folder(folder, readonly=False)
    result = client.search(["SINCE", since_date])
    if not result:
        return []
    return sorted(int(uid) for uid in result)
