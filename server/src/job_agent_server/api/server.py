from fastapi import FastAPI, Depends, Header, HTTPException
from job_agent_server.config import Settings, load_settings
from job_agent_server.auth import verify_bearer_token
from job_agent_server.imap.connection import open_imap_connection, close_imap_connection
from job_agent_server.verify_service import poll_for_verification
from job_agent_server.api.models import VerifyRequest, VerifyResponse, HealthResponse


def create_app(settings_override: Settings | None = None) -> FastAPI:
    app = FastAPI(title="Job Agent — Verification Server")

    def get_settings() -> Settings:
        return settings_override or load_settings()

    def require_auth(authorization: str | None = Header(default=None),
                     settings: Settings = Depends(get_settings)) -> None:
        if not verify_bearer_token(authorization, settings.auth_token):
            raise HTTPException(status_code=401, detail="unauthorized")

    @app.get("/health", response_model=HealthResponse)
    def health(settings: Settings = Depends(get_settings)) -> HealthResponse:
        try:
            c = open_imap_connection(settings.imap_host, settings.imap_port,
                                     settings.imap_user, settings.imap_app_password,
                                     settings.imap_use_ssl)
            close_imap_connection(c)
            return HealthResponse(status="ok", imap="connected")
        except Exception as e:
            return HealthResponse(status="ok", imap=f"error: {type(e).__name__}")

    @app.post("/verify-code", response_model=VerifyResponse,
              dependencies=[Depends(require_auth)])
    def verify_code(req: VerifyRequest, settings: Settings = Depends(get_settings)) -> VerifyResponse:
        c = open_imap_connection(settings.imap_host, settings.imap_port,
                                 settings.imap_user, settings.imap_app_password,
                                 settings.imap_use_ssl)
        try:
            r = poll_for_verification(c, settings.imap_folder, req.pattern,
                                      req.since_seconds, req.timeout_seconds,
                                      req.poll_interval_seconds)
        finally:
            close_imap_connection(c)
        if r is None:
            raise HTTPException(status_code=408, detail="timeout")
        return VerifyResponse(code=r.code, magic_link=r.magic_link,
                              subject=r.subject, from_addr=r.from_addr)

    return app


app = create_app()
