// ============================================================
// Mobile Secure Storage Adapter
//
// Wraps expo-secure-store to satisfy Zustand's StateStorage
// interface. This is what gets injected into createAuthStore()
// so tokens are stored securely in the device keychain/keystore
// rather than AsyncStorage (which is unencrypted).
// ============================================================

import * as SecureStore from 'expo-secure-store'
import type { StateStorage } from 'zustand/middleware'

export const secureStorage: StateStorage = {
  getItem: async (key: string): Promise<string | null> => {
    return SecureStore.getItemAsync(key)
  },
  setItem: async (key: string, value: string): Promise<void> => {
    await SecureStore.setItemAsync(key, value)
  },
  removeItem: async (key: string): Promise<void> => {
    await SecureStore.deleteItemAsync(key)
  },
}
