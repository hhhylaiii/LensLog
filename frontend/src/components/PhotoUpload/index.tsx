import React, { useCallback, useState } from 'react'
import { useDropzone } from 'react-dropzone'
import axios from 'axios'
import api from '../../lib/api'

interface FileItem {
  file: File
  preview: string
  caption: string
  status: 'pending' | 'uploading' | 'done' | 'error'
  progress: number
  error?: string
}

interface PhotoUploadProps {
  onSuccess?: () => void
}

type PresignPostResponse = {
  presigned_url: string
  s3_key: string
  fields: Record<string, string>
  max_size_mb?: number
}

const s: Record<string, React.CSSProperties> = {
  container: { padding: '24px', color: '#e8e8f0', fontFamily: "'Inter', system-ui, sans-serif" },
  dropzone: {
    border: '2px dashed #2a2a38',
    borderRadius: '12px',
    padding: '48px 24px',
    textAlign: 'center',
    cursor: 'pointer',
    background: '#13131a',
    transition: 'border-color 0.2s, background 0.2s',
    marginBottom: '24px',
  },
  dropzoneActive: { borderColor: '#6366f1', background: '#1a1a2e' },
  dropIcon: { fontSize: '40px', marginBottom: '12px' },
  dropText: { fontSize: '16px', fontWeight: 600, color: '#e8e8f0', marginBottom: '6px' },
  dropSub: { fontSize: '13px', color: '#666' },
  fileList: { display: 'flex', flexDirection: 'column', gap: '12px', marginBottom: '24px' },
  fileCard: {
    display: 'flex',
    gap: '16px',
    background: '#13131a',
    border: '1px solid #2a2a38',
    borderRadius: '10px',
    padding: '12px',
    alignItems: 'flex-start',
  },
  thumb: {
    width: '80px',
    height: '80px',
    objectFit: 'cover',
    borderRadius: '8px',
    flexShrink: 0,
    background: '#1e1e2e',
  },
  fileInfo: { flex: 1, minWidth: 0 },
  fileName: { fontSize: '13px', fontWeight: 600, color: '#e8e8f0', marginBottom: '6px', wordBreak: 'break-all' },
  captionInput: {
    width: '100%',
    background: '#1e1e2e',
    border: '1px solid #2a2a38',
    borderRadius: '6px',
    padding: '6px 10px',
    color: '#e8e8f0',
    fontSize: '13px',
    boxSizing: 'border-box',
    outline: 'none',
    marginBottom: '8px',
  },
  progressTrack: {
    height: '6px',
    background: '#1e1e2e',
    borderRadius: '4px',
    overflow: 'hidden',
    marginBottom: '4px',
  },
  progressFill: { height: '100%', borderRadius: '4px', transition: 'width 0.2s ease' },
  statusText: { fontSize: '11px', color: '#666' },
  removeBtn: {
    background: 'transparent',
    border: 'none',
    color: '#555',
    cursor: 'pointer',
    fontSize: '18px',
    padding: '0 4px',
    lineHeight: 1,
    flexShrink: 0,
  },
  uploadBtn: {
    background: '#6366f1',
    color: '#fff',
    border: 'none',
    borderRadius: '8px',
    padding: '10px 24px',
    fontSize: '14px',
    fontWeight: 600,
    cursor: 'pointer',
    transition: 'opacity 0.15s',
  },
  uploadBtnDisabled: { opacity: 0.5, cursor: 'not-allowed' },
}

function statusColor(status: FileItem['status']): string {
  if (status === 'done') return '#22c55e'
  if (status === 'error') return '#ef4444'
  if (status === 'uploading') return '#6366f1'
  return '#374151'
}

const PhotoUpload: React.FC<PhotoUploadProps> = ({ onSuccess }) => {
  const [files, setFiles] = useState<FileItem[]>([])
  const [uploading, setUploading] = useState(false)

  const onDrop = useCallback((accepted: File[]) => {
    const items: FileItem[] = accepted.map((file) => ({
      file,
      preview: URL.createObjectURL(file),
      caption: '',
      status: 'pending',
      progress: 0,
    }))
    setFiles((prev) => [...prev, ...items])
  }, [])

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop,
    accept: { 'image/*': [] },
    multiple: true,
  })

  const updateFile = (index: number, patch: Partial<FileItem>) => {
    setFiles((prev) => prev.map((f, i) => (i === index ? { ...f, ...patch } : f)))
  }

  const removeFile = (index: number) => {
    setFiles((prev) => {
      URL.revokeObjectURL(prev[index].preview)
      return prev.filter((_, i) => i !== index)
    })
  }

  const uploadOne = async (item: FileItem, index: number): Promise<void> => {
    updateFile(index, { status: 'uploading', progress: 0 })
    try {
      // 1. Get presigned URL
      const contentType = item.file.type || 'application/octet-stream'
      const { data } = await api.post<PresignPostResponse>(
        `/photos/presign?filename=${encodeURIComponent(item.file.name)}&content_type=${encodeURIComponent(contentType)}`
      )
      if (typeof data.max_size_mb === 'number') {
        const maxBytes = data.max_size_mb * 1024 * 1024
        if (item.file.size > maxBytes) {
          updateFile(index, { status: 'error', error: `File too large (max ${data.max_size_mb} MB)`, progress: 0 })
          return
        }
      }
      // 2. POST directly to storage (no auth header — use plain axios)
      const form = new FormData()
      Object.entries(data.fields || {}).forEach(([k, v]) => form.append(k, v))
      form.append('file', item.file)
      await axios.post(data.presigned_url, form, {
        onUploadProgress: (e) => {
          const pct = e.total ? Math.round((e.loaded / e.total) * 100) : 0
          updateFile(index, { progress: pct })
        },
      })
      // 3. Create photo metadata
      await api.post('/photos', {
        s3_key: data.s3_key,
        caption: item.caption || undefined,
        is_public: true,
      })
      updateFile(index, { status: 'done', progress: 100 })
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Upload failed'
      updateFile(index, { status: 'error', error: msg })
    }
  }

  const handleUploadAll = async () => {
    const pending = files.filter((f) => f.status === 'pending')
    if (pending.length === 0) return
    setUploading(true)
    await Promise.all(
      files.map((f, i) => (f.status === 'pending' ? uploadOne(f, i) : Promise.resolve()))
    )
    setUploading(false)
    const allDone = files.every((f) => f.status === 'done' || f.status === 'error')
    if (allDone && onSuccess) onSuccess()
  }

  const pendingCount = files.filter((f) => f.status === 'pending').length

  return (
    <div style={s.container}>
      <div
        {...getRootProps({
          style: { ...s.dropzone, ...(isDragActive ? s.dropzoneActive : {}) },
        })}
      >
        <input {...getInputProps()} />
        <div style={s.dropIcon}>⊕</div>
        <div style={s.dropText}>
          {isDragActive ? 'Drop photos here…' : 'Drag & drop photos, or click to select'}
        </div>
        <div style={s.dropSub}>Supports JPG, PNG, WEBP, HEIC · Multiple files allowed</div>
      </div>

      {files.length > 0 && (
        <>
          <div style={s.fileList}>
            {files.map((item, i) => (
              <div key={i} style={s.fileCard}>
                <img src={item.preview} alt="" style={s.thumb} />
                <div style={s.fileInfo}>
                  <div style={s.fileName}>{item.file.name}</div>
                  <input
                    style={s.captionInput}
                    placeholder="Caption (optional)"
                    value={item.caption}
                    onChange={(e) => updateFile(i, { caption: e.target.value })}
                    disabled={item.status !== 'pending'}
                  />
                  <div style={s.progressTrack}>
                    <div
                      style={{
                        ...s.progressFill,
                        width: `${item.progress}%`,
                        background: statusColor(item.status),
                      }}
                    />
                  </div>
                  <div style={s.statusText}>
                    {item.status === 'uploading' && `Uploading… ${item.progress}%`}
                    {item.status === 'done' && '✓ Uploaded'}
                    {item.status === 'error' && `✗ ${item.error}`}
                    {item.status === 'pending' && `Ready · ${(item.file.size / 1024).toFixed(0)} KB`}
                  </div>
                </div>
                {item.status === 'pending' && (
                  <button style={s.removeBtn} onClick={() => removeFile(i)} title="Remove">
                    ×
                  </button>
                )}
              </div>
            ))}
          </div>

          <button
            style={{
              ...s.uploadBtn,
              ...(uploading || pendingCount === 0 ? s.uploadBtnDisabled : {}),
            }}
            onClick={handleUploadAll}
            disabled={uploading || pendingCount === 0}
          >
            {uploading ? 'Uploading…' : `Upload ${pendingCount} photo${pendingCount !== 1 ? 's' : ''}`}
          </button>
        </>
      )}
    </div>
  )
}

export default PhotoUpload
