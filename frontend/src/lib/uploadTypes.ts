export interface ExifData {
  make?: string; model?: string; lens?: string; aperture?: string
  shutter?: string; iso?: string; focalLength?: string; takenAt?: string
  width?: string; height?: string
  gpsLat?: number; gpsLng?: number
}
export type LocationSource = 'user' | 'global'
export interface LocationMatch {
  status: 'pending' | 'matched' | 'manual' | 'none'
  loc?: { id: string; name: string; source: LocationSource; distance?: number }
}
export type Visibility = 'public' | 'private'
export interface FileItem {
  file: File; preview: string; caption: string; tags: string[]
  visibility: Visibility; hidePreciseGps: boolean
  exif?: ExifData; location?: LocationMatch
  status: 'pending' | 'uploading' | 'done' | 'error'
  progress: number; error?: string
}
