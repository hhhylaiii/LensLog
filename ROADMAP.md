# LensLog 開發路徑規劃

> **核心原則：Web 優先，App 可無縫銜接**
> - `docker-compose up` 可獨立跑通 Web + 後端，隨時可 Demo
> - 後端 API 從第一天起就同時支援 Web / App（無需二次改動）
> - App 在 Web 穩定後再接入，架構已預留好位置

---

## 開發策略總覽

```
Week 1-2    基礎建設（環境 + 認證）
Week 3-4    後端核心 API + 資料庫
Week 5-6    Web 地圖功能
Week 7-8    Web 照片上傳 + EXIF
Week 9-10   Web 器材庫 + 統計儀表板
Week 11-12  整合測試 + 部署 + Demo 準備
              └── App 銜接（視進度，可平行進行）
```

---

## Phase 0：開發前準備（Day 1–3）

**所有成員都要完成：**

- [ ] Clone repo，跑通 `docker-compose up`
- [ ] 確認 `http://localhost:5173`（Web）和 `http://localhost:8000/docs`（API 文件）可開啟
- [ ] 各自建立 GitHub 帳號並加入 repo collaborator

**PM / QA：**
- [ ] 建立 GitHub Projects 看板（Backlog / In Progress / Review / Done）
- [ ] 確認 `.github/workflows/ci.yml` 跑通（Push 後自動 lint + test）

**UI/UX 設計師：**
- [ ] 建立 Figma 專案，匯入設計元件庫（推薦 shadcn/ui Figma kit）
- [ ] 優先完成：登入 / 註冊頁、地圖主頁、照片上傳流程這三條核心動線的 Wireframe

---

## Phase 1：基礎建設（Week 1–2）

### 後端工程師

**Week 1**
- [ ] 建立 PostgreSQL Schema + PostGIS extension（`alembic upgrade head`）
  - 資料表：`users`、`locations`、`location_tags`、`photos`、`exif_data`、`gear`
  - 地理索引：`CREATE INDEX idx_locations_geom ON locations USING GIST(geom)`
- [ ] 實作 JWT 認證系統
  - `POST /auth/register` — bcrypt 雜湊密碼
  - `POST /auth/login` — 回傳 access token（15 min）+ refresh token（7 天）
  - `POST /auth/refresh` — Refresh Token 輪換
  - `POST /auth/logout` — 廢棄 Refresh Token（存入 Redis blacklist）

**Week 2**
- [ ] 建立 AWS S3 bucket，實作 `POST /photos/presign`（產生 Presigned PUT URL）
- [ ] Redis 連線設定（用於 Celery broker + API 快取）
- [ ] 撰寫認證流程的 pytest 測試（真實測試 DB，不用 mock）

### 前端工程師

**Week 1**
- [ ] 確認 `shared/` 套件可被 `frontend/` 正確 import（`@shared/types`、`@shared/api`）
- [ ] 建立 React Router 路由結構：
  ```
  /           → 地圖探索頁（暫用佔位元件）
  /gear       → 器材庫（暫用佔位元件）
  /stats      → 統計儀表板（暫用佔位元件）
  /auth/login
  /auth/register
  ```
- [ ] 建立 Tailwind + shadcn/ui 元件庫，確認設計 token 與 Figma 一致

**Week 2**
- [ ] 接串登入 / 註冊 API（`POST /auth/login`、`POST /auth/register`）
- [ ] Zustand auth store 初始化（注入 localStorage adapter，from `@lenslog/shared`）
- [ ] 實作 Axios interceptor：自動帶 Bearer token、401 時自動 refresh

### 交付驗收（Week 2 結束）
- [ ] 可以在 `http://localhost:5173` 完成註冊、登入、登出全流程
- [ ] `http://localhost:8000/docs` API 文件顯示所有認證端點，並可手動測試

---

## Phase 2：地圖核心功能（Week 3–6）

### 後端工程師（Week 3–4）

- [ ] **景點 CRUD API**（`/api/v1/locations`）
  - `GET /locations?lat=&lng=&radius=&tags=`（PostGIS `ST_DWithin` 地理篩選）
  - `POST /locations`、`PATCH /locations/{id}`、`DELETE /locations/{id}`
  - `GET /locations/{id}/weather`（串接 CWA F-D0047-091 鄉鎮天氣預報 + Sunrise-Sunset API，Redis 快取 TTL 2 小時）
- [ ] **照片 metadata API**（`/api/v1/photos`）
  - `POST /photos`（接收 S3 key + caption + location_id + metadata）
  - `GET /photos/{id}`（含 EXIF join）
  - `PATCH /photos/{id}`、`DELETE /photos/{id}`
- [ ] **Celery Worker** — `exif_tasks.py`：
  - 照片上傳後非同步解析 EXIF，寫入 `exif_data` 表
  - 生成 800px / 400px 縮圖，上傳至 S3 `thumbnails/` 前綴

### 資料 / 地理資訊工程師（Week 3–6）

- [ ] 設計景點 `geom` 欄位的 PostGIS 查詢優化（`EXPLAIN ANALYZE` 確認使用 GIST index）
- [ ] 實作 viewport 篩選邏輯（`ST_MakeEnvelope`），避免回傳視窗外景點
- [x] 串接 CWA F-D0047-091 API（7 天鄉鎮天氣預報：溫度、降雨機率、風速）+ Sunrise-Sunset API（日出日落時間）
- [ ] 實作 Marker Clustering 建議邏輯（提供前端聚合所需的資料格式）

### 前端工程師（Week 5–6）

- [x] 整合 Leaflet.js + React-Leaflet，顯示台灣地圖
- [x] 串接 `GET /locations`，將景點顯示為地圖 Marker
- [x] 實作 Marker Clustering（`leaflet.markercluster`） #7
- [x] 點擊 Marker 開啟 spotCard：景點名稱、天氣、日落時間（縮圖待 #38、原 popup 規格 #8 已併入 spotCard）
- [x] 左側 Panel：標籤過濾、附近搜尋（Geolocation API） #9
- [x] 新增景點 Modal（表單 + react-hook-form 驗證）

### 交付驗收（Week 6 結束）
- [x] 可在地圖上新增景點、查看景點清單、依標籤過濾
- [x] 點擊景點顯示天氣與日落時間（7 天預報、降雨/風速、日出待後續 issue 補齊）
- [x] Marker 數量 > 50 時自動 Clustering

---

## Phase 3：照片上傳與 EXIF（Week 7–8）

### 前端工程師

- [ ] 實作照片上傳元件（`react-dropzone`）：
  1. 呼叫 `POST /photos/presign` 取得 Presigned URL
  2. `PUT` 直傳至 S3（顯示上傳進度條）
  3. 上傳完成後呼叫 `POST /photos` 建立 metadata
- [ ] 照片詳情頁：顯示 EXIF 資訊（相機、鏡頭、焦段、光圈、ISO、拍攝時間）
- [ ] 個人主頁：照片網格、公開 / 私人切換
- [ ] 新增景點時，可直接從此次上傳的照片建立 GPS 景點標記

### 後端工程師

- [ ] 確認 Celery EXIF 解析任務穩定（錯誤時 retry 最多 3 次，寫入 Sentry）
- [ ] `GET /photos`（公開照片分頁列表，支援 `?location_id=` 篩選）
- [ ] `GET /photos/{id}` 確認 EXIF join 正確回傳

### 交付驗收（Week 8 結束）
- [ ] 可拖曳上傳多張照片，進度條正確顯示
- [ ] 上傳後照片 EXIF 資訊（焦段、光圈、ISO）正確顯示於照片詳情頁
- [ ] 照片縮圖（400px）在地圖 Marker Popup 中正常載入

---

## Phase 4：器材庫 + 統計儀表板（Week 9–10）

### 後端工程師

- [ ] **器材 CRUD API**（`/api/v1/gear`）：
  - 類型分類：`body / lens / flash / tripod / filter / memory_card`
  - `POST /gear/{id}/maintain` — 更新 `last_maintained`
- [ ] **Celery Beat 定時任務**（`notification_tasks.py`）：
  - 每日掃描 `last_maintained + maintenance_interval_days <= today` 的器材
  - 發送保養提醒 Email（FastAPI-Mail）
- [ ] **Stats API**（`/api/v1/stats`）：
  - `GET /stats/me/focal-length`、`/aperture`、`/iso`、`/monthly`
  - 結果預計算後存入 Redis（TTL 1 小時），避免每次聚合查詢

### 前端工程師

- [ ] **器材庫頁面**（`/gear`）：
  - 器材清單 + 新增 / 編輯 / 刪除 Modal
  - 保養狀態徽章（正常 / 即將到期 / 逾期）
  - 器材與 EXIF 鏡頭型號比對（高亮顯示已在器材庫的鏡頭）
- [ ] **統計儀表板**（`/stats`）：
  - 焦段使用長條圖（D3.js）
  - 光圈偏好圓餅圖（D3.js）
  - ISO 趨勢折線圖（D3.js）
  - 月度拍攝量折線圖
  - 拍攝地點熱力地圖（Leaflet.heat）

### 交付驗收（Week 10 結束）
- [ ] 可新增 / 編輯 / 刪除器材，快門數可手動輸入
- [ ] 統計頁四張圖表正確依照個人 EXIF 資料渲染
- [ ] 保養到期器材顯示紅色徽章

---

## Phase 5：整合測試 + 部署（Week 11–12）

### PM / QA

- [ ] 撰寫端對端測試案例（登入 → 上傳照片 → 景點標記 → 統計更新 的完整流程）
- [ ] k6 壓力測試：地圖載入 500 個 Marker、10 人同時上傳照片
- [ ] 確認所有 API 錯誤都有友善的前端提示（非空白頁或 console error）

### 後端工程師

- [ ] 整合 Sentry（後端 Exception tracking）
- [ ] 設定 `docker-compose.prod.yml`：Gunicorn 4 workers + Nginx + 前端靜態檔案
- [ ] Let's Encrypt SSL 憑證申請（如部署至公網伺服器）

### 前端工程師

- [ ] 整合 Sentry（前端 JS 錯誤追蹤）
- [ ] CloudFront CDN 設定，確認縮圖載入速度 < 200ms
- [ ] RWD 最終確認（桌機 1440px / 平板 768px / 手機 375px）
- [ ] 準備 Demo 腳本：依情境一（尋找靈感）、情境二（拍攝後記錄）走一遍

### 交付驗收（Week 12 結束，期末 Demo）
- [ ] `docker-compose -f docker-compose.prod.yml up -d` 一鍵啟動完整環境
- [ ] Web 端三大功能（地圖 / 器材庫 / 統計）全部可展示
- [ ] 所有 API 回應時間 p95 < 500ms

---

## App 銜接路徑（視進度，可平行於 Phase 4–5）

App 不影響 Web 開發進度。後端 API 從 Phase 1 起就已兼容 App，隨時可接入。

### 前置條件
- [ ] `shared/` 套件穩定（types、api client、Zustand store 測試通過）
- [ ] 後端 API 全部完成（Phase 1–4）

### 銜接步驟

**Step 1：環境建置**
```bash
cd mobile
npm install
cp .env.example .env
# 設定 EXPO_PUBLIC_API_URL=http://<區網IP>:8000/api/v1
npx expo start
```

**Step 2：認證（1–2 天）**
- [ ] 確認 `mobile/src/store/authStore.ts`（SecureStore adapter）與 `shared/` auth store 正確連接
- [ ] 登入 / 註冊頁可正常呼叫後端 API

**Step 3：地圖（2–3 天）**
- [ ] `react-native-maps` 顯示景點 Marker（共用 `useLocations` hook from `@shared`）
- [ ] 點擊 Marker 顯示景點詳情

**Step 4：照片上傳（2–3 天）**
- [ ] `expo-image-picker` 或 `expo-camera` 選取 / 拍攝照片
- [ ] 相同的 S3 Presigned URL 流程（共用 `usePhotos` hook from `@shared`）

**Step 5：器材庫 + 統計（2–3 天）**
- [ ] 共用 `useGear`、`useStats` hook，Victory Native 渲染圖表

---

## 關鍵依賴關係（Critical Path）

```
[後端認證 API] ──→ [前端登入流程] ──→ [地圖景點 API] ──→ [前端地圖功能]
                                    ↓
                              [照片上傳 API] ──→ [EXIF 解析] ──→ [Stats API] ──→ [統計圖表]
                                    ↓
                              [器材庫 API] ──→ [前端器材庫]
```

**永遠不要 block 的原則：**
- 後端 API 開發不到，前端用 MSW（Mock Service Worker）模擬回應繼續開發
- 設計稿不到，前端用 Tailwind placeholder 先做結構，後續換主題
- AWS S3 未申請到，本地開發用 MinIO（S3 相容的本地替代方案）

---

## 每週 Sync 節奏

| 時間 | 會議 | 參與者 | 目標 |
|------|------|--------|------|
| 每週一 09:00 | Sprint Planning | 全體 | 確認本週 tasks，解除 blockers |
| 每週三 18:00 | 技術同步 | 工程師 | 跨前後端 API 介面確認 |
| 每週五 17:00 | Demo + Retro | 全體 | 展示本週成果，記錄待改進項目 |

---

## 工具與資源

| 用途 | 工具 |
|------|------|
| 任務追蹤 | GitHub Projects（Kanban） |
| 設計 | Figma |
| API 測試 | `http://localhost:8000/docs`（Swagger UI，自動生成）|
| 本地 S3 替代 | [MinIO](https://min.io/)（docker-compose 加一個 service 即可）|
| 前端 API Mock | [MSW](https://mswjs.io/)（Service Worker mock，無需後端即可開發）|
| 監控 | Sentry（錯誤）+ UptimeRobot（可用性）|
