# PostgreSQL & PostGIS

## 版本

```
Docker Image: postgis/postgis:14-3.3
# PostgreSQL 14 + PostGIS 3.3
```

## 在此專案中的用途與角色

PostgreSQL 是 LensLog 的主要關聯式資料庫，儲存所有結構化資料，包含使用者、照片、景點與器材資訊。

PostGIS 是 PostgreSQL 的地理空間延伸套件，目前已預先安裝以支援未來的地理查詢功能（例如「找出距離我 X 公里內的拍攝景點」）。現有模型以 `Numeric(10, 7)` 儲存經緯度，待地理查詢需求明確後再遷移至 PostGIS 的 `geometry` 欄位型別。

## 主要功能與特性說明

- **UUID 主鍵**：所有資料表主鍵均使用 `UUID`，避免自增 ID 的可預測性與分散式問題。
- **CASCADE 刪除**：外鍵設定 `ondelete="CASCADE"`，確保刪除使用者時其照片、器材等資料同步清除。
- **時間戳自動產生**：`created_at` 欄位使用 `server_default=func.now()`，由資料庫端維護，避免應用層時區問題。
- **Connection Pooling**：SQLAlchemy asyncio engine 的 `pool_pre_ping=True` 確保連線健康。

## 資料庫設定

### Docker 開發環境

```yaml
# docker-compose.yml
db:
  image: postgis/postgis:14-3.3
  environment:
    POSTGRES_DB: lenslog
    POSTGRES_USER: postgres
    POSTGRES_PASSWORD: password
  ports:
    - "5432:5432"
  volumes:
    - postgres_data:/var/lib/postgresql/data
```

連線字串格式：

```
# 非同步（SQLAlchemy / FastAPI）
postgresql+asyncpg://postgres:password@db:5432/lenslog

# 同步（Alembic）
postgresql+psycopg2://postgres:password@db:5432/lenslog
```

### 健康檢查

Docker Compose 使用 `pg_isready` 確認 PostgreSQL 就緒後才啟動 backend：

```yaml
healthcheck:
  test: ["CMD-SHELL", "pg_isready -U postgres"]
  interval: 10s
  timeout: 5s
  retries: 5
```

### 生產環境

生產環境不暴露 5432 port，資料庫只在 Docker internal network 內可訪問：

```yaml
# docker-compose.prod.yml
db:
  image: postgis/postgis:14-3.3
  environment:
    POSTGRES_PASSWORD: ${DB_PASSWORD}  # 從環境變數注入，不寫死
```

## 資料表結構概覽

```
users
  ├── photos (user_id FK)
  │     └── exif_data (photo_id FK, 1:1)
  ├── locations (user_id FK)
  │     └── location_tags (location_id FK)
  └── gear (user_id FK)
```

## 相關資源

- [PostgreSQL 14 文件](https://www.postgresql.org/docs/14/)
- [PostGIS 文件](https://postgis.net/documentation/)
- [postgis/postgis Docker Image](https://hub.docker.com/r/postgis/postgis)
