import boto3
from botocore.config import Config
from botocore.exceptions import ClientError
from urllib.parse import urlparse, urlunparse

from app.core.config import settings


def _make_client():
    kwargs = dict(
        region_name=settings.AWS_REGION,
        aws_access_key_id=settings.AWS_ACCESS_KEY_ID,
        aws_secret_access_key=settings.AWS_SECRET_ACCESS_KEY,
        config=Config(signature_version="s3v4"),
    )
    if settings.S3_ENDPOINT_URL:
        kwargs["endpoint_url"] = settings.S3_ENDPOINT_URL
    return boto3.client("s3", **kwargs)


s3_client = _make_client()


def generate_presigned_url(s3_key: str, expiration: int = 3600) -> str:
    """產生 S3 Presigned URL 供前端直接上傳"""
    url = s3_client.generate_presigned_url(
        "put_object",
        Params={"Bucket": settings.S3_BUCKET_NAME, "Key": s3_key},
        ExpiresIn=expiration,
    )
    # When S3_ENDPOINT_URL is an internal hostname (e.g. minio:9000 inside Docker),
    # boto3 embeds that host into the presigned URL. Rewrite it to the public-facing
    # host from S3_PUBLIC_URL so the browser can actually reach it.
    if settings.S3_ENDPOINT_URL and settings.S3_PUBLIC_URL:
        internal = urlparse(settings.S3_ENDPOINT_URL)
        public = urlparse(settings.S3_PUBLIC_URL)
        internal_base = urlunparse((internal.scheme, internal.netloc, "", "", "", ""))
        public_base = urlunparse((public.scheme, public.netloc, "", "", "", ""))
        if internal_base != public_base:
            url = url.replace(internal_base, public_base, 1)
    return url


def get_object_url(s3_key: str) -> str:
    """取得 CloudFront、MinIO 或 S3 URL"""
    if settings.S3_PUBLIC_URL:
        return f"{settings.S3_PUBLIC_URL.rstrip('/')}/{s3_key}"
    return f"https://{settings.S3_BUCKET_NAME}.s3.{settings.AWS_REGION}.amazonaws.com/{s3_key}"


def delete_object(s3_key: str) -> bool:
    try:
        s3_client.delete_object(Bucket=settings.S3_BUCKET_NAME, Key=s3_key)
        return True
    except ClientError:
        return False
