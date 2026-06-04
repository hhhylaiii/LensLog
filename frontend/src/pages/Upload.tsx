import React, { startTransition, useCallback, useEffect, useMemo, useState } from 'react'
import imageCompression from 'browser-image-compression'
import { useNavigate, useSearchParams } from 'react-router-dom'
import { useQueryClient } from '@tanstack/react-query'
import T from '../styles/tokens'
import type { FileItem, LocationMatch, LocationSource, Visibility } from '../lib/uploadTypes'
import { uploadOne } from '../lib/uploadService'
import { parseExifData } from '../lib/exif'
import { useBreakpoint } from '../hooks/useBreakpoint'
import Stepper from '../components/PhotoUpload/Stepper'
import DropStep from '../components/PhotoUpload/DropStep'
import ReviewStep from '../components/PhotoUpload/ReviewStep'
import PreviewPane from '../components/PhotoUpload/PreviewPane'
import PhotoPreview from '../components/PhotoUpload/PhotoPreview'
import VisibilityPanel from '../components/PhotoUpload/VisibilityPanel'
import LocationPanel from '../components/PhotoUpload/LocationPanel'
import api from '../lib/api'

// ─── Types ────────────────────────────────────────────────────────────────────

interface ApiPhoto {
  id: string
  s3_key: string
  thumb_key?: string
  url?: string
  thumb_url?: string
  caption?: string
  tags: string[]
  is_public: boolean
  taken_at?: string
  user_location_id?: string
  global_location_id?: string
  location_id?: string
  location_source?: 'user' | 'global'
  exif?: {
    make?: string; model?: string; lens_model?: string
    focal_length?: number; aperture?: number; shutter_speed?: string; iso?: number
    gps_lat?: number; gps_lng?: number; width?: number; height?: number
  }
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

interface UploadPreset {
  visibility: Visibility
  location?: LocationMatch
}

const makeItem = async (file: File, preset?: UploadPreset): Promise<FileItem> => {
  const needsCompression = file.size > 5 * 1024 * 1024
  const compressed = needsCompression
    ? await imageCompression(file, { maxSizeMB: 5, useWebWorker: true, preserveExif: true })
    : file
  if (needsCompression) {
    console.log(`[compress] ${file.name}: ${(file.size / 1024 / 1024).toFixed(2)}MB → ${(compressed.size / 1024 / 1024).toFixed(2)}MB`)
  }

  return {
    file: compressed as File,
    preview: URL.createObjectURL(compressed),
    caption: '',
    tags: [],
    visibility: preset?.visibility ?? 'public',
    hidePreciseGps: false,
    exif: await parseExifData(file),
    location: preset?.location ?? { status: 'pending' },
    status: 'pending',
    progress: 0,
  }
}

function photoToFileItem(photo: ApiPhoto): FileItem {
  const location: LocationMatch = photo.location_id
    ? { status: 'manual', loc: { id: photo.location_id, name: '已選擇位置', source: photo.location_source ?? 'user' } }
    : { status: 'none' }
  return {
    file: null as unknown as File,
    preview: photo.thumb_url || photo.url || '',
    caption: photo.caption ?? '',
    tags: photo.tags ?? [],
    visibility: photo.is_public ? 'public' : 'private',
    hidePreciseGps: false,
    exif: photo.exif ? {
      make: photo.exif.make,
      model: photo.exif.model,
      aperture: photo.exif.aperture != null ? String(photo.exif.aperture) : undefined,
      shutter: photo.exif.shutter_speed,
      iso: photo.exif.iso != null ? String(photo.exif.iso) : undefined,
      focalLength: photo.exif.focal_length != null ? String(photo.exif.focal_length) : undefined,
      takenAt: photo.taken_at,
      gpsLat: photo.exif.gps_lat,
      gpsLng: photo.exif.gps_lng,
    } : undefined,
    location,
    status: 'done',
    progress: 100,
  }
}

// ─── Edit mode component ───────────────────────────────────────────────────────

interface EditModeProps {
  photoId: string
}

const EditMode: React.FC<EditModeProps> = ({ photoId }) => {
  const navigate = useNavigate()
  const queryClient = useQueryClient()
  const { isMobile } = useBreakpoint()
  const [item, setItem] = useState<FileItem | null>(null)
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [saved, setSaved] = useState(false)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    api.get<ApiPhoto>(`/photos/${photoId}`)
      .then(r => setItem(photoToFileItem(r.data)))
      .catch(() => setError('找不到該照片'))
      .finally(() => setLoading(false))
  }, [photoId])

  const updateItem = (patch: Partial<FileItem>) => {
    setItem(prev => prev ? { ...prev, ...patch } : prev)
  }

  const handleSave = async () => {
    if (!item || saving) return
    setSaving(true)
    setError(null)
    try {
      const loc = item.location?.status === 'matched' || item.location?.status === 'manual'
        ? item.location.loc : undefined
      await api.patch(`/photos/${photoId}`, {
        caption: item.caption || undefined,
        tags: item.tags,
        is_public: item.visibility === 'public',
        ...(loc?.source === 'user' ? { user_location_id: loc.id } : {}),
        ...(loc?.source === 'global' ? { global_location_id: loc.id } : {}),
      })
      queryClient.invalidateQueries({ queryKey: ['photos'] })
      setSaved(true)
    } catch {
      setError('儲存失敗，請稍後再試')
    } finally {
      setSaving(false)
    }
  }

  const containerStyle: React.CSSProperties = {
    padding: isMobile ? 16 : 24,
    fontFamily: "'Inter', 'Noto Sans TC', sans-serif",
    color: T.ink,
    background: T.paper,
    minHeight: '100%',
    boxSizing: 'border-box',
  }

  if (saved) {
    return (
      <div style={containerStyle}>
        <div style={{ background: T.okSoft, border: `1px solid ${T.ok}`, borderRadius: 10, padding: '16px 20px', color: T.ok, fontSize: 14, display: 'flex', alignItems: 'center', gap: 10, marginBottom: 24 }}>
          <span>✓</span>
          <span>
            修改已儲存！{' '}
            <button onClick={() => navigate(-1)} style={{ color: T.accent, cursor: 'pointer', textDecoration: 'underline', background: 'none', border: 'none', fontSize: 14, padding: 0 }}>
              返回 →
            </button>
          </span>
        </div>
      </div>
    )
  }

  return (
    <div style={containerStyle}>
      {/* Topbar */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 20 }}>
        <div style={{ flex: 1 }}>
          <h1 style={{ fontSize: 22, fontWeight: 600, letterSpacing: '-0.025em', margin: 0, color: T.ink }}>
            編輯<span style={{ color: T.accent }}>照片</span>
          </h1>
          <p style={{ margin: '2px 0 0', fontSize: 13, color: T.inkMute }}>修改說明、標籤、位置與可見度</p>
        </div>
        <button
          onClick={() => navigate(-1)}
          style={{ background: 'none', border: `1px solid ${T.line}`, borderRadius: 6, padding: '6px 14px', fontSize: 13, color: T.inkSoft, cursor: 'pointer' }}
        >
          取消
        </button>
        <button
          onClick={handleSave}
          disabled={saving || loading}
          style={{
            background: saving || loading ? T.paperTwo : T.accent,
            color: saving || loading ? T.inkMute : '#fff',
            border: 'none', borderRadius: 6, padding: '6px 20px',
            fontSize: 13, fontWeight: 600,
            cursor: saving || loading ? 'not-allowed' : 'pointer',
          }}
        >
          {saving ? '儲存中…' : '儲存修改'}
        </button>
      </div>

      {error && (
        <div style={{ background: '#fff0f0', border: '1px solid #fca5a5', borderRadius: 8, padding: '10px 14px', color: '#dc2626', fontSize: 13, marginBottom: 16 }}>
          {error}
        </div>
      )}

      {loading || !item ? (
        <div style={{ color: T.inkMute, fontSize: 14, padding: '40px 0', textAlign: 'center' }}>載入中…</div>
      ) : (
        <div
          style={isMobile
            ? { display: 'flex', flexDirection: 'column', gap: 16 }
            : { display: 'grid', gridTemplateColumns: '1fr 320px', gap: 20, minHeight: 540 }}
        >
          {isMobile && <PhotoPreview item={item} />}
          <PreviewPane item={item} onChange={updateItem} />
          <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
            <LocationPanel
              gpsLat={item.exif?.gpsLat}
              gpsLng={item.exif?.gpsLng}
              visibility={item.visibility as Visibility}
              value={item.location}
              onChange={(location: LocationMatch) => updateItem({ location })}
            />
            <VisibilityPanel
              visibility={item.visibility as Visibility}
              onChange={(v: Visibility) => updateItem({ visibility: v })}
              hidePreciseGps={item.hidePreciseGps}
              onToggleGps={() => updateItem({ hidePreciseGps: !item.hidePreciseGps })}
            />
          </div>
        </div>
      )}
    </div>
  )
}

// ─── Upload component ─────────────────────────────────────────────────────────

const Upload: React.FC = () => {
  const navigate = useNavigate()
  const [searchParams] = useSearchParams()
  const queryClient = useQueryClient()
  const editPhotoId = searchParams.get('edit')
  const { isMobile } = useBreakpoint()

  const [step, setStep] = useState<1 | 2>(1)
  const [items, setItems] = useState<FileItem[]>([])
  const [selectedIdx, setSelectedIdx] = useState(0)
  const [publishing, setPublishing] = useState(false)
  const [success, setSuccess] = useState(false)
  const [fileError, setFileError] = useState<string | null>(null)

  const preset = useMemo<UploadPreset | null>(() => {
    const source = searchParams.get('source')
    const id = searchParams.get('locationId')
    const name = searchParams.get('locationName')
    if (!source || !id || !name) return null
    if (source !== 'user' && source !== 'global') return null
    return {
      visibility: source === 'global' ? 'public' : 'private',
      location: {
        status: 'manual',
        loc: {
          id,
          name,
          source: source as LocationSource,
        },
      },
    }
  }, [searchParams])

  const updateItem = useCallback((index: number, patch: Partial<FileItem>) => {
    setItems(prev => prev.map((f, i) => (i === index ? { ...f, ...patch } : f)))
  }, [])

  const removeFile = useCallback((index: number) => {
    setItems(prev => {
      const next = prev.filter((_, i) => i !== index)
      setSelectedIdx(idx => Math.min(idx, Math.max(0, next.length - 1)))
      return next
    })
  }, [])

  const addFiles = useCallback(async (files: File[]) => {
    const total = items.length + files.length
    const allowed = Math.max(0, 10 - items.length)
    const acceptedFiles = total > 10 ? files.slice(0, allowed) : files
    if (total > 10) {
      setFileError(`一次最多上傳 10 張，已略去 ${files.length - allowed} 張`)
    } else {
      setFileError(null)
    }
    const nextItems = await Promise.all(acceptedFiles.map((file) => makeItem(file, preset ?? undefined)))
    startTransition(() => {
      setItems(prev => [...prev, ...nextItems])
    })
  }, [items.length, preset])

  const addMore = useCallback(async (files: File[]) => {
    const total = items.length + files.length
    const allowed = Math.max(0, 10 - items.length)
    const acceptedFiles = total > 10 ? files.slice(0, allowed) : files
    if (total > 10) {
      setFileError(`一次最多上傳 10 張，已略去 ${files.length - allowed} 張`)
    } else {
      setFileError(null)
    }
    const nextItems = await Promise.all(acceptedFiles.map((file) => makeItem(file, preset ?? undefined)))
    startTransition(() => {
      setItems(prev => {
        const next = [...prev, ...nextItems]
        if (nextItems.length > 0) setSelectedIdx(prev.length)
        return next
      })
    })
  }, [items.length, preset])

  const handlePublish = async () => {
    const pending = items.filter(f => f.status === 'pending')
    if (pending.length === 0 || publishing) return
    setPublishing(true)
    await Promise.all(
      items.map((f, i) => f.status === 'pending' ? uploadOne(f, i, updateItem) : Promise.resolve())
    )
    setPublishing(false)
    queryClient.invalidateQueries({ queryKey: ['photos'] })
    setSuccess(true)
  }

  if (editPhotoId) return <EditMode photoId={editPhotoId} />

  const pendingCount = items.filter(f => f.status === 'pending').length
  const allDone = items.length > 0 && items.every(f => f.status === 'done' || f.status === 'error')
  const presetNotice = preset?.location?.loc ? (
    <div style={{ background: T.accentSoft, border: `1px solid ${T.accent}`, borderRadius: 10, padding: '12px 16px', color: T.accentInk, fontSize: 13, marginBottom: 16 }}>
      這次上傳會預設綁定到 <strong>{preset.location.loc.name}</strong> · {preset.location.loc.source === 'global' ? '大家景點 / 公開照片' : '我的景點 / 私人照片'}
    </div>
  ) : null
  const fileErrorNotice = fileError ? (
    <div style={{ background: '#fff0f0', border: '1px solid #fca5a5', borderRadius: 8, padding: '10px 14px', color: '#dc2626', fontSize: 13, marginBottom: 8 }}>
      {fileError}
    </div>
  ) : null

  const successBanner = (
    <div style={{ background: T.okSoft, border: `1px solid ${T.ok}`, borderRadius: 10, padding: '16px 20px', color: T.ok, fontSize: 14, display: 'flex', alignItems: 'center', gap: 10, marginBottom: 24 }}>
      <span>✓</span>
      <span>
        照片上傳成功！{' '}
        <button onClick={() => navigate('/map')} style={{ color: T.accent, cursor: 'pointer', textDecoration: 'underline', background: 'none', border: 'none', fontSize: 14, padding: 0 }}>
          前往地圖 →
        </button>
      </span>
    </div>
  )

  // ── Mobile layout ──────────────────────────────────────────────
  if (isMobile) {
    if (success || allDone) {
      return <div style={{ padding: 16, fontFamily: "'Inter', 'Noto Sans TC', sans-serif", color: T.ink }}>{successBanner}</div>
    }
    return (
      <div style={{ display: 'flex', flexDirection: 'column', minHeight: '100%', fontFamily: "'Inter', 'Noto Sans TC', sans-serif", color: T.ink, background: T.paper }}>
        {/* Header */}
        <div style={{ padding: '14px 16px 8px', background: T.paper, flexShrink: 0 }}>
          <h1 style={{ fontSize: 20, fontWeight: 600, letterSpacing: '-0.025em', margin: 0, color: T.ink }}>
            上傳<span style={{ color: T.accent }}>照片</span>
          </h1>
          {step === 2 && (
            <p style={{ margin: '2px 0 0', fontSize: 11, color: T.inkMute }}>
              {items.length} 張已選 · 步驟 2/3
            </p>
          )}
        </div>

        {/* Stepper */}
        <div style={{ padding: '4px 16px 10px', flexShrink: 0 }}>
          <Stepper step={step} />
        </div>

        {/* Content */}
        <div style={{ flex: 1 }}>
          {step === 1 ? (
            <div style={{ padding: '0 16px 16px' }}>
              {presetNotice}
              {fileErrorNotice}
              <DropStep files={items} onAddFiles={addFiles} onRemove={removeFile} onNext={() => { setSelectedIdx(0); setStep(2) }} />
            </div>
          ) : (
            <ReviewStep items={items} selectedIdx={selectedIdx} onSelect={setSelectedIdx} onAddMore={addMore} onChangeItem={updateItem} />
          )}
        </div>

        {/* Footer buttons (step 2 only) */}
        {step === 2 && (
          <div style={{ padding: '8px 10px', background: 'transparent', borderTop: 'none', display: 'flex', gap: 6, flexShrink: 0 }}>
            <button
              onClick={() => { setStep(1); setSuccess(false) }}
              style={{ flex: 1, height: 40, border: `1px solid ${T.line}`, borderRadius: 8, background: T.card, color: T.inkSoft, fontSize: 13, fontWeight: 500, cursor: 'pointer' }}
            >
              取消
            </button>
            <button
              onClick={handlePublish}
              disabled={publishing || pendingCount === 0}
              style={{
                flex: 2, height: 40, border: 'none', borderRadius: 8,
                background: publishing || pendingCount === 0 ? T.paperTwo : T.accent,
                color: publishing || pendingCount === 0 ? T.inkMute : '#fff',
                fontSize: 13, fontWeight: 600,
                cursor: publishing || pendingCount === 0 ? 'not-allowed' : 'pointer',
              }}
            >
              {publishing ? '發布中…' : `發布 ${pendingCount} 張`}
            </button>
          </div>
        )}
      </div>
    )
  }

  // ── Desktop layout ─────────────────────────────────────────────
  if (success || allDone) {
    return <div style={{ padding: 32, fontFamily: "'Inter', 'Noto Sans TC', sans-serif", color: T.ink }}>{successBanner}</div>
  }

  return (
    <div style={{ padding: isMobile ? 16 : 24, fontFamily: "'Inter', 'Noto Sans TC', sans-serif", color: T.ink, background: T.paper, minHeight: '100%', boxSizing: 'border-box' }}>
      {/* Topbar */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 20 }}>
        <div style={{ flex: 1 }}>
          <h1 style={{ fontSize: 22, fontWeight: 600, letterSpacing: '-0.025em', margin: 0, color: T.ink }}>
            上傳<span style={{ color: T.accent }}>照片</span>
          </h1>
          {step === 2 && (
            <p style={{ margin: '2px 0 0', fontSize: 13, color: T.inkMute }}>
              Step 2 · 檢閱與編輯 ·{' '}
              <span style={{ fontFamily: "'IBM Plex Mono', monospace", fontSize: 11 }}>{items.length} 張已選</span>
            </p>
          )}
        </div>
        {step === 2 && (
          <>
            <button
              onClick={() => { setStep(1); setSuccess(false) }}
              style={{ background: 'none', border: `1px solid ${T.line}`, borderRadius: 6, padding: '6px 14px', fontSize: 13, color: T.inkSoft, cursor: 'pointer' }}
            >
              取消
            </button>
            <button
              disabled
              style={{ background: 'none', border: `1px solid ${T.line}`, borderRadius: 6, padding: '6px 14px', fontSize: 13, color: T.inkMute, cursor: 'not-allowed', opacity: 0.5 }}
            >
              存為草稿
            </button>
            <button
              onClick={handlePublish}
              disabled={publishing || pendingCount === 0}
              style={{
                background: publishing || pendingCount === 0 ? T.paperTwo : T.accent,
                color: publishing || pendingCount === 0 ? T.inkMute : '#fff',
                border: 'none', borderRadius: 6, padding: '6px 16px',
                fontSize: 13, fontWeight: 600,
                cursor: publishing || pendingCount === 0 ? 'not-allowed' : 'pointer',
              }}
            >
              {publishing ? '發布中…' : `發布 ${pendingCount} 張`}
            </button>
          </>
        )}
      </div>

      {/* Stepper */}
      <div style={{ marginBottom: 24 }}>
        <Stepper step={step} />
      </div>

      {/* Step content */}
      {step === 1 ? (
        <>
          {presetNotice}
          {fileErrorNotice}
          <DropStep files={items} onAddFiles={addFiles} onRemove={removeFile} onNext={() => { setSelectedIdx(0); setStep(2) }} />
        </>
      ) : (
        <ReviewStep items={items} selectedIdx={selectedIdx} onSelect={setSelectedIdx} onAddMore={addMore} onChangeItem={updateItem} />
      )}
    </div>
  )
}

export default Upload
