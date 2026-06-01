import React, { useState, useEffect } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { MapContainer, TileLayer, Marker, Popup } from 'react-leaflet'
import { Camera, Wrench, Maximize2, Aperture, Timer, BarChart2, CalendarDays, MapPin } from 'lucide-react'

import 'leaflet/dist/leaflet.css'
import L from 'leaflet'
import markerIconUrl from 'leaflet/dist/images/marker-icon.png'
import markerIconRetinaUrl from 'leaflet/dist/images/marker-icon-2x.png'
import markerShadowUrl from 'leaflet/dist/images/marker-shadow.png'
import api from '../lib/api'
import T from '../styles/tokens'
import { useBreakpoint } from '../hooks/useBreakpoint'

delete (L.Icon.Default.prototype as any)._getIconUrl
L.Icon.Default.mergeOptions({
  iconUrl: markerIconUrl,
  iconRetinaUrl: markerIconRetinaUrl,
  shadowUrl: markerShadowUrl,
})

// ─── Types ────────────────────────────────────────────────────────────────────

interface ExifData {
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

interface PhotoFull {
  id: string
  user_id: string
  user_location_id?: string
  global_location_id?: string
  location_id?: string
  location_source?: 'user' | 'global'
  s3_key: string
  thumb_key?: string
  url?: string
  thumb_url?: string
  caption?: string
  tags: string[]
  is_public: boolean
  taken_at?: string
  created_at: string
  exif?: ExifData
}

interface Location {
  id: string
  name: string
  description?: string
  latitude: number
  longitude: number
  tags: string[]
}

interface GlobalLocation {
  id: string
  name: string
  description?: string
  latitude: number
  longitude: number
}

const privacyStyles = {
  shared: {
    background: [
      'linear-gradient(145deg, rgba(255,255,255,0.92), rgba(255,255,255,0.64))',
      'radial-gradient(circle at 28% 16%, rgba(255,255,255,0.98), transparent 32%)',
      'linear-gradient(180deg, rgba(219,255,235,0.52), rgba(255,255,255,0.08) 46%, rgba(33,200,117,0.08))',
    ].join(', '),
    border: '1px solid rgba(33,200,117,0.42)',
    color: '#0f7a3f',
    boxShadow: [
      'inset 0 1px 0 rgba(255,255,255,0.98)',
      'inset 0 -8px 16px rgba(33,200,117,0.08)',
      '0 0 0 1px rgba(255,255,255,0.72)',
      '0 10px 24px rgba(26,41,66,0.12)',
      '0 0 18px rgba(33,200,117,0.14)',
    ].join(', '),
    textShadow: '0 1px 0 rgba(255,255,255,0.72)',
  },
  private: {
    background: [
      'linear-gradient(145deg, rgba(255,255,255,0.94), rgba(255,255,255,0.62))',
      'radial-gradient(circle at 28% 16%, rgba(255,255,255,0.98), transparent 32%)',
      'linear-gradient(180deg, rgba(255,224,235,0.6), rgba(255,255,255,0.08) 46%, rgba(240,111,157,0.1))',
    ].join(', '),
    border: '1px solid rgba(240,111,157,0.48)',
    color: '#b83263',
    boxShadow: [
      'inset 0 1px 0 rgba(255,255,255,0.98)',
      'inset 0 -8px 16px rgba(240,111,157,0.09)',
      '0 0 0 1px rgba(255,255,255,0.74)',
      '0 10px 24px rgba(26,41,66,0.12)',
      '0 0 18px rgba(240,111,157,0.16)',
    ].join(', '),
    textShadow: '0 1px 0 rgba(255,255,255,0.72)',
  },
}

// ─── Styles ───────────────────────────────────────────────────────────────────

const s: Record<string, React.CSSProperties> = {
  page: {
    padding: '32px 40px',
    color: T.ink,
    background: T.paper,
    fontFamily: "'Inter', system-ui, sans-serif",
    minHeight: '100%',
    boxSizing: 'border-box',
  },
  back: {
    display: 'inline-flex',
    alignItems: 'center',
    gap: '6px',
    color: T.inkSoft,
    fontSize: '13px',
    cursor: 'pointer',
    marginBottom: '24px',
    background: 'none',
    border: 'none',
    padding: 0,
    transition: 'color 0.15s',
  },
  layout: {
    display: 'grid',
    gridTemplateColumns: '1fr 380px',
    gap: '28px',
    alignItems: 'flex-start',
    position: 'relative' as const,
  },
  imageColumn: {
    position: 'relative' as const,
    minHeight: 'calc(100vh - 140px)',
  },

  // Image
  imageWrap: {
    background: T.card,
    border: `1px solid ${T.line}`,
    borderRadius: '14px',
    overflow: 'hidden',
    aspectRatio: '4/3',
    maxHeight: 'calc(100vh - 160px)',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    position: 'relative',
    margin: '0 auto',
  },
  image: { width: '100%', height: '100%', objectFit: 'contain' as const },
  imageWrapNatural: {
    background: T.card,
    border: `1px solid ${T.line}`,
    borderRadius: '14px',
    overflow: 'hidden',
    maxHeight: 'calc(100vh - 160px)',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    position: 'relative' as const,
    margin: '0 auto',
  },
  navZoneLeft: {
    position: 'absolute' as const,
    left: '-40px', top: 0,
    width: 'calc(50% + 40px)', height: '100%',
    cursor: 'w-resize',
    zIndex: 5,
  },
  navZoneRight: {
    position: 'absolute' as const,
    right: '-28px', top: 0,
    width: 'calc(50% + 28px)', height: '100%',
    cursor: 'e-resize',
    zIndex: 5,
  },
  imagePlaceholder: { color: T.inkMute, fontSize: '80px', userSelect: 'none' as const },
  imageError: {
    display: 'flex',
    flexDirection: 'column' as const,
    alignItems: 'center',
    gap: '12px',
    color: T.inkMute,
    fontSize: '14px',
  },

  // Panel
  panel: { display: 'flex', flexDirection: 'column' as const, gap: '16px' },

  // Caption card
  captionCard: {
    background: T.card,
    border: `1px solid ${T.line}`,
    borderRadius: '12px',
    padding: '20px',
  },
  captionHeader: {
    display: 'flex',
    alignItems: 'flex-start',
    justifyContent: 'space-between',
    gap: '12px',
    marginBottom: '10px',
  },
  captionText: { fontSize: '17px', fontWeight: 600, color: T.ink, lineHeight: 1.4, flex: 1, cursor: 'text' },
  captionEmpty: { fontSize: '17px', fontWeight: 600, color: T.inkMute, lineHeight: 1.4, flex: 1, cursor: 'text' },
  captionInput: {
    flex: 1,
    background: T.card,
    border: `1px solid ${T.line}`,
    borderRadius: '8px',
    color: T.ink,
    fontSize: '15px',
    fontWeight: 600,
    padding: '8px 12px',
    resize: 'vertical' as const,
    fontFamily: "'Inter', system-ui, sans-serif",
    lineHeight: 1.4,
    outline: 'none',
    width: '100%',
    boxSizing: 'border-box' as const,
  },
  metaRow: {
    display: 'flex',
    alignItems: 'center',
    gap: '8px',
    fontSize: '12px',
    color: T.inkMute,
    flexWrap: 'wrap' as const,
    marginBottom: '14px',
  },
  metaDot: { color: T.inkMute },

  // Edit / save buttons
  editBtn: {
    background: T.card,
    border: `1px solid ${T.line}`,
    borderRadius: '8px',
    color: T.inkSoft,
    fontSize: '12px',
    padding: '5px 12px',
    cursor: 'pointer',
    flexShrink: 0,
    transition: 'background 0.15s, color 0.15s',
    whiteSpace: 'nowrap' as const,
  },
  actionRow: { display: 'flex', gap: '8px', marginTop: '12px' },
  saveBtn: {
    flex: 1,
    background: T.accent,
    border: 'none',
    borderRadius: '8px',
    color: '#fff',
    fontSize: '13px',
    fontWeight: 600,
    padding: '9px',
    cursor: 'pointer',
    transition: 'opacity 0.15s',
  },
  cancelBtn: {
    flex: 1,
    background: T.card,
    border: `1px solid ${T.line}`,
    borderRadius: '8px',
    color: T.inkSoft,
    fontSize: '13px',
    padding: '9px',
    cursor: 'pointer',
  },

  // Location select (edit mode)
  locationSelect: {
    width: '100%',
    background: T.card,
    border: `1px solid ${T.line}`,
    borderRadius: '8px',
    color: T.ink,
    fontSize: '13px',
    padding: '8px 12px',
    outline: 'none',
    cursor: 'pointer',
    marginTop: '8px',
  },
  locationLabel: { fontSize: '12px', color: T.inkMute, marginTop: '12px', marginBottom: '4px' },

  // Toggle
  toggleRow: {
    display: 'flex',
    alignItems: 'center',
    gap: '10px',
    paddingTop: '14px',
    borderTop: `1px solid ${T.lineSoft}`,
  },
  toggleLabel: { fontSize: '13px', color: T.inkSoft, flex: 1 },
  toggleBtn: {
    padding: '7px 18px',
    borderRadius: '999px',
    fontSize: '12px',
    fontWeight: 700,
    cursor: 'pointer',
    backdropFilter: 'blur(16px) saturate(180%)',
    WebkitBackdropFilter: 'blur(16px) saturate(180%)',
    transition: 'opacity 0.15s, box-shadow 0.15s',
    letterSpacing: '0.02em',
  },

  // EXIF card
  exifCard: {
    background: T.card,
    border: `1px solid ${T.line}`,
    borderRadius: '12px',
    overflow: 'visible',
  },
  exifHeader: {
    padding: '14px 18px',
    borderBottom: `1px solid ${T.lineSoft}`,
    fontSize: '12px',
    fontWeight: 600,
    color: T.inkMute,
    letterSpacing: '0.07em',
    textTransform: 'uppercase' as const,
  },
  exifBody: { padding: '4px 0' },
  exifRow: {
    display: 'flex',
    alignItems: 'flex-start',
    gap: '12px',
    padding: '10px 18px',
    borderBottom: `1px solid ${T.lineSoft}`,
    minWidth: 0,
  },
  exifIcon: { fontSize: '16px', width: '22px', textAlign: 'center' as const, flexShrink: 0 },
  exifLabel: {
    fontSize: '11px',
    color: T.inkMute,
    width: '72px',
    flexShrink: 0,
    letterSpacing: '0.04em',
  },
  exifValue: {
    fontSize: '13px',
    color: T.ink,
    flex: 1,
    minWidth: 0,
    overflowWrap: 'anywhere' as const,
    wordBreak: 'break-word' as const,
    whiteSpace: 'normal' as const,
    lineHeight: 1.45,
  },
  exifValueEmpty: {
    fontSize: '13px',
    color: T.inkMute,
    flex: 1,
    lineHeight: 1.45,
  },

  // Location card (read-only)
  locationCard: {
    background: T.card,
    border: `1px solid ${T.line}`,
    borderRadius: '12px',
    overflow: 'hidden',
    cursor: 'pointer',
    transition: 'border-color 0.15s',
  },
  locationBody: {
    display: 'flex',
    alignItems: 'center',
    gap: '12px',
    padding: '14px 18px',
  },
  locationIcon: {
    width: '36px',
    height: '36px',
    borderRadius: '8px',
    background: T.paperTwo,
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    fontSize: '16px',
    flexShrink: 0,
  },
  locationName: { fontSize: '14px', fontWeight: 500, color: T.ink, marginBottom: '2px' },
  locationMeta: { fontSize: '11px', color: T.inkMute },
  locationArrow: { color: T.inkMute, fontSize: '14px', marginLeft: 'auto' },

  // Tags
  tagsRow: {
    display: 'flex',
    flexWrap: 'wrap' as const,
    gap: '6px',
    marginBottom: '10px',
  },
  tagChip: {
    background: T.paperTwo,
    border: `1px solid ${T.line}`,
    borderRadius: '20px',
    color: T.inkSoft,
    fontSize: '12px',
    padding: '3px 10px',
  },

  // GPS mini-map
  mapWrap: {
    height: '180px',
    borderRadius: '12px',
    overflow: 'hidden',
    border: `1px solid ${T.line}`,
  },

  // Delete
  deleteBtn: {
    background: T.card,
    border: `1px solid ${T.line}`,
    borderRadius: '8px',
    color: '#a51c30',
    fontSize: '12px',
    padding: '7px',
    cursor: 'pointer',
    width: '100%',
    marginTop: '8px',
  },
  deleteActionRow: { display: 'flex', gap: '8px', marginTop: '14px' },
  saveBtnDanger: {
    flex: 1,
    background: '#ef4444',
    border: 'none',
    borderRadius: '8px',
    color: '#fff',
    fontSize: '13px',
    fontWeight: 600,
    padding: '9px',
    cursor: 'pointer',
    transition: 'opacity 0.15s',
    opacity: 1,
  },
  saveBtnDangerPending: {
    flex: 1,
    background: '#ef4444',
    border: 'none',
    borderRadius: '8px',
    color: '#fff',
    fontSize: '13px',
    fontWeight: 600,
    padding: '9px',
    cursor: 'pointer',
    transition: 'opacity 0.15s',
    opacity: 0.6,
  },

  // Retry button
  retryBtn: {
    background: T.card,
    border: `1px solid ${T.line}`,
    borderRadius: '8px',
    padding: '7px 16px',
    color: T.inkSoft,
    fontSize: '13px',
    cursor: 'pointer',
  },

  // States
  spinner: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    height: '300px',
    color: T.inkMute,
    fontSize: '14px',
  },
  errorPage: {
    display: 'flex',
    flexDirection: 'column' as const,
    alignItems: 'center',
    justifyContent: 'center',
    height: '300px',
    gap: '12px',
    color: T.inkMute,
    fontSize: '14px',
  },
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

function fmt(iso?: string | null) {
  if (!iso) return null
  return new Date(iso).toLocaleString('zh-TW', {
    year: 'numeric', month: '2-digit', day: '2-digit',
    hour: '2-digit', minute: '2-digit',
  })
}

function cleanLensModel(lens?: string | null) {
  if (!lens) return null
  const cleaned = lens
    .replace(/\b\d+(?:\.\d+)?\s*-\s*\d+(?:\.\d+)?\s*mm\b/gi, '')
    .replace(/\b\d+(?:\.\d+)?\s*mm\b/gi, '')
    .replace(/\bf\s*\/\s*\d+(?:\.\d+)?(?:\s*-\s*\d+(?:\.\d+)?)?\b/gi, '')
    .replace(/\bF\d+(?:\.\d+)?(?:\s*-\s*\d+(?:\.\d+)?)?\b/g, '')
    .replace(/\s{2,}/g, ' ')
    .replace(/\s+([,;/])/g, '$1')
    .replace(/([,;/])\s*([,;/])/g, '$1')
    .replace(/^[\s,;/|-]+|[\s,;/|-]+$/g, '')
    .trim()
  return cleaned || null
}

// ─── SafeImage ────────────────────────────────────────────────────────────────

function SafeImage({ src, style, onFail, onLoad }: {
  src: string
  style?: React.CSSProperties
  onFail?: () => void
  onLoad?: React.ReactEventHandler<HTMLImageElement>
}) {
  const [failed, setFailed] = useState(false)
  if (failed) return null
  return <img src={src} alt="" style={style} onError={() => { setFailed(true); onFail?.() }} onLoad={onLoad} />
}

// ─── ExifRow — always rendered, shows "—" when value is missing ───────────────

function ExifRow({ icon, label, value }: { icon: React.ReactNode; label: string; value?: string | number | null }) {
  const isEmpty = value == null || value === ''
  return (
    <div style={s.exifRow}>
      <span style={s.exifIcon}>{icon}</span>
      <span style={s.exifLabel}>{label}</span>
      <span style={isEmpty ? s.exifValueEmpty : s.exifValue}>
        {isEmpty ? '—' : value}
      </span>
    </div>
  )
}

// ─── MiniMap ─────────────────────────────────────────────────────────────────

function MiniMap({ lat, lng }: { lat: number; lng: number }) {
  return (
    <div style={s.mapWrap}>
      <MapContainer
        center={[lat, lng]}
        zoom={13}
        style={{ height: '100%', width: '100%' }}
        scrollWheelZoom={false}
        zoomControl={false}
        attributionControl={false}
      >
        <TileLayer url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png" />
        <Marker position={[lat, lng]}>
          <Popup>GPS: {lat.toFixed(5)}, {lng.toFixed(5)}</Popup>
        </Marker>
      </MapContainer>
    </div>
  )
}

// ─── PhotoView ────────────────────────────────────────────────────────────────

const PhotoView: React.FC = () => {
  const { id } = useParams<{ id: string }>()
  const navigate = useNavigate()
  const qc = useQueryClient()
  const { isMobile } = useBreakpoint()

  const [imgFailed, setImgFailed] = useState(false)
  const [imgRetry, setImgRetry] = useState(0)
  const [imgNaturalRatio, setImgNaturalRatio] = useState<number | null>(null)

  // Edit mode state
  const [isEditing, setIsEditing] = useState(false)
  const [draftCaption, setDraftCaption] = useState('')
  const [draftLocationValue, setDraftLocationValue] = useState('')

  const { data: photo, isLoading, isError } = useQuery<PhotoFull>({
    queryKey: ['photo', id],
    queryFn: () => api.get(`/photos/${id}`).then((r) => r.data),
    enabled: !!id,
  })

  const { data: locations = [] } = useQuery<Location[]>({
    queryKey: ['locations'],
    queryFn: () => api.get('/locations').then((r) => r.data),
  })
  const { data: globalLocations = [] } = useQuery<GlobalLocation[]>({
    queryKey: ['global-locations'],
    queryFn: () => api.get('/global-locations').then((r) => r.data),
  })

  const { data: photoList = [] } = useQuery<PhotoFull[]>({
    queryKey: ['photos', 'profile-all'],
    queryFn: () => api.get('/photos?limit=500').then((r) => r.data),
    staleTime: 30_000,
  })

  // Reset natural ratio when navigating to a different photo
  useEffect(() => { setImgNaturalRatio(null) }, [id])

  // Initialise drafts whenever photo loads or edit mode opens
  useEffect(() => {
    if (photo && isEditing) {
      setDraftCaption(photo.caption ?? '')
      setDraftLocationValue(photo.location_id && photo.location_source ? `${photo.location_source}:${photo.location_id}` : '')
    }
  }, [photo, isEditing])

  const togglePublic = useMutation({
    mutationFn: () =>
      api.patch(`/photos/${id}`, { is_public: !photo?.is_public }).then((r) => r.data),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['photo', id] })
      qc.invalidateQueries({ queryKey: ['photos', 'profile-all'] })
    },
  })

  const deletePhoto = useMutation({
    mutationFn: () => api.delete(`/photos/${id}`),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['photos', 'profile-all'] })
      const idx = photoList.findIndex(p => p.id === id)
      const target = photoList[idx + 1]?.id ?? photoList[idx - 1]?.id
      if (target) navigate(`/photos/${target}`)
      else navigate('/profile')
    },
  })

  const saveEdit = useMutation({
    mutationFn: () =>
      api.patch(`/photos/${id}`, {
        caption: draftCaption.trim() || null,
        user_location_id: draftLocationValue.startsWith('user:') ? draftLocationValue.slice(5) : null,
        global_location_id: draftLocationValue.startsWith('global:') ? draftLocationValue.slice(7) : null,
      }).then((r) => r.data),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['photo', id] })
      qc.invalidateQueries({ queryKey: ['photos', 'profile-all'] })
      setIsEditing(false)
    },
  })

  const handleEditOpen = () => {
    setDraftCaption(photo?.caption ?? '')
    setDraftLocationValue(photo?.location_id && photo.location_source ? `${photo.location_source}:${photo.location_id}` : '')
    setIsEditing(true)
  }

  const handleEditCancel = () => setIsEditing(false)

  if (isLoading) return <div style={s.spinner}>載入中…</div>
  if (isError || !photo) {
    return (
      <div style={s.errorPage}>
        <span>找不到照片</span>
        <button style={s.retryBtn} onClick={() => navigate(-1)}>← 返回</button>
      </div>
    )
  }

  const exif = photo.exif
  const hasGps = exif?.gps_lat != null && exif?.gps_lng != null
  const cameraLabel = [exif?.make, exif?.model].filter(Boolean).join(' ') || null
  const lensLabel = cleanLensModel(exif?.lens_model)
  const location = photo.location_id ? locations.find((l) => l.id === photo.location_id) : undefined

  const currentIdx = photoList.findIndex(p => p.id === id)
  const prevId = currentIdx > 0 ? photoList[currentIdx - 1].id : null
  const nextId = currentIdx !== -1 && currentIdx < photoList.length - 1 ? photoList[currentIdx + 1].id : null
  const fitsFrame = imgNaturalRatio === null || Math.abs(imgNaturalRatio - 4 / 3) < 0.1

  return (
    <div style={{ ...s.page, padding: isMobile ? '12px 16px' : '32px 40px', paddingBottom: isMobile ? '74px' : undefined }}>
      <button style={s.back} onClick={() => navigate('/profile')}>← 返回</button>

      <div style={{ ...s.layout, gridTemplateColumns: isMobile ? '1fr' : '1fr 380px' }}>

        {/* ── Left: large image ── */}
        <div style={{ ...s.imageColumn, minHeight: isMobile ? 'auto' : 'calc(100vh - 140px)' }}>
          <div style={
            fitsFrame
              ? { ...s.imageWrap, maxHeight: isMobile ? 'none' : 'calc(100vh - 160px)' }
              : { ...s.imageWrapNatural, maxHeight: isMobile ? 'none' : 'calc(100vh - 160px)', aspectRatio: imgNaturalRatio ? String(imgNaturalRatio) : 'auto' }
          }>
            {photo.url && !imgFailed ? (
              <SafeImage
                key={imgRetry}
                src={photo.url}
                style={s.image}
                onFail={() => setImgFailed(true)}
                onLoad={(e) => setImgNaturalRatio(
                  e.currentTarget.naturalWidth / e.currentTarget.naturalHeight
                )}
              />
            ) : imgFailed ? (
              <div style={s.imageError}>
                <span style={{ fontSize: '40px', color: T.inkMute }}>◈</span>
                <span>圖片載入失敗</span>
                <button
                  style={s.retryBtn}
                  onClick={() => { setImgFailed(false); setImgRetry((n) => n + 1) }}
                >
                  重試
                </button>
              </div>
            ) : (
              <div style={s.imagePlaceholder}>◈</div>
            )}
          </div>
          {!isMobile && photo.url && !imgFailed && prevId && (
            <div
              style={s.navZoneLeft}
              onClick={(e) => { e.stopPropagation(); navigate(`/photos/${prevId}`) }}
              title="上一張"
            />
          )}
          {!isMobile && photo.url && !imgFailed && nextId && (
            <div
              style={s.navZoneRight}
              onClick={(e) => { e.stopPropagation(); navigate(`/photos/${nextId}`) }}
              title="下一張"
            />
          )}
        </div>

        {/* ── Right: info panel ── */}
        <div style={s.panel}>

          {/* ── Caption + location + toggle ── */}
          <div style={s.captionCard}>

            {/* Caption row */}
            <div style={s.captionHeader}>
              {isEditing ? (
                <textarea
                  style={s.captionInput}
                  rows={2}
                  placeholder="輸入標題…"
                  value={draftCaption}
                  onChange={(e) => setDraftCaption(e.target.value)}
                />
              ) : (
                <div
                  style={photo.caption ? s.captionText : s.captionEmpty}
                  onClick={handleEditOpen}
                  title="點擊編輯標題"
                >
                  {photo.caption || '未命名照片'}
                </div>
              )}
            </div>

            {/* Upload date + dimensions */}
            <div style={s.metaRow}>
              <span>上傳 {fmt(photo.created_at) ?? '—'}</span>
              {exif?.width && exif?.height && (
                <>
                  <span style={s.metaDot}>·</span>
                  <span>{exif.width} × {exif.height}</span>
                </>
              )}
            </div>

            {photo.tags?.length > 0 && (
              <div style={s.tagsRow}>
                {photo.tags.map((tag) => (
                  <span key={tag} style={s.tagChip}>#{tag}</span>
                ))}
              </div>
            )}

            {/* Location selector (edit) or link (read) */}
            {isEditing ? (
              <>
                <div style={s.locationLabel}>所屬景點</div>
                <select
                  style={s.locationSelect}
                  aria-label="所屬景點"
                  value={draftLocationValue}
                  onChange={(e) => setDraftLocationValue(e.target.value)}
                >
                  <option value="">— 無景點 —</option>
                  {locations.map((loc) => (
                    <option key={`user:${loc.id}`} value={`user:${loc.id}`}>我的景點 · {loc.name}</option>
                  ))}
                  {globalLocations.map((loc) => (
                    <option key={`global:${loc.id}`} value={`global:${loc.id}`}>公開景點 · {loc.name}</option>
                  ))}
                </select>
              </>
            ) : location ? (
              <div
                style={{ ...s.locationCard, marginTop: '4px' }}
                onClick={() => navigate('/map')}
                title="在地圖上查看"
              >
                <div style={s.locationBody}>
                  <div style={s.locationIcon}>📍</div>
                  <div>
                    <div style={s.locationName}>{location.name}</div>
                    <div style={s.locationMeta}>
                      {location.tags?.length
                        ? location.tags.join(' · ')
                        : `${Number(location.latitude).toFixed(4)}, ${Number(location.longitude).toFixed(4)}`}
                    </div>
                  </div>
                  <span style={s.locationArrow}>›</span>
                </div>
              </div>
            ) : null}

            {/* Save / Cancel (edit mode) */}
            {isEditing && (
              <div style={s.actionRow}>
                <button
                  type="button"
                  style={{ ...s.saveBtn, opacity: saveEdit.isPending ? 0.6 : 1 }}
                  disabled={saveEdit.isPending}
                  onClick={() => saveEdit.mutate()}
                >
                  {saveEdit.isPending ? '儲存中…' : '儲存'}
                </button>
                <button type="button" style={s.cancelBtn} onClick={handleEditCancel}>取消</button>
              </div>
            )}

            {/* Public / private toggle */}
            <div style={s.toggleRow}>
              <span style={s.toggleLabel}>
                {photo.is_public ? '此照片為公開' : '此照片為私人'}
              </span>
              <button
                type="button"
                style={{
                  ...s.toggleBtn,
                  ...(photo.is_public ? privacyStyles.shared : privacyStyles.private),
                  opacity: togglePublic.isPending ? 0.6 : 1,
                }}
                disabled={togglePublic.isPending}
                onClick={() => togglePublic.mutate()}
                title={photo.is_public ? '點擊設為私人' : '點擊設為公開'}
              >
                {photo.is_public ? '🔓 Shared' : '🔒 Private'}
              </button>
            </div>

            {/* Delete photo */}
            {!isEditing && (
              <button
                type="button"
                style={s.deleteBtn}
                disabled={deletePhoto.isPending}
                onClick={() => deletePhoto.mutate()}
              >
                {deletePhoto.isPending ? '刪除中…' : '刪除照片'}
              </button>
            )}
          </div>

          {/* ── EXIF block — always shows all rows ── */}
          <div style={s.exifCard}>
            <div style={s.exifHeader}>EXIF 資訊</div>
            <div style={s.exifBody}>
              <ExifRow icon={<Camera size={15} />}      label="相機"     value={cameraLabel} />
              <ExifRow icon={<Wrench size={15} />}      label="鏡頭"     value={lensLabel} />
              <ExifRow icon={<Maximize2 size={15} />}   label="焦段"     value={exif?.focal_length != null ? `${exif.focal_length} mm` : null} />
              <ExifRow icon={<Aperture size={15} />}    label="光圈"     value={exif?.aperture != null ? `f/${exif.aperture}` : null} />
              <ExifRow icon={<Timer size={15} />}       label="快門"     value={exif?.shutter_speed} />
              <ExifRow icon={<BarChart2 size={15} />}   label="ISO"      value={exif?.iso} />
              <ExifRow icon={<CalendarDays size={15} />} label="拍攝時間" value={fmt(photo.taken_at)} />
              <ExifRow
                icon={<MapPin size={15} />}
                label="GPS"
                value={hasGps ? `${exif!.gps_lat!.toFixed(5)}, ${exif!.gps_lng!.toFixed(5)}` : null}
              />
            </div>
          </div>

          {/* GPS mini-map */}
          {hasGps && (
            <MiniMap lat={exif!.gps_lat!} lng={exif!.gps_lng!} />
          )}

        </div>
      </div>
    </div>
  )
}

export default PhotoView
