# TanStack Query (React Query)

## 版本

```json
"@tanstack/react-query": "^5.40.0"
```

（Web 與 Mobile 使用相同版本）

## 在此專案中的用途與角色

TanStack Query 是 LensLog 前端（Web + Mobile）的**伺服器狀態管理**工具，負責所有 API 資料的快取、同步、背景更新與錯誤處理。它取代了手動管理 `loading`/`error`/`data` state 的樣板代碼。

業務邏輯 hooks（`usePhotos`、`useGear`、`useLocations`、`useStats`）定義在 `@lenslog/shared` 套件中，Web 與 Mobile 共用同一份實作。

## 主要功能與特性說明

### QueryClient 初始化

**Web**（`frontend/src/main.tsx`）：

```tsx
const queryClient = new QueryClient()

// 包裹整個應用
<QueryClientProvider client={queryClient}>
  ...
</QueryClientProvider>
```

**Mobile**（`mobile/app/_layout.tsx`）：

```tsx
const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      retry: 1,          // 失敗最多重試 1 次（手機網路不穩定，避免過多重試）
      staleTime: 60_000, // 60 秒內資料視為新鮮，不重新 fetch
    },
  },
})
```

### 共用 Hooks（`@lenslog/shared/src/hooks/`）

所有資料 hooks 定義於 shared 套件，Web 與 Mobile 直接 import 使用：

```typescript
// usePhotos.ts - 照片列表查詢
export function usePhotos(params?: PhotoListParams) {
  return useQuery({
    queryKey: ['photos', params],
    queryFn: () => api.photos.list(params),
  })
}

// useGear.ts - 器材清單
export function useGear() {
  return useQuery({
    queryKey: ['gear'],
    queryFn: () => api.gear.list(),
  })
}

// useLocations.ts - 拍攝景點
export function useLocations() {
  return useQuery({
    queryKey: ['locations'],
    queryFn: () => api.locations.list(),
  })
}

// useStats.ts - 個人統計數據
export function useStats() {
  return useQuery({
    queryKey: ['stats'],
    queryFn: () => api.stats.me(),
  })
}
```

### 在元件中使用

```tsx
import { useGear } from '@lenslog/shared'

function GearVault() {
  const { data: gear, isLoading, error } = useGear()

  if (isLoading) return <Spinner />
  if (error) return <ErrorMessage error={error} />
  if (!gear?.length) return <EmptyState />

  return <GearList items={gear} />
}
```

### Query Key 規範

| Query Key | 對應資料 |
|---|---|
| `['photos', params]` | 照片列表（params 影響快取分組） |
| `['photos', photoId]` | 單一照片 |
| `['gear']` | 全部器材 |
| `['locations']` | 全部景點 |
| `['stats']` | 使用者統計 |

### Mutation（寫入操作）

```typescript
const { mutate: createGear } = useMutation({
  mutationFn: (data: GearFormValues) => api.gear.create(data),
  onSuccess: () => {
    // 清除快取，觸發重新 fetch
    queryClient.invalidateQueries({ queryKey: ['gear'] })
  },
})
```

## 快取策略

- Mobile 預設 `staleTime: 60_000`（1 分鐘），適應手機網路頻寬限制
- Web 使用 QueryClient 預設值（`staleTime: 0`），每次 focus 視窗自動 refetch
- 寫入成功後呼叫 `invalidateQueries` 使相關快取失效，確保資料一致

## 相關資源

- [TanStack Query v5 文件](https://tanstack.com/query/v5)
- [Query Keys 最佳實踐](https://tanstack.com/query/v5/docs/framework/react/guides/query-keys)
- [Mutations 指南](https://tanstack.com/query/v5/docs/framework/react/guides/mutations)
