from pydantic_settings import BaseSettings
from functools import lru_cache


class Settings(BaseSettings):
    # App
    APP_NAME: str = "LensLog"
    DEBUG: bool = False

    # Database
    DATABASE_URL: str = "postgresql+asyncpg://postgres:password@db:5432/lenslog"

    # JWT
    SECRET_KEY: str = "change-me-in-production"
    ALGORITHM: str = "HS256"
    ACCESS_TOKEN_EXPIRE_MINUTES: int = 15
    REFRESH_TOKEN_EXPIRE_DAYS: int = 7

    # AWS S3
    AWS_ACCESS_KEY_ID: str = ""
    AWS_SECRET_ACCESS_KEY: str = ""
    AWS_REGION: str = "ap-northeast-1"
    S3_BUCKET_NAME: str = "lenslog-photos"

    # Redis
    REDIS_URL: str = "redis://redis:6379/0"

    # External APIs
    OPENMETEO_BASE_URL: str = "https://api.open-meteo.com/v1"
    SUNRISE_SUNSET_API_URL: str = "https://api.sunrise-sunset.org/json"

    # Email
    MAIL_USERNAME: str = ""
    MAIL_PASSWORD: str = ""
    MAIL_FROM: str = "noreply@lenslog.app"
    MAIL_PORT: int = 587
    MAIL_SERVER: str = "smtp.gmail.com"

    class Config:
        env_file = ".env"
        case_sensitive = True
        extra = "ignore"


@lru_cache()
def get_settings() -> Settings:
    return Settings()


settings = get_settings()
