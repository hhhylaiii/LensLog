# LensLog - 攝影走讀與器材管理社群平台

## 核心概念

打造一個專屬攝影玩家的數位基地。整合「**私房景點地圖**」、「**器材數位防潮箱**」以及「**個人拍攝習慣視覺化**」三大核心，讓不管是拍風景、街貓，還是人像棚拍的使用者，都能輕鬆記錄與分享。

> **平台策略：Web + App 雙平台，完全獨立可分開展示**
> - **Web**（React + Vite）：功能完整的響應式網頁，適合桌機與平板使用
> - **App**（Expo + React Native）：原生 iOS / Android App，整合手機相機與系統通知
> - **Shared**（`@lenslog/shared`）：平台無關的共用模組，包含 TypeScript 型別、API client factory、Zustand store、Zod schema 與 React Query hooks；Web 和 App 各自建立自己的 API 實例，token 儲存則透過 Storage Adapter Pattern 抽換（Web 用 `localStorage`，App 用 `expo-secure-store`）
>
> **Web 與 App 完全獨立**：`docker-compose up` 只啟動後端與 Web 前端（PostgreSQL、Redis、FastAPI、React），不需要 Node.js 或 Expo。App 以 `npx expo start` 單獨啟動，透過 `EXPO_PUBLIC_API_URL` 指向後端，不影響 Web 的任何運作。兩者可分開開發、分開展示。

---

## 一、團隊分工（共 7 人）

在三個月的開發期內，確保每個人都有明確的守備範圍：

| 角色 | 人數 | 職責 |
|------|:----:|------|
| **專案經理 / QA** | 1 | 掌控開發時程（Sprint）、撰寫測試案例、確保各功能模組順利對接 |
| **UI/UX 設計師** | 1 | 負責 Wireframe、Figma 視覺設計，確保 App/Web 的操作動線符合直覺 |
| **前端工程師** | 2 | 負責串接地圖 API、開發響應式網頁介面，以及處理照片上傳與前端圖表渲染 |
| **後端工程師** | 2 | 負責會員系統、照片 EXIF 資訊解析、資料庫 CRUD 操作與伺服器邏輯 |
| **資料 / 地理資訊工程師** | 1 | 專注於地理空間資料庫（Spatial Database）的建置、地點搜尋演算法，以及整合天氣與日照 API |

---

## 二、核心功能與使用流程

### 核心功能

#### 攝影地圖探索（Photo Map）

結合 Google Maps 或 Mapbox，使用者可以標註拍攝地點（可加上「百萬夜景」、「街貓聚集地」、「適合 Cosplay 取景」等自訂標籤），並附上實景照片與拍攝參數。

- 地點標記支援自訂標籤與分類過濾
- 顯示該地點所有攝影師作品縮圖（含 EXIF 資訊）
- 整合即時天氣與日落時間（Open-Meteo / Sunrise-Sunset API）
- 地理搜尋：「找我附近 5 公里內的拍攝景點」（PostGIS ST_DWithin）
- Marker Clustering：地圖縮放時自動聚合附近景點

#### 數位器材庫（Gear Vault）

建立個人的器材清單

- 器材類型分類：機身、鏡頭、閃燈、腳架、濾鏡、記憶卡
- 保養提醒（自訂週期，Email 通知）
- 快門數追蹤（機身使用壽命估算）
- 與照片 EXIF 的鏡頭焦段自動比對關聯

#### 拍攝數據儀表板（Photography Stats）

系統自動讀取上傳照片的 EXIF 資訊（快門、光圈、ISO、焦段），並轉化為精美的視覺化圖表，讓使用者了解自己的拍攝習慣。

- 最常使用焦段長條圖
- 光圈偏好分佈圓餅圖
- ISO 使用趨勢折線圖（依時間）
- 拍攝地點熱力地圖（Heatmap）
- 月度拍攝量統計

### 使用流程（User Flow）

#### 情境一：尋找靈感與出發前準備

1. 登入 LensLog 平台。
2. 打開「攝影地圖」，過濾出週末想去的「風景」地標。
3. 點擊地標查看其他攝影師的作品，系統自動顯示該地點當下的天氣狀況與日落時間。

#### 情境二：拍攝後的記錄與回顧

1. 拍攝結束後，將精選照片上傳至平台。
2. 系統自動解析照片 EXIF 數據，並詢問：「這張是用清單中的 56mm f/1.4 鏡頭拍攝的嗎？」
3. 確認後照片發布至個人主頁，並同步更新使用者的「數據儀表板」（例如本月最常使用的焦段長條圖）。

---

## 三、系統架構

### 整體架構圖

```
┌──────────────────────────┐   ┌──────────────────────────────┐
│      🌐 Web 用戶端        │   │      📱 App 用戶端             │
│  React.js + TypeScript   │   │  Expo + React Native          │
│  (Vite, Leaflet, D3.js)  │   │  (react-native-maps, Victory) │
└────────────┬─────────────┘   └──────────────┬───────────────┘
             │                                │
             └──────────┬─────────────────────┘
                        │ HTTPS / REST API
                        ▼
┌─────────────────────────────────────────────────────────────┐
│                      Nginx（反向代理）                        │
│              SSL 終止  │  靜態資源服務  │  負載均衡           │
└──────────┬────────────────────────────────┬─────────────────┘
           │                                │
           ▼                                ▼
┌──────────────────────┐        ┌──────────────────────────┐
│   FastAPI Application│        │   Celery Worker（非同步） │
│   (Gunicorn + Uvicorn│        │   - EXIF 解析            │
│   4 workers)         │        │   - 照片縮圖生成          │
│                      │        │   - Email / Push 通知     │
│   /api/v1/           │        │   - 統計資料預計算         │
│   ├── auth           │        └──────────┬───────────────┘
│   ├── photos         │                   │
│   ├── locations      │        ┌──────────▼───────────────┐
│   ├── gear           │        │       Redis               │
│   └── stats          │        │   - Celery Broker         │
└──────────┬───────────┘        │   - API 快取              │
           │                    └──────────────────────────┘
           ▼
┌──────────────────────────────────────────────────────────┐
│              PostgreSQL 14 + PostGIS 3                    │
│   users │ photos │ locations │ gear │ tags │ exif_data    │
└──────────────────────────────────────────────────────────┘

┌──────────────────────────────────────────────────────────┐
│                     雲端儲存 / 外部服務                    │
│   AWS S3（原圖 + 縮圖）  │  CloudFront CDN（圖片加速）    │
│   Open-Meteo API（天氣） │  Sunrise-Sunset API（日落）    │
│   Expo Push Notification Service（App 推播通知）           │
└──────────────────────────────────────────────────────────┘
```

### 照片上傳流程（繞過後端，直傳 S3）

```
前端                後端 FastAPI              AWS S3
 │                       │                      │
 │── POST /photos/presign ──>                   │
 │                       │── 產生 Presigned URL ─>
 │<── 回傳 presigned_url ──│                    │
 │                       │                      │
 │──────── PUT 原始照片 ──────────────────────>  │
 │<──────────── 200 OK ───────────────────────  │
 │                       │                      │
 │── POST /photos (metadata) ──>               │
 │                       │── 推送 Celery Task ──>
 │<── 201 Created ────── │    (EXIF解析、縮圖)   │
```

> 照片直接從前端上傳 S3（Presigned URL），後端只處理 metadata，避免大檔案佔用 API server 資源。

---

## 四、技術選型詳細說明

### 前端 Web（Frontend Web）

| 項目 | 技術選型 | 說明 |
|------|----------|------|
| **語言 / 框架** | React.js 18 + TypeScript | 確保大型團隊協作的程式碼穩定度，搭配 Vite 加速開發 |
| **狀態管理** | Zustand | 輕量，適合中型專案；避免 Redux 的樣板程式碼 |
| **路由** | React Router v6 | 標準 SPA 路由方案 |
| **地圖整合** | Leaflet.js + React-Leaflet | 開源免費；若需更豐富樣式可升級 Mapbox GL JS |
| **Marker 聚合** | Leaflet.markercluster | 地圖有大量標記時自動分群，避免效能問題 |
| **資料視覺化** | D3.js | 客製化光圈分佈圓餅圖、焦段長條圖、ISO 趨勢折線圖 |
| **UI 元件庫** | shadcn/ui + Tailwind CSS | 快速建立一致的設計系統 |
| **HTTP 請求** | Axios + React Query | React Query 負責快取、loading/error 狀態管理 |
| **照片上傳** | react-dropzone | 拖曳上傳介面，支援多檔上傳與進度條 |
| **表單驗證** | React Hook Form + Zod | 型別安全的表單驗證 |

### 前端 App（Frontend Mobile）

| 項目 | 技術選型 | 說明 |
|------|----------|------|
| **語言 / 框架** | Expo + React Native + TypeScript | 一份程式碼同時建置 iOS / Android 原生 App |
| **路由** | Expo Router (File-based) | 類 Next.js 的檔案路由，支援 Deep Linking |
| **狀態管理** | Zustand | **與 Web 共用**，無縫共享認證與快取狀態 |
| **HTTP 請求** | Axios + React Query | **與 Web 共用**同一套 API 封裝模組 |
| **地圖整合** | react-native-maps | 原生地圖元件，整合 Google Maps / Apple Maps |
| **資料視覺化** | Victory Native | React Native 相容的圖表庫，取代 D3.js |
| **相機 / 照片** | expo-image-picker + expo-camera | 直接呼叫手機相機拍攝，並讀取 EXIF metadata |
| **推播通知** | Expo Push Notifications | 器材保養提醒直接推播到手機 |
| **表單驗證** | React Hook Form + Zod | **與 Web 共用**同一套 schema 驗證 |
| **UI 元件庫** | NativeWind (Tailwind for RN) | 與 Web 風格一致的設計語言 |

### 後端（Backend）

| 項目 | 技術選型 | 說明 |
|------|----------|------|
| **語言 / 框架** | Python 3.11 + FastAPI | 高效能非同步框架，自動產生 OpenAPI 文件 |
| **ASGI 伺服器** | Uvicorn + Gunicorn | 多 worker 部署，生產環境穩定 |
| **ORM** | SQLAlchemy 2.0 + Alembic | Alembic 管理資料庫 migration |
| **資料驗證** | Pydantic v2 | Request / Response schema 定義與驗證 |
| **認證** | JWT（python-jose）+ OAuth2 | Access Token（15 分鐘）+ Refresh Token（7 天） |
| **密碼雜湊** | bcrypt（passlib） | 安全儲存使用者密碼 |
| **EXIF 解析** | Pillow + piexif | 讀取照片快門、光圈、ISO、GPS 座標等 metadata |
| **非同步任務** | Celery + Redis | EXIF 解析、縮圖生成、統計預計算、Email 排程 |
| **Email 通知** | FastAPI-Mail + SMTP | 器材保養提醒、帳號驗證信 |
| **S3 整合** | boto3 | 產生 Presigned URL、管理儲存桶 |
| **地理空間** | GeoAlchemy2 | SQLAlchemy 的 PostGIS 擴充，支援地理查詢 |
| **測試** | pytest + pytest-asyncio | 單元測試 + 整合測試（使用真實測試資料庫）|
| **程式碼品質** | Ruff + Black + mypy | Linting、格式化、靜態型別檢查 |

### 資料庫與儲存（Database & Storage）

| 項目 | 技術選型 | 說明 |
|------|----------|------|
| **主資料庫** | PostgreSQL 14 + PostGIS 3 | 地理空間查詢（ST_DWithin、ST_Distance）|
| **快取 / Broker** | Redis 7 | API 快取（熱門景點）、Celery 任務佇列 |
| **物件儲存** | AWS S3 | 原始照片、壓縮縮圖（800px、400px）|
| **CDN** | AWS CloudFront | 全球圖片加速，降低 S3 頻寬成本 |
| **搜尋** | PostgreSQL Full-Text Search | 景點名稱、標籤模糊搜尋（初期不需引入 Elasticsearch）|

### 部署與基礎設施（Infrastructure）

| 項目 | 技術選型 | 說明 |
|------|----------|------|
| **容器化** | Docker + Docker Compose | 開發環境一致性，生產環境隔離 |
| **CI/CD** | GitHub Actions | 自動跑測試、Lint，通過後自動部署 |
| **雲端平台** | AWS EC2 / Railway / Render | 初期可用 Railway/Render 降低維運成本 |
| **反向代理** | Nginx | SSL 終止、靜態資源、API 代理 |
| **SSL 憑證** | Let's Encrypt (Certbot) | 免費 HTTPS 憑證，自動續約 |
| **監控** | Sentry（錯誤追蹤）+ UptimeRobot（可用性）| 生產環境錯誤即時通知 |
| **環境變數** | python-dotenv / .env 檔案 | 區分 development / production 設定 |

---

## 五、資料庫結構（Schema）

```sql
-- 使用者
CREATE TABLE users (
    id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    username    VARCHAR(50) UNIQUE NOT NULL,
    email       VARCHAR(255) UNIQUE NOT NULL,
    password_hash VARCHAR(255) NOT NULL,
    avatar_url  TEXT,
    bio         TEXT,
    created_at  TIMESTAMPTZ DEFAULT NOW()
);

-- 拍攝景點
CREATE TABLE locations (
    id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id     UUID REFERENCES users(id) ON DELETE CASCADE,
    name        VARCHAR(200) NOT NULL,
    description TEXT,
    geom        GEOGRAPHY(POINT, 4326) NOT NULL,  -- PostGIS 地理座標
    created_at  TIMESTAMPTZ DEFAULT NOW()
);
CREATE INDEX idx_locations_geom ON locations USING GIST(geom);

-- 景點標籤
CREATE TABLE location_tags (
    location_id UUID REFERENCES locations(id) ON DELETE CASCADE,
    tag         VARCHAR(50) NOT NULL,
    PRIMARY KEY (location_id, tag)
);

-- 照片
CREATE TABLE photos (
    id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id     UUID REFERENCES users(id) ON DELETE CASCADE,
    location_id UUID REFERENCES locations(id) ON DELETE SET NULL,
    s3_key      TEXT NOT NULL,           -- 原始圖 S3 路徑
    thumb_key   TEXT,                    -- 縮圖 S3 路徑
    caption     TEXT,
    is_public   BOOLEAN DEFAULT TRUE,
    taken_at    TIMESTAMPTZ,             -- 從 EXIF 讀取
    created_at  TIMESTAMPTZ DEFAULT NOW()
);

-- EXIF 資料
CREATE TABLE exif_data (
    photo_id        UUID PRIMARY KEY REFERENCES photos(id) ON DELETE CASCADE,
    make            VARCHAR(100),        -- 相機品牌
    model           VARCHAR(100),        -- 相機型號
    lens_model      VARCHAR(200),        -- 鏡頭型號
    focal_length    NUMERIC(6,2),        -- 焦段 mm
    focal_length_35 NUMERIC(6,2),        -- 等效焦段
    aperture        NUMERIC(5,2),        -- 光圈值 f/x
    shutter_speed   VARCHAR(20),         -- 快門速度（如 1/500）
    iso             INTEGER,
    gps_lat         NUMERIC(10,7),
    gps_lng         NUMERIC(10,7),
    width           INTEGER,
    height          INTEGER
);

-- 器材
CREATE TABLE gear (
    id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id         UUID REFERENCES users(id) ON DELETE CASCADE,
    type            VARCHAR(50) NOT NULL,   -- body / lens / flash / tripod / filter / memory_card
    brand           VARCHAR(100),
    model           VARCHAR(200) NOT NULL,
    serial_number   VARCHAR(100),
    purchase_date   DATE,
    notes           TEXT,
    maintenance_interval_days INTEGER,      -- 保養提醒週期
    last_maintained DATE,
    created_at      TIMESTAMPTZ DEFAULT NOW()
);
```

---

## 六、API 設計（RESTful）

所有 API 基底路徑：`/api/v1`

### 認證（Auth）

| Method | Endpoint | 說明 |
|--------|----------|------|
| POST | `/auth/register` | 註冊新帳號 |
| POST | `/auth/login` | 登入，回傳 JWT |
| POST | `/auth/refresh` | 刷新 Access Token |
| POST | `/auth/logout` | 登出（廢棄 Refresh Token）|

### 照片（Photos）

| Method | Endpoint | 說明 |
|--------|----------|------|
| GET | `/photos` | 取得公開照片列表（分頁）|
| POST | `/photos/presign` | 取得 S3 Presigned URL |
| POST | `/photos` | 建立照片 metadata |
| GET | `/photos/{id}` | 取得單張照片詳情（含 EXIF）|
| PATCH | `/photos/{id}` | 更新照片說明 / 地點 |
| DELETE | `/photos/{id}` | 刪除照片 |

### 景點（Locations）

| Method | Endpoint | 說明 |
|--------|----------|------|
| GET | `/locations` | 取得景點列表，支援 `?lat=&lng=&radius=` 地理篩選 |
| POST | `/locations` | 新增景點 |
| GET | `/locations/{id}` | 取得景點詳情（含照片、天氣）|
| PATCH | `/locations/{id}` | 更新景點資訊 |
| DELETE | `/locations/{id}` | 刪除景點 |
| GET | `/locations/{id}/weather` | 取得景點即時天氣與日落時間 |

### 器材（Gear）

| Method | Endpoint | 說明 |
|--------|----------|------|
| GET | `/gear` | 取得個人器材清單 |
| POST | `/gear` | 新增器材 |
| GET | `/gear/{id}` | 取得單筆器材詳情 |
| PATCH | `/gear/{id}` | 更新器材資訊 |
| DELETE | `/gear/{id}` | 刪除器材 |
| POST | `/gear/{id}/maintain` | 記錄保養日期 |

### 統計（Stats）

| Method | Endpoint | 說明 |
|--------|----------|------|
| GET | `/stats/me` | 個人完整拍攝統計 |
| GET | `/stats/me/focal-length` | 焦段使用分佈 |
| GET | `/stats/me/aperture` | 光圈使用分佈 |
| GET | `/stats/me/iso` | ISO 趨勢 |
| GET | `/stats/me/monthly` | 月度拍攝量 |

---

## 七、專案目錄結構

```
lenslog/
├── shared/                      # @lenslog/shared — 平台無關共用模組（npm workspaces 套件）
│   ├── src/
│   │   ├── api/
│   │   │   ├── client.ts        # API client factory（各平台傳入自己的 token getter/setter）
│   │   │   └── services.ts      # 各資源的 API 方法（photos、locations、gear、stats）
│   │   ├── stores/
│   │   │   └── authStore.ts     # Zustand auth store（Storage Adapter Pattern，平台注入儲存實作）
│   │   ├── types/
│   │   │   └── index.ts         # TypeScript 型別定義（對應後端 Pydantic schema）
│   │   ├── schemas/
│   │   │   └── index.ts         # Zod 驗證 schema（表單與 API 回應驗證）
│   │   ├── hooks/               # React Query hooks（接受 api 物件為參數，Web / App 通用）
│   │   │   ├── usePhotos.ts
│   │   │   ├── useLocations.ts
│   │   │   ├── useGear.ts
│   │   │   └── useStats.ts
│   │   └── index.ts             # 統一 re-export 入口
│   ├── tsconfig.json
│   └── package.json             # name: "@lenslog/shared"
│
├── frontend/                    # Web — React + TypeScript (Vite)
│   ├── src/
│   │   ├── api/
│   │   │   └── index.ts         # 建立 Web 專用 API 實例（注入 localStorage token 操作）
│   │   ├── stores/
│   │   │   └── authStore.ts     # 初始化 Zustand store（注入 localStorage adapter）
│   │   ├── types/
│   │   │   └── index.ts         # Web 專用型別（若有需要，大多重新 export @lenslog/shared）
│   │   ├── components/          # Web 專用 UI 元件
│   │   │   ├── Map/             # Leaflet 地圖元件
│   │   │   ├── PhotoUpload/     # react-dropzone 上傳元件
│   │   │   └── Charts/          # D3.js 圖表元件
│   │   └── pages/               # 頁面元件
│   │       ├── MapExplore.tsx
│   │       ├── GearVault.tsx
│   │       └── Dashboard.tsx
│   ├── public/
│   ├── vite.config.ts           # 設定 @shared 路徑別名指向 shared/src
│   ├── tsconfig.json
│   └── package.json
│
├── mobile/                      # App — Expo + React Native（獨立啟動，不進 Docker）
│   ├── app/                     # Expo Router 頁面（File-based routing）
│   │   ├── (tabs)/
│   │   │   ├── _layout.tsx
│   │   │   ├── map.tsx          # 地圖探索（react-native-maps）
│   │   │   ├── gear.tsx         # 數位器材庫
│   │   │   └── stats.tsx        # 拍攝儀表板（Victory Native）
│   │   ├── auth/
│   │   │   ├── _layout.tsx
│   │   │   ├── login.tsx
│   │   │   └── register.tsx
│   │   └── _layout.tsx
│   ├── components/              # App 專用原生 UI 元件
│   │   ├── CameraCapture/       # expo-camera 相機元件
│   │   └── NativeMap/           # react-native-maps 封裝
│   ├── src/
│   │   ├── api/
│   │   │   └── index.ts         # 建立 App 專用 API 實例（注入 expo-secure-store token 操作）
│   │   └── store/
│   │       ├── authStore.ts     # 初始化 Zustand store（注入 SecureStore adapter）
│   │       └── authStorage.ts   # expo-secure-store 封裝
│   ├── app.json                 # Expo 設定
│   ├── babel.config.js          # 設定 @shared 路徑別名（babel-plugin-module-resolver）
│   ├── tsconfig.json
│   └── package.json
│
├── backend/                     # Python FastAPI（Web / App 共用後端）
│   ├── app/
│   │   ├── api/
│   │   │   └── v1/
│   │   │       ├── auth.py
│   │   │       ├── photos.py
│   │   │       ├── locations.py
│   │   │       ├── gear.py
│   │   │       └── stats.py
│   │   ├── core/
│   │   │   ├── config.py        # 環境變數設定
│   │   │   ├── security.py      # JWT 工具
│   │   │   └── database.py      # DB 連線
│   │   ├── models/              # SQLAlchemy ORM 模型
│   │   ├── schemas/             # Pydantic Request/Response 模型
│   │   ├── services/            # 商業邏輯
│   │   │   ├── exif_service.py
│   │   │   ├── s3_service.py
│   │   │   └── weather_service.py
│   │   ├── tasks/               # Celery 非同步任務
│   │   │   ├── exif_tasks.py
│   │   │   └── notification_tasks.py
│   │   └── main.py
│   ├── alembic/                 # 資料庫 migration
│   ├── tests/
│   ├── requirements.txt
│   └── Dockerfile
│
├── nginx/
│   └── nginx.conf               # 生產環境 Nginx 反向代理設定（SSL 終止、靜態資源、API 代理）
│
├── docker-compose.yml           # 本地開發：PostgreSQL + Redis + FastAPI + React（不含 mobile）
├── docker-compose.prod.yml      # 生產環境：frontend build + Nginx + 後端服務
└── .github/
    └── workflows/
        └── ci.yml               # GitHub Actions CI/CD
```

---

## 八、開發環境建置

### 前置需求

- Docker（啟動 PostgreSQL + Redis 必要）
- Node.js 20+（前端與 `shared/` 套件必要）
- Python 3.11+（後端本機開發）
- [uv](https://github.com/astral-sh/uv)（Python 套件管理，`pip install uv` 或 `curl -LsSf https://astral.sh/uv/install.sh | sh`）
- iOS 模擬器（Xcode）或 Android 模擬器（Android Studio），或 Expo Go App（App 開發用）

> **Web 與 App 完全獨立**：只想跑 Web 只需要 Docker + Node.js + Python；只想跑 App 只需要 Node.js 與後端 URL。兩者不互相依賴。

### 快速啟動（本機開發，推薦）

Docker 只用來跑 PostgreSQL 和 Redis，後端與前端在本機直接執行，方便 debug 與快速迭代。

```bash
# 1. Clone 專案
git clone https://github.com/your-org/lenslog.git
cd lenslog

# 2. 啟動資料庫與 Redis（只需 Docker 跑 DB/Redis）
docker compose up -d db redis

# 3. 後端：建立虛擬環境並安裝套件
cd backend
python3 -m venv .venv
.venv/bin/pip install -r requirements.txt
# 或使用 uv（更快）：uv venv && uv pip install -r requirements.txt

# 4. 後端：設定環境變數
cp .env.example .env
# .env 預設值已設定好，直接使用即可（DATABASE_URL 指向 localhost:5432）

# 5. 執行資料庫 migration
.venv/bin/alembic upgrade head

# 6. 啟動後端 API server
.venv/bin/uvicorn app.main:app --reload
# API：http://localhost:8000
# Swagger 文件：http://localhost:8000/docs

# --- 開新終端機視窗 ---

# 7. 前端：安裝套件並啟動
cd ../frontend
npm install
npm run dev
# 前端：http://localhost:5173
```

> **注意事項**
> - `docker compose`（有空格）為新版指令，舊版 `docker-compose` 已棄用
> - `bcrypt` 已在 `requirements.txt` 鎖定 4.0.1，直接安裝即可，無需手動指定版本

### 管理員帳號設定

首次啟動後，需手動將特定帳號設為管理員：

```bash
# 將指定 email 設為管理員
docker exec lenslog_db psql -U postgres -d lenslog \
  -c "UPDATE users SET is_admin=true WHERE email='你的email@example.com';"
```

管理員登入後，側邊欄會出現 **Admin** 連結，可進入 `/admin` 頁面：
- 查看所有註冊用戶
- 刪除帳號
- 切換其他用戶的管理員權限

> 查看所有用戶：
> ```bash
> docker exec lenslog_db psql -U postgres -d lenslog \
>   -c "SELECT username, email, is_admin, created_at FROM users ORDER BY created_at DESC;"
> ```

### 快速啟動（全 Docker，僅供參考）

```bash
# 啟動所有服務（PostgreSQL + PostGIS、Redis、FastAPI、React Vite）
docker compose up -d

# 執行資料庫 migration
docker compose exec backend alembic upgrade head

# 開啟瀏覽器
# 前端：http://localhost:5173
# API 文件：http://localhost:8000/docs
```

### 快速啟動（App）

App 在 Docker 之外獨立運行，只需後端 URL 可連線即可（本機開發時後端由 `docker-compose up` 提供）。

```bash
# 1. 安裝 shared 套件（若尚未執行）
cd shared && npm install && cd ..

# 2. 進入 mobile 目錄並安裝依賴
cd mobile
npm install

# 3. 複製環境變數並設定後端位址
cp .env.example .env
# 編輯 .env，設定：
# EXPO_PUBLIC_API_URL=http://<你的區網IP>:8000/api/v1
# （注意：模擬器 / 實機需使用區網 IP，不能用 localhost）

# 4. 啟動 Expo 開發伺服器
npx expo start

# 掃描 QR Code 用 Expo Go 在手機上測試
# 或按 i 開啟 iOS 模擬器 / a 開啟 Android 模擬器
```

### 環境變數（backend/.env）

```env
# 資料庫
DATABASE_URL=postgresql+asyncpg://postgres:password@db:5432/lenslog

# JWT
SECRET_KEY=your-super-secret-key
ACCESS_TOKEN_EXPIRE_MINUTES=15
REFRESH_TOKEN_EXPIRE_DAYS=7

# AWS S3
AWS_ACCESS_KEY_ID=your-access-key
AWS_SECRET_ACCESS_KEY=your-secret-key
AWS_REGION=ap-northeast-1
S3_BUCKET_NAME=lenslog-photos

# Redis
REDIS_URL=redis://redis:6379/0

# 外部 API
OPENMETEO_BASE_URL=https://api.open-meteo.com/v1
```

---

## 九、三個月開發時程規劃（Timeline）

### 第 1–3 週：企劃定案與基礎建設

- [ ] 確立 Figma 設計稿與資料庫結構設計（含 PostGIS Schema）
- [ ] 前後端 Docker 環境建置，Alembic 初始 migration
- [ ] GitHub Actions CI 設定（Lint + 測試自動化）
- [ ] 完成帳號註冊 / 登入系統（JWT + Refresh Token）
- [ ] S3 Bucket 建立與 Presigned URL 上傳流程 PoC

### 第 4–7 週：核心地圖與照片功能

- [ ] **前端：** Leaflet.js 地圖介面、Marker Clustering、景點標籤過濾
- [ ] **前端：** 照片上傳元件（react-dropzone，直傳 S3）
- [ ] **後端：** 照片 metadata API、Celery EXIF 解析任務
- [ ] **後端：** 景點 CRUD API、PostGIS 地理搜尋（半徑篩選）
- [ ] **後端：** 天氣 / 日落 API 串接與快取（Redis，TTL 30 分鐘）

### 第 8–10 週：器材庫與 D3.js 視覺化

- [ ] 開發「數位器材庫」CRUD（前後端完整）
- [ ] Celery Beat 定時任務：掃描器材保養到期，發送 Email 通知
- [ ] 前端 D3.js：焦段長條圖、光圈圓餅圖、ISO 折線圖
- [ ] 後端 Stats API：聚合 EXIF 資料，預計算統計結果存入 Redis

### 第 11–12 週：封測、優化與上線

- [ ] Sentry 錯誤監控、UptimeRobot 可用性監控設定
- [ ] 壓力測試（k6）：地圖大量 Marker 載入、照片批次上傳
- [ ] CloudFront CDN 設定，圖片載入效能優化
- [ ] 修復 Edge Cases，撰寫使用說明
- [ ] 正式部署至 AWS EC2 / Railway，準備 Demo 影片

---

## 十、關鍵效能考量

| 問題場景 | 解決方案 |
|----------|----------|
| 地圖同時載入上千個 Marker | 前端 Marker Clustering + 後端 viewport 範圍篩選（只回傳畫面內景點）|
| 照片上傳佔用 API server 資源 | 前端直傳 S3 Presigned URL，後端只接收 metadata |
| EXIF 解析、縮圖生成耗時 | Celery Worker 非同步處理，上傳後立即回應，背景完成解析 |
| 熱門景點重複查詢天氣 API | Redis 快取天氣結果（TTL 30 分鐘）|
| 統計圖表每次即時計算 | 後端定時預計算統計結果存 Redis，前端直接讀取快取 |

---

> **LensLog** — *Capture More, Discover More.* 📷
