import boto3
from botocore.client import Config
from urllib.parse import urlparse, urlunparse

from app.core.config import settings


def get_storage_client():
    """
    產生 boto3 client 實例。
    透過判斷 STORAGE_ENDPOINT_URL 來決定連線目標 (適配器模式的核心)
    """
    # 如果 .env 裡的 ENDPOINT 是空字串，這裡就會拿到 None (代表要連線到真實的 AWS S3)
    endpoint_url = settings.STORAGE_ENDPOINT_URL if settings.STORAGE_ENDPOINT_URL else None
    
    # 針對 MinIO 等 S3-compatible 儲存，必須強制使用 path style addressing
    # 例如：http://minio:9000/bucket-name/key 而不是 http://bucket-name.minio:9000/key
    s3_config = Config(s3={'addressing_style': 'path'}) if endpoint_url else Config()

    return boto3.client(
        "s3",
        endpoint_url=endpoint_url,
        aws_access_key_id=settings.STORAGE_ACCESS_KEY,
        aws_secret_access_key=settings.STORAGE_SECRET_KEY,
        region_name=settings.STORAGE_REGION,
        config=s3_config
    )


def _rewrite_presigned_url_host(url: str) -> str:
    """將內網 endpoint 轉為瀏覽器可達的公開 host。"""
    if not settings.STORAGE_ENDPOINT_URL or not settings.STORAGE_PUBLIC_URL:
        return url

    internal = urlparse(settings.STORAGE_ENDPOINT_URL)
    public = urlparse(settings.STORAGE_PUBLIC_URL)
    if not internal.netloc or not public.netloc:
        return url

    parsed = urlparse(url)
    if parsed.netloc != internal.netloc:
        return url

    return urlunparse(
        (
            public.scheme or parsed.scheme,
            public.netloc,
            parsed.path,
            parsed.params,
            parsed.query,
            parsed.fragment,
        )
    )


def download_object(key: str) -> bytes:
    """下載照片並轉為位元組，供給 Pillow 或 EXIF 解析使用"""
    s3 = get_storage_client()
    response = s3.get_object(Bucket=settings.STORAGE_BUCKET_NAME, Key=key)
    return response["Body"].read()

def upload_object(key: str, data: bytes, content_type: str = "image/jpeg"):
    """上傳處理好的縮圖或其他檔案"""
    s3 = get_storage_client()
    s3.put_object(
        Bucket=settings.STORAGE_BUCKET_NAME, 
        Key=key, 
        Body=data, 
        ContentType=content_type
    )


def generate_presigned_url(
    key: str,
    expiration: int = 3600,
    content_type: str | None = None,
    tagging: str | None = None,
) -> str:
    """產生給前端直傳原始照片用的限時 URL"""
    s3 = get_storage_client()
    params = {"Bucket": settings.STORAGE_BUCKET_NAME, "Key": key}
    if content_type:
        params["ContentType"] = content_type
    if tagging:
        params["Tagging"] = tagging

    url = s3.generate_presigned_url(
        "put_object",
        Params=params,
        ExpiresIn=expiration,
    )
    return _rewrite_presigned_url_host(url)


def put_object_tags(key: str, tags: dict[str, str]) -> None:
    """更新既有物件的 tags，供 lifecycle 與狀態管理使用。"""
    s3 = get_storage_client()
    s3.put_object_tagging(
        Bucket=settings.STORAGE_BUCKET_NAME,
        Key=key,
        Tagging={
            "TagSet": [{"Key": tag_key, "Value": tag_value} for tag_key, tag_value in tags.items()]
        },
    )


def get_object_url(key: str) -> str:
    """產生對外的公開連結供前端 `<img src="...">` 顯示"""
    # 如果沒有設定 endpoint，代表我們在正式機用 AWS S3
    if not settings.STORAGE_ENDPOINT_URL:
        return f"https://{settings.STORAGE_BUCKET_NAME}.s3.{settings.STORAGE_REGION}.amazonaws.com/{key}"
    
    # 若為本機開發 (MinIO) 或 Cloudflare R2
    public_url = settings.STORAGE_PUBLIC_URL.rstrip("/")
    return f"{public_url}/{settings.STORAGE_BUCKET_NAME}/{key}"
