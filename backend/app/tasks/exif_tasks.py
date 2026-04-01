from celery import Celery
from app.core.config import settings

celery_app = Celery("lenslog", broker=settings.REDIS_URL, backend=settings.REDIS_URL)


@celery_app.task(name="tasks.process_exif")
def process_exif_task(photo_id: str, s3_key: str):
    """從 S3 下載照片並解析 EXIF，存回資料庫"""
    import boto3
    from app.services.exif_service import extract_exif

    s3 = boto3.client("s3")
    obj = s3.get_object(Bucket=settings.S3_BUCKET_NAME, Key=s3_key)
    image_bytes = obj["Body"].read()
    exif_data = extract_exif(image_bytes)
    # TODO: 將 exif_data 寫入資料庫 ExifData table
    return exif_data


@celery_app.task(name="tasks.generate_thumbnail")
def generate_thumbnail_task(s3_key: str, thumb_key: str, max_size: int = 800):
    """從 S3 下載原圖，生成縮圖後上傳回 S3"""
    import boto3
    import io
    from PIL import Image

    s3 = boto3.client("s3")
    obj = s3.get_object(Bucket=settings.S3_BUCKET_NAME, Key=s3_key)
    image_bytes = obj["Body"].read()

    img = Image.open(io.BytesIO(image_bytes))
    img.thumbnail((max_size, max_size))

    buf = io.BytesIO()
    img.save(buf, format="JPEG", quality=85)
    buf.seek(0)

    s3.put_object(Bucket=settings.S3_BUCKET_NAME, Key=thumb_key, Body=buf, ContentType="image/jpeg")
    return thumb_key
