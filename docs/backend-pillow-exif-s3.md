# Pillow、piexif 與 S3-compatible Storage (boto3)

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
- **boto3**：AWS SDK for Python，用於操作 S3-compatible 儲存服務（MinIO / Cloudflare R2 / AWS S3）。
- **httpx**：非同步 HTTP 客戶端，用於呼叫外部 API（CWA F-D0047-091 天氣預報、Sunrise-Sunset）。

## 照片上傳流程（Presigned URL 模式）

LensLog 採用「前端直傳 S3」的架構，後端不需要中轉圖片資料流：

```
1. 前端請求 presigned URL
   GET/POST /api/v1/photos/presign?filename=IMG_001.jpg&content_type=image/jpeg
   → 後端產生 presigned PUT URL（有效期 1 小時）

2. 前端直接 PUT 圖片到 storage
   PUT https://lenslog-photos.s3.ap-northeast-1.amazonaws.com/photos/{uuid}/IMG_001.jpg

3. 前端通知後端照片已上傳
   POST /api/v1/photos
   body: { s3_key, caption, location_id, is_public }

4. 後端派發 Celery 任務
   - process_exif_task(photo_id, object_key)   → 解析 EXIF
   - generate_thumbnail_task(object_key, thumb_key, max_size) → 產生縮圖
```

## Storage 服務（`backend/app/services/storage_service.py`）

```python
# 產生 Presigned URL（前端直傳用）
def generate_presigned_url(key: str, expiration: int = 3600, content_type: str | None = None) -> str:
    # Params 會把 ContentType 納入簽名，避免瀏覽器 PUT 時 header 不一致導致 403
    ...

# 取得物件的公開 URL（本機 MinIO / R2 / AWS S3）
def get_object_url(key: str) -> str:
    ...
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
# CWA F-D0047-091：取得鄉鎮 7 天天氣預報（溫度、降雨機率、風速）
async def get_weather_forecast(county_name: str) -> list[dict]: ...

# Sunrise-Sunset API：取得日出日落時間
async def get_sunrise_sunset(lat: float, lng: float, date: str = None) -> dict: ...
```

## AWS 環境變數

| 變數 | 說明 |
|---|---|
| `STORAGE_ENDPOINT_URL` | S3-compatible endpoint（空字串 = AWS S3；MinIO/R2 需填） |
| `STORAGE_PUBLIC_URL` | 對瀏覽器可達的公開網址（MinIO 本機通常是 `http://localhost:9000`） |
| `STORAGE_ACCESS_KEY` | Access key |
| `STORAGE_SECRET_KEY` | Secret key |
| `STORAGE_BUCKET_NAME` | Bucket 名稱 |
| `STORAGE_REGION` | Region（AWS S3 會用到；MinIO/R2 多半不嚴格） |

## 相關資源

- [Pillow 官方文件](https://pillow.readthedocs.io/)
- [piexif 文件](https://piexif.readthedocs.io/)
- [boto3 S3 文件](https://boto3.amazonaws.com/v1/documentation/api/latest/reference/services/s3.html)
- [Presigned URLs 說明](https://docs.aws.amazon.com/AmazonS3/latest/userguide/PresignedUrlUploadObject.html)
- [CWA 開放資料平臺](https://opendata.cwa.gov.tw)
- [Sunrise-Sunset API](https://sunrise-sunset.org/api)
