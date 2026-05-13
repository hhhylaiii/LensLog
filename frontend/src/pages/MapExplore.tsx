import React, { useState, useEffect, useMemo } from 'react'
import { MapContainer, TileLayer, useMap } from 'react-leaflet'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { useForm } from 'react-hook-form'
import L from 'leaflet'
import 'leaflet/dist/leaflet.css'
import 'leaflet.markercluster/dist/MarkerCluster.css'
import 'leaflet.markercluster/dist/MarkerCluster.Default.css'
import 'leaflet.markercluster'
import api from '../lib/api'

// Fix Leaflet default marker icons in bundled apps
import markerIconUrl from 'leaflet/dist/images/marker-icon.png'
import markerIconRetinaUrl from 'leaflet/dist/images/marker-icon-2x.png'
import markerShadowUrl from 'leaflet/dist/images/marker-shadow.png'

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
  // Floating spot card
  spotCard: {
    position: 'absolute',
    top: '14px',
    right: '14px',
    width: '280px',
    background: t.card,
    border: `1px solid ${t.line}`,
    borderRadius: '8px',
    padding: '14px',
    boxShadow: '0 10px 28px rgba(16,24,40,0.12), 0 2px 6px rgba(16,24,40,0.06)',
    zIndex: 500,
  },
  spotHead: { display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between' },
  spotMono: {
    fontFamily: "'IBM Plex Mono', monospace",
    fontSize: '11px',
    color: t.inkMute,
  },
  spotTitle: {
    fontSize: '18px',
    fontWeight: 600,
    margin: '2px 0 0',
    color: t.ink,
    letterSpacing: '-0.02em',
  },
  spotMetaSm: { fontSize: '12px', color: t.inkSoft, marginTop: '2px' },
  closeBtn: {
    width: '24px',
    height: '24px',
    border: `1px solid ${t.line}`,
    borderRadius: '6px',
    background: t.card,
    color: t.ink,
    fontSize: '12px',
    cursor: 'pointer',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    flexShrink: 0,
  },
  photoGrid: {
    display: 'grid',
    gridTemplateColumns: 'repeat(4, 1fr)',
    gap: '4px',
    margin: '10px 0',
  },
  photoTile: {
    height: '44px',
    borderRadius: '6px',
    border: `1px solid ${t.line}`,
    background:
      'linear-gradient(160deg, #6b82a8 0%, #4c6590 28%, #334a75 52%, #22355b 78%, #1a2942 100%)',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
  },
  photoTileMore: {
    fontFamily: "'IBM Plex Mono', monospace",
    fontSize: '10px',
    background: 'rgba(255,255,255,0.9)',
    padding: '2px 6px',
    borderRadius: '3px',
    color: t.inkSoft,
  },
  weatherCard: {
    background: t.card,
    border: `1px solid ${t.line}`,
    borderRadius: '8px',
    padding: '8px',
    marginBottom: '8px',
    display: 'flex',
    justifyContent: 'space-between',
    gap: '8px',
  },
  weatherCol: { paddingLeft: '8px' },
  weatherColFirst: { paddingLeft: 0 },
  weatherColDivider: { borderLeft: `1px solid ${t.line}` },
  weatherLabel: {
    fontFamily: "'IBM Plex Mono', monospace",
    fontSize: '11px',
    color: t.inkMute,
  },
  weatherValue: { fontSize: '13px', fontWeight: 500, color: t.ink },
  weatherAccent: {
    fontSize: '13px',
    fontWeight: 500,
    color: t.accent,
    display: 'inline-flex',
    alignItems: 'center',
    gap: '5px',
  },
  pulseDot: {
    width: '6px',
    height: '6px',
    borderRadius: '50%',
    background: t.accent,
    flexShrink: 0,
    animation: 'lensLogPulse 2s ease-out infinite',
  },
  socialRow: {
    display: 'flex',
    alignItems: 'center',
    gap: '8px',
    marginBottom: '10px',
  },
  avatarStack: { display: 'flex' },
  socialAvatar: {
    width: '24px',
    height: '24px',
    borderRadius: '50%',
    border: `1.5px solid ${t.card}`,
    boxShadow: `0 0 0 1px ${t.line}`,
  },
  socialMore: {
    width: '24px',
    height: '24px',
    borderRadius: '50%',
    border: `1.5px solid ${t.card}`,
    boxShadow: `0 0 0 1px ${t.line}`,
    background: t.paper2,
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    fontSize: '9px',
    fontFamily: "'IBM Plex Mono', monospace",
    color: t.inkMute,
    marginLeft: '-8px',
  },
  socialText: { fontSize: '11px', color: t.inkSoft },
  spotActions: { display: 'flex', gap: '6px' },
  btnSm: {
    flex: 1,
    height: '26px',
    fontSize: '12px',
    fontWeight: 500,
    border: `1px solid ${t.line}`,
    borderRadius: '6px',
    background: t.card,
    color: t.ink,
    cursor: 'pointer',
  },
  btnSmPrimary: {
    flex: 1,
    height: '26px',
    fontSize: '12px',
    fontWeight: 500,
    border: `1px solid ${t.accent}`,
    borderRadius: '6px',
    background: t.accent,
    color: '#fff',
    cursor: 'pointer',
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

// ─── ClusterMarkers — renders all locations as a clustered layer ──────────────

interface ClusterMarkersProps {
  locations: Location[]
  onSelect: (loc: Location) => void
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
  const queryClient = useQueryClient()
  const [search, setSearch] = useState('')
  const [target, setTarget] = useState<[number, number] | null>(null)
  const [showModal, setShowModal] = useState(false)
  const [selectedTag, setSelectedTag] = useState<string | null>(null)
  const [selected, setSelected] = useState<Location | null>(null)
  const [spotListOpen, setSpotListOpen] = useState(true)
  const [mapInstance, setMapInstance] = useState<L.Map | null>(null)

  const { data: locations = [] } = useQuery<Location[]>({
    queryKey: ['locations'],
    queryFn: () => api.get('/locations').then((r) => r.data),
  })

  const { data: weather, isLoading: weatherLoading, isError: weatherError } =
    useQuery<WeatherForecast>({
      queryKey: ['weather', selected?.id],
      queryFn: () =>
        api.get(`/locations/${selected!.id}/weather`).then((r) => r.data),
      enabled: !!selected,
      staleTime: 1000 * 60 * 30,
      retry: false,
    })

  const currentForecast = weather?.forecasts?.[0]

  const allTags = useMemo(
    () => Array.from(new Set(locations.flatMap((l) => l.tags))),
    [locations]
  )

  const filtered = useMemo(
    () =>
      locations.filter((l) => {
        const matchesSearch = l.name.toLowerCase().includes(search.toLowerCase())
        const matchesTag = selectedTag ? l.tags.includes(selectedTag) : true
        return matchesSearch && matchesTag
      }),
    [locations, search, selectedTag]
  )

  const handleSelect = (loc: Location) => {
    setSelected(loc)
    setTarget([loc.latitude, loc.longitude])
  }

  const goldenMin = goldenMinutesLeft(weather?.sunset ?? null)

  return (
    <div style={s.page}>
      <PulseStyle />

      {/* Topbar: heading + search + chips + add + avatar (single row) */}
      <div style={s.topbar}>
        <h2 style={s.topbarHeading}>探索攝影地圖</h2>
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
        <button style={s.btnPrimary} onClick={() => setShowModal(true)}>
          ＋ 新增景點
        </button>
        <div style={s.avatar} />
      </div>

      {/* Body: list + map */}
      <div style={s.body}>
        {/* Slide-in spot list panel */}
        <div style={{ ...s.spotList, ...(spotListOpen ? {} : s.spotListClosed) }}>
          <div style={s.spotListInner}>
            <div style={s.listHeader}>全台 {locations.length} 處 · 距離</div>
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
                        <div style={s.itemMeta}>
                          {loc.tags[0] || '景點'} · ★ 4.{(loc.id.charCodeAt(0) % 9) + 1}
                        </div>
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
              <div style={s.spotHead}>
                <div>
                  <div style={s.spotMono}>已選景點</div>
                  <h2 style={s.spotTitle}>{selected.name}</h2>
                  <div style={s.spotMetaSm}>
                    ★ 4.{(selected.id.charCodeAt(0) % 9) + 1} ·{' '}
                    {selected.tags.length > 0 ? selected.tags.join(' · ') : '景點'}
                  </div>
                </div>
                <button style={s.closeBtn} onClick={() => setSelected(null)}>
                  ✕
                </button>
              </div>

              {/* Photos placeholder */}
              <div style={s.photoGrid}>
                <div style={s.photoTile} />
                <div style={s.photoTile} />
                <div style={s.photoTile} />
                <div style={s.photoTile}>
                  <span style={s.photoTileMore}>+9</span>
                </div>
              </div>

              {/* Weather / Sunset / Golden */}
              <div style={s.weatherCard}>
                <div style={s.weatherColFirst}>
                  <div style={s.weatherLabel}>天氣</div>
                  <div style={s.weatherValue}>
                    {weatherLoading
                      ? '載入中…'
                      : weatherError || !currentForecast
                      ? '—'
                      : `${currentForecast.weather_description} ${currentForecast.temp_max}°`}
                  </div>
                </div>
                <div style={{ ...s.weatherCol, ...s.weatherColDivider }}>
                  <div style={s.weatherLabel}>日落</div>
                  <div style={s.weatherValue}>
                    {weatherLoading ? '…' : weather?.sunset ?? '—'}
                  </div>
                </div>
                <div style={{ ...s.weatherCol, ...s.weatherColDivider }}>
                  <div style={s.weatherLabel}>黃金剩</div>
                  <div style={s.weatherAccent}>
                    {goldenMin !== null && (
                      <>
                        <span style={s.pulseDot} />
                        {goldenMin} 分
                      </>
                    )}
                    {goldenMin === null && <span style={{ color: t.inkMute }}>—</span>}
                  </div>
                </div>
              </div>

              {/* Social */}
              <div style={s.socialRow}>
                <div style={s.avatarStack}>
                  <div style={{ ...s.socialAvatar, background: '#c9d1dd' }} />
                  <div
                    style={{ ...s.socialAvatar, background: '#b8c4d6', marginLeft: '-8px' }}
                  />
                  <div
                    style={{ ...s.socialAvatar, background: '#a2b0c7', marginLeft: '-8px' }}
                  />
                  <div style={s.socialMore}>+24</div>
                </div>
                <div style={s.socialText}>27 位攝影師拍過 · ♡ 186</div>
              </div>

              {/* Actions */}
              <div style={s.spotActions}>
                <button style={s.btnSm}>♡ 收藏</button>
                <button
                  style={s.btnSmPrimary}
                  onClick={() =>
                    window.open(
                      `https://www.google.com/maps/dir/?api=1&destination=${selected.latitude},${selected.longitude}`,
                      '_blank'
                    )
                  }
                >
                  → 導航
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
