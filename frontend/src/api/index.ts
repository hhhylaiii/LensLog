// ============================================================
// Web API Client
//
// Thin platform-specific wrapper around @lenslog/shared.
// - baseURL: uses Vite proxy (/api/v1 → http://localhost:8000)
// - getAccessToken: reads from localStorage
// - onUnauthorized: redirects via window.location
//
// All typed API methods live in @lenslog/shared/src/api/services.ts
// ============================================================

import { createApiClient } from '@shared/api/client'
import { createLensLogApi } from '@shared/api/services'

// Re-export all service types so existing imports still work
export * from '@shared/api/services'

const apiClient = createApiClient({
  baseURL: '/api/v1',
  getAccessToken: () => localStorage.getItem('access_token'),
  onUnauthorized: () => {
    window.location.href = '/login'
  },
})

export { apiClient }

// The fully typed API object — use this in components and hooks
export const api = createLensLogApi(apiClient)

export default apiClient
