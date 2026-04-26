import React, { useState, useEffect } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { MapContainer, TileLayer, Marker, Popup } from 'react-leaflet'
import 'leaflet/dist/leaflet.css'
import L from 'leaflet'
import markerIconUrl from 'leaflet/dist/images/marker-icon.png'
import markerIconRetinaUrl from 'leaflet/dist/images/marker-icon-2x.png'
import markerShadowUrl from 'leaflet/dist/images/marker-shadow.png'
import api from '../lib/api'

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
  location_id?: string
  s3_key: string
  thumb_key?: string
  url?: string
  caption?: string
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

// ─── Styles ───────────────────────────────────────────────────────────────────

const s: Record<string, React.CSSProperties> = {
  page: {
    padding: '32px 40px',
    color: '#e8e8f0',
    fontFamily: "'Inter', system-ui, sans-serif",
    maxWidth: '1100px',
    margin: '0 auto',
  },
  back: {
    display: 'inline-flex',
    alignItems: 'center',
    gap: '6px',
    color: '#666',
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
  },

  // Image
  imageWrap: {
    background: '#0d0d18',
    borderRadius: '14px',
    overflow: 'hidden',
    aspectRatio: '4/3',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    position: 'relative',
  },
  image: { width: '100%', height: '100%', objectFit: 'contain' as const },
  imagePlaceholder: { color: '#2a2a44', fontSize: '80px', userSelect: 'none' as const },
  imageError: {
    display: 'flex',
    flexDirection: 'column' as const,
    alignItems: 'center',
    gap: '12px',
    color: '#555',
    fontSize: '14px',
  },

  // Panel
  panel: { display: 'flex', flexDirection: 'column' as const, gap: '16px' },

  // Caption card
  captionCard: {
    background: '#13131a',
    border: '1px solid #2a2a38',
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
  captionText: { fontSize: '17px', fontWeight: 600, color: '#e8e8f0', lineHeight: 1.4, flex: 1 },
  captionEmpty: { fontSize: '17px', fontWeight: 600, color: '#3a3a50', lineHeight: 1.4, flex: 1 },
  captionInput: {
    flex: 1,
    background: '#0d0d18',
    border: '1px solid #3a3a50',
    borderRadius: '8px',
    color: '#e8e8f0',
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
    color: '#666',
    flexWrap: 'wrap' as const,
    marginBottom: '14px',
  },
  metaDot: { color: '#333' },

  // Edit / save buttons
  editBtn: {
    background: 'transparent',
    border: '1px solid #2a2a38',
    borderRadius: '8px',
    color: '#666',
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
    background: '#6366f1',
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
    background: 'transparent',
    border: '1px solid #2a2a38',
    borderRadius: '8px',
    color: '#888',
    fontSize: '13px',
    padding: '9px',
    cursor: 'pointer',
  },

  // Location select (edit mode)
  locationSelect: {
    width: '100%',
    background: '#0d0d18',
    border: '1px solid #3a3a50',
    borderRadius: '8px',
    color: '#e8e8f0',
    fontSize: '13px',
    padding: '8px 12px',
    outline: 'none',
    cursor: 'pointer',
    marginTop: '8px',
  },
  locationLabel: { fontSize: '12px', color: '#555', marginTop: '12px', marginBottom: '4px' },

  // Toggle
  toggleRow: {
    display: 'flex',
    alignItems: 'center',
    gap: '10px',
    paddingTop: '14px',
    borderTop: '1px solid #1e1e2e',
  },
  toggleLabel: { fontSize: '13px', color: '#888', flex: 1 },
  toggleBtn: {
    padding: '7px 18px',
    borderRadius: '20px',
    border: 'none',
    fontSize: '12px',
    fontWeight: 600,
    cursor: 'pointer',
    transition: 'opacity 0.15s',
    letterSpacing: '0.04em',
  },

  // EXIF card
  exifCard: {
    background: '#13131a',
    border: '1px solid #2a2a38',
    borderRadius: '12px',
    overflow: 'hidden',
  },
  exifHeader: {
    padding: '14px 18px',
    borderBottom: '1px solid #1e1e2e',
    fontSize: '12px',
    fontWeight: 600,
    color: '#555',
    letterSpacing: '0.07em',
    textTransform: 'uppercase' as const,
  },
  exifBody: { padding: '4px 0' },
  exifRow: {
    display: 'flex',
    alignItems: 'center',
    gap: '12px',
    padding: '10px 18px',
    borderBottom: '1px solid #0d0d18',
  },
  exifIcon: { fontSize: '16px', width: '22px', textAlign: 'center' as const, flexShrink: 0 },
  exifLabel: {
    fontSize: '11px',
    color: '#555',
    width: '72px',
    flexShrink: 0,
    letterSpacing: '0.04em',
  },
  exifValue: {
    fontSize: '13px',
    color: '#c0c0d0',
    flex: 1,
    minWidth: 0,
    overflow: 'hidden',
    textOverflow: 'ellipsis',
    whiteSpace: 'nowrap' as const,
  },
  exifValueEmpty: {
    fontSize: '13px',
    color: '#333',
    flex: 1,
  },

  // Location card (read-only)
  locationCard: {
    background: '#13131a',
    border: '1px solid #2a2a38',
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
    background: '#1e1e2e',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    fontSize: '16px',
    flexShrink: 0,
  },
  locationName: { fontSize: '14px', fontWeight: 500, color: '#e8e8f0', marginBottom: '2px' },
  locationMeta: { fontSize: '11px', color: '#666' },
  locationArrow: { color: '#444', fontSize: '14px', marginLeft: 'auto' },

  // GPS mini-map
  mapWrap: {
    height: '180px',
    borderRadius: '12px',
    overflow: 'hidden',
    border: '1px solid #2a2a38',
  },

  // Retry button
  retryBtn: {
    background: 'transparent',
    border: '1px solid #2a2a38',
    borderRadius: '8px',
    padding: '7px 16px',
    color: '#888',
    fontSize: '13px',
    cursor: 'pointer',
  },

  // States
  spinner: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    height: '300px',
    color: '#555',
    fontSize: '14px',
  },
  errorPage: {
    display: 'flex',
    flexDirection: 'column' as const,
    alignItems: 'center',
    justifyContent: 'center',
    height: '300px',
    gap: '12px',
    color: '#555',
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

// ─── SafeImage ────────────────────────────────────────────────────────────────

function SafeImage({ src, style, onFail }: { src: string; style?: React.CSSProperties; onFail?: () => void }) {
  const [failed, setFailed] = useState(false)
  if (failed) return null
  return <img src={src} alt="" style={style} onError={() => { setFailed(true); onFail?.() }} />
}

// ─── ExifRow — always rendered, shows "—" when value is missing ───────────────

function ExifRow({ icon, label, value }: { icon: string; label: string; value?: string | number | null }) {
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

  const [imgFailed, setImgFailed] = useState(false)
  const [imgRetry, setImgRetry] = useState(0)

  // Edit mode state
  const [isEditing, setIsEditing] = useState(false)
  const [draftCaption, setDraftCaption] = useState('')
  const [draftLocationId, setDraftLocationId] = useState('')

  const { data: photo, isLoading, isError } = useQuery<PhotoFull>({
    queryKey: ['photo', id],
    queryFn: () => api.get(`/photos/${id}`).then((r) => r.data),
    enabled: !!id,
  })

  const { data: locations = [] } = useQuery<Location[]>({
    queryKey: ['locations'],
    queryFn: () => api.get('/locations').then((r) => r.data),
  })

  // Initialise drafts whenever photo loads or edit mode opens
  useEffect(() => {
    if (photo && isEditing) {
      setDraftCaption(photo.caption ?? '')
      setDraftLocationId(photo.location_id ?? '')
    }
  }, [photo, isEditing])

  const togglePublic = useMutation({
    mutationFn: () =>
      api.patch(`/photos/${id}`, { is_public: !photo?.is_public }).then((r) => r.data),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['photo', id] }),
  })

  const saveEdit = useMutation({
    mutationFn: () =>
      api.patch(`/photos/${id}`, {
        caption: draftCaption.trim() || null,
        location_id: draftLocationId || null,
      }).then((r) => r.data),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['photo', id] })
      qc.invalidateQueries({ queryKey: ['photos', 'profile-all'] })
      setIsEditing(false)
    },
  })

  const handleEditOpen = () => {
    setDraftCaption(photo?.caption ?? '')
    setDraftLocationId(photo?.location_id ?? '')
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
  const location = photo.location_id ? locations.find((l) => l.id === photo.location_id) : undefined

  return (
    <div style={s.page}>
      <button style={s.back} onClick={() => navigate(-1)}>← 返回</button>

      <div style={s.layout}>

        {/* ── Left: large image ── */}
        <div>
          <div style={s.imageWrap}>
            {photo.url && !imgFailed ? (
              <SafeImage
                key={imgRetry}
                src={photo.url}
                style={s.image}
                onFail={() => setImgFailed(true)}
              />
            ) : imgFailed ? (
              <div style={s.imageError}>
                <span style={{ fontSize: '40px', color: '#333' }}>◈</span>
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
                <div style={photo.caption ? s.captionText : s.captionEmpty}>
                  {photo.caption || '未命名照片'}
                </div>
              )}
              {!isEditing && (
                <button style={s.editBtn} onClick={handleEditOpen}>編輯</button>
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

            {/* Location selector (edit) or link (read) */}
            {isEditing ? (
              <>
                <div style={s.locationLabel}>所屬景點</div>
                <select
                  style={s.locationSelect}
                  aria-label="所屬景點"
                  value={draftLocationId}
                  onChange={(e) => setDraftLocationId(e.target.value)}
                >
                  <option value="">— 無景點 —</option>
                  {locations.map((loc) => (
                    <option key={loc.id} value={loc.id}>{loc.name}</option>
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
                  background: photo.is_public ? 'rgba(16,185,129,0.15)' : 'rgba(99,102,241,0.15)',
                  color: photo.is_public ? '#10b981' : '#6366f1',
                  opacity: togglePublic.isPending ? 0.6 : 1,
                }}
                disabled={togglePublic.isPending}
                onClick={() => togglePublic.mutate()}
              >
                {photo.is_public ? '切換為私人' : '切換為公開'}
              </button>
            </div>
          </div>

          {/* ── EXIF block — always shows all rows ── */}
          <div style={s.exifCard}>
            <div style={s.exifHeader}>EXIF 資訊</div>
            <div style={s.exifBody}>
              <ExifRow icon="📷" label="相機"     value={cameraLabel} />
              <ExifRow icon="🔧" label="鏡頭"     value={exif?.lens_model} />
              <ExifRow icon="📐" label="焦段"     value={exif?.focal_length != null ? `${exif.focal_length} mm` : null} />
              <ExifRow icon="🌀" label="光圈"     value={exif?.aperture != null ? `f/${exif.aperture}` : null} />
              <ExifRow icon="⏱"  label="快門"     value={exif?.shutter_speed} />
              <ExifRow icon="📊" label="ISO"      value={exif?.iso} />
              <ExifRow icon="📅" label="拍攝時間" value={fmt(photo.taken_at)} />
              <ExifRow
                icon="📍"
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
