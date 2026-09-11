from __future__ import annotations

from email.header import decode_header, make_header
from email.utils import parseaddr
from typing import Any


def _decode_header(raw: Any) -> str:
    """Best-effort decode of an ENVELOPE header (bytes or str). Return empty string on failure."""
    if raw is None:
        return ""
    try:
        if isinstance(raw, bytes):
            try:
                value = raw.decode("ascii")
            except UnicodeDecodeError:
                value = raw.decode("utf-8", errors="replace")
        else:
            value = str(raw)
        return str(make_header(decode_header(value)))
    except Exception:
        try:
            if isinstance(raw, bytes):
                return raw.decode("utf-8", errors="replace")
            return str(raw)
        except Exception:
            return ""


def fetch_message_by_uid(client: Any, uid: int) -> tuple[str, str, bytes]:
    """Fetch ENVELOPE + BODY.PEEK[] for the given UID.

    Returns (subject, from_addr as 'local@host', raw_rfc5322_bytes).
    Raises KeyError if UID not present in the currently-selected folder.
    """
    response = client.fetch([uid], [b"ENVELOPE", b"BODY.PEEK[]"])
    if not response or uid not in response:
        raise KeyError(uid)

    data = response[uid]
    envelope = data.get(b"ENVELOPE") if isinstance(data, dict) else None
    raw_bytes = None
    if isinstance(data, dict):
        raw_bytes = data.get(b"BODY[]") or data.get(b"RFC822") or data.get(b"BODY.PEEK[]")
    if raw_bytes is None:
        raise KeyError(uid)

    subject = ""
    from_addr = ""

    if envelope is not None:
        subject = _decode_header(getattr(envelope, "subject", None))
        from_list = getattr(envelope, "from_", None)
        if from_list:
            addr = from_list[0]
            mailbox = getattr(addr, "mailbox", None)
            host = getattr(addr, "host", None)
            if isinstance(mailbox, bytes):
                mailbox = mailbox.decode("utf-8", errors="replace")
            if isinstance(host, bytes):
                host = host.decode("utf-8", errors="replace")
            if mailbox and host:
                from_addr = f"{mailbox}@{host}"
            elif mailbox:
                from_addr = str(mailbox)

    if not from_addr:
        try:
            from email import message_from_bytes

            msg = message_from_bytes(raw_bytes)
            _, parsed = parseaddr(msg.get("From", ""))
            from_addr = parsed or ""
            if not subject:
                subject = _decode_header(msg.get("Subject"))
        except Exception:
            pass

    return subject, from_addr, bytes(raw_bytes)
