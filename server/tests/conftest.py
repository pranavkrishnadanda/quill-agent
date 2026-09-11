"""Shared integration/e2e fixtures.

Ensures a Greenmail container is running for the whole test session, waits for
the IMAP server to actually respond to a full handshake (not just accept TCP),
and only tears down the container if THIS session started it. Between tests,
`greenmail_clean` wipes the INBOX so tests never observe each other's mail.
"""
from __future__ import annotations

import socket
import subprocess
import time
from dataclasses import dataclass
from pathlib import Path

import pytest
from imapclient import IMAPClient

_COMPOSE_FILE = Path(__file__).resolve().parents[1] / "docker-compose.test.yml"
_CONTAINER = "job-agent-greenmail-test"

_IMAP_HOST = "127.0.0.1"
_IMAP_PORT = 3143
_SMTP_PORT = 3025
_IMAP_USER = "testuser"
_IMAP_PASSWORD = "testpass"


@dataclass(frozen=True)
class GreenmailInfo:
    host: str
    smtp_port: int
    imap_port: int
    user: str
    password: str
    imap_folder: str = "INBOX"


def _container_running() -> bool:
    r = subprocess.run(
        ["docker", "ps", "--filter", f"name={_CONTAINER}", "--format", "{{.Names}}"],
        check=False, capture_output=True, text=True,
    )
    return _CONTAINER in r.stdout


def _wait_imap_ready(host: str, port: int, timeout: float = 45.0) -> None:
    """Wait for a full IMAP greeting (`* OK`) and for auth to work."""
    deadline = time.monotonic() + timeout
    last_err: Exception | None = None
    while time.monotonic() < deadline:
        try:
            with socket.create_connection((host, port), timeout=2.0) as s:
                s.settimeout(2.0)
                greeting = s.recv(200)
            if greeting.startswith(b"* OK"):
                # Confirm a real login+logout works before returning.
                client = IMAPClient(host, port=port, ssl=False)
                client.login(_IMAP_USER, _IMAP_PASSWORD)
                client.logout()
                return
            last_err = RuntimeError(f"unexpected greeting: {greeting!r}")
        except Exception as exc:
            last_err = exc
        time.sleep(0.5)
    raise RuntimeError(f"Greenmail IMAP not ready within {timeout}s: {last_err}")


def _wait_smtp_ready(host: str, port: int, timeout: float = 30.0) -> None:
    deadline = time.monotonic() + timeout
    while time.monotonic() < deadline:
        try:
            with socket.create_connection((host, port), timeout=2.0) as s:
                s.settimeout(2.0)
                greeting = s.recv(200)
            if greeting.startswith(b"220"):
                return
        except Exception:
            pass
        time.sleep(0.5)
    raise RuntimeError(f"Greenmail SMTP not ready within {timeout}s")


@pytest.fixture(scope="session")
def greenmail() -> GreenmailInfo:
    """Ensure Greenmail is running for the session.

    Behaviour:
      • If the container was already running before this session, use it and
        do NOT tear it down at the end (developer-friendly for iterative runs).
      • If we started it, we stop it on teardown.
    """
    started_by_us = not _container_running()
    if started_by_us:
        subprocess.run(
            ["docker", "compose", "-f", str(_COMPOSE_FILE), "up", "-d"],
            check=True, capture_output=True,
        )
    try:
        _wait_imap_ready(_IMAP_HOST, _IMAP_PORT)
        _wait_smtp_ready(_IMAP_HOST, _SMTP_PORT)
        yield GreenmailInfo(
            host=_IMAP_HOST,
            smtp_port=_SMTP_PORT,
            imap_port=_IMAP_PORT,
            user=_IMAP_USER,
            password=_IMAP_PASSWORD,
        )
    finally:
        if started_by_us:
            subprocess.run(
                ["docker", "compose", "-f", str(_COMPOSE_FILE), "down", "-v"],
                check=False, capture_output=True,
            )


@pytest.fixture
def greenmail_clean(greenmail: GreenmailInfo) -> GreenmailInfo:
    """Wipe the INBOX before yielding — every test starts from empty state."""
    with IMAPClient(greenmail.host, port=greenmail.imap_port, ssl=False) as client:
        client.login(greenmail.user, greenmail.password)
        client.select_folder("INBOX")
        uids = client.search(["ALL"])
        if uids:
            client.delete_messages(uids)
            client.expunge()
    return greenmail
