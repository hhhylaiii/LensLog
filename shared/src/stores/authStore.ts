// ============================================================
// LensLog Auth Store (Platform-Agnostic)
//
// Uses a StorageAdapter so the persist layer is injected by
// the consuming platform, not hardcoded:
//
//   Web:    createWebAuthStore()   → uses localStorage via zustand/middleware
//   Mobile: createMobileAuthStore() → uses expo-secure-store adapter
//
// Both store shapes are identical; components import the same
// useAuthStore hook regardless of platform.
// ============================================================

import { create } from 'zustand'
import { persist, createJSONStorage, type StateStorage } from 'zustand/middleware'
import type { User, TokenResponse } from '../types'

// The shape of the store — identical on both platforms
export interface AuthState {
  user: User | null
  accessToken: string | null
  refreshToken: string | null
  isAuthenticated: boolean
  setTokens: (tokens: TokenResponse) => void
  setUser: (user: User) => void
  logout: () => void
}

// Only the fields that get persisted to storage
type PersistedAuthState = Pick<
  AuthState,
  'accessToken' | 'refreshToken' | 'isAuthenticated'
>

/**
 * Creates the auth store with an injected storage adapter.
 *
 * @param storage  A Zustand-compatible StateStorage object.
 *                 - Web:    localStorage (window.localStorage)
 *                 - Mobile: build one from expo-secure-store (see mobile/src/store/authStorage.ts)
 * @param storeName  Key used in the storage backend (default: 'lenslog-auth')
 */
export function createAuthStore(
  storage: StateStorage,
  storeName = 'lenslog-auth'
) {
  return create<AuthState>()(
    persist(
      (set) => ({
        user: null,
        accessToken: null,
        refreshToken: null,
        isAuthenticated: false,

        setTokens: (tokens: TokenResponse) =>
          set({
            accessToken: tokens.access_token,
            refreshToken: tokens.refresh_token,
            isAuthenticated: true,
          }),

        setUser: (user: User) => set({ user }),

        logout: () =>
          set({
            user: null,
            accessToken: null,
            refreshToken: null,
            isAuthenticated: false,
          }),
      }),
      {
        name: storeName,
        storage: createJSONStorage(() => storage),
        partialize: (state): PersistedAuthState => ({
          accessToken: state.accessToken,
          refreshToken: state.refreshToken,
          isAuthenticated: state.isAuthenticated,
        }),
      }
    )
  )
}

// Type alias so consumers can type the hook without re-importing from zustand
export type AuthStore = ReturnType<typeof createAuthStore>
