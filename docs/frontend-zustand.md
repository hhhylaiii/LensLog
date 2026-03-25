# Zustand

## 版本

```json
"zustand": "^4.5.2"
```

（Web、Mobile、@lenslog/shared 三者共用同版本）

## 在此專案中的用途與角色

Zustand 是 LensLog 的**客戶端全域狀態管理**工具，目前主要用於 Auth Store，儲存使用者身份驗證狀態（token、user 物件、isAuthenticated）。

Auth Store 的核心邏輯定義於 `@lenslog/shared`，並透過「注入 storage adapter」的方式讓 Web 與 Mobile 共用同一份邏輯，但各自使用不同的持久化儲存後端。

## Auth Store 設計

### 核心概念：Storage Adapter 注入

`@lenslog/shared/src/stores/authStore.ts` 暴露一個 `createAuthStore(storage, storeName)` 工廠函式，呼叫端注入 storage adapter：

```typescript
export function createAuthStore(storage: StateStorage, storeName = 'lenslog-auth') {
  return create<AuthState>()(
    persist(
      (set) => ({
        user: null,
        accessToken: null,
        refreshToken: null,
        isAuthenticated: false,

        setTokens: (tokens: TokenResponse) => set({
          accessToken: tokens.access_token,
          refreshToken: tokens.refresh_token,
          isAuthenticated: true,
        }),

        setUser: (user: User) => set({ user }),

        logout: () => set({
          user: null, accessToken: null,
          refreshToken: null, isAuthenticated: false,
        }),
      }),
      {
        name: storeName,
        storage: createJSONStorage(() => storage),
        // 只持久化 token，不持久化 user 物件（避免 stale data）
        partialize: (state) => ({
          accessToken: state.accessToken,
          refreshToken: state.refreshToken,
          isAuthenticated: state.isAuthenticated,
        }),
      }
    )
  )
}
```

### 平台實例化

**Web**（`frontend/src/stores/authStore.ts`）：

```typescript
import { createAuthStore } from '@shared/stores/authStore'

// localStorage 直接符合 Zustand StateStorage 介面
export const useAuthStore = createAuthStore(localStorage, 'lenslog-auth')
```

**Mobile**（`mobile/src/store/authStore.ts`）：

```typescript
import { createAuthStore } from '@shared/stores/authStore'
import { secureStorage } from './authStorage'

// secureStorage 是包裝 expo-secure-store 的 adapter
export const useAuthStore = createAuthStore(secureStorage, 'lenslog-auth')
```

### 在元件中使用

```tsx
import { useAuthStore } from '../stores/authStore'

function Navbar() {
  const { isAuthenticated, user, logout } = useAuthStore()

  return isAuthenticated ? (
    <button onClick={logout}>登出 {user?.username}</button>
  ) : (
    <Link to="/login">登入</Link>
  )
}
```

### 持久化策略

- 只持久化 `accessToken`、`refreshToken`、`isAuthenticated`（`partialize`）
- `user` 物件**不持久化**，每次 app 重啟後透過 API 重新 fetch，確保資料最新
- Storage key 統一為 `'lenslog-auth'`（跨平台一致）

## Zustand 特性在此專案的應用

- **無 Provider 包裹需求**：Zustand store 為模組級單例，不需要 React Context Provider
- **選擇性訂閱**：元件可以只訂閱需要的欄位，避免不必要的重新渲染
- **Middleware**：使用 `persist` middleware 處理 localStorage / SecureStore 持久化，`devtools` middleware 可在開發時接入 Redux DevTools

## 相關資源

- [Zustand 官方文件](https://zustand.docs.pmnd.rs/)
- [persist middleware](https://zustand.docs.pmnd.rs/integrations/persisting-store-data)
- [zustand/middleware 型別說明](https://zustand.docs.pmnd.rs/middlewares/persist)
