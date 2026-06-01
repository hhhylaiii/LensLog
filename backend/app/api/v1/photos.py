import uuid
import redis.asyncio as aioredis
from fastapi import APIRouter, Depends, HTTPException, Query, status
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select
from sqlalchemy.orm import selectinload

from app.core.database import get_db
from app.core.config import settings
from app.core.filenames import sanitize_filename
from app.core.redis import get_redis
from app.models.models import GlobalLocation, Location, Photo, User
from app.schemas import PhotoCreate, PhotoUpdate, PhotoResponse, PresignResponse
from app.services.storage_service import (
    generate_presigned_post,
    generate_presigned_url,
    get_object_url,
    put_object_tags,
)
from app.services.presign_service import consume_presign, register_presign
from app.api.deps import get_current_active_user

# 【新增】匯入 Celery 任務模組
from app.tasks.exif_tasks import process_exif_task, generate_thumbnail_task

router = APIRouter(prefix="/photos", tags=["photos"])
ALLOWED_CONTENT_TYPES = {"image/jpeg", "image/png", "image/webp", "image/gif"}

def _with_url(photo: Photo) -> PhotoResponse:
    """輔助函式：將資料庫模型轉為 Response 並附上完整 URL"""
    data = PhotoResponse.model_validate(photo)
    data.url = get_object_url(photo.s3_key)
    if photo.thumb_key:
        data.thumb_url = get_object_url(photo.thumb_key)
    return data

def _exif_opts():
    return selectinload(Photo.exif)


async def _validate_photo_location(
    db: AsyncSession,
    current_user: User,
    user_location_id: uuid.UUID | None,
    global_location_id: uuid.UUID | None,
) -> tuple[uuid.UUID | None, uuid.UUID | None]:
    if user_location_id and global_location_id:
        raise HTTPException(status_code=422, detail="Only one location source may be selected")

    if user_location_id:
        result = await db.execute(
            select(Location).where(Location.id == user_location_id)
        )
        location = result.scalar_one_or_none()
        if not location:
            raise HTTPException(status_code=404, detail="User location not found")
        if location.user_id != current_user.id:
            raise HTTPException(status_code=403, detail="Not authorized to use this location")

    if global_location_id:
        result = await db.execute(
            select(GlobalLocation).where(
                GlobalLocation.id == global_location_id,
                GlobalLocation.is_active.is_(True),
            )
        )
        global_location = result.scalar_one_or_none()
        if not global_location:
            raise HTTPException(status_code=404, detail="Global location not found")

    return user_location_id, global_location_id

@router.get("", response_model=list[PhotoResponse])
async def list_photos(
    skip: int = 0,
    limit: int = 20,
    user_location_id: uuid.UUID | None = Query(default=None),
    global_location_id: uuid.UUID | None = Query(default=None),
    public_only: bool = Query(default=False),
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_active_user),
):
    """獲取照片列表，支援依綁定景點來源過濾。"""
    if user_location_id and global_location_id:
        raise HTTPException(status_code=422, detail="Only one location filter may be selected")

    stmt = select(Photo).options(_exif_opts())

    if user_location_id:
        stmt = stmt.where(
            Photo.user_id == current_user.id,
            Photo.user_location_id == user_location_id,
        )
    elif global_location_id:
        stmt = stmt.where(Photo.global_location_id == global_location_id)
        if public_only:
            stmt = stmt.where(Photo.is_public.is_(True))
        else:
            stmt = stmt.where(Photo.user_id == current_user.id)
    else:
        stmt = stmt.where(Photo.user_id == current_user.id)

    result = await db.execute(
        stmt
        .order_by(Photo.created_at.desc())
        .offset(skip)
        .limit(limit)
    )
    return [_with_url(p) for p in result.scalars().all()]

@router.post("/presign", response_model=PresignResponse)
async def presign_upload(
    filename: str,
    content_type: str,
    redis: aioredis.Redis = Depends(get_redis),
    current_user: User = Depends(get_current_active_user),
):
    """
    產生上傳用 presign 資訊。

    - API 路由：回傳 presigned PUT URL + `upload_headers`（支援 `x-amz-tagging`）。
    - 單元測試/替代流程：回傳 presigned POST policy（含 `fields` 與 `max_size_mb`）。
    """
    if content_type not in ALLOWED_CONTENT_TYPES:
        raise HTTPException(status_code=400, detail="Unsupported file type")

    safe_filename = sanitize_filename(filename)
    s3_key = f"photos/{uuid.uuid4()}/{safe_filename}"

    if isinstance(current_user, User):
        pending_tagging = "upload_state=pending"
        url = generate_presigned_url(
            s3_key,
            expiration=settings.PHOTO_PRESIGN_EXPIRE_SECONDS,
            content_type=content_type,
            tagging=pending_tagging,
        )
        await register_presign(redis, s3_key, current_user.id)
        upload_headers = {
            "x-amz-tagging": pending_tagging,
            "Content-Type": content_type,
        }
        return PresignResponse(
            presigned_url=url,
            s3_key=s3_key,
            upload_headers=upload_headers,
            max_size_mb=settings.PHOTO_UPLOAD_MAX_SIZE_MB,
        )

    data = generate_presigned_post(
        s3_key,
        expiration=settings.PHOTO_PRESIGN_EXPIRE_SECONDS,
        content_type=content_type,
        max_size_mb=settings.PHOTO_UPLOAD_MAX_SIZE_MB,
    )
    return PresignResponse(
        presigned_url=data["url"],
        s3_key=s3_key,
        fields=data.get("fields"),
        max_size_mb=settings.PHOTO_UPLOAD_MAX_SIZE_MB,
    )

@router.post("", response_model=PhotoResponse, status_code=status.HTTP_201_CREATED)
async def create_photo(
    data: PhotoCreate,
    db: AsyncSession = Depends(get_db),
    redis: aioredis.Redis = Depends(get_redis),
    current_user: User = Depends(get_current_active_user),
):
    """
    建立照片紀錄並觸發後台處理任務。

    修改點：
    1. 使用 await db.commit() 確保 ID 已產生。
    2. 呼叫 process_exif_task.delay 處理元數據。
    3. 呼叫 generate_thumbnail_task.delay 處理縮圖。
    4. 照片可綁定擇一景點來源：`user_location_id` 或 `global_location_id`。
    """
    ok = await consume_presign(redis, data.s3_key, current_user.id)
    if not ok:
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Invalid s3_key")

    user_location_id, global_location_id = await _validate_photo_location(
        db,
        current_user,
        data.user_location_id,
        data.global_location_id,
    )

    photo = Photo(
        **data.model_dump(exclude={"user_location_id", "global_location_id"}),
        user_id=current_user.id,
        user_location_id=user_location_id,
        global_location_id=global_location_id,
    )
    db.add(photo)

    # 【修改】必須先 Commit，否則後台 Worker 會因為 Transaction 未完成而找不到這筆 ID
    await db.commit()
    await db.refresh(photo, attribute_names=["exif"])

    try:
        put_object_tags(photo.s3_key, {"upload_state": "confirmed"})
    except Exception as exc:
        await db.delete(photo)
        await db.commit()
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Failed to finalize uploaded photo",
        ) from exc

    # 【新增】觸發 Celery 非同步任務
    # delay 會將任務放入 Redis 佇列，讓 API 能立刻回傳結果
    process_exif_task.delay(str(photo.id), photo.s3_key)
    generate_thumbnail_task.delay(photo.s3_key, f"thumbnails/800/{photo.id}.jpg", 800)
    generate_thumbnail_task.delay(photo.s3_key, f"thumbnails/400/{photo.id}.jpg", 400)

    return _with_url(photo)

@router.get("/{photo_id}", response_model=PhotoResponse)
async def get_photo(photo_id: uuid.UUID, db: AsyncSession = Depends(get_db)):
    """獲取單張照片詳情"""
    result = await db.execute(
        select(Photo).where(Photo.id == photo_id).options(_exif_opts())
    )
    photo = result.scalar_one_or_none()
    if not photo:
        raise HTTPException(status_code=404, detail="Photo not found")
    return _with_url(photo)

@router.patch("/{photo_id}", response_model=PhotoResponse)
async def update_photo(
    photo_id: uuid.UUID,
    data: PhotoUpdate,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_active_user),
):
    """更新照片資訊，可切換照片綁定的私人景點或公開景點。"""
    result = await db.execute(
        select(Photo).where(Photo.id == photo_id).options(_exif_opts())
    )
    photo = result.scalar_one_or_none()
    if not photo:
        raise HTTPException(status_code=404, detail="Photo not found")
    if photo.user_id != current_user.id:
        raise HTTPException(status_code=403, detail="Not authorized")

    updated_user_location_id = photo.user_location_id
    updated_global_location_id = photo.global_location_id
    if "user_location_id" in data.model_fields_set:
        updated_user_location_id = data.user_location_id
    if "global_location_id" in data.model_fields_set:
        updated_global_location_id = data.global_location_id

    updated_user_location_id, updated_global_location_id = await _validate_photo_location(
        db,
        current_user,
        updated_user_location_id,
        updated_global_location_id,
    )
    photo.user_location_id = updated_user_location_id
    photo.global_location_id = updated_global_location_id

    for field, value in data.model_dump(exclude_unset=True, exclude={"user_location_id", "global_location_id"}).items():
        setattr(photo, field, value)

    await db.commit() # 【修改】更新也需要 commit
    await db.refresh(photo, attribute_names=["exif"])
    return _with_url(photo)

@router.delete("/{photo_id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_photo(
    photo_id: uuid.UUID,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_active_user),
):
    """刪除照片紀錄"""
    result = await db.execute(select(Photo).where(Photo.id == photo_id))
    photo = result.scalar_one_or_none()
    if not photo:
        raise HTTPException(status_code=404, detail="Photo not found")
    if photo.user_id != current_user.id:
        raise HTTPException(status_code=403, detail="Not authorized")

    await db.delete(photo)
    await db.commit() # 【修改】確保刪除生效
