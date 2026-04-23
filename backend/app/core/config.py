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

    # S3-compatible storage (MinIO for dev, R2/S3 for prod)
    S3_ENDPOINT_URL: str = ""  # e.g. http://minio:9000 for MinIO
    S3_PUBLIC_URL: str = ""    # e.g. http://localhost:9000/lenslog-dev for MinIO

    # Redis
    REDIS_URL: str = "redis://redis:6379/0"

    # External APIs
    CWA_API_KEY: str = ""
    CWA_BASE_URL: str = "https://opendata.cwa.gov.tw/api/v1/rest/datastore"
    SUNRISE_SUNSET_API_URL: str = "https://api.sunrise-sunset.org/json"

    # Frontend / CORS
    FRONTEND_URL: str = "http://localhost:5173"
    CORS_ORIGINS: str = ""  # comma-separated extra allowed origins

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
