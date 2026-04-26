import React, { useCallback, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useQueryClient } from '@tanstack/react-query'
import T from '../styles/tokens'
import type { FileItem } from '../lib/uploadTypes'
import { uploadOne } from '../lib/uploadService'
import Stepper from '../components/PhotoUpload/Stepper'
import DropStep from '../components/PhotoUpload/DropStep'
import ReviewStep from '../components/PhotoUpload/ReviewStep'

const makeItem = (file: File): FileItem => ({
  file,
  preview: URL.createObjectURL(file),
  caption: '',
  tags: [],
  visibility: 'public',
  hidePreciseGps: false,
  status: 'pending',
  progress: 0,
})

const Upload: React.FC = () => {
  const navigate = useNavigate()
  const queryClient = useQueryClient()

  const [step, setStep] = useState<1 | 2>(1)
  const [items, setItems] = useState<FileItem[]>([])
  const [selectedIdx, setSelectedIdx] = useState(0)
  const [publishing, setPublishing] = useState(false)
  const [success, setSuccess] = useState(false)

  const updateItem = useCallback((index: number, patch: Partial<FileItem>) => {
    setItems(prev => prev.map((f, i) => (i === index ? { ...f, ...patch } : f)))
  }, [])

  const addFiles = useCallback((files: File[]) => {
    setItems(prev => [...prev, ...files.map(makeItem)])
  }, [])

  const addMore = useCallback((files: File[]) => {
    setItems(prev => {
      const next = [...prev, ...files.map(makeItem)]
      setSelectedIdx(prev.length)
      return next
    })
  }, [])

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

  const pendingCount = items.filter(f => f.status === 'pending').length
  const allDone = items.length > 0 && items.every(f => f.status === 'done' || f.status === 'error')

  if (success || allDone) {
    return (
      <div style={{ padding: 32, fontFamily: "'Inter', 'Noto Sans TC', sans-serif", color: T.ink }}>
        <div style={{ background: T.okSoft, border: `1px solid ${T.ok}`, borderRadius: 10, padding: '16px 20px', color: T.ok, fontSize: 14, display: 'flex', alignItems: 'center', gap: 10, marginBottom: 24 }}>
          <span>✓</span>
          <span>
            照片上傳成功！{' '}
            <button onClick={() => navigate('/')} style={{ color: T.accent, cursor: 'pointer', textDecoration: 'underline', background: 'none', border: 'none', fontSize: 14, padding: 0 }}>
              前往 Dashboard →
            </button>
          </span>
        </div>
      </div>
    )
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
        <DropStep
          files={items}
          onAddFiles={addFiles}
          onNext={() => { setSelectedIdx(0); setStep(2) }}
        />
      ) : (
        <ReviewStep
          items={items}
          selectedIdx={selectedIdx}
          onSelect={setSelectedIdx}
          onAddMore={addMore}
          onChangeItem={updateItem}
        />
      )}
    </div>
  )
}

export default Upload
