"""Unit tests for Settings configuration loading."""
from __future__ import annotations

import pytest
from pydantic import ValidationError

from job_agent_server.config import Settings, load_settings


REQUIRED_ENV = {
    "IMAP_HOST": "imap.example.com",
    "IMAP_USER": "user@example.com",
    "IMAP_APP_PASSWORD": "app-password-value",
    "AUTH_TOKEN": "a" * 32,
}


@pytest.fixture(autouse=True)
def _clean_env(monkeypatch: pytest.MonkeyPatch) -> None:
    """Ensure no leaking env vars from the host, and disable .env file."""
    for key in [
        "IMAP_HOST",
        "IMAP_PORT",
        "IMAP_USER",
        "IMAP_APP_PASSWORD",
        "IMAP_FOLDER",
        "IMAP_USE_SSL",
        "SERVER_HOST",
        "SERVER_PORT",
        "AUTH_TOKEN",
    ]:
        monkeypatch.delenv(key, raising=False)
    # Prevent an on-disk .env from polluting tests.
    monkeypatch.chdir("/tmp")


def _set_required(monkeypatch: pytest.MonkeyPatch) -> None:
    for k, v in REQUIRED_ENV.items():
        monkeypatch.setenv(k, v)


def test_load_settings_with_all_required_env_succeeds(monkeypatch: pytest.MonkeyPatch) -> None:
    _set_required(monkeypatch)
    settings = load_settings()
    assert settings.imap_host == "imap.example.com"
    assert settings.imap_user == "user@example.com"
    assert settings.imap_app_password == "app-password-value"
    assert settings.auth_token == "a" * 32


@pytest.mark.parametrize("missing_key", ["IMAP_HOST", "IMAP_USER", "IMAP_APP_PASSWORD", "AUTH_TOKEN"])
def test_missing_required_env_raises_validation_error(
    monkeypatch: pytest.MonkeyPatch, missing_key: str
) -> None:
    _set_required(monkeypatch)
    monkeypatch.delenv(missing_key, raising=False)
    with pytest.raises(ValidationError):
        Settings()


def test_short_auth_token_raises_validation_error(monkeypatch: pytest.MonkeyPatch) -> None:
    _set_required(monkeypatch)
    monkeypatch.setenv("AUTH_TOKEN", "a" * 31)
    with pytest.raises(ValidationError):
        Settings()


def test_defaults_applied_when_optional_fields_absent(monkeypatch: pytest.MonkeyPatch) -> None:
    _set_required(monkeypatch)
    settings = load_settings()
    assert settings.imap_port == 993
    assert settings.imap_folder == "INBOX"
    assert settings.server_host == "127.0.0.1"
    assert settings.server_port == 8787
    # Derived from default port 993.
    assert settings.imap_use_ssl is True


def test_port_993_derives_use_ssl_true(monkeypatch: pytest.MonkeyPatch) -> None:
    _set_required(monkeypatch)
    monkeypatch.setenv("IMAP_PORT", "993")
    settings = load_settings()
    assert settings.imap_use_ssl is True


def test_port_143_derives_use_ssl_false(monkeypatch: pytest.MonkeyPatch) -> None:
    _set_required(monkeypatch)
    monkeypatch.setenv("IMAP_PORT", "143")
    settings = load_settings()
    assert settings.imap_use_ssl is False


def test_explicit_imap_use_ssl_overrides_derivation_true(monkeypatch: pytest.MonkeyPatch) -> None:
    _set_required(monkeypatch)
    monkeypatch.setenv("IMAP_PORT", "143")
    monkeypatch.setenv("IMAP_USE_SSL", "true")
    settings = load_settings()
    assert settings.imap_use_ssl is True


def test_explicit_imap_use_ssl_overrides_derivation_false(monkeypatch: pytest.MonkeyPatch) -> None:
    _set_required(monkeypatch)
    monkeypatch.setenv("IMAP_PORT", "993")
    monkeypatch.setenv("IMAP_USE_SSL", "false")
    settings = load_settings()
    assert settings.imap_use_ssl is False
