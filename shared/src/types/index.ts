// ============================================================
// LensLog Shared Types
// Single source of truth — mirrors backend Pydantic schemas.
// Do NOT import browser or React Native APIs here.
// ============================================================

export interface User {
  id: string
  username: string
  email: string
  avatar_url?: string
  bio?: string
  created_at: string
}

export interface Photo {
  id: string
  user_id: string
  location_id?: string
  s3_key: string
  thumb_key?: string
  caption?: string
  is_public: boolean
  taken_at?: string
  created_at: string
  exif?: ExifData
}

export interface ExifData {
  make?: string
  model?: string
  lens_model?: string
  focal_length?: number
  focal_length_35?: number
  aperture?: number
  shutter_speed?: string
  iso?: number
  gps_lat?: number
  gps_lng?: number
  width?: number
  height?: number
}

export interface Location {
  id: string
  user_id: string
  name: string
  description?: string
  latitude: number
  longitude: number
  tags: string[]
  created_at: string
}

export interface LocationWeather {
  temperature: number
  weather_code: number
  wind_speed: number
  sunrise: string
  sunset: string
}

export type GearType = 'body' | 'lens' | 'flash' | 'tripod' | 'filter' | 'memory_card'

export interface Gear {
  id: string
  user_id: string
  type: GearType
  brand?: string
  model: string
  serial_number?: string
  purchase_date?: string
  notes?: string
  maintenance_interval_days?: number
  last_maintained?: string
  created_at: string
}

// Auth
export interface TokenResponse {
  access_token: string
  refresh_token: string
  token_type: string
}

export interface LoginRequest {
  email: string
  password: string
}

export interface RegisterRequest {
  username: string
  email: string
  password: string
}

// Stats
export interface FocalLengthStat {
  focal_length: number
  count: number
}

export interface ApertureStat {
  aperture: number
  count: number
}

export interface IsoStat {
  iso: number
  count: number
}

export interface MonthlyStat {
  month: string
  count: number
}

export interface UserStats {
  total_photos: number
  total_locations: number
  total_gear: number
  focal_length_distribution: FocalLengthStat[]
  aperture_distribution: ApertureStat[]
  monthly_counts: MonthlyStat[]
}

// API wrapper
export interface ApiError {
  detail: string
  status_code?: number
}

export interface PaginatedResponse<T> {
  items: T[]
  total: number
  skip: number
  limit: number
}

// Presign
export interface PresignResponse {
  presigned_url: string
  s3_key: string
  upload_headers: Record<string, string>
}
