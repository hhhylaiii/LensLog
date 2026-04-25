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

    # --- 修改後的 Storage 設定 (帶有 MinIO 預設值) ---
    # 這樣即便沒讀到 .env，本地開發也能正常運作
    STORAGE_ENDPOINT_URL: str = "http://minio:9000"  
    STORAGE_PUBLIC_URL: str = "http://localhost:9000"    
    STORAGE_ACCESS_KEY: str = "minioadmin"
    STORAGE_SECRET_KEY: str = "minioadmin"
    STORAGE_BUCKET_NAME: str = "lenslog-dev"
    STORAGE_REGION: str = "us-east-1"

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
