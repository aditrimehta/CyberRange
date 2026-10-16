from functools import lru_cache

from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    model_config = SettingsConfigDict(env_file=".env", extra="ignore")
    app_env: str = "development"
    database_url: str = "sqlite:///./cyberrange.db"
    postgres_password: str = "development-db-password-change-me"
    session_secret: str = "development-only-change-me-32-chars"
    session_cookie: str = "cr_session"
    secure_cookies: bool = False
    runtime: str = "fake"
    docker_host: str = "tcp://socket-proxy:2375"
    lab_root: str = "../labs"
    max_active_sessions: int = 40
    max_sessions_per_user: int = 1
    allow_session_extension: bool = False
    default_idle_minutes: int = 30
    default_max_duration_minutes: int = 180
    require_email_verification: bool = False
    smtp_host: str = "mailpit"
    smtp_port: int = 1025
    smtp_user: str = ""
    smtp_password: str = ""
    frontend_origin: str = "http://localhost"
    domain: str = "localhost"

    def validate_production(self) -> None:
        if self.app_env == "production":
            if len(self.session_secret) < 32 or "change-me" in self.session_secret:
                raise RuntimeError("SESSION_SECRET must be a unique secret of at least 32 characters in production")
            if len(self.postgres_password) < 24 or "change-me" in self.postgres_password:
                raise RuntimeError("POSTGRES_PASSWORD must be a unique secret of at least 24 characters in production")


@lru_cache
def get_settings() -> Settings:
    settings = Settings()
    settings.validate_production()
    return settings
