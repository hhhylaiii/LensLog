# Docker & Docker Compose

## 版本

```yaml
# 使用的 Docker Image
node:20-alpine          # Frontend 建置與開發
postgis/postgis:14-3.3  # PostgreSQL 14 + PostGIS 3.3
redis:7-alpine          # Redis 7
nginx:alpine            # Nginx（生產環境）
```

## 在此專案中的用途與角色

Docker Compose 管理 LensLog 的所有基礎設施服務，提供開發與生產兩套設定：

- `docker-compose.yml`：本機開發環境（含 hot-reload）
- `docker-compose.prod.yml`：生產環境（靜態建置 + Nginx）

**Mobile App（Expo）不在 Docker 環境中**，需在本機直接執行。

## 開發環境服務（`docker-compose.yml`）

| 服務 | Container 名稱 | Port | 說明 |
|---|---|---|---|
| `db` | `lenslog_db` | 5432 | PostgreSQL + PostGIS |
| `redis` | `lenslog_redis` | 6379 | Redis |
| `backend` | `lenslog_backend` | 8000 | FastAPI（`--reload`） |
| `celery_worker` | `lenslog_celery` | - | Celery worker |
| `frontend` | `lenslog_frontend` | 5173 | Vite dev server |

### 健康檢查與依賴順序

```
db (healthy) ─┐
               ├→ backend ─→ celery_worker
redis (healthy)┘

frontend（獨立啟動，不依賴 backend）
```

### 開發快速啟動

```bash
# 啟動所有服務
docker-compose up -d

# 套用資料庫 migration
docker-compose exec backend alembic upgrade head

# 查看服務狀態
docker-compose ps

# 查看 backend 日誌
docker-compose logs -f backend
```

### 開發環境存取

| 服務 | URL |
|---|---|
| Web 前端 | http://localhost:5173 |
| FastAPI | http://localhost:8000 |
| API 文件（Swagger） | http://localhost:8000/docs |
| API 文件（ReDoc） | http://localhost:8000/redoc |

## 前端 Volume 策略

```yaml
frontend:
  volumes:
    - .:/app                              # 掛載整個 repo root（讓 @shared alias 可以存取 ../shared）
    - frontend_node_modules:/app/frontend/node_modules  # 隔離 node_modules（避免 host/container 衝突）
    - shared_node_modules:/app/shared/node_modules
```

Volume 隔離是必要的，因為 host（WSL/Linux/macOS）的 node_modules 與 container（Alpine Linux）的不相容。

## 生產環境架構（`docker-compose.prod.yml`）

```
Internet
    │
  443/80
    │
 [Nginx]
    ├── /api/* → [FastAPI backend:8000]
    └── /* → 靜態 SPA 檔案（frontend dist）
              │
              [Celery Worker] ← [Redis]
                    │
               [PostgreSQL]
```

### 生產建置流程

```bash
# 1. 建置 React SPA（one-shot container）
docker-compose -f docker-compose.prod.yml --profile build up frontend_build

# 2. 啟動所有服務
docker-compose -f docker-compose.prod.yml up -d

# 3. 套用 migration
docker-compose -f docker-compose.prod.yml exec backend alembic upgrade head
```

### 生產環境差異

| 項目 | 開發 | 生產 |
|---|---|---|
| 前端服務 | Vite dev server（port 5173） | Nginx 靜態服務 |
| DB/Redis port | 對外暴露（5432、6379） | 僅在 Docker 內部網路 |
| 密碼設定 | 硬碼預設值 | `${DB_PASSWORD}` 環境變數 |
| Celery worker 數 | 1 | 4（`-c 4`） |
| HTTPS | 無 | SSL 憑證（`/etc/nginx/certs/`） |

## 環境變數注入

Backend 透過 `env_file: ./backend/.env` 注入，關鍵生產變數：

```bash
SECRET_KEY=<隨機產生的高熵字串>
DATABASE_URL=postgresql+asyncpg://postgres:${DB_PASSWORD}@db:5432/lenslog
REDIS_URL=redis://redis:6379/0
STORAGE_ENDPOINT_URL=<空字串=AWS S3；或填 MinIO/R2 endpoint>
STORAGE_PUBLIC_URL=<瀏覽器可達的 storage URL>
STORAGE_ACCESS_KEY=<Storage access key>
STORAGE_SECRET_KEY=<Storage secret key>
STORAGE_BUCKET_NAME=<Bucket name>
STORAGE_REGION=<Region>
```

## 相關資源

- [Docker Compose 文件](https://docs.docker.com/compose/)
- [postgis/postgis Docker Image](https://hub.docker.com/r/postgis/postgis)
- [redis:alpine Docker Image](https://hub.docker.com/_/redis)
- [nginx:alpine Docker Image](https://hub.docker.com/_/nginx)
