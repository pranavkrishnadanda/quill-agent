from pydantic import BaseModel, Field


class VerifyRequest(BaseModel):
    pattern: str = "verify|confirm|code|activate"
    since_seconds: int = Field(default=300, ge=1, le=3600)
    timeout_seconds: int = Field(default=60, ge=1, le=300)
    poll_interval_seconds: float = Field(default=3.0, ge=0.5, le=30.0)


class VerifyResponse(BaseModel):
    code: str | None = None
    magic_link: str | None = None
    subject: str
    from_addr: str


class HealthResponse(BaseModel):
    status: str
    imap: str


class ErrorResponse(BaseModel):
    error: str
    detail: str | None = None
