"""
Legacy compatibility layer.

Historically this project used S3_* settings and this module was imported by routes/docs.
The implementation has moved to `storage_service.py` with unified `STORAGE_*` settings.

Keep this module to avoid breaking old imports; delegate behavior to storage_service.
"""

from botocore.exceptions import ClientError

from app.core.config import settings
from app.services.storage_service import generate_presigned_url as _generate_presigned_url
from app.services.storage_service import generate_presigned_post as _generate_presigned_post
from app.services.storage_service import get_object_url as _get_object_url
from app.services.storage_service import get_storage_client


def generate_presigned_url(
    s3_key: str,
    content_type: str,
    expiration: int = 3600,
) -> str:
    """產生 Presigned URL 供前端直接上傳（delegates to storage_service）。"""
    return _generate_presigned_url(s3_key, content_type=content_type, expiration=expiration)


def generate_presigned_post(
    s3_key: str,
    expiration: int = 3600,
    content_type: str | None = None,
    max_size_mb: int | None = None,
) -> dict:
    """產生 Presigned POST 供前端直傳（delegates to storage_service）。"""
    return _generate_presigned_post(
        s3_key,
        expiration=expiration,
        content_type=content_type,
        max_size_mb=max_size_mb,
    )


def get_object_url(s3_key: str) -> str:
    """取得 MinIO / R2 / S3 URL（delegates to storage_service）。"""
    return _get_object_url(s3_key)


def delete_object(s3_key: str) -> bool:
    """Delete one object from the configured bucket."""
    s3 = get_storage_client()
    try:
        s3.delete_object(Bucket=settings.STORAGE_BUCKET_NAME, Key=s3_key)
        return True
    except ClientError:
        return False
