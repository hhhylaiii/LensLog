import boto3
from botocore.exceptions import ClientError

from app.core.config import settings

s3_client = boto3.client(
    "s3",
    region_name=settings.AWS_REGION,
    aws_access_key_id=settings.AWS_ACCESS_KEY_ID,
    aws_secret_access_key=settings.AWS_SECRET_ACCESS_KEY,
)


def generate_presigned_url(s3_key: str, expiration: int = 3600) -> str:
    """產生 S3 Presigned URL 供前端直接上傳"""
    url = s3_client.generate_presigned_url(
        "put_object",
        Params={"Bucket": settings.S3_BUCKET_NAME, "Key": s3_key},
        ExpiresIn=expiration,
    )
    return url


def get_object_url(s3_key: str) -> str:
    """取得 CloudFront 或 S3 URL"""
    return f"https://{settings.S3_BUCKET_NAME}.s3.{settings.AWS_REGION}.amazonaws.com/{s3_key}"


def delete_object(s3_key: str) -> bool:
    try:
        s3_client.delete_object(Bucket=settings.S3_BUCKET_NAME, Key=s3_key)
        return True
    except ClientError:
        return False
