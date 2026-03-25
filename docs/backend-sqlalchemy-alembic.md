# SQLAlchemy & Alembic

## 版本

```
sqlalchemy[asyncio]>=2.0.30
asyncpg>=0.29.0
psycopg2-binary>=2.9.9
alembic>=1.13.0
geoalchemy2>=0.15.0
```

## 在此專案中的用途與角色

- **SQLAlchemy 2.x**：ORM 層，負責所有資料庫模型定義與查詢。使用 asyncio 模式搭配 `asyncpg` 驅動，達到全非同步的資料庫操作。
- **Alembic**：資料庫 schema 版本控制工具，管理所有 migration。
- **GeoAlchemy2**：SQLAlchemy 的地理空間延伸，配合 PostGIS 使用（目前模型使用 `Numeric` 儲存座標，GeoAlchemy2 為未來地理查詢預留）。
- **asyncpg**：非同步 PostgreSQL 驅動，由 SQLAlchemy asyncio engine 使用。
- **psycopg2-binary**：同步驅動，專供 Alembic migration 使用（Alembic 不支援 asyncpg）。

## 主要功能與特性說明

### 非同步引擎設定

位於 `backend/app/core/database.py`：

```python
engine = create_async_engine(
    settings.DATABASE_URL,  # postgresql+asyncpg://...
    echo=settings.DEBUG,    # DEBUG 模式下輸出 SQL
    pool_pre_ping=True,     # 每次從 pool 取出連線前先 ping，避免使用到已斷線的連線
)

AsyncSessionLocal = async_sessionmaker(
    engine,
    class_=AsyncSession,
    expire_on_commit=False,  # commit 後不讓 ORM 物件失效，避免 lazy load 問題
)
```

### 依賴注入 DB Session

`get_db` 作為 FastAPI `Depends()` 使用，每個請求取得獨立 session，並自動提交或回滾：

```python
async def get_db() -> AsyncSession:
    async with AsyncSessionLocal() as session:
        try:
            yield session
            await session.commit()
        except Exception:
            await session.rollback()
            raise
        finally:
            await session.close()
```

### 資料模型

模型定義於 `backend/app/models/models.py`，使用 SQLAlchemy 2.x 的 `Mapped` 型別標注風格：

| 模型 | 資料表 | 說明 |
|---|---|---|
| `User` | `users` | 使用者帳號，UUID 主鍵 |
| `Location` | `locations` | 拍攝景點，含經緯度 |
| `LocationTag` | `location_tags` | 景點標籤（複合主鍵） |
| `Photo` | `photos` | 照片記錄，參照 S3 key |
| `ExifData` | `exif_data` | EXIF 元資料，與 Photo 一對一 |
| `Gear` | `gear` | 攝影器材清單 |

所有主鍵均為 `UUID`，時間戳由 `server_default=func.now()` 在資料庫端產生。

### Alembic Migration

設定於 `backend/alembic/env.py`。因 Alembic 需要同步連線，故 DATABASE_URL 的驅動從 `asyncpg` 換成 `psycopg2`：

```python
config.set_main_option(
    "sqlalchemy.url",
    settings.DATABASE_URL.replace("+asyncpg", "+psycopg2")
)
```

常用指令：

```bash
# 套用所有 migration
docker-compose exec backend alembic upgrade head

# 建立新 migration（自動偵測模型變更）
docker-compose exec backend alembic revision --autogenerate -m "add_new_column"

# 回滾一個版本
docker-compose exec backend alembic downgrade -1
```

## 重要注意事項

- **不得手動修改資料庫 schema**，所有變更必須透過 Alembic migration。
- Migration 版本檔案位於 `backend/alembic/versions/`。
- `Base` 類別定義於 `database.py`，所有模型必須繼承它，Alembic 才能自動偵測。

## 相關資源

- [SQLAlchemy 2.0 asyncio 文件](https://docs.sqlalchemy.org/en/20/orm/extensions/asyncio.html)
- [Alembic 官方文件](https://alembic.sqlalchemy.org/)
- [GeoAlchemy2 文件](https://geoalchemy-2.readthedocs.io/)
