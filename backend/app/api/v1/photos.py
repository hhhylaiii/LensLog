import uuid
from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select
from sqlalchemy.orm import selectinload

from app.core.database import get_db
from app.models.models import Photo, User
from app.schemas import PhotoCreate, PhotoUpdate, PhotoResponse, PresignResponse
from app.services.storage_service import generate_presigned_url, get_object_url
from app.api.deps import get_current_active_user

# 【新增】匯入 Celery 任務模組
from app.tasks.exif_tasks import process_exif_task, generate_thumbnail_task

router = APIRouter(prefix="/photos", tags=["photos"])

def _with_url(photo: Photo) -> PhotoResponse:
    """輔助函式：將資料庫模型轉為 Response 並附上完整 URL"""
    data = PhotoResponse.model_validate(photo)
    data.url = get_object_url(photo.s3_key)
    if photo.thumb_key:
        data.thumb_url = get_object_url(photo.thumb_key)
    return data

def _exif_opts():
    return selectinload(Photo.exif)

@router.get("", response_model=list[PhotoResponse])
async def list_photos(
    skip: int = 0,
    limit: int = 20,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_active_user),
):
    """獲取當前使用者的照片列表"""
    result = await db.execute(
        select(Photo)
        .where(Photo.user_id == current_user.id)
        .options(_exif_opts())
        .offset(skip)
        .limit(limit)
    )
    return [_with_url(p) for p in result.scalars().all()]

@router.post("/presign", response_model=PresignResponse)
async def presign_upload(
    filename: str,
    content_type: str | None = None,
    current_user: User = Depends(get_current_active_user),
):
    """產生 S3 預簽名網址，供前端直接上傳原圖至 MinIO"""
    s3_key = f"photos/{uuid.uuid4()}/{filename}"
    url = generate_presigned_url(s3_key, content_type=content_type)
    return PresignResponse(presigned_url=url, s3_key=s3_key)

@router.post("", response_model=PhotoResponse, status_code=status.HTTP_201_CREATED)
async def create_photo(
    data: PhotoCreate,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_active_user),
):
    """
    建立照片紀錄並觸發後台處理任務。
    
    修改點：
    1. 使用 await db.commit() 確保 ID 已產生。
    2. 呼叫 process_exif_task.delay 處理元數據。
    3. 呼叫 generate_thumbnail_task.delay 處理縮圖。
    """
    photo = Photo(**data.model_dump(), user_id=current_user.id)
    db.add(photo)
    
    # 【修改】必須先 Commit，否則後台 Worker 會因為 Transaction 未完成而找不到這筆 ID
    await db.commit()
    await db.refresh(photo)

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
    """更新照片資訊 (如標題、描述)"""
    result = await db.execute(select(Photo).where(Photo.id == photo_id))
    photo = result.scalar_one_or_none()
    if not photo:
        raise HTTPException(status_code=404, detail="Photo not found")
    if photo.user_id != current_user.id:
        raise HTTPException(status_code=403, detail="Not authorized")
    
    for field, value in data.model_dump(exclude_unset=True).items():
        setattr(photo, field, value)
    
    await db.commit() # 【修改】更新也需要 commit
    await db.refresh(photo)
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
