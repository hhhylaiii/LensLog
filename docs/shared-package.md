# @lenslog/shared（共用套件）

## 版本

```json
{
  "name": "@lenslog/shared",
  "version": "0.1.0"
}
```

## 在此專案中的用途與角色

`@lenslog/shared` 是 LensLog 的跨平台共用套件，作為 Web（frontend）與 Mobile 之間的**唯一事實來源（Single Source of Truth）**，包含：

- **TypeScript 型別**：鏡像後端 Pydantic schema，確保前後端型別一致
- **Zod Schema**：表單驗證規則，Web 與 Mobile 共用
- **API Client 工廠**：平台無關的 Axios 封裝
- **API Services**：具型別的 API 呼叫方法
- **Zustand Store 工廠**：Auth store 邏輯，注入不同 storage adapter
- **React Query Hooks**：資料 fetching hooks，兩個平台直接 import 使用

## 套件結構

```
shared/src/
├── index.ts           # 公開 API（re-export 所有模組）
├── types/
│   └── index.ts       # TypeScript 介面定義（鏡像 Pydantic schema）
├── schemas/
│   └── index.ts       # Zod 表單驗證 schema
├── api/
│   ├── client.ts      # createApiClient() 工廠函式
│   └── services.ts    # createLensLogApi() 與各 service 函式
├── stores/
│   └── authStore.ts   # createAuthStore() 工廠函式
└── hooks/
    ├── usePhotos.ts
    ├── useGear.ts
    ├── useLocations.ts
    └── useStats.ts
```

## 關鍵型別（`types/index.ts`）

所有型別定義鏡像後端 Pydantic model，**不得**在此 import 任何瀏覽器或 React Native API：

```typescript
// 主要領域型別
interface User { id: string; username: string; email: string; ... }
interface Photo { id: string; s3_key: string; exif?: ExifData; ... }
interface ExifData { make?: string; focal_length?: number; iso?: number; ... }
interface Location { id: string; latitude: number; longitude: number; tags: string[]; ... }
interface Gear { id: string; type: GearType; brand?: string; model: string; ... }

// Auth
interface TokenResponse { access_token: string; refresh_token: string; token_type: string }

// 統計
interface UserStats {
  total_photos: number
  focal_length_distribution: FocalLengthStat[]
  aperture_distribution: ApertureStat[]
  monthly_counts: MonthlyStat[]
}

// API 包裝
interface PaginatedResponse<T> { items: T[]; total: number; skip: number; limit: number }
interface PresignResponse { presigned_url: string; s3_key: string }
```

## 平台整合方式

### Alias 設定

兩個平台都設定 `@shared` alias 直接指向 `shared/src`（而非透過 npm 安裝的 dist），實現無編譯步驟的原始碼共用：

| 平台 | 工具 | 設定位置 | Alias |
|---|---|---|---|
| Web | Vite | `vite.config.ts` | `@shared` → `../shared/src` |
| Web | TypeScript | `tsconfig.json` | `@shared` → `../shared/src` |
| Mobile | Metro/Babel | `babel.config.js` | `@shared` → `../shared/src` |
| Mobile | TypeScript | `tsconfig.json` | `@shared` → `../shared/src` |

Web 同時透過 `package.json` 以 `file:../shared` 安裝，使 `@lenslog/shared` 名稱也可使用。

### Web 使用

```typescript
import { usePhotos, useGear } from '@lenslog/shared'
import { createApiClient } from '@shared/api/client'
```

### Mobile 使用

```typescript
import { usePhotos, useGear } from '@lenslog/shared'
import { createApiClient } from '@shared/api/client'
```

## 依賴注入原則

Shared 套件**不直接依賴任何平台 API**，平台特定的行為由呼叫端注入：

| 功能 | Web 注入 | Mobile 注入 |
|---|---|---|
| Token 讀取 | `localStorage.getItem` | `SecureStore.getItemAsync` |
| 未授權處理 | `window.location.href = '/login'` | `router.replace('/auth/login')` |
| Token 持久化 | `localStorage` | `expo-secure-store adapter` |

## Peer Dependencies

```json
"peerDependencies": {
  "axios": ">=1.0.0",
  "zustand": ">=4.0.0",
  "zod": ">=3.0.0"
}
```

這些套件由消費端（frontend/mobile）安裝，shared 套件不重複打包，避免版本衝突。

## 相關資源

- 型別定義：`/home/eric3/LensLog/shared/src/types/index.ts`
- API Client：`/home/eric3/LensLog/shared/src/api/client.ts`
- Zod Schema：`/home/eric3/LensLog/shared/src/schemas/index.ts`
- Alias 設定說明：參見各平台的 `vite.config.ts` / `babel.config.js`
