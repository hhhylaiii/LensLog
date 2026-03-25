# Expo Router

## 版本

```json
"expo-router": "~3.5.0"
```

## 在此專案中的用途與角色

Expo Router v3 是 LensLog Mobile 的路由框架，採用**檔案系統路由**（File-based Routing）模式，`mobile/app/` 目錄下的每個檔案自動對應一個路由。

這與 Web 端使用的 React Router DOM（程式化路由定義）不同，但兩者在導航概念上一致。

## 目錄結構與路由對應

```
mobile/app/
├── _layout.tsx          # Root layout（QueryClientProvider + Stack）
├── (tabs)/              # Tab 群組（括號表示 layout group，不影響 URL）
│   ├── _layout.tsx      # Tab bar 設定
│   ├── map.tsx          # /map  → 地圖探索
│   ├── gear.tsx         # /gear → 器材庫
│   └── stats.tsx        # /stats → 統計 Dashboard
└── auth/
    ├── _layout.tsx      # Auth stack layout
    ├── login.tsx        # /auth/login
    └── register.tsx     # /auth/register
```

## 路由架構說明

### Root Layout（`app/_layout.tsx`）

```tsx
import { Stack } from 'expo-router'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'

const queryClient = new QueryClient({
  defaultOptions: {
    queries: { retry: 1, staleTime: 60_000 },
  },
})

export default function RootLayout() {
  return (
    <QueryClientProvider client={queryClient}>
      <StatusBar style="auto" />
      <Stack>
        <Stack.Screen name="(tabs)" options={{ headerShown: false }} />
        <Stack.Screen name="auth" options={{ headerShown: false }} />
      </Stack>
    </QueryClientProvider>
  )
}
```

### Tab 群組（`app/(tabs)/`）

括號命名（group）表示這個目錄是 layout group，不會出現在路由路徑中。底部 Tab bar 透過 `(tabs)/_layout.tsx` 設定。

### 型別安全路由

`app.json` 中啟用了 `"typedRoutes": true`，Expo Router 會自動生成路由型別，讓 `router.push('/auth/login')` 等呼叫在 TypeScript 中獲得型別檢查。

## 程式化導航

```typescript
import { router } from 'expo-router'
import { Link } from 'expo-router'

// 程式化導航
router.push('/auth/login')
router.replace('/auth/login')  // 不留歷史記錄（用於登出跳轉）
router.back()

// 宣告式連結
<Link href="/gear">器材庫</Link>
```

## 深層連結（Deep Linking）

App scheme 設定為 `lenslog`，支援 `lenslog://` 格式的 deep link：

```json
// app.json
"scheme": "lenslog"
```

## babel.config.js 設定

```js
module.exports = function (api) {
  api.cache(true)
  return {
    presets: ['babel-preset-expo'],
    plugins: [
      'nativewind/babel',
      ['module-resolver', {
        alias: {
          '@shared': '../shared/src',  // @shared → @lenslog/shared 原始碼
          '@': './',
        },
      }],
    ],
  }
}
```

`module-resolver` plugin 解決 Metro bundler 對 `@shared` alias 的識別，與 Vite 的 `resolve.alias` 作用相同。

## 相關資源

- [Expo Router 官方文件](https://docs.expo.dev/router/introduction/)
- [File-based Routing](https://docs.expo.dev/router/create-pages/)
- [Layout Routes](https://docs.expo.dev/router/layouts/)
- [Typed Routes](https://docs.expo.dev/router/reference/typed-routes/)
