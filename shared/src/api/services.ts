// ============================================================
// LensLog API Services
//
// Each service is a factory that takes an AxiosInstance and
// returns typed methods. This keeps the API layer decoupled
// from how the client is constructed (web vs mobile).
// ============================================================

import type { AxiosInstance } from 'axios'
import type {
  TokenResponse,
  LoginRequest,
  RegisterRequest,
  User,
  Photo,
  PresignResponse,
  Location,
  LocationWeather,
  Gear,
  FocalLengthStat,
  ApertureStat,
  IsoStat,
  MonthlyStat,
  UserStats,
  PaginatedResponse,
} from '../types'

// --- Auth ---

export function createAuthService(client: AxiosInstance) {
  return {
    register: (data: RegisterRequest) =>
      client.post<TokenResponse>('/auth/register', data),

    login: (data: LoginRequest) =>
      client.post<TokenResponse>('/auth/login', data),

    refresh: (refreshToken: string) =>
      client.post<TokenResponse>('/auth/refresh', { refresh_token: refreshToken }),

    logout: (refreshToken: string) =>
      client.post<void>('/auth/logout', { refresh_token: refreshToken }),

    me: () =>
      client.get<User>('/auth/me'),
  }
}

// --- Photos ---

export function createPhotosService(client: AxiosInstance) {
  return {
    list: (params?: { skip?: number; limit?: number }) =>
      client.get<PaginatedResponse<Photo>>('/photos', { params }),

    presign: (filename: string, content_type: string) =>
      client.post<PresignResponse>('/photos/presign', null, {
        params: { filename, content_type },
      }),

    create: (data: {
      s3_key: string
      caption?: string
      location_id?: string
      tags?: string[]
      is_public?: boolean
    }) => client.post<Photo>('/photos', data),

    get: (id: string) =>
      client.get<Photo>(`/photos/${id}`),

    update: (id: string, data: { caption?: string; location_id?: string; tags?: string[]; is_public?: boolean }) =>
      client.patch<Photo>(`/photos/${id}`, data),

    delete: (id: string) =>
      client.delete<void>(`/photos/${id}`),
  }
}

// --- Locations ---

export function createLocationsService(client: AxiosInstance) {
  return {
    list: (params?: { lat?: number; lng?: number; radius?: number }) =>
      client.get<Location[]>('/locations', { params }),

    create: (data: {
      name: string
      description?: string
      latitude: number
      longitude: number
      tags?: string[]
    }) => client.post<Location>('/locations', data),

    get: (id: string) =>
      client.get<Location>(`/locations/${id}`),

    update: (
      id: string,
      data: { name?: string; description?: string; tags?: string[] }
    ) => client.patch<Location>(`/locations/${id}`, data),

    delete: (id: string) =>
      client.delete<void>(`/locations/${id}`),

    getWeather: (id: string) =>
      client.get<LocationWeather>(`/locations/${id}/weather`),
  }
}

// --- Gear ---

export function createGearService(client: AxiosInstance) {
  return {
    list: () =>
      client.get<Gear[]>('/gear'),

    create: (data: {
      type: Gear['type']
      brand?: string
      model: string
      serial_number?: string
      purchase_date?: string
      notes?: string
      maintenance_interval_days?: number
    }) => client.post<Gear>('/gear', data),

    get: (id: string) =>
      client.get<Gear>(`/gear/${id}`),

    update: (id: string, data: Partial<Omit<Gear, 'id' | 'user_id' | 'created_at'>>) =>
      client.patch<Gear>(`/gear/${id}`, data),

    delete: (id: string) =>
      client.delete<void>(`/gear/${id}`),

    recordMaintenance: (id: string) =>
      client.post<Gear>(`/gear/${id}/maintain`),
  }
}

// --- Stats ---

export function createStatsService(client: AxiosInstance) {
  return {
    me: () =>
      client.get<UserStats>('/stats/me'),

    focalLength: () =>
      client.get<FocalLengthStat[]>('/stats/me/focal-length'),

    aperture: () =>
      client.get<ApertureStat[]>('/stats/me/aperture'),

    iso: () =>
      client.get<IsoStat[]>('/stats/me/iso'),

    monthly: () =>
      client.get<MonthlyStat[]>('/stats/me/monthly'),
  }
}

// --- Convenience bundle ---

export function createLensLogApi(client: AxiosInstance) {
  return {
    auth: createAuthService(client),
    photos: createPhotosService(client),
    locations: createLocationsService(client),
    gear: createGearService(client),
    stats: createStatsService(client),
  }
}

export type LensLogApi = ReturnType<typeof createLensLogApi>
