# FastAPI

## 版本

```
fastapi>=0.111.0
uvicorn[standard]>=0.30.0
gunicorn>=22.0.0
```

## 在此專案中的用途與角色

FastAPI 是 LensLog 的核心後端框架，負責處理所有 HTTP API 請求。它提供了 `/api/v1` 下的所有 RESTful 端點，並透過自動產生的 OpenAPI 文件（`/docs`、`/redoc`）方便前後端協作。

專案入口為 `backend/app/main.py`，透過 `create_app()` 工廠函式建立應用實例。

## 主要功能與特性說明

- **非同步優先**：所有 route handler 使用 `async def`，搭配 SQLAlchemy asyncio 引擎，全程非阻塞 I/O。
- **自動 API 文件**：`/docs`（Swagger UI）與 `/redoc` 在開發環境自動可用。
- **依賴注入**：使用 `Depends()` 注入資料庫 session（`get_db`）、認證等跨路由共用的依賴。
- **CORS 設定**：開發環境允許 `http://localhost:5173`（Vite）與 `http://localhost:3000`。
- **Lifespan 管理**：透過 `@asynccontextmanager` 的 `lifespan` 處理啟動/關閉事件。

## 路由結構

路由以 `APIRouter` 分模組管理，統一掛載於 `/api/v1` 前綴：

| Router 模組 | 前綴 | 功能 |
|---|---|---|
| `app/api/v1/auth.py` | `/api/v1/auth` | 使用者登入、註冊、token 刷新 |
| `app/api/v1/photos.py` | `/api/v1/photos` | 照片 CRUD、S3 presign |
| `app/api/v1/locations.py` | `/api/v1/locations` | 拍攝景點管理 |
| `app/api/v1/gear.py` | `/api/v1/gear` | 攝影器材管理 |
| `app/api/v1/stats.py` | `/api/v1/stats` | 個人拍攝統計資料 |

## 基本使用方式與重要設定

### 開發啟動

```bash
# Docker（推薦，含 hot-reload）
docker-compose up backend

# 或直接在本機
cd backend
uvicorn app.main:app --host 0.0.0.0 --port 8000 --reload
```

### 健康檢查端點

```
GET /health
# 回傳：{"status": "ok", "app": "LensLog"}
```

### 生產部署

生產環境使用 Gunicorn 管理 Uvicorn workers：

```bash
gunicorn app.main:app -k uvicorn.workers.UvicornWorker --workers 4
```

### 環境變數

設定位於 `backend/app/core/config.py`（`pydantic-settings`），從 `backend/.env` 讀取。關鍵變數：

| 變數 | 預設值 | 說明 |
|---|---|---|
| `DATABASE_URL` | `postgresql+asyncpg://...` | 非同步 DB 連線字串 |
| `SECRET_KEY` | `change-me-in-production` | JWT 簽署金鑰（**生產必須更換**） |
| `REDIS_URL` | `redis://redis:6379/0` | Celery broker / backend |
| `S3_BUCKET_NAME` | `lenslog-photos` | 照片儲存 S3 bucket |

## 相關資源

- [FastAPI 官方文件](https://fastapi.tiangolo.com/)
- [Uvicorn 官方文件](https://www.uvicorn.org/)
- [Gunicorn 官方文件](https://gunicorn.org/)
