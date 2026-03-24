// ============================================================
// Mobile Auth Store
//
// Instantiates the shared createAuthStore() with expo-secure-store
// as the storage adapter. Tokens are stored in the device
// keychain (iOS) or Keystore (Android).
// ============================================================

import { createAuthStore } from '@shared/stores/authStore'
import { secureStorage } from './authStorage'

export const useAuthStore = createAuthStore(secureStorage, 'lenslog-auth')

// Re-export the type for selectors
export type { AuthState } from '@shared/stores/authStore'
