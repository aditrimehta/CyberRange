from functools import lru_cache

from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    model_config = SettingsConfigDict(env_file=".env", extra="ignore")
    database_url: str = "sqlite:///./cyberrange.db"
    session_secret: str = "development-only-change-me-32-chars"
    session_cookie: str = "cr_session"
    secure_cookies: bool = False
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

@lru_cache
def get_settings() -> Settings:
    return Settings()
