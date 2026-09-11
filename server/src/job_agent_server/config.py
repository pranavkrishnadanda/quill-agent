"""Application configuration loaded from environment variables and .env files."""
from __future__ import annotations

from typing import Any

from pydantic import Field, model_validator
from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    """Runtime settings for the job-agent server.

    Values are read from environment variables (case-insensitive) with a
    fallback to a local `.env` file. Unknown keys are ignored.
    """

    model_config = SettingsConfigDict(
        env_file=".env",
        env_file_encoding="utf-8",
        extra="ignore",
    )

    imap_host: str
    imap_port: int = 993
    imap_user: str
    imap_app_password: str
    imap_folder: str = "INBOX"
    imap_use_ssl: bool = True

    server_host: str = "127.0.0.1"
    server_port: int = 8787

    auth_token: str = Field(min_length=32)

    @model_validator(mode="before")
    @classmethod
    def _derive_use_ssl(cls, values: Any) -> Any:
        """Derive `imap_use_ssl` from `imap_port` unless explicitly provided.

        If the caller/environment did not set IMAP_USE_SSL, infer SSL from the
        IMAP port: 993 -> True, anything else -> False.
        """
        if not isinstance(values, dict):
            return values
        # Normalize keys to lowercase to match field names (env vars are upper).
        normalized = {k.lower(): v for k, v in values.items()}
        if "imap_use_ssl" in normalized:
            return values
        port_raw = normalized.get("imap_port", 993)
        try:
            port = int(port_raw)
        except (TypeError, ValueError):
            return values
        values["imap_use_ssl"] = port == 993
        return values


def load_settings() -> Settings:
    """Load settings from environment variables and `.env`."""
    return Settings()
