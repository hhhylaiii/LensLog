# React Router DOM

## 版本

```json
"react-router-dom": "^6.23.0"
```

## 在此專案中的用途與角色

React Router v6 負責 LensLog 網頁前端的客戶端路由。採用 `BrowserRouter` 模式，所有路由定義集中在 `frontend/src/main.tsx` 的根元件中。

Mobile 端使用 Expo Router（基於 React Navigation），路由架構不同，請參見 [expo-router.md](./mobile-expo-router.md)。

## 路由結構

```
/           → 重新導向至 /map
/map        → MapExplore（地圖探索頁）
/gear       → GearVault（器材庫頁）
/dashboard  → Dashboard（統計 Dashboard 頁）
```

### 路由定義

```tsx
<BrowserRouter>
  <Routes>
    <Route path="/" element={<Navigate to="/map" replace />} />
    <Route path="/map" element={<MapExplore />} />
    <Route path="/gear" element={<GearVault />} />
    <Route path="/dashboard" element={<Dashboard />} />
  </Routes>
</BrowserRouter>
```

預設路徑 `/` 使用 `<Navigate replace>` 重新導向至 `/map`，避免在瀏覽器歷史記錄中留下 `/` 記錄。

## SPA Fallback 設定

React Router 的 `BrowserRouter` 使用 HTML5 History API，所有路由（如 `/map`、`/gear`）在直接訪問或重新整理時需要伺服器回傳 `index.html`。

**開發環境**（Vite）：Vite dev server 自動處理 SPA fallback。

**生產環境**（Nginx）：

```nginx
location / {
    try_files $uri $uri/ /index.html;
}
```

## 導航使用方式

```tsx
import { useNavigate, Link } from 'react-router-dom'

// 程式化導航
const navigate = useNavigate()
navigate('/map')

// 連結元件
<Link to="/gear">器材庫</Link>
```

## 相關資源

- [React Router v6 文件](https://reactrouter.com/en/main)
- [BrowserRouter API](https://reactrouter.com/en/main/router-components/browser-router)
