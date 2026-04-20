import uuid
from contextlib import contextmanager

from celery import Celery
from sqlalchemy import create_engine, select
from sqlalchemy.orm import Session, sessionmaker

from app.core.config import settings
from app.models.models import ExifData, Photo
from app.services.exif_service import extract_exif, get_resized_image
from app.services.storage_service import download_object, upload_object

celery_app = Celery("lenslog", broker=settings.REDIS_URL, backend=settings.REDIS_URL)

sync_database_url = settings.DATABASE_URL.replace("+asyncpg", "")
sync_engine = create_engine(sync_database_url, pool_pre_ping=True)
SyncSessionLocal = sessionmaker(bind=sync_engine, autocommit=False, autoflush=False)


@contextmanager
def _db_session() -> Session:
    session = SyncSessionLocal()
    try:
        yield session
        session.commit()
    except Exception:
        session.rollback()
        raise
    finally:
        session.close()


@celery_app.task(
    bind=True,
    name="tasks.process_exif",
    autoretry_for=(Exception,),
    retry_backoff=True,
    retry_kwargs={"max_retries": 3},
)
def process_exif_task(self, photo_id: str, object_key: str):
    """下載原圖、解析 EXIF，並寫入 exif_data。"""
    image_bytes = download_object(object_key)
    exif_data = extract_exif(image_bytes)
    photo_uuid = uuid.UUID(photo_id)

    payload = {
        "make": exif_data.get("make"),
        "model": exif_data.get("model"),
        "lens_model": exif_data.get("lens_model"),
        "focal_length": exif_data.get("focal_length"),
        "aperture": exif_data.get("aperture"),
        "shutter_speed": exif_data.get("shutter_speed"),
        "iso": exif_data.get("iso"),
        "gps_lat": exif_data.get("gps_lat"),
        "gps_lng": exif_data.get("gps_lng"),
        "width": exif_data.get("width"),
        "height": exif_data.get("height"),
    }

    with _db_session() as db:
        photo = db.get(Photo, photo_uuid)
        if photo is None:
            return {"status": "skipped", "reason": "photo_not_found", "photo_id": photo_id}

        existing = db.get(ExifData, photo_uuid)
        if existing:
            for key, value in payload.items():
                setattr(existing, key, value)
        else:
            db.add(ExifData(photo_id=photo_uuid, **payload))

    return {"status": "ok", "photo_id": photo_id}


@celery_app.task(
    bind=True,
    name="tasks.generate_thumbnail",
    autoretry_for=(Exception,),
    retry_backoff=True,
    retry_kwargs={"max_retries": 3},
)
def generate_thumbnail_task(self, object_key: str, thumb_key: str, max_size: int = 800):
    """下載原圖、生成縮圖並上傳，800px 版本會更新 photos.thumb_key。"""
    image_bytes = download_object(object_key)
    thumb_bytes = get_resized_image(image_bytes, max_size=max_size)
    upload_object(thumb_key, thumb_bytes, content_type="image/jpeg")

    if max_size == 800:
        with _db_session() as db:
            photo = db.execute(select(Photo).where(Photo.s3_key == object_key)).scalar_one_or_none()
            if photo:
                photo.thumb_key = thumb_key

    return {"status": "ok", "thumb_key": thumb_key, "size": max_size}
