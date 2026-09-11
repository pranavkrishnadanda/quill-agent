"""IMAP connection helpers."""

from __future__ import annotations

from imapclient import IMAPClient


def open_imap_connection(
    host: str,
    port: int,
    user: str,
    password: str,
    use_ssl: bool = True,
) -> IMAPClient:
    """Open an IMAP connection, log in, and return the authenticated client.

    Raises:
        ConnectionError: If the connection or login fails, with a clear message.
    """
    try:
        client = IMAPClient(host=host, port=port, ssl=use_ssl)
    except Exception as exc:
        raise ConnectionError(
            f"Failed to connect to IMAP server {host}:{port} (ssl={use_ssl}): {exc}"
        ) from exc

    try:
        client.login(user, password)
    except Exception as exc:
        try:
            client.logout()
        except Exception:
            pass
        raise ConnectionError(
            f"Failed to log in to IMAP server {host}:{port} as {user!r}: {exc}"
        ) from exc

    return client


def close_imap_connection(client: IMAPClient) -> None:
    """Best-effort logout and close. Never raises."""
    if client is None:
        return
    try:
        client.logout()
    except Exception:
        try:
            client.shutdown()
        except Exception:
            pass
