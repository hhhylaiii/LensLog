# Redis & Celery

## 版本

```
# Redis
Docker Image: redis:7-alpine

# Python 套件
celery[redis]>=5.4.0
redis>=5.0.5
```

## 在此專案中的用途與角色

- **Redis**：作為 Celery 的 message broker 與 result backend，同時可作為快取層。
- **Celery**：非同步任務佇列，處理耗時的背景工作，避免阻塞 FastAPI 的請求處理。

主要背景任務（`backend/app/tasks/`）：
- `exif_tasks.process_exif_task`：從 S3-compatible storage 下載照片並解析 EXIF 元資料，存入資料庫
- `exif_tasks.generate_thumbnail_task`：產生照片縮圖並上傳至 S3-compatible storage
- `notification_tasks`：推播通知任務

## 主要功能與特性說明

### Celery App 初始化

位於 `backend/app/tasks/exif_tasks.py`：

```python
from celery import Celery
from app.core.config import settings

celery_app = Celery(
    "lenslog",
    broker=settings.REDIS_URL,   # redis://redis:6379/0
    backend=settings.REDIS_URL,  # 任務結果也存 Redis
)
```

### 非同步照片處理流程

1. 使用者透過前端上傳照片至 S3-compatible storage（直接 PUT，繞過後端）
2. 前端通知後端照片已上傳（POST `/api/v1/photos`）
3. 後端建立 Photo 記錄後，派發兩個 Celery 任務：
   - `process_exif_task`：解析 EXIF 並更新 `exif_data` 資料表
   - `generate_thumbnail_task`：產生縮圖並更新 Photo 的 `thumb_key`（800px 版本）

### 縮圖生成任務範例

```python
@celery_app.task(name="tasks.generate_thumbnail")
def generate_thumbnail_task(object_key: str, thumb_key: str, max_size: int = 800):
    # 從 storage 下載 → Pillow 縮圖 → 上傳回 storage
    img.thumbnail((max_size, max_size))
    img.save(buf, format="JPEG", quality=85)
```

## Docker 設定

### 開發環境

```yaml
# docker-compose.yml
redis:
  image: redis:7-alpine
  ports:
    - "6379:6379"
  healthcheck:
    test: ["CMD", "redis-cli", "ping"]

celery_worker:
  build: ./backend
  command: celery -A app.tasks.exif_tasks.celery_app worker --loglevel=info
  depends_on:
    - backend
    - redis
```

### 生產環境

生產環境開啟 4 個 worker 並行處理：

```bash
celery -A app.tasks.exif_tasks.celery_app worker --loglevel=info -c 4
```

## 啟動與監控

```bash
# 啟動 Celery worker（透過 Docker）
docker-compose up celery_worker

# 查看 worker 狀態
docker-compose exec celery_worker celery -A app.tasks.exif_tasks.celery_app inspect active

# 監控任務（需另外安裝 flower）
celery -A app.tasks.exif_tasks.celery_app flower
```

## 環境變數

| 變數 | 預設值 | 說明 |
|---|---|---|
| `REDIS_URL` | `redis://redis:6379/0` | Redis 連線字串（DB 0） |

## 相關資源

- [Celery 官方文件](https://docs.celeryq.dev/)
- [Redis 官方文件](https://redis.io/docs/)
- [Celery Redis broker 設定](https://docs.celeryq.dev/en/stable/getting-started/backends-and-brokers/redis.html)
