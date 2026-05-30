import React, { startTransition, useCallback, useMemo, useState } from 'react'
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

interface UploadPreset {
  visibility: Visibility
  location?: LocationMatch
}

const makeItem = async (file: File, preset?: UploadPreset): Promise<FileItem> => ({
  file,
  preview: URL.createObjectURL(file),
  caption: '',
  tags: [],
  visibility: preset?.visibility ?? 'public',
  hidePreciseGps: false,
  exif: await parseExifData(file),
  location: preset?.location ?? { status: 'pending' },
  status: 'pending',
  progress: 0,
})

const Upload: React.FC = () => {
  const navigate = useNavigate()
  const [searchParams] = useSearchParams()
  const queryClient = useQueryClient()

  const [step, setStep] = useState<1 | 2>(1)
  const [items, setItems] = useState<FileItem[]>([])
  const [selectedIdx, setSelectedIdx] = useState(0)
  const [publishing, setPublishing] = useState(false)
  const [success, setSuccess] = useState(false)

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

  const addFiles = useCallback(async (files: File[]) => {
    const nextItems = await Promise.all(files.map((file) => makeItem(file, preset ?? undefined)))
    startTransition(() => {
      setItems(prev => [...prev, ...nextItems])
    })
  }, [preset])

  const addMore = useCallback(async (files: File[]) => {
    const nextItems = await Promise.all(files.map((file) => makeItem(file, preset ?? undefined)))
    startTransition(() => {
      setItems(prev => {
        const next = [...prev, ...nextItems]
        setSelectedIdx(prev.length)
        return next
      })
    })
  }, [preset])

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

  const { isMobile } = useBreakpoint()
  const pendingCount = items.filter(f => f.status === 'pending').length
  const allDone = items.length > 0 && items.every(f => f.status === 'done' || f.status === 'error')
  const presetNotice = preset?.location?.loc ? (
    <div style={{ background: T.accentSoft, border: `1px solid ${T.accent}`, borderRadius: 10, padding: '12px 16px', color: T.accentInk, fontSize: 13, marginBottom: 16 }}>
      這次上傳會預設綁定到 <strong>{preset.location.loc.name}</strong> · {preset.location.loc.source === 'global' ? '大家景點 / 公開照片' : '我的景點 / 私人照片'}
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
              <DropStep files={items} onAddFiles={addFiles} onNext={() => { setSelectedIdx(0); setStep(2) }} />
            </div>
          ) : (
            <ReviewStep items={items} selectedIdx={selectedIdx} onSelect={setSelectedIdx} onAddMore={addMore} onChangeItem={updateItem} />
          )}
        </div>

        {/* Footer buttons (step 2 only) */}
        {step === 2 && (
          <div style={{ padding: '8px 12px', background: T.card, borderTop: `1px solid ${T.lineSoft}`, display: 'flex', gap: 6, flexShrink: 0 }}>
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
    <div style={{ padding: 24, fontFamily: "'Inter', 'Noto Sans TC', sans-serif", color: T.ink, background: T.paper, minHeight: '100%', boxSizing: 'border-box' }}>
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
          <DropStep files={items} onAddFiles={addFiles} onNext={() => { setSelectedIdx(0); setStep(2) }} />
        </>
      ) : (
        <ReviewStep items={items} selectedIdx={selectedIdx} onSelect={setSelectedIdx} onAddMore={addMore} onChangeItem={updateItem} />
      )}
    </div>
  )
}

export default Upload
