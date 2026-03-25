# Axios

## 版本

```json
"axios": "^1.7.2"
```

（Web、Mobile、@lenslog/shared 三者共用同版本）

## 在此專案中的用途與角色

Axios 是 LensLog 的 HTTP 客戶端，負責所有 API 請求。它被封裝在 `@lenslog/shared/src/api/client.ts` 的工廠函式中，Web 與 Mobile 透過注入不同的設定（baseURL、token 來源）共用同一套 interceptor 邏輯。

## API Client 工廠模式

### 核心設計（`@lenslog/shared/src/api/client.ts`）

```typescript
export interface ApiClientOptions {
  baseURL: string
  getAccessToken: () => string | null | Promise<string | null>  // 支援同步或非同步
  onUnauthorized?: () => void
}

export function createApiClient(options: ApiClientOptions): AxiosInstance {
  const client = axios.create({
    baseURL,
    headers: { 'Content-Type': 'application/json' },
    timeout: 15_000,  // 15 秒逾時
  })

  // Request interceptor：自動附加 JWT
  client.interceptors.request.use(async (config) => {
    const token = await getAccessToken()  // 支援 async（SecureStore）
    if (token) config.headers.Authorization = `Bearer ${token}`
    return config
  })

  // Response interceptor：全局 401 處理
  client.interceptors.response.use(
    (res) => res,
    (error) => {
      if (axios.isAxiosError(error) && error.response?.status === 401) {
        onUnauthorized?.()  // 導向登入頁
      }
      return Promise.reject(error)
    }
  )

  return client
}
```

### Web 實例化（`frontend/src/api/index.ts`）

```typescript
const apiClient = createApiClient({
  baseURL: '/api/v1',  // Vite proxy 轉發至 FastAPI
  getAccessToken: () => localStorage.getItem('access_token'),
  onUnauthorized: () => { window.location.href = '/login' },
})
```

### Mobile 實例化（`mobile/src/api/index.ts`）

```typescript
const apiClient = createApiClient({
  baseURL: process.env.EXPO_PUBLIC_API_URL ?? 'http://localhost:8000/api/v1',
  getAccessToken: () => SecureStore.getItemAsync('access_token'),  // 非同步
  onUnauthorized: () => { router.replace('/auth/login') },
})
```

## API Service 層（`@lenslog/shared/src/api/services.ts`）

在 axios instance 之上封裝具型別的 API 方法：

```typescript
export function createPhotosService(client: AxiosInstance) {
  return {
    list: (params?) => client.get<Photo[]>('/photos', { params }).then(r => r.data),
    presign: (filename: string) =>
      client.post<PresignResponse>('/photos/presign', null, { params: { filename } }).then(r => r.data),
    create: (data: PhotoCreate) =>
      client.post<Photo>('/photos', data).then(r => r.data),
    delete: (id: string) => client.delete(`/photos/${id}`),
  }
}

// 組合所有 service 成單一 api 物件
export function createLensLogApi(client: AxiosInstance): LensLogApi {
  return {
    auth: createAuthService(client),
    photos: createPhotosService(client),
    locations: createLocationsService(client),
    gear: createGearService(client),
    stats: createStatsService(client),
  }
}
```

使用方式：

```typescript
// Web
import { api } from '../api'
const photos = await api.photos.list({ limit: 20 })

// Mobile
import { api } from '../src/api'
const gear = await api.gear.list()
```

## 照片上傳至 S3

對 S3 的 presigned URL 直接 PUT，**不需要** Authorization header：

```typescript
// 取得 presigned URL
const { presigned_url, s3_key } = await api.photos.presign(file.name)

// 直接上傳至 S3（使用原始 axios，不帶 JWT header）
await axios.put(presigned_url, file, {
  headers: { 'Content-Type': file.type },
})
```

## 相關資源

- [Axios 官方文件](https://axios-http.com/)
- [Axios Interceptors](https://axios-http.com/docs/interceptors)
