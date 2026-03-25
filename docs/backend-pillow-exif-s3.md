# Pillow、piexif 與 AWS S3 (boto3)

## 版本

```
Pillow>=10.4.0
piexif>=1.1.3
boto3>=1.34.0
httpx>=0.27.0
```

## 在此專案中的用途與角色

- **Pillow**：Python 的圖片處理函式庫，用於解析圖片格式、產生縮圖。
- **piexif**：EXIF 元資料讀取函式庫，從 JPEG 圖片中提取相機設定資訊。
- **boto3**：AWS SDK for Python，用於操作 S3 儲存服務（產生 Presigned URL、刪除物件）。
- **httpx**：非同步 HTTP 客戶端，用於呼叫外部 API（Open-Meteo 天氣、Sunrise-Sunset）。

## 照片上傳流程（Presigned URL 模式）

LensLog 採用「前端直傳 S3」的架構，後端不需要中轉圖片資料流：

```
1. 前端請求 presigned URL
   GET/POST /api/v1/photos/presign?filename=IMG_001.jpg
   → 後端產生 S3 presigned PUT URL（有效期 1 小時）

2. 前端直接 PUT 圖片到 S3
   PUT https://lenslog-photos.s3.ap-northeast-1.amazonaws.com/photos/{uuid}/IMG_001.jpg

3. 前端通知後端照片已上傳
   POST /api/v1/photos
   body: { s3_key, caption, location_id, is_public }

4. 後端派發 Celery 任務
   - process_exif_task(photo_id, s3_key)   → 解析 EXIF
   - generate_thumbnail_task(s3_key, thumb_key) → 產生縮圖
```

## S3 服務（`backend/app/services/s3_service.py`）

```python
# 產生 Presigned URL（前端直傳用）
def generate_presigned_url(s3_key: str, expiration: int = 3600) -> str:
    return s3_client.generate_presigned_url(
        "put_object",
        Params={"Bucket": settings.S3_BUCKET_NAME, "Key": s3_key},
        ExpiresIn=expiration,
    )

# 取得物件的公開 URL（或 CloudFront URL）
def get_object_url(s3_key: str) -> str:
    return f"https://{settings.S3_BUCKET_NAME}.s3.{settings.AWS_REGION}.amazonaws.com/{s3_key}"
```

S3 Key 命名規則：`photos/{uuid}/{filename}`

## EXIF 解析（`backend/app/services/exif_service.py`）

從圖片 bytes 中提取以下資訊，存入 `exif_data` 資料表：

| 欄位 | EXIF 標籤 | 說明 |
|---|---|---|
| `make` | `ImageIFD.Make` | 相機製造商 |
| `model` | `ImageIFD.Model` | 相機型號 |
| `lens_model` | `ExifIFD.LensModel` | 鏡頭型號 |
| `focal_length` | `ExifIFD.FocalLength` | 實際焦距（mm） |
| `aperture` | `ExifIFD.FNumber` | 光圈值（f/x） |
| `iso` | `ExifIFD.ISOSpeedRatings` | ISO 感光度 |
| `shutter_speed` | `ExifIFD.ExposureTime` | 快門速度（如 1/250） |
| `width`/`height` | `Image.size` | 圖片解析度 |

```python
def extract_exif(image_bytes: bytes) -> dict:
    img = Image.open(io.BytesIO(image_bytes))
    exif_dict = piexif.load(img.info.get("exif", b""))
    # 解析各 IFD 欄位...
```

## 縮圖生成（Celery 任務）

```python
@celery_app.task(name="tasks.generate_thumbnail")
def generate_thumbnail_task(s3_key: str, thumb_key: str, max_size: int = 800):
    # 從 S3 下載原圖
    # 用 Pillow 縮圖：保持長寬比，最長邊不超過 max_size
    img.thumbnail((max_size, max_size))
    # 以 JPEG quality=85 上傳回 S3
    img.save(buf, format="JPEG", quality=85)
```

## 外部天氣 API（httpx）

位於 `backend/app/services/weather_service.py`，為拍攝景點提供天氣資訊：

```python
# Open-Meteo：取得即時溫度、天氣代碼、風速
async def get_weather(lat: float, lng: float) -> dict: ...

# Sunrise-Sunset API：取得日出日落時間
async def get_sunrise_sunset(lat: float, lng: float, date: str = None) -> dict: ...
```

## AWS 環境變數

| 變數 | 說明 |
|---|---|
| `AWS_ACCESS_KEY_ID` | AWS 存取金鑰 ID |
| `AWS_SECRET_ACCESS_KEY` | AWS 秘密存取金鑰 |
| `AWS_REGION` | S3 bucket 所在區域（預設 `ap-northeast-1`，東京） |
| `S3_BUCKET_NAME` | S3 bucket 名稱（預設 `lenslog-photos`） |

## 相關資源

- [Pillow 官方文件](https://pillow.readthedocs.io/)
- [piexif 文件](https://piexif.readthedocs.io/)
- [boto3 S3 文件](https://boto3.amazonaws.com/v1/documentation/api/latest/reference/services/s3.html)
- [Presigned URLs 說明](https://docs.aws.amazon.com/AmazonS3/latest/userguide/PresignedUrlUploadObject.html)
- [Open-Meteo API](https://open-meteo.com/)
- [Sunrise-Sunset API](https://sunrise-sunset.org/api)
