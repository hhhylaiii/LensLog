// ============================================================
// @lenslog/shared — Public API
// ============================================================

// Types
export * from './types'

// API
export { createApiClient } from './api/client'
export type { ApiClientOptions } from './api/client'
export {
  createAuthService,
  createPhotosService,
  createLocationsService,
  createGearService,
  createStatsService,
  createLensLogApi,
} from './api/services'
export type { LensLogApi } from './api/services'

// Store
export { createAuthStore } from './stores/authStore'
export type { AuthState, AuthStore } from './stores/authStore'

// Schemas
export * from './schemas'

// Hooks
export * from './hooks/usePhotos'
export * from './hooks/useGear'
export * from './hooks/useLocations'
export * from './hooks/useStats'
