# LensLog 技術文件索引

本目錄收錄 LensLog 專案所有主要技術的說明文件，按技術層分類。
每份文件包含：版本資訊、在專案中的角色、重要設定，以及官方參考資源。

---

## Backend

| 文件 | 說明 |
|---|---|
| [backend-fastapi.md](./backend-fastapi.md) | FastAPI 框架、路由結構、CORS、lifespan、部署設定 |
| [backend-sqlalchemy-alembic.md](./backend-sqlalchemy-alembic.md) | SQLAlchemy 2 asyncio ORM、資料模型、Alembic migration 工作流程 |
| [backend-postgresql-postgis.md](./backend-postgresql-postgis.md) | PostgreSQL 14 + PostGIS、資料表結構、Docker 設定 |
| [backend-redis-celery.md](./backend-redis-celery.md) | Redis broker、Celery 非同步任務（EXIF 解析、縮圖產生） |
| [backend-pydantic-auth.md](./backend-pydantic-auth.md) | Pydantic v2、pydantic-settings、JWT 雙 token 認證、bcrypt 密碼雜湊 |
| [backend-pillow-exif-s3.md](./backend-pillow-exif-s3.md) | Pillow 縮圖、piexif EXIF 解析、AWS S3 presigned URL 上傳流程、httpx 天氣 API |

---

## Web Frontend

| 文件 | 說明 |
|---|---|
| [frontend-react-vite.md](./frontend-react-vite.md) | React 18、Vite 5、應用程式入口、頁面結構、proxy 設定、建置流程 |
| [frontend-react-router.md](./frontend-react-router.md) | React Router v6、路由定義、SPA fallback 設定 |
| [frontend-tanstack-query.md](./frontend-tanstack-query.md) | TanStack Query v5、QueryClient 設定、共用 hooks、快取策略 |
| [frontend-zustand.md](./frontend-zustand.md) | Zustand Auth Store、storage adapter 注入模式、持久化策略 |
| [frontend-forms-validation.md](./frontend-forms-validation.md) | React Hook Form + Zod schema、跨平台共用驗證規則、前後端對應 |
| [frontend-leaflet-d3.md](./frontend-leaflet-d3.md) | Leaflet 互動地圖、MarkerCluster 聚合、D3.js 統計圖表 |
| [frontend-axios.md](./frontend-axios.md) | Axios API client 工廠、JWT interceptor、S3 直傳模式 |

---

## Mobile App

| 文件 | 說明 |
|---|---|
| [mobile-expo.md](./mobile-expo.md) | Expo SDK 51、app.json 設定、原生權限、expo-secure-store、NativeWind |
| [mobile-expo-router.md](./mobile-expo-router.md) | Expo Router v3、檔案系統路由、tab 群組、型別安全路由、@shared alias |
| [mobile-react-native.md](./mobile-react-native.md) | react-native-maps、safe-area-context、victory-native 圖表、相機與相片庫 |

---

## 共用套件

| 文件 | 說明 |
|---|---|
| [shared-package.md](./shared-package.md) | @lenslog/shared 架構、型別定義、Zod schema、API client 工廠、Zustand store 工廠、跨平台 alias 設定 |

---

## Infrastructure

| 文件 | 說明 |
|---|---|
| [infra-docker.md](./infra-docker.md) | Docker Compose 開發/生產設定、服務架構、volume 策略、建置流程 |
| [infra-nginx.md](./infra-nginx.md) | Nginx 反向代理、SPA fallback、API 代理、HTTPS 設定、靜態資源快取 |

---

## 工具與品質

| 文件 | 說明 |
|---|---|
| [tooling-typescript-eslint.md](./tooling-typescript-eslint.md) | TypeScript strict 模式、ESLint + react-hooks plugin、mypy、Ruff、Black |
| [tooling-testing.md](./tooling-testing.md) | pytest、pytest-asyncio、httpx AsyncClient、API 整合測試策略 |

---

## 技術架構概覽

```
                    ┌─────────────────────────────────┐
                    │        @lenslog/shared           │
                    │  Types / Zod / API Client /      │
                    │  Zustand Factory / RQ Hooks      │
                    └────────────┬────────────┬────────┘
                                 │            │
               ┌─────────────────┘            └──────────────────┐
               │                                                  │
  ┌────────────▼─────────────┐              ┌────────────────────▼──────┐
  │    Web (React + Vite)    │              │    Mobile (Expo + RN)     │
  │  React Router / Leaflet  │              │  Expo Router / RN Maps    │
  │  D3 / react-dropzone     │              │  NativeWind / victory-rn  │
  └────────────┬─────────────┘              └────────────────┬──────────┘
               │  /api/v1 (Vite proxy / Nginx)               │  EXPO_PUBLIC_API_URL
               └────────────────────┬────────────────────────┘
                                    │
               ┌────────────────────▼────────────────────────────┐
               │              FastAPI (Python 3.11)               │
               │     Pydantic v2 / JWT / Alembic / GeoAlchemy2   │
               └──────┬──────────────┬──────────────┬────────────┘
                      │              │              │
           ┌──────────▼──┐  ┌────────▼────┐  ┌────▼──────────┐
           │ PostgreSQL  │  │    Redis    │  │   AWS S3      │
           │  + PostGIS  │  │  + Celery   │  │ (photo store) │
           └─────────────┘  └─────────────┘  └───────────────┘
```

## 快速參考

### 開發環境啟動

```bash
# Backend + 前端
docker-compose up -d
docker-compose exec backend alembic upgrade head

# Mobile（另開終端）
cd mobile && npx expo start
```

### 常用埠號

| 服務 | 埠號 |
|---|---|
| Web 前端（Vite） | 5173 |
| FastAPI | 8000 |
| PostgreSQL | 5432 |
| Redis | 6379 |
