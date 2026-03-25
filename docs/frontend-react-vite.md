# React & Vite

## 版本

```json
"react": "^18.3.1",
"react-dom": "^18.3.1",
"vite": "^5.3.1",
"@vitejs/plugin-react": "^4.3.1",
"typescript": "^5.2.2"
```

## 在此專案中的用途與角色

React 18 是 LensLog 網頁前端的 UI 框架，Vite 5 作為開發伺服器與打包工具。整個前端應用為 Single Page Application（SPA），由 React Router 處理路由，部署後由 Nginx 以 SPA fallback 模式服務。

## 主要功能與特性說明

### 應用程式入口

位於 `frontend/src/main.tsx`，以 `StrictMode` 包裹，搭配 TanStack Query 和 React Router：

```tsx
createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <QueryClientProvider client={queryClient}>
      <BrowserRouter>
        <Routes>
          <Route path="/" element={<Navigate to="/map" replace />} />
          <Route path="/map" element={<MapExplore />} />
          <Route path="/gear" element={<GearVault />} />
          <Route path="/dashboard" element={<Dashboard />} />
        </Routes>
      </BrowserRouter>
    </QueryClientProvider>
  </StrictMode>,
)
```

### 頁面結構

| 頁面元件 | 路徑 | 功能 |
|---|---|---|
| `MapExplore` | `/map` | 地圖探索，呈現拍攝景點 |
| `GearVault` | `/gear` | 器材庫管理 |
| `Dashboard` | `/dashboard` | 個人拍攝統計 Dashboard |

### 元件目錄結構

```
frontend/src/
├── main.tsx           # 應用程式入口
├── pages/             # 頁面級元件（路由直接對應）
│   ├── MapExplore.tsx
│   ├── GearVault.tsx
│   └── Dashboard.tsx
├── components/        # 可重用元件
│   ├── Map/           # 地圖相關元件（Leaflet）
│   ├── Charts/        # 統計圖表元件（D3）
│   └── PhotoUpload/   # 照片上傳元件
├── api/               # API 客戶端實例
│   └── index.ts
├── stores/            # 全域狀態（Zustand）
│   └── authStore.ts
├── hooks/             # 自定義 hooks（透過 @shared）
└── types/             # TypeScript 型別定義
```

### Vite 設定

Vite 配置 API proxy，開發環境將 `/api` 請求轉發到 FastAPI：

```typescript
// vite.config.ts
export default defineConfig({
  plugins: [react()],
  server: {
    proxy: {
      '/api': 'http://localhost:8000'
    }
  },
  resolve: {
    alias: {
      '@shared': path.resolve(__dirname, '../shared/src'),
    }
  }
})
```

`@shared` alias 讓前端可以直接 import `@lenslog/shared` 的原始碼，無需編譯步驟。

### 開發啟動

```bash
# 透過 Docker（含 shared 套件安裝）
docker-compose up frontend

# 或本機開發
cd shared && npm install
cd ../frontend && npm install && npm run dev

# 開發伺服器：http://localhost:5173
# FastAPI Docs：http://localhost:8000/docs
```

### 建置與型別檢查

```bash
# 型別檢查
npm run typecheck

# 程式碼風格檢查
npm run lint

# 生產建置
npm run build   # tsc && vite build
```

## TypeScript 設定

使用嚴格模式，`tsconfig.json` 包含：
- `strict: true`
- `moduleResolution: "bundler"`（Vite 模式）
- Path alias：`@shared` → `../shared/src`

## 相關資源

- [React 18 文件](https://react.dev/)
- [Vite 官方文件](https://vitejs.dev/)
- [TypeScript 文件](https://www.typescriptlang.org/docs/)
- [@vitejs/plugin-react](https://github.com/vitejs/vite-plugin-react)
