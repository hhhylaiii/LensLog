// ============================================================
// LensLog API Client Factory
//
// Platform-agnostic: does NOT import localStorage, AsyncStorage,
// or any platform SDK directly. Callers inject token retrieval
// and redirect behavior via the options object.
//
// Web usage:
//   createApiClient({
//     baseURL: '/api/v1',
//     getAccessToken: () => localStorage.getItem('access_token'),
//     onUnauthorized: () => { window.location.href = '/login' },
//   })
//
// Mobile usage:
//   createApiClient({
//     baseURL: process.env.EXPO_PUBLIC_API_URL,
//     getAccessToken: () => SecureStore.getItemAsync('access_token'),
//     onUnauthorized: () => router.replace('/auth/login'),
//   })
// ============================================================

import axios, { type AxiosInstance, type AxiosResponse } from 'axios'

export interface ApiClientOptions {
  /** Full base URL including /api/v1 prefix */
  baseURL: string
  /** Called synchronously or async to retrieve the current access token */
  getAccessToken: () => string | null | Promise<string | null>
  /** Called when the server returns 401 (token expired / invalid) */
  onUnauthorized?: () => void
}

export function createApiClient(options: ApiClientOptions): AxiosInstance {
  const { baseURL, getAccessToken, onUnauthorized } = options

  const client = axios.create({
    baseURL,
    headers: { 'Content-Type': 'application/json' },
    timeout: 15_000,
  })

  // Attach JWT before every request
  client.interceptors.request.use(async (config) => {
    const token = await getAccessToken()
    if (token) {
      config.headers.Authorization = `Bearer ${token}`
    }
    return config
  })

  // Handle 401 globally
  client.interceptors.response.use(
    (res: AxiosResponse) => res,
    (error: unknown) => {
      if (
        axios.isAxiosError(error) &&
        error.response?.status === 401 &&
        onUnauthorized
      ) {
        onUnauthorized()
      }
      return Promise.reject(error)
    }
  )

  return client
}
