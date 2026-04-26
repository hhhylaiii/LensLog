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
    padding: '24px 32px',
    boxSizing: 'border-box',
    overflow: 'auto',
    letterSpacing: '-0.005em',
  },
  topbar: { display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '20px' },
  search: {
    flex: 1,
    maxWidth: '360px',
    height: '34px',
    border: `1px solid ${t.line}`,
    borderRadius: '6px',
    background: t.card,
    padding: '0 12px',
    fontSize: '13px',
    color: t.ink,
    outline: 'none',
    boxSizing: 'border-box',
  },
  btnPrimary: {
    height: '34px',
    padding: '0 14px',
    border: `1px solid ${t.accent}`,
    borderRadius: '6px',
    background: t.accent,
    color: '#fff',
    fontSize: '13px',
    fontWeight: 500,
    cursor: 'pointer',
  },
  avatar: {
    width: '32px',
    height: '32px',
    borderRadius: '50%',
    background: t.paper2,
    border: `1px solid ${t.line}`,
    marginLeft: 'auto',
  },
  h1: {
    fontSize: '24px',
    fontWeight: 600,
    letterSpacing: '-0.02em',
    margin: '0 0 2px',
    color: t.ink,
  },
  underline: { position: 'relative', display: 'inline-block', paddingBottom: '3px' },
  underlineBar: {
    position: 'absolute',
    left: 0,
    right: 0,
    bottom: 0,
    height: '2px',
    background: t.accent,
    borderRadius: '1px',
  },
  pageSub: { color: t.inkSoft, fontSize: '13px', margin: '0 0 20px' },
  chipRow: { marginBottom: '12px', display: 'flex', flexWrap: 'wrap', gap: '4px' },
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
  },
  chipOn: { background: t.ink, borderColor: t.ink, color: '#fff', fontWeight: 500 },
  chipNeutral: { background: t.paper2, color: t.ink },
  body: {
    display: 'grid',
    gridTemplateColumns: '300px 1fr',
    gap: '14px',
    height: 'calc(100vh - 220px)',
    minHeight: '460px',
    position: 'relative',
  },
  // List card
  listCard: {
    background: t.card,
    border: `1px solid ${t.line}`,
    borderRadius: '8px',
    padding: '8px',
    overflow: 'auto',
  },
  listHeader: { padding: '4px 8px 8px', fontSize: '12px', color: t.inkSoft },
  listItems: { display: 'grid', gap: '8px' },
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
  // Map
  mapWrap: {
    position: 'relative',
    border: `1px solid ${t.line}`,
    borderRadius: '8px',
    overflow: 'hidden',
    background: t.paper2,
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
    }
    .lenslog-pin-shape {
      width: 14px;
      height: 20px;
      margin: 2px 5px;
      background: #1e5fb3;
      border: 1.5px solid #ffffff;
      border-radius: 50% 50% 50% 0;
      transform: rotate(-45deg);
      box-shadow: 0 2px 4px rgba(26, 41, 66, 0.3);
    }
    .lenslog-pin-shape.active {
      background: #60a5fa;
      border-color: #1a2942;
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

const pinIcon = L.divIcon({
  className: 'lenslog-pin',
  html: '<div class="lenslog-pin-shape"></div>',
  iconSize: [24, 24],
  iconAnchor: [12, 22],
  popupAnchor: [0, -22],
})

const activePinIcon = L.divIcon({
  className: 'lenslog-pin',
  html: '<div class="lenslog-pin-shape active"></div>',
  iconSize: [24, 24],
  iconAnchor: [12, 22],
  popupAnchor: [0, -22],
})

// ─── MapExplore ───────────────────────────────────────────────────────────────

const MapExplore: React.FC = () => {
  const queryClient = useQueryClient()
  const [search, setSearch] = useState('')
  const [target, setTarget] = useState<[number, number] | null>(null)
  const [showModal, setShowModal] = useState(false)
  const [selectedTag, setSelectedTag] = useState<string | null>(null)
  const [selected, setSelected] = useState<Location | null>(null)

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

      {/* Topbar: search + add + avatar */}
      <div style={s.topbar}>
        <input
          style={s.search}
          placeholder="🔍  搜尋景點、城市、標籤…"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
        />
        <button style={s.btnPrimary} onClick={() => setShowModal(true)}>
          ＋ 新增景點
        </button>
        <div style={s.avatar} />
      </div>

      {/* Heading */}
      <h1 style={s.h1}>
        探索
        <span style={s.underline}>
          攝影路線
          <span style={s.underlineBar} />
        </span>
      </h1>
      <p style={s.pageSub}>
        全台 {locations.length} 處攝影熱點 · {Math.floor(locations.length * 0.06)} 處收藏
      </p>

      {/* Tag chips */}
      <div style={s.chipRow}>
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
        <button style={{ ...s.chip, ...s.chipNeutral }} onClick={() => setShowModal(true)}>
          ＋自訂
        </button>
      </div>

      {/* Body: list + map */}
      <div style={s.body}>
        {/* List card */}
        <div style={s.listCard}>
          <div style={s.listHeader}>排序: 距離 ↓</div>
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

        {/* Map */}
        <div style={s.mapWrap}>
          <MapContainer
            center={[25.033, 121.5654]}
            zoom={11}
            style={{ height: '100%', width: '100%' }}
          >
            <TileLayer
              url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
              attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'
            />
            <MapController target={target} />
            <ClusterMarkers
              locations={filtered}
              onSelect={handleSelect}
              selectedId={selected?.id ?? null}
            />
          </MapContainer>

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
