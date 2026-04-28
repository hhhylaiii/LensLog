export type GearType = 'body' | 'lens' | 'flash' | 'tripod' | 'filter' | 'memory_card'
export type GearStatus = 'normal' | 'most_used' | 'maintenance_due'
export type GearFilter = 'all' | GearType | 'maintenance_due'

export interface GearItem {
  id: string
  type: GearType
  brand?: string
  model: string
  serialNumber?: string
  purchaseDate?: string            // "YYYY/MM"
  lastMaintained?: string          // "YYYY-MM-DD"
  maintenanceIntervalDays?: number
  shutterCount?: number
  shutterLifeMax?: number
  overdueDays?: number             // pre-computed by backend
  daysSinceLastUsed?: number       // pre-computed by backend
  status: GearStatus
  photosLinkedCount?: number
  communityUserCount?: number
  imageUrl?: string
}

export interface FilterPillConfig {
  key: GearFilter
  label: string
  count: number
}
