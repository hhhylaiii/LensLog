// ============================================================
// Mobile API Client
//
// Platform-specific wrapper around @lenslog/shared.
// - baseURL: from EXPO_PUBLIC_API_URL environment variable
// - getAccessToken: reads from expo-secure-store (async)
// - onUnauthorized: navigates to /auth/login via Expo Router
// ============================================================

import * as SecureStore from 'expo-secure-store'
import { router } from 'expo-router'
import Constants from 'expo-constants'
import { createApiClient } from '@shared/api/client'
import { createLensLogApi } from '@shared/api/services'

// EXPO_PUBLIC_* variables are inlined at build time by Expo
const API_URL =
  process.env.EXPO_PUBLIC_API_URL ??
  (Constants.expoConfig?.extra?.apiUrl as string | undefined) ??
  'http://localhost:8000/api/v1'

const apiClient = createApiClient({
  baseURL: API_URL,
  getAccessToken: () => SecureStore.getItemAsync('access_token'),
  onUnauthorized: () => {
    router.replace('/auth/login')
  },
})

export { apiClient }

// The fully typed API object — use this in screens and hooks
export const api = createLensLogApi(apiClient)

export default apiClient
