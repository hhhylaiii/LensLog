import type { CSSProperties } from 'react'

// ─── Design tokens ────────────────────────────────────────────────────────────

export const t = {
  ink: '#1a2942',
  inkSoft: '#4a5773',
  inkMute: '#7d88a0',
  line: '#dde3ee',
  lineSoft: '#e9eef5',
  paper: '#eef2f8',
  paper2: '#dfe6f0',
  card: '#ffffff',
  accent: '#1e5fb3',
  accentSoft: '#e3edfa',
  accentInk: '#143e77',
  accentNeon: '#60a5fa',
  gold: '#d97706',
  goldSoft: '#fef3e2',
}

// ─── Domain types ─────────────────────────────────────────────────────────────

export interface Location {
  id: string
  name: string
  description?: string
  latitude: number
  longitude: number
  user_id: string
  created_at: string
  tags: string[]
}

export interface GlobalLocation {
  id: string
  name: string
  description?: string
  latitude: number
  longitude: number
  is_active: boolean
  created_at: string
}

export type MapSource = 'user' | 'global'

export type SheetState = 'peek' | 'half' | 'full' | null

export interface ExploreLocation {
  id: string
  name: string
  description?: string
  latitude: number
  longitude: number
  created_at: string
  source: MapSource
  tags: string[]
}

export interface ForecastPeriod {
  start_time: string
  end_time: string
  temp_max: number
  temp_min: number
  pop: number
  wind_speed: string
  weather_description: string
}

export interface WeatherForecast {
  township: string
  county: string
  forecasts: ForecastPeriod[]
  sunrise: string | null
  sunset: string | null
}

// ─── Icon ─────────────────────────────────────────────────────────────────────

export { Icon } from './Icon'

// ─── Icon paths ───────────────────────────────────────────────────────────────

export const ICON = {
  xmark: 'M6 18L18 6M6 6L18 18',
  sun: 'M12 3V5.25M18.364 5.63604L16.773 7.22703M21 12H18.75M18.364 18.364L16.773 16.773M12 18.75V21M7.22703 16.773L5.63604 18.364M5.25 12H3M7.22703 7.22703L5.63604 5.63604M15.75 12C15.75 14.0711 14.0711 15.75 12 15.75C9.92893 15.75 8.25 14.0711 8.25 12C8.25 9.92893 9.92893 8.25 12 8.25C14.0711 8.25 15.75 9.92893 15.75 12Z',
  moon: 'M21.7519 15.0021C20.597 15.484 19.3296 15.7501 18 15.7501C12.6152 15.7501 8.25 11.3849 8.25 6.00011C8.25 4.67052 8.51614 3.40308 8.99806 2.24817C5.47566 3.71798 3 7.19493 3 11.2501C3 16.6349 7.36522 21.0001 12.75 21.0001C16.8052 21.0001 20.2821 18.5245 21.7519 15.0021Z',
  clock: 'M12 6V12H16.5M21 12C21 16.9706 16.9706 21 12 21C7.02944 21 3 16.9706 3 12C3 7.02944 7.02944 3 12 3C16.9706 3 21 7.02944 21 12Z',
  cloud: 'M2.25 15C2.25 17.4853 4.26472 19.5 6.75 19.5H18C20.0711 19.5 21.75 17.8211 21.75 15.75C21.75 14.1479 20.7453 12.7805 19.3316 12.2433C19.4407 11.9324 19.5 11.5981 19.5 11.25C19.5 9.59315 18.1569 8.25 16.5 8.25C16.1767 8.25 15.8654 8.30113 15.5737 8.39575C14.9765 6.1526 12.9312 4.5 10.5 4.5C7.6005 4.5 5.25 6.85051 5.25 9.75C5.25 10.0832 5.28105 10.4092 5.3404 10.7252C3.54555 11.3167 2.25 13.0071 2.25 15Z',
  drop: 'M12 3C9.5 6.5 7.5 9.75 7.5 12.75a4.5 4.5 0 009 0C16.5 9.75 14.5 6.5 12 3z',
  wind: 'M3 8.25h12.75a3 3 0 100-6 3 3 0 00-2.25 5.003M3 12h9M3 15.75h11.25a3 3 0 110 6 3 3 0 01-2.25-5.003',
  eye: 'M2.03555 12.3224C1.96647 12.1151 1.9664 11.8907 2.03536 11.6834C3.42372 7.50972 7.36079 4.5 12.0008 4.5C16.6387 4.5 20.5742 7.50692 21.9643 11.6776C22.0334 11.8849 22.0335 12.1093 21.9645 12.3166C20.5761 16.4903 16.6391 19.5 11.9991 19.5C7.36119 19.5 3.42564 16.4931 2.03555 12.3224ZM15 12C15 13.6569 13.6569 15 12 15C10.3431 15 9 13.6569 9 12C9 10.3431 10.3431 9 12 9C13.6569 9 15 10.3431 15 12Z',
  mapPin: 'M15 10.5C15 12.1569 13.6569 13.5 12 13.5C10.3431 13.5 9 12.1569 9 10.5C9 8.84315 10.3431 7.5 12 7.5C13.6569 7.5 15 8.84315 15 10.5ZM19.5 10.5C19.5 17.6421 12 21.75 12 21.75C12 21.75 4.5 17.6421 4.5 10.5C4.5 6.35786 7.85786 3 12 3C16.1421 3 19.5 6.35786 19.5 10.5Z',
  search: 'M21 21L15.8033 15.8033M15.8033 15.8033C17.1605 14.4461 18 10.5711 18 10.5C18 6.35786 14.6421 3 10.5 3C6.35786 3 3 6.35786 3 10.5C3 14.6421 6.35786 18 10.5 18C12.5711 18 14.4461 17.1605 15.8033 15.8033Z',
  list: 'M8.25 6.75H20.25M8.25 12H20.25M8.25 17.25H20.25M3.75 6.75h.008v.008H3.75V6.75zm.375 0a.375.375 0 11-.75 0 .375.375 0 01.75 0zM3.75 12h.008v.008H3.75V12zm.375 0a.375.375 0 11-.75 0 .375.375 0 01.75 0zm-.375 5.25h.008v.008H3.75v-.008zm.375 0a.375.375 0 11-.75 0 .375.375 0 01.75 0z',
}

// ─── Shared styles (mobile components) ───────────────────────────────────────

export const sharedStyles: Record<string, CSSProperties> = {
  sunTiming: {
    background: `linear-gradient(135deg, ${t.goldSoft}, ${t.card})`,
    border: `1px solid ${t.gold}`,
    borderRadius: 10,
    padding: '10px 12px',
    marginBottom: 10,
    position: 'relative',
    overflow: 'hidden',
  },
  sunLabel: {
    fontFamily: "'IBM Plex Mono', monospace",
    fontSize: 9,
    letterSpacing: '0.1em',
    textTransform: 'uppercase',
    color: t.gold,
    fontWeight: 600,
    marginBottom: 6,
    display: 'flex',
    alignItems: 'center',
    gap: 5,
  },
  sunPulse: {
    width: 5,
    height: 5,
    borderRadius: '50%',
    background: t.gold,
    boxShadow: '0 0 6px rgba(217,119,6,0.6)',
    animation: 'lensLogGoldPulse 2s ease-out infinite',
  },
  sunRow: {
    display: 'grid',
    gridTemplateColumns: '1fr 1fr 1fr',
    gap: 8,
    alignItems: 'end',
  },
  sunK: {
    fontSize: 9.5,
    color: t.inkSoft,
    marginBottom: 1,
    display: 'flex',
    alignItems: 'center',
    gap: 3,
  },
  sunV: { fontSize: 14.5, fontWeight: 600, letterSpacing: '-0.01em', lineHeight: 1.05 },
  sunVGolden: { color: t.gold, fontSize: 18 },
  sunVSmall: { fontSize: 11, fontWeight: 500, marginLeft: 1 },
  weatherGrid: {
    display: 'grid',
    gridTemplateColumns: 'repeat(2, 1fr)',
    gap: 2,
    background: t.line,
    borderRadius: 12,
    overflow: 'hidden',
    border: `1px solid ${t.line}`,
    marginBottom: 10,
  },
  wxCell: { padding: '9px 10px', display: 'flex', alignItems: 'center', gap: 8 },
  wxCellWeather: { background: 'linear-gradient(150deg, #edf0f5 0%, #d8e2ec 100%)' },
  wxCellRain:    { background: 'linear-gradient(150deg, #eaecf3 0%, #d4d8e8 100%)' },
  wxCellWind:    { background: 'linear-gradient(150deg, #edf2ec 0%, #d4e0d2 100%)' },
  wxCellVis:     { background: 'linear-gradient(150deg, #f0ece6 0%, #dfd6cb 100%)' },
  wxIcon: { width: 28, height: 28, borderRadius: 8, color: '#fff', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 },
  wxIconWeather: { background: 'linear-gradient(135deg, #7896b2, #4a6882)', boxShadow: '0 4px 14px rgba(74,104,130,0.22)' },
  wxIconRain:    { background: 'linear-gradient(135deg, #7e90b6, #546082)', boxShadow: '0 4px 14px rgba(84,96,130,0.22)' },
  wxIconWind:    { background: 'linear-gradient(135deg, #789878, #4c6e4c)', boxShadow: '0 4px 14px rgba(76,110,76,0.22)' },
  wxIconVis:     { background: 'linear-gradient(135deg, #9e8c7a, #6c5c4c)', boxShadow: '0 4px 14px rgba(108,92,76,0.22)' },
  wxText: { flex: 1, minWidth: 0 },
  wxK: { fontSize: 8.5, color: t.inkMute, fontFamily: "'IBM Plex Mono', monospace", textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: 1 },
  wxV: { fontSize: 12, fontWeight: 600, letterSpacing: '-0.005em', lineHeight: 1.15 },
  wxVSmall: { fontSize: 10, fontWeight: 500, color: t.inkSoft, marginLeft: 1 },
  icBtn: {
    height: 36,
    padding: '0 12px',
    border: `1px solid ${t.line}`,
    background: t.card,
    color: t.ink,
    borderRadius: 9,
    fontFamily: 'inherit',
    fontSize: 12.5,
    fontWeight: 500,
    cursor: 'pointer',
    display: 'inline-flex',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 5,
  },
  icBtnPrimary: { background: t.accent, borderColor: t.accent, color: '#fff' },
}
