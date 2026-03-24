// ============================================================
// Web Auth Store
//
// Instantiates the shared createAuthStore() with localStorage
// as the storage adapter. This is the only web-specific wiring
// needed — the store shape and all methods are defined in
// @lenslog/shared/src/stores/authStore.ts
// ============================================================

import { createAuthStore } from '@shared/stores/authStore'

// localStorage satisfies the Zustand StateStorage interface natively
export const useAuthStore = createAuthStore(localStorage, 'lenslog-auth')

// Re-export the type so consumers can type their selectors
export type { AuthState } from '@shared/stores/authStore'
