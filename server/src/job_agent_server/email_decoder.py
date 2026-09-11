"""RFC 5322 email body decoder.

Parses raw email bytes and returns a decoded plaintext string.
Prefers text/plain over text/html in multipart/alternative messages,
handles common transfer encodings (base64, quoted-printable), and
strips HTML tags when only an HTML part is available.

Never raises: returns "" on unparseable input.
"""
from __future__ import annotations

import base64
import quopri
from email import message_from_bytes
from email.message import Message
from email.policy import compat32
from html.parser import HTMLParser


class _TagStripper(HTMLParser):
    """Collect textual content from an HTML document, ignoring tags."""

    def __init__(self) -> None:
        super().__init__(convert_charrefs=True)
        self._parts: list[str] = []
        self._skip_depth = 0

    def handle_starttag(self, tag: str, attrs: list[tuple[str, str | None]]) -> None:
        if tag.lower() in ("script", "style"):
            self._skip_depth += 1
        elif tag.lower() in ("br", "p", "div", "li", "tr"):
            self._parts.append("\n")

    def handle_endtag(self, tag: str) -> None:
        if tag.lower() in ("script", "style") and self._skip_depth > 0:
            self._skip_depth -= 1
        elif tag.lower() in ("p", "div", "li", "tr"):
            self._parts.append("\n")

    def handle_data(self, data: str) -> None:
        if self._skip_depth == 0:
            self._parts.append(data)

    def get_text(self) -> str:
        return "".join(self._parts)


def _strip_html(html: str) -> str:
    stripper = _TagStripper()
    try:
        stripper.feed(html)
        stripper.close()
    except Exception:
        return html
    return stripper.get_text()


def _decode_payload(part: Message) -> str:
    """Decode a single non-multipart part into a string, best-effort."""
    charset = part.get_content_charset() or "utf-8"
    raw = part.get_payload(decode=False)

    if isinstance(raw, list):
        # Nested multipart or unexpected structure — skip.
        return ""

    if raw is None:
        return ""

    if isinstance(raw, bytes):
        payload_bytes = raw
    else:
        # String payload; decode any transfer encoding manually.
        encoding = (part.get("Content-Transfer-Encoding") or "").strip().lower()
        try:
            if encoding == "base64":
                payload_bytes = base64.b64decode(raw, validate=False)
            elif encoding == "quoted-printable":
                payload_bytes = quopri.decodestring(raw)
            elif encoding in ("7bit", "8bit", "binary", "", None):
                payload_bytes = raw.encode(charset, errors="replace")
            else:
                payload_bytes = raw.encode(charset, errors="replace")
        except Exception:
            try:
                payload_bytes = raw.encode("utf-8", errors="replace")
            except Exception:
                return ""

    # Prefer email lib's own decoder if it succeeds — handles transfer
    # encoding for bytes payloads too.
    try:
        decoded = part.get_payload(decode=True)
        if isinstance(decoded, bytes) and decoded:
            payload_bytes = decoded
    except Exception:
        pass

    try:
        return payload_bytes.decode(charset, errors="replace")
    except (LookupError, TypeError):
        try:
            return payload_bytes.decode("utf-8", errors="replace")
        except Exception:
            return ""


def _find_text_parts(msg: Message) -> tuple[str | None, str | None]:
    """Walk the message tree; return (first text/plain, first text/html) bodies."""
    plain: str | None = None
    html: str | None = None

    if msg.is_multipart():
        for part in msg.walk():
            if part.is_multipart():
                continue
            ctype = (part.get_content_type() or "").lower()
            if ctype == "text/plain" and plain is None:
                plain = _decode_payload(part)
            elif ctype == "text/html" and html is None:
                html = _decode_payload(part)
            if plain is not None and html is not None:
                break
    else:
        ctype = (msg.get_content_type() or "").lower()
        body = _decode_payload(msg)
        if ctype == "text/html":
            html = body
        else:
            plain = body

    return plain, html


def decode_email_body(raw_message: bytes) -> str:
    """Parse RFC 5322 bytes and return decoded plaintext body.

    Rules:
      - multipart/alternative: prefer text/plain over text/html.
      - HTML-only: strip tags with a stdlib HTMLParser.
      - Handle base64 and quoted-printable transfer encodings.
      - Honor Content-Type charset (default utf-8).
      - Never raise; return "" on unparseable input.
    """
    if not isinstance(raw_message, (bytes, bytearray)) or not raw_message:
        return ""

    try:
        msg = message_from_bytes(bytes(raw_message), policy=compat32)
    except Exception:
        return ""

    try:
        plain, html = _find_text_parts(msg)
    except Exception:
        return ""

    if plain is not None and plain.strip() != "":
        return plain
    if html is not None and html.strip() != "":
        return _strip_html(html)
    if plain is not None:
        return plain
    if html is not None:
        return _strip_html(html)
    return ""
