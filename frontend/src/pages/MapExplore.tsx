import React, { useState, useEffect, useMemo } from 'react'
import { useNavigate } from 'react-router-dom'
import { MapContainer, TileLayer, useMap } from 'react-leaflet'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { useForm } from 'react-hook-form'
import L from 'leaflet'
import 'leaflet/dist/leaflet.css'
import 'leaflet.markercluster/dist/MarkerCluster.css'
import 'leaflet.markercluster/dist/MarkerCluster.Default.css'
import 'leaflet.markercluster'
import api from '../lib/api'
import { useBreakpoint } from '../hooks/useBreakpoint'
import MobileMapView from '../components/Map/MobileMapView'

// Fix Leaflet default marker icons in bundled apps
import markerIconUrl from 'leaflet/dist/images/marker-icon.png'
import markerIconRetinaUrl from 'leaflet/dist/images/marker-icon-2x.png'
import markerShadowUrl from 'leaflet/dist/images/marker-shadow.png'
import type { Photo } from '@shared/types'

delete (L.Icon.Default.prototype as any)._getIconUrl
L.Icon.Default.mergeOptions({
  iconUrl: markerIconUrl,
  iconRetinaUrl: markerIconRetinaUrl,
  shadowUrl: markerShadowUrl,
})

// ─── Design tokens (blue-hour palette) ────────────────────────────────────────

const t = {
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

// ─── Types ────────────────────────────────────────────────────────────────────

interface Location {
  id: string
  name: string
  description?: string
  latitude: number
  longitude: number
  user_id: string
  created_at: string
  tags: string[]
}

interface GlobalLocation {
  id: string
  name: string
  description?: string
  latitude: number
  longitude: number
  is_active: boolean
  created_at: string
}

type MapSource = 'user' | 'global'
type SheetState = 'peek' | 'half' | 'full' | null

interface ExploreLocation {
  id: string
  name: string
  description?: string
  latitude: number
  longitude: number
  created_at: string
  source: MapSource
  tags: string[]
}

interface LocationForm {
  name: string
  description: string
  latitude: string
  longitude: string
}

interface ForecastPeriod {
  start_time: string
  end_time: string
  temp_max: number
  temp_min: number
  pop: number
  wind_speed: string
  weather_description: string
}

interface WeatherForecast {
  township: string
  county: string
  forecasts: ForecastPeriod[]
  sunrise: string | null
  sunset: string | null
}

// ─── Styles ───────────────────────────────────────────────────────────────────

const s: Record<string, React.CSSProperties> = {
  page: {
    height: '100vh',
    background: t.paper,
    color: t.ink,
    fontFamily: "'Inter', 'Noto Sans TC', system-ui, sans-serif",
    padding: 0,
    boxSizing: 'border-box',
    display: 'flex',
    flexDirection: 'column',
    overflow: 'hidden',
    letterSpacing: '-0.005em',
  },
  // Topbar (single 56px row: heading + search + chips + add + avatar)
  topbar: {
    height: '56px',
    flexShrink: 0,
    padding: '0 20px',
    background: t.card,
    borderBottom: `1px solid ${t.line}`,
    display: 'flex',
    alignItems: 'center',
    gap: '10px',
  },
  topbarHeading: {
    fontSize: '16px',
    fontWeight: 600,
    letterSpacing: '-0.015em',
    margin: 0,
    color: t.ink,
    whiteSpace: 'nowrap',
  },
  search: {
    width: '340px',
    flexShrink: 0,
    height: '34px',
    border: `1px solid ${t.line}`,
    borderRadius: '8px',
    background: t.paper,
    padding: '0 12px',
    fontSize: '13px',
    color: t.ink,
    outline: 'none',
    boxSizing: 'border-box',
  },
  topbarChips: {
    flex: 1,
    minWidth: 0,
    display: 'flex',
    gap: '5px',
    overflow: 'hidden',
  },
  sourceTabs: {
    display: 'flex',
    gap: '6px',
    flexShrink: 0,
    marginRight: '4px',
  },
  sourceTab: {
    height: '34px',
    padding: '0 12px',
    border: `1px solid ${t.line}`,
    borderRadius: '9px',
    background: t.paper,
    color: t.inkSoft,
    fontSize: '12px',
    fontWeight: 600,
    cursor: 'pointer',
    display: 'inline-flex',
    alignItems: 'center',
    gap: '6px',
    whiteSpace: 'nowrap',
  },
  sourceTabOn: {
    background: t.accentSoft,
    borderColor: t.accent,
    color: t.accentInk,
  },
  chip: {
    display: 'inline-flex',
    alignItems: 'center',
    padding: '3px 10px',
    border: `1px solid ${t.line}`,
    borderRadius: '14px',
    background: t.card,
    fontSize: '12px',
    color: t.inkSoft,
    cursor: 'pointer',
    fontWeight: 400,
    whiteSpace: 'nowrap',
    flexShrink: 0,
  },
  chipOn: { background: t.ink, borderColor: t.ink, color: '#fff', fontWeight: 500 },
  btnPrimary: {
    height: '32px',
    padding: '0 14px',
    border: `1px solid ${t.accent}`,
    borderRadius: '8px',
    background: t.accent,
    color: '#fff',
    fontSize: '13px',
    fontWeight: 500,
    cursor: 'pointer',
    display: 'inline-flex',
    alignItems: 'center',
    gap: '6px',
    flexShrink: 0,
  },
  avatar: {
    width: '32px',
    height: '32px',
    borderRadius: '50%',
    background: t.paper2,
    border: `1px solid ${t.line}`,
    flexShrink: 0,
  },
  // Body (fills remaining vertical space, flex row: spot list + map)
  body: {
    flex: 1,
    display: 'flex',
    minHeight: 0,
    position: 'relative',
    overflow: 'hidden',
  },
  // Spot list panel — collapsible 268px slide-in
  spotList: {
    width: '268px',
    flexShrink: 0,
    overflow: 'hidden',
    background: t.card,
    borderRight: `1px solid ${t.line}`,
    transition: 'width 0.24s ease, border-color 0.24s ease',
    display: 'flex',
    flexDirection: 'column',
  },
  spotListClosed: { width: 0, borderRightColor: 'transparent' },
  spotListInner: {
    width: '268px',
    display: 'flex',
    flexDirection: 'column',
    height: '100%',
    overflow: 'hidden',
  },
  listHeader: {
    padding: '10px 14px 8px',
    fontSize: '10.5px',
    color: t.inkMute,
    fontFamily: "'IBM Plex Mono', monospace",
    textTransform: 'uppercase',
    letterSpacing: '0.06em',
    borderBottom: `1px solid ${t.lineSoft}`,
  },
  listItems: {
    flex: 1,
    overflowY: 'auto',
    padding: '6px',
    display: 'flex',
    flexDirection: 'column',
    gap: '2px',
  },
  listItem: {
    display: 'flex',
    gap: '8px',
    padding: '8px',
    borderRadius: '6px',
    cursor: 'pointer',
    border: '1px solid transparent',
  },
  listItemActive: {
    background: t.accentSoft,
    border: `1px solid #c6dbf3`,
  },
  thumb: {
    width: '48px',
    height: '48px',
    flexShrink: 0,
    borderRadius: '6px',
    border: `1px solid ${t.line}`,
    background:
      'linear-gradient(160deg, #6b82a8 0%, #4c6590 28%, #334a75 52%, #22355b 78%, #1a2942 100%)',
  },
  itemName: { fontWeight: 600, fontSize: '13px', color: t.ink, marginBottom: '1px' },
  itemMeta: { fontSize: '12px', color: t.inkSoft },
  itemMono: {
    fontFamily: "'IBM Plex Mono', monospace",
    fontSize: '11px',
    color: t.inkMute,
    marginTop: '2px',
  },
  // Map (full-bleed, fills remaining width)
  mapWrap: {
    flex: 1,
    position: 'relative',
    overflow: 'hidden',
    background: t.paper2,
  },
  // Spot list toggle button (right side of map, below zoom)
  spotListToggle: {
    position: 'absolute',
    top: '100px',
    right: '16px',
    zIndex: 500,
    width: '36px',
    height: '36px',
    borderRadius: '8px',
    background: t.card,
    border: `1px solid ${t.line}`,
    boxShadow: '0 4px 12px rgba(15,30,56,0.10)',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    cursor: 'pointer',
    color: t.inkSoft,
    padding: 0,
  },
  spotListToggleActive: {
    background: t.accentSoft,
    borderColor: t.accent,
    color: t.accentInk,
  },
  // Custom zoom control (top-right of map, replaces Leaflet default)
  zoomControl: {
    position: 'absolute',
    top: '16px',
    right: '16px',
    zIndex: 500,
    background: t.card,
    border: `1px solid ${t.line}`,
    borderRadius: '8px',
    overflow: 'hidden',
    display: 'flex',
    flexDirection: 'column',
    boxShadow: '0 4px 12px rgba(15,30,56,0.10)',
  },
  zoomBtn: {
    width: '36px',
    height: '36px',
    background: 'transparent',
    border: 0,
    borderBottom: `1px solid ${t.line}`,
    cursor: 'pointer',
    color: t.ink,
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 0,
  },
  // Scale indicator (bottom-left of map)
  // TODO(#54-followup): wire up to Leaflet zoom level for dynamic distance
  mapScale: {
    position: 'absolute',
    bottom: '14px',
    left: '16px',
    zIndex: 500,
    fontFamily: "'IBM Plex Mono', monospace",
    fontSize: '10px',
    color: t.inkMute,
    background: 'rgba(255,255,255,0.82)',
    padding: '3px 7px',
    borderRadius: '4px',
    border: `1px solid ${t.line}`,
  },
  // Floating spot card (redesigned per #45)
  spotCard: {
    position: 'absolute',
    top: '14px',
    right: '14px',
    width: '360px',
    background: t.card,
    border: `1px solid ${t.line}`,
    borderRadius: '14px',
    boxShadow:
      '0 1px 2px rgba(15,30,56,0.04), 0 24px 48px -12px rgba(15,30,56,0.25), 0 8px 16px -4px rgba(15,30,56,0.12)',
    zIndex: 500,
    overflow: 'hidden',
  },
  // Hero (image area with title overlay)
  icHero: {
    position: 'relative',
    height: '140px',
    background:
      'linear-gradient(160deg, #6b82a8 0%, #4c6590 28%, #334a75 52%, #22355b 78%, #1a2942 100%)',
    overflow: 'hidden',
  },
  icHeroOverlay: {
    position: 'absolute',
    inset: 0,
    background: 'linear-gradient(180deg, rgba(15,30,56,0) 50%, rgba(15,30,56,0.65) 100%)',
  },
  icActions: {
    position: 'absolute',
    top: '12px',
    right: '12px',
    display: 'flex',
    gap: '6px',
    zIndex: 2,
  },
  icActionBtn: {
    width: '30px',
    height: '30px',
    borderRadius: '7px',
    background: 'rgba(255,255,255,0.22)',
    border: '1px solid rgba(255,255,255,0.3)',
    color: '#fff',
    backdropFilter: 'blur(8px)',
    cursor: 'pointer',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
  },
  icTitleArea: {
    position: 'absolute',
    left: '18px',
    right: '18px',
    bottom: '14px',
    color: '#fff',
    zIndex: 2,
  },
  icDifficulty: {
    display: 'inline-flex',
    alignItems: 'center',
    gap: '5px',
    fontFamily: "'IBM Plex Mono', monospace",
    fontSize: '10px',
    textTransform: 'uppercase',
    letterSpacing: '0.08em',
    background: 'rgba(255,255,255,0.2)',
    border: '1px solid rgba(255,255,255,0.3)',
    padding: '3px 8px',
    borderRadius: '12px',
    backdropFilter: 'blur(6px)',
    marginBottom: '8px',
    color: '#fff',
  },
  icTitle: {
    margin: '0 0 2px',
    fontSize: '20px',
    fontWeight: 600,
    letterSpacing: '-0.015em',
    color: '#fff',
    textShadow: '0 1px 6px rgba(0,0,0,0.3)',
  },
  icSubtitle: {
    fontSize: '12.5px',
    color: 'rgba(255,255,255,0.85)',
    display: 'flex',
    gap: '8px',
    alignItems: 'center',
    flexWrap: 'wrap',
  },
  icSubtitleMono: {
    fontFamily: "'IBM Plex Mono', monospace",
    fontSize: '11px',
  },
  icBody: { padding: '16px 18px 0' },
  // Sun timing banner
  sunTiming: {
    background: `linear-gradient(135deg, ${t.goldSoft}, ${t.card})`,
    border: `1px solid ${t.gold}`,
    borderRadius: '10px',
    padding: '14px 16px',
    marginBottom: '14px',
    position: 'relative',
    overflow: 'hidden',
  },
  sunLabel: {
    fontFamily: "'IBM Plex Mono', monospace",
    fontSize: '10px',
    letterSpacing: '0.1em',
    textTransform: 'uppercase',
    color: t.gold,
    fontWeight: 600,
    marginBottom: '8px',
    display: 'flex',
    alignItems: 'center',
    gap: '6px',
  },
  sunPulse: {
    width: '6px',
    height: '6px',
    borderRadius: '50%',
    background: t.gold,
    boxShadow: '0 0 8px rgba(217,119,6,0.6)',
    animation: 'lensLogGoldPulse 2s ease-out infinite',
  },
  sunRow: {
    display: 'grid',
    gridTemplateColumns: '1fr 1fr 1fr',
    gap: '12px',
    alignItems: 'end',
  },
  sunK: {
    fontSize: '11px',
    color: t.inkSoft,
    marginBottom: '2px',
    display: 'flex',
    alignItems: 'center',
    gap: '4px',
  },
  sunV: {
    fontSize: '18px',
    fontWeight: 600,
    letterSpacing: '-0.01em',
    lineHeight: 1.1,
    color: t.ink,
  },
  sunVGolden: { color: t.gold, fontSize: '22px' },
  sunVSmall: { fontSize: '13px', fontWeight: 500, marginLeft: '1px' },
  // Weather grid (2x2)
  weatherGrid: {
    display: 'grid',
    gridTemplateColumns: 'repeat(2, 1fr)',
    gap: '2px',
    background: t.line,
    borderRadius: '14px',
    overflow: 'hidden',
    border: `1px solid ${t.line}`,
    marginBottom: '14px',
  },
  wxCell: {
    padding: '13px 14px',
    display: 'flex',
    alignItems: 'center',
    gap: '11px',
  },
  wxCellWeather: { background: 'linear-gradient(150deg, #edf0f5 0%, #d8e2ec 100%)' },
  wxCellRain: { background: 'linear-gradient(150deg, #eaecf3 0%, #d4d8e8 100%)' },
  wxCellWind: { background: 'linear-gradient(150deg, #edf2ec 0%, #d4e0d2 100%)' },
  wxCellVis: { background: 'linear-gradient(150deg, #f0ece6 0%, #dfd6cb 100%)' },
  wxIcon: {
    width: '36px',
    height: '36px',
    borderRadius: '10px',
    color: '#fff',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    flexShrink: 0,
  },
  wxIconWeather: {
    background: 'linear-gradient(135deg, #7896b2, #4a6882)',
    boxShadow: '0 4px 14px rgba(74,104,130,0.22)',
  },
  wxIconRain: {
    background: 'linear-gradient(135deg, #7e90b6, #546082)',
    boxShadow: '0 4px 14px rgba(84,96,130,0.22)',
  },
  wxIconWind: {
    background: 'linear-gradient(135deg, #789878, #4c6e4c)',
    boxShadow: '0 4px 14px rgba(76,110,76,0.22)',
  },
  wxIconVis: {
    background: 'linear-gradient(135deg, #9e8c7a, #6c5c4c)',
    boxShadow: '0 4px 14px rgba(108,92,76,0.22)',
  },
  wxText: { flex: 1, minWidth: 0 },
  wxK: {
    fontSize: '10.5px',
    color: t.inkMute,
    fontFamily: "'IBM Plex Mono', monospace",
    textTransform: 'uppercase',
    letterSpacing: '0.06em',
    marginBottom: '2px',
  },
  wxV: {
    fontSize: '14.5px',
    fontWeight: 600,
    letterSpacing: '-0.005em',
    lineHeight: 1.2,
    color: t.ink,
  },
  wxVSmall: {
    fontSize: '11px',
    fontWeight: 500,
    color: t.inkSoft,
    marginLeft: '2px',
  },
  // Footer actions
  icFoot: { padding: '14px 18px 16px', display: 'flex', gap: '8px' },
  icBtn: {
    flex: 1,
    height: '36px',
    padding: '0 14px',
    border: `1px solid ${t.line}`,
    background: t.card,
    color: t.ink,
    borderRadius: '8px',
    fontSize: '13px',
    fontWeight: 500,
    cursor: 'pointer',
    display: 'inline-flex',
    alignItems: 'center',
    justifyContent: 'center',
    gap: '6px',
    fontFamily: 'inherit',
  },
  icBtnPrimary: {
    background: t.accent,
    borderColor: t.accent,
    color: '#fff',
  },
  emptyList: { padding: '20px', color: t.inkMute, fontSize: '13px', textAlign: 'center' },
  // Modal
  overlay: {
    position: 'fixed',
    inset: 0,
    background: 'rgba(26, 41, 66, 0.5)',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    zIndex: 2000,
  },
  modal: {
    background: t.card,
    border: `1px solid ${t.line}`,
    borderRadius: '10px',
    padding: '28px',
    width: '100%',
    maxWidth: '400px',
    color: t.ink,
    boxShadow: '0 20px 48px rgba(16,24,40,0.18)',
  },
  modalTitle: { fontSize: '18px', fontWeight: 600, marginBottom: '20px' },
  field: { marginBottom: '14px' },
  label: {
    display: 'block',
    fontSize: '12px',
    fontWeight: 500,
    color: t.inkSoft,
    marginBottom: '6px',
  },
  input: {
    width: '100%',
    background: t.card,
    border: `1px solid ${t.line}`,
    borderRadius: '6px',
    padding: '8px 12px',
    color: t.ink,
    fontSize: '13px',
    outline: 'none',
    boxSizing: 'border-box',
  },
  textarea: {
    width: '100%',
    background: t.card,
    border: `1px solid ${t.line}`,
    borderRadius: '6px',
    padding: '8px 12px',
    color: t.ink,
    fontSize: '13px',
    outline: 'none',
    boxSizing: 'border-box',
    resize: 'vertical',
    minHeight: '64px',
    fontFamily: 'inherit',
  },
  coordRow: { display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px' },
  modalActions: { display: 'flex', gap: '10px', marginTop: '4px' },
  cancelBtn: {
    flex: 1,
    background: t.card,
    color: t.inkSoft,
    border: `1px solid ${t.line}`,
    borderRadius: '6px',
    padding: '9px',
    fontSize: '13px',
    cursor: 'pointer',
  },
  submitBtn: {
    flex: 1,
    background: t.accent,
    color: '#fff',
    border: `1px solid ${t.accent}`,
    borderRadius: '6px',
    padding: '9px',
    fontSize: '13px',
    fontWeight: 500,
    cursor: 'pointer',
  },
  errText: { color: '#b91c1c', fontSize: '12px', marginTop: '4px' },
}

function goldenMinutesLeft(sunsetHHMM: string | null): number | null {
  if (!sunsetHHMM) return null
  const [h, m] = sunsetHHMM.split(':').map(Number)
  if (Number.isNaN(h) || Number.isNaN(m)) return null
  const now = new Date()
  const sunset = new Date()
  sunset.setHours(h, m, 0, 0)
  const diff = Math.round((sunset.getTime() - now.getTime()) / 60000)
  return diff > 0 ? diff : null
}

// ─── Icon helper (Heroicons-style outline SVGs) ──────────────────────────────

const Icon: React.FC<{ path: string; size?: number }> = ({ path, size = 16 }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none">
    <path
      stroke="currentColor"
      strokeWidth={1.5}
      strokeLinecap="round"
      strokeLinejoin="round"
      d={path}
    />
  </svg>
)

const ICON = {
  xmark: 'M6 18L18 6M6 6L18 18',
  sun:
    'M12 3V5.25M18.364 5.63604L16.773 7.22703M21 12H18.75M18.364 18.364L16.773 16.773M12 18.75V21M7.22703 16.773L5.63604 18.364M5.25 12H3M7.22703 7.22703L5.63604 5.63604M15.75 12C15.75 14.0711 14.0711 15.75 12 15.75C9.92893 15.75 8.25 14.0711 8.25 12C8.25 9.92893 9.92893 8.25 12 8.25C14.0711 8.25 15.75 9.92893 15.75 12Z',
  moon:
    'M21.7519 15.0021C20.597 15.484 19.3296 15.7501 18 15.7501C12.6152 15.7501 8.25 11.3849 8.25 6.00011C8.25 4.67052 8.51614 3.40308 8.99806 2.24817C5.47566 3.71798 3 7.19493 3 11.2501C3 16.6349 7.36522 21.0001 12.75 21.0001C16.8052 21.0001 20.2821 18.5245 21.7519 15.0021Z',
  clock: 'M12 6V12H16.5M21 12C21 16.9706 16.9706 21 12 21C7.02944 21 3 16.9706 3 12C3 7.02944 7.02944 3 12 3C16.9706 3 21 7.02944 21 12Z',
  cloud:
    'M2.25 15C2.25 17.4853 4.26472 19.5 6.75 19.5H18C20.0711 19.5 21.75 17.8211 21.75 15.75C21.75 14.1479 20.7453 12.7805 19.3316 12.2433C19.4407 11.9324 19.5 11.5981 19.5 11.25C19.5 9.59315 18.1569 8.25 16.5 8.25C16.1767 8.25 15.8654 8.30113 15.5737 8.39575C14.9765 6.1526 12.9312 4.5 10.5 4.5C7.6005 4.5 5.25 6.85051 5.25 9.75C5.25 10.0832 5.28105 10.4092 5.3404 10.7252C3.54555 11.3167 2.25 13.0071 2.25 15Z',
  drop: 'M12 3C9.5 6.5 7.5 9.75 7.5 12.75a4.5 4.5 0 009 0C16.5 9.75 14.5 6.5 12 3z',
  wind:
    'M3 8.25h12.75a3 3 0 100-6 3 3 0 00-2.25 5.003M3 12h9M3 15.75h11.25a3 3 0 110 6 3 3 0 01-2.25-5.003',
  eye:
    'M2.03555 12.3224C1.96647 12.1151 1.9664 11.8907 2.03536 11.6834C3.42372 7.50972 7.36079 4.5 12.0008 4.5C16.6387 4.5 20.5742 7.50692 21.9643 11.6776C22.0334 11.8849 22.0335 12.1093 21.9645 12.3166C20.5761 16.4903 16.6391 19.5 11.9991 19.5C7.36119 19.5 3.42564 16.4931 2.03555 12.3224ZM15 12C15 13.6569 13.6569 15 12 15C10.3431 15 9 13.6569 9 12C9 10.3431 10.3431 9 12 9C13.6569 9 15 10.3431 15 12Z',
  mapPin:
    'M15 10.5C15 12.1569 13.6569 13.5 12 13.5C10.3431 13.5 9 12.1569 9 10.5C9 8.84315 10.3431 7.5 12 7.5C13.6569 7.5 15 8.84315 15 10.5ZM19.5 10.5C19.5 17.6421 12 21.75 12 21.75C12 21.75 4.5 17.6421 4.5 10.5C4.5 6.35786 7.85786 3 12 3C16.1421 3 19.5 6.35786 19.5 10.5Z',
}

// ─── ClusterMarkers — renders all locations as a clustered layer ──────────────

interface ClusterMarkersProps {
  locations: ExploreLocation[]
  onSelect: (loc: ExploreLocation) => void
  selectedId: string | null
}

const ClusterMarkers: React.FC<ClusterMarkersProps> = ({ locations, onSelect, selectedId }) => {
  const map = useMap()

  useEffect(() => {
    const cluster = (L as any).markerClusterGroup({
      iconCreateFunction: (c: any) =>
        L.divIcon({
          className: 'lenslog-cluster',
          html: `<div class="lenslog-cluster-shape">${c.getChildCount()}</div>`,
          iconSize: [32, 32],
          iconAnchor: [16, 16],
        }),
      showCoverageOnHover: false,
      spiderfyOnMaxZoom: true,
    })

    locations.forEach((loc) => {
      const icon = loc.id === selectedId ? activePinIcon : pinIcon
      const marker = L.marker([loc.latitude, loc.longitude], { icon })
      marker.on('click', () => onSelect(loc))
      cluster.addLayer(marker)
    })

    map.addLayer(cluster)
    return () => {
      map.removeLayer(cluster)
    }
  }, [map, locations, onSelect, selectedId])

  return null
}

// ─── MapController — fly to target when selected ──────────────────────────────

const MapController: React.FC<{ target: [number, number] | null }> = ({ target }) => {
  const map = useMap()
  useEffect(() => {
    if (target) map.flyTo(target, 14, { duration: 1 })
  }, [target, map])
  return null
}

// ─── MapRefSetter — expose Leaflet instance to outside controls ────────────────

const MapRefSetter: React.FC<{ onReady: (map: L.Map) => void }> = ({ onReady }) => {
  const map = useMap()
  useEffect(() => {
    onReady(map)
  }, [map, onReady])
  return null
}

// ─── AddLocationModal ─────────────────────────────────────────────────────────

interface AddLocationModalProps {
  onClose: () => void
  onAdded: () => void
}

const AddLocationModal: React.FC<AddLocationModalProps> = ({ onClose, onAdded }) => {
  const [apiError, setApiError] = useState('')
  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<LocationForm>()

  const mutation = useMutation({
    mutationFn: (data: LocationForm) =>
      api.post('/locations', {
        name: data.name,
        description: data.description || null,
        latitude: parseFloat(data.latitude),
        longitude: parseFloat(data.longitude),
        tags: [],
      }),
    onSuccess: () => {
      onAdded()
      onClose()
    },
    onError: (err: any) =>
      setApiError(err.response?.data?.detail || 'Failed to add location'),
  })

  return (
    <div style={s.overlay} onClick={onClose}>
      <div style={s.modal} onClick={(e) => e.stopPropagation()}>
        <div style={s.modalTitle}>新增景點</div>
        {apiError && <div style={{ ...s.errText, marginBottom: '12px' }}>{apiError}</div>}
        <form onSubmit={handleSubmit((d) => mutation.mutate(d))}>
          <div style={s.field}>
            <label style={s.label}>名稱 *</label>
            <input
              style={s.input}
              placeholder="例：象山六巨石"
              {...register('name', { required: '請輸入名稱' })}
            />
            {errors.name && <div style={s.errText}>{errors.name.message}</div>}
          </div>
          <div style={s.field}>
            <label style={s.label}>描述</label>
            <textarea
              style={s.textarea}
              placeholder="這個景點的拍攝筆記…"
              {...register('description')}
            />
          </div>
          <div style={{ ...s.field, ...s.coordRow }}>
            <div>
              <label style={s.label}>緯度 *</label>
              <input
                style={s.input}
                placeholder="25.0330"
                {...register('latitude', {
                  required: '必填',
                  validate: (v) => !isNaN(parseFloat(v)) || '需為數字',
                })}
              />
              {errors.latitude && <div style={s.errText}>{errors.latitude.message}</div>}
            </div>
            <div>
              <label style={s.label}>經度 *</label>
              <input
                style={s.input}
                placeholder="121.5654"
                {...register('longitude', {
                  required: '必填',
                  validate: (v) => !isNaN(parseFloat(v)) || '需為數字',
                })}
              />
              {errors.longitude && <div style={s.errText}>{errors.longitude.message}</div>}
            </div>
          </div>
          <div style={s.modalActions}>
            <button type="button" style={s.cancelBtn} onClick={onClose}>
              取消
            </button>
            <button type="submit" style={s.submitBtn} disabled={mutation.isPending}>
              {mutation.isPending ? '新增中…' : '新增景點'}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}

// ─── Pulse keyframes injection ────────────────────────────────────────────────

const PulseStyle: React.FC = () => (
  <style>{`
    @keyframes lensLogPulse {
      0%   { box-shadow: 0 0 0 0   rgba(30, 95, 179, 0.5); }
      70%  { box-shadow: 0 0 0 8px rgba(30, 95, 179, 0);   }
      100% { box-shadow: 0 0 0 0   rgba(30, 95, 179, 0);   }
    }
    @keyframes lensLogGoldPulse {
      0%   { box-shadow: 0 0 0 0   rgba(217, 119, 6, 0.5); }
      70%  { box-shadow: 0 0 0 6px rgba(217, 119, 6, 0);   }
      100% { box-shadow: 0 0 0 0   rgba(217, 119, 6, 0);   }
    }
    .lenslog-pin {
      background: transparent !important;
      border: 0 !important;
      filter: drop-shadow(0 2px 3px rgba(26, 41, 66, 0.3));
    }
    .lenslog-cluster {
      background: transparent !important;
      border: 0 !important;
    }
    .lenslog-cluster-shape {
      width: 32px;
      height: 32px;
      border-radius: 50%;
      background: #ffffff;
      color: #1a2942;
      border: 1px solid #dde3ee;
      display: flex;
      align-items: center;
      justify-content: center;
      font-family: 'Inter', 'Noto Sans TC', sans-serif;
      font-weight: 600;
      font-size: 12px;
      box-shadow: 0 2px 6px rgba(26, 41, 66, 0.18);
    }
  `}</style>
)

const pinSvg = (fill: string, dot: string): string =>
  `<svg width="100%" height="100%" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">` +
  `<path d="M20 10C20 14.4183 12 22 12 22C12 22 4 14.4183 4 10C4 5.58172 7.58172 2 12 2C16.4183 2 20 5.58172 20 10Z" stroke="#000000" stroke-width="1.5" fill="${fill}"/>` +
  `<path d="M12 11C12.5523 11 13 10.5523 13 10C13 9.44772 12.5523 9 12 9C11.4477 9 11 9.44772 11 10C11 10.5523 11.4477 11 12 11Z" fill="${dot}" stroke="${dot}" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"/>` +
  `</svg>`

const pinIcon = L.divIcon({
  className: 'lenslog-pin',
  html: pinSvg('#ffffff', '#000000'),
  iconSize: [28, 28],
  iconAnchor: [14, 26],
  popupAnchor: [0, -26],
})

const activePinIcon = L.divIcon({
  className: 'lenslog-pin',
  html: pinSvg('#000000', '#ffffff'),
  iconSize: [34, 34],
  iconAnchor: [17, 31],
  popupAnchor: [0, -31],
})

// ─── MapExplore ───────────────────────────────────────────────────────────────

const MapExplore: React.FC = () => {
  const navigate = useNavigate()
  const queryClient = useQueryClient()
  const [search, setSearch] = useState('')
  const [target, setTarget] = useState<[number, number] | null>(null)
  const [showModal, setShowModal] = useState(false)
  const [source, setSource] = useState<MapSource>('user')
  const [selectedTag, setSelectedTag] = useState<string | null>(null)
  const [selected, setSelected] = useState<ExploreLocation | null>(null)
  const [spotListOpen, setSpotListOpen] = useState(true)
  const [mapInstance, setMapInstance] = useState<L.Map | null>(null)
  const { isMobile } = useBreakpoint()
  const [sheetState, setSheetState] = useState<SheetState>(null)
  const [spotsSheetOpen, setSpotsSheetOpen] = useState(false)

  const { data: userLocations = [] } = useQuery<Location[]>({
    queryKey: ['locations'],
    queryFn: () => api.get('/locations').then((r) => r.data),
  })
  const { data: globalLocations = [] } = useQuery<GlobalLocation[]>({
    queryKey: ['global-locations'],
    queryFn: () => api.get('/global-locations').then((r) => r.data),
  })

  const { data: weather, isLoading: weatherLoading, isError: weatherError } =
    useQuery<WeatherForecast>({
      queryKey: ['weather', selected?.source, selected?.id],
      queryFn: () =>
        selected!.source === 'global'
          ? api.get(`/global-locations/${selected!.id}/weather`).then((r) => r.data)
          : api.get(`/locations/${selected!.id}/weather`).then((r) => r.data),
      enabled: !!selected,
      staleTime: 1000 * 60 * 30,
      retry: false,
    })

  const {
    data: locationPhotos = [],
    isLoading: locationPhotosLoading,
  } = useQuery<Photo[]>({
    queryKey: ['map-location-photos', selected?.source, selected?.id],
    queryFn: async () => {
      if (!selected) return []
      const params =
        selected.source === 'global'
          ? { global_location_id: selected.id, public_only: true, limit: 12 }
          : { user_location_id: selected.id, limit: 12 }
      const res = await api.get<Photo[]>('/photos', { params })
      return res.data
    },
    enabled: !!selected,
    staleTime: 60 * 1000,
  })

  const currentForecast = weather?.forecasts?.[0]

  const mappedUserLocations = useMemo<ExploreLocation[]>(
    () =>
      userLocations.map((loc) => ({
        ...loc,
        source: 'user',
      })),
    [userLocations]
  )

  const mappedGlobalLocations = useMemo<ExploreLocation[]>(
    () =>
      globalLocations.map((loc) => ({
        id: loc.id,
        name: loc.name,
        description: loc.description,
        latitude: loc.latitude,
        longitude: loc.longitude,
        created_at: loc.created_at,
        source: 'global',
        tags: ['公開景點'],
      })),
    [globalLocations]
  )

  const activeLocations = source === 'user' ? mappedUserLocations : mappedGlobalLocations

  const allTags = useMemo(
    () => Array.from(new Set(activeLocations.flatMap((l) => l.tags))).filter(Boolean),
    [activeLocations]
  )

  const filtered = useMemo(
    () =>
      activeLocations.filter((l) => {
        const matchesSearch = l.name.toLowerCase().includes(search.toLowerCase())
        const matchesTag = selectedTag ? l.tags.includes(selectedTag) : true
        return matchesSearch && matchesTag
      }),
    [activeLocations, search, selectedTag]
  )

  useEffect(() => {
    setSelected(null)
    setSelectedTag(null)
    setTarget(null)
  }, [source])

  const handleSelect = (loc: ExploreLocation) => {
    setSelected(loc)
    setTarget([loc.latitude, loc.longitude])
    if (isMobile) {
      setSheetState('peek')
      setSpotsSheetOpen(false)
    }
  }

  const handleAdvanceSheet = () =>
    setSheetState((s) => (s === 'peek' ? 'half' : s === 'half' ? 'full' : 'full'))

  const handleCloseDetail = () => {
    setSelected(null)
    setSheetState(null)
  }

  const openUploadForLocation = (loc: ExploreLocation) => {
    const params = new URLSearchParams({
      source: loc.source,
      locationId: loc.id,
      locationName: loc.name,
    })
    navigate(`/upload?${params.toString()}`)
  }

  const goldenMin = goldenMinutesLeft(weather?.sunset ?? null)

  if (isMobile) {
    return (
      <MobileMapView
        filtered={filtered}
        allTags={allTags}
        search={search}
        onSearch={setSearch}
        selectedTag={selectedTag}
        onTagSelect={setSelectedTag}
        source={source}
        onSourceChange={setSource}
        target={target}
        onMapReady={setMapInstance}
        selected={selected}
        onSelect={handleSelect}
        onCloseDetail={handleCloseDetail}
        sheetState={sheetState}
        onAdvanceSheet={handleAdvanceSheet}
        spotsSheetOpen={spotsSheetOpen}
        onToggleSpotsSheet={() => setSpotsSheetOpen((v) => !v)}
        weather={weather}
        weatherLoading={weatherLoading}
        weatherError={weatherError}
        goldenMin={goldenMin}
        locationPhotos={locationPhotos}
        locationPhotosLoading={locationPhotosLoading}
      />
    )
  }

  return (
    <div style={s.page}>
      <PulseStyle />

      {/* Topbar: heading + search + chips + add + avatar (single row) */}
      <div style={s.topbar}>
        <h2 style={s.topbarHeading}>探索攝影地圖</h2>
        <div style={s.sourceTabs}>
          <button
            style={{ ...s.sourceTab, ...(source === 'user' ? s.sourceTabOn : {}) }}
            onClick={() => setSource('user')}
          >
            我的景點
          </button>
          <button
            style={{ ...s.sourceTab, ...(source === 'global' ? s.sourceTabOn : {}) }}
            onClick={() => setSource('global')}
          >
            大家景點
          </button>
        </div>
        <input
          style={s.search}
          placeholder="搜尋景點、城市、標籤…"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
        />
        <div style={s.topbarChips}>
          <button
            style={{ ...s.chip, ...(selectedTag === null ? s.chipOn : {}) }}
            onClick={() => setSelectedTag(null)}
          >
            全部
          </button>
          {allTags.map((tag) => (
            <button
              key={tag}
              style={{ ...s.chip, ...(selectedTag === tag ? s.chipOn : {}) }}
              onClick={() => setSelectedTag(selectedTag === tag ? null : tag)}
            >
              {tag}
            </button>
          ))}
        </div>
        {source === 'user' && (
          <button style={s.btnPrimary} onClick={() => setShowModal(true)}>
            ＋ 新增景點
          </button>
        )}
        <div style={s.avatar} />
      </div>

      {/* Body: list + map */}
      <div style={s.body}>
        {/* Slide-in spot list panel */}
        <div style={{ ...s.spotList, ...(spotListOpen ? {} : s.spotListClosed) }}>
          <div style={s.spotListInner}>
            <div style={s.listHeader}>
              {source === 'user' ? '我的景點' : '大家景點'} · {activeLocations.length} 處
            </div>
            <div style={s.listItems}>
              {filtered.length === 0 ? (
                <div style={s.emptyList}>{search ? '沒有符合的景點' : '還沒有景點'}</div>
              ) : (
                filtered.map((loc) => {
                  const active = selected?.id === loc.id
                  return (
                    <div
                      key={loc.id}
                      style={{ ...s.listItem, ...(active ? s.listItemActive : {}) }}
                      onClick={() => handleSelect(loc)}
                    >
                      <div style={s.thumb} />
                      <div style={{ flex: 1, minWidth: 0 }}>
                        <div style={s.itemName}>{loc.name}</div>
                        <div style={s.itemMeta}>{loc.tags[0] || (loc.source === 'global' ? '公開景點' : '景點')}</div>
                        <div style={s.itemMono}>
                          {Number(loc.latitude).toFixed(3)}, {Number(loc.longitude).toFixed(3)}
                        </div>
                      </div>
                    </div>
                  )
                })
              )}
            </div>
          </div>
        </div>

        {/* Map */}
        <div style={s.mapWrap}>
          <MapContainer
            center={[25.033, 121.5654]}
            zoom={11}
            zoomControl={false}
            style={{ height: '100%', width: '100%' }}
          >
            <TileLayer
              url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
              attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'
            />
            <MapRefSetter onReady={setMapInstance} />
            <MapController target={target} />
            <ClusterMarkers
              locations={filtered}
              onSelect={handleSelect}
              selectedId={selected?.id ?? null}
            />
          </MapContainer>

          {/* Custom zoom control */}
          <div style={s.zoomControl}>
            <button
              style={s.zoomBtn}
              onClick={() => mapInstance?.zoomIn()}
              aria-label="放大"
              title="放大"
            >
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none">
                <path
                  stroke="currentColor"
                  strokeWidth={1.5}
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  d="M12 4.5V19.5M19.5 12L4.5 12"
                />
              </svg>
            </button>
            <button
              style={{ ...s.zoomBtn, borderBottom: 0 }}
              onClick={() => mapInstance?.zoomOut()}
              aria-label="縮小"
              title="縮小"
            >
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none">
                <path
                  stroke="currentColor"
                  strokeWidth={1.5}
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  d="M5 12H19"
                />
              </svg>
            </button>
          </div>

          {/* Spot list toggle button */}
          <button
            style={{
              ...s.spotListToggle,
              ...(spotListOpen ? s.spotListToggleActive : {}),
            }}
            onClick={() => setSpotListOpen((v) => !v)}
            aria-label="切換景點清單"
            title="景點清單"
          >
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none">
              <path
                stroke="currentColor"
                strokeWidth={1.5}
                strokeLinecap="round"
                strokeLinejoin="round"
                d="M8.25 6.75H20.25M8.25 12H20.25M8.25 17.25H20.25"
              />
            </svg>
          </button>

          {/* Scale indicator (static for now) */}
          <div style={s.mapScale}>1 km ├───────┤</div>

          {/* Floating spot card */}
          {selected && (
            <div style={s.spotCard}>
              <div style={s.icHero}>
                <div style={s.icHeroOverlay} />
                <div style={s.icActions}>
                  <button
                    style={s.icActionBtn}
                    aria-label="關閉"
                    title="關閉"
                    onClick={() => setSelected(null)}
                  >
                    <Icon path={ICON.xmark} />
                  </button>
                </div>
                <div style={s.icTitleArea}>
                  {selected.tags[0] && (
                    <div style={s.icDifficulty}>{selected.tags[0]}</div>
                  )}
                  <h2 style={s.icTitle}>{selected.name}</h2>
                  <div style={s.icSubtitle}>
                    <span style={s.icSubtitleMono}>
                      {Number(selected.latitude).toFixed(3)}°N ·{' '}
                      {Number(selected.longitude).toFixed(3)}°E
                    </span>
                    <span>{selected.source === 'global' ? '平台標注景點' : '你的私人景點'}</span>
                  </div>
                </div>
              </div>

              <div style={s.icBody}>
                {/* Sun timing */}
                <div style={s.sunTiming}>
                  <div style={s.sunLabel}>
                    {goldenMin !== null && <span style={s.sunPulse} />}
                    黃金時刻{goldenMin !== null ? ' · 進行中' : ''}
                  </div>
                  <div style={s.sunRow}>
                    <div>
                      <div style={s.sunK}>
                        <Icon path={ICON.sun} size={13} /> 日出
                      </div>
                      <div style={s.sunV}>
                        {weatherLoading ? '…' : weather?.sunrise ?? '—'}
                      </div>
                    </div>
                    <div>
                      <div style={s.sunK}>
                        <Icon path={ICON.clock} size={13} /> 剩餘
                      </div>
                      <div style={{ ...s.sunV, ...s.sunVGolden }}>
                        {goldenMin !== null ? (
                          <>
                            {goldenMin}
                            <small style={s.sunVSmall}> 分</small>
                          </>
                        ) : (
                          '—'
                        )}
                      </div>
                    </div>
                    <div>
                      <div style={s.sunK}>
                        <Icon path={ICON.moon} size={13} /> 日落
                      </div>
                      <div style={s.sunV}>
                        {weatherLoading ? '…' : weather?.sunset ?? '—'}
                      </div>
                    </div>
                  </div>
                </div>

                {/* Weather grid (2x2) */}
                <div style={s.weatherGrid}>
                  <div style={{ ...s.wxCell, ...s.wxCellWeather }}>
                    <div style={{ ...s.wxIcon, ...s.wxIconWeather }}>
                      <Icon path={ICON.cloud} size={20} />
                    </div>
                    <div style={s.wxText}>
                      <div style={s.wxK}>天氣</div>
                      <div style={s.wxV}>
                        {weatherLoading ? (
                          '載入中…'
                        ) : weatherError || !currentForecast ? (
                          '—'
                        ) : (
                          <>
                            {currentForecast.temp_max}°
                            <small style={s.wxVSmall}>
                              C · {currentForecast.weather_description}
                            </small>
                          </>
                        )}
                      </div>
                    </div>
                  </div>
                  <div style={{ ...s.wxCell, ...s.wxCellRain }}>
                    <div style={{ ...s.wxIcon, ...s.wxIconRain }}>
                      <Icon path={ICON.drop} size={20} />
                    </div>
                    <div style={s.wxText}>
                      <div style={s.wxK}>降雨機率</div>
                      <div style={s.wxV}>
                        {currentForecast ? (
                          <>
                            {currentForecast.pop}
                            <small style={s.wxVSmall}>%</small>
                          </>
                        ) : (
                          '—'
                        )}
                      </div>
                    </div>
                  </div>
                  <div style={{ ...s.wxCell, ...s.wxCellWind }}>
                    <div style={{ ...s.wxIcon, ...s.wxIconWind }}>
                      <Icon path={ICON.wind} size={20} />
                    </div>
                    <div style={s.wxText}>
                      <div style={s.wxK}>風速</div>
                      <div style={s.wxV}>{currentForecast?.wind_speed ?? '—'}</div>
                    </div>
                  </div>
                  <div style={{ ...s.wxCell, ...s.wxCellVis }}>
                    <div style={{ ...s.wxIcon, ...s.wxIconVis }}>
                      <Icon path={ICON.eye} size={20} />
                    </div>
                    <div style={s.wxText}>
                      <div style={s.wxK}>能見度</div>
                      <div style={s.wxV}>—</div>
                    </div>
                  </div>
                </div>

                {selected.source === 'global' && selected.description && (
                  <div style={{ fontSize: '13px', color: t.inkSoft, lineHeight: 1.6, marginBottom: '14px' }}>
                    {selected.description}
                  </div>
                )}

                <div style={{ marginBottom: '14px' }}>
                  <div style={{ fontSize: '12px', fontWeight: 600, marginBottom: '8px', color: t.ink }}>
                    {selected.source === 'global' ? '這個景點的公開照片' : '這個景點的照片'}
                  </div>
                  {locationPhotosLoading ? (
                    <div style={{ fontSize: '12px', color: t.inkMute }}>照片載入中…</div>
                  ) : locationPhotos.length === 0 ? (
                    <div style={{ fontSize: '12px', color: t.inkMute }}>目前還沒有照片</div>
                  ) : (
                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '6px' }}>
                      {locationPhotos.slice(0, 6).map((photo) => (
                        <button
                          key={photo.id}
                          type="button"
                          onClick={() => navigate(`/photos/${photo.id}`)}
                          style={{ aspectRatio: '1', border: `1px solid ${t.line}`, borderRadius: '8px', overflow: 'hidden', background: t.paper2, padding: 0, cursor: 'pointer' }}
                          title={photo.caption || '查看照片'}
                        >
                          {photo.thumb_url || photo.url ? (
                            <img
                              src={photo.thumb_url || photo.url}
                              alt={photo.caption || ''}
                              style={{ width: '100%', height: '100%', objectFit: 'cover', display: 'block' }}
                            />
                          ) : (
                            <div style={{ width: '100%', height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', color: t.inkMute, fontSize: '11px' }}>
                              無預覽
                            </div>
                          )}
                        </button>
                      ))}
                    </div>
                  )}
                </div>
              </div>

              {/* Actions */}
              <div style={s.icFoot}>
                <button
                  style={s.icBtn}
                  onClick={() => openUploadForLocation(selected)}
                >
                  上傳到這裡
                </button>
                <button
                  style={{ ...s.icBtn, ...s.icBtnPrimary }}
                  onClick={() =>
                    window.open(
                      `https://www.google.com/maps/dir/?api=1&destination=${selected.latitude},${selected.longitude}`,
                      '_blank'
                    )
                  }
                >
                  <Icon path={ICON.mapPin} size={16} /> 導航
                </button>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Add location modal */}
      {showModal && (
        <AddLocationModal
          onClose={() => setShowModal(false)}
          onAdded={() => queryClient.invalidateQueries({ queryKey: ['locations'] })}
        />
      )}
    </div>
  )
}

export default MapExplore
