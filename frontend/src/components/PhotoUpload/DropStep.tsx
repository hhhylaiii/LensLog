import React, { useCallback } from 'react'
import { useDropzone } from 'react-dropzone'
import T from '../../styles/tokens'
import type { FileItem } from '../../lib/uploadTypes'

interface DropStepProps {
  files: FileItem[]
  onAddFiles: (files: File[]) => void
  onNext: () => void
  disabled?: boolean
}

const DropStep: React.FC<DropStepProps> = ({ files, onAddFiles, onNext, disabled }) => {
  const onDrop = useCallback((accepted: File[]) => onAddFiles(accepted), [onAddFiles])
  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop, accept: { 'image/*': [] }, multiple: true,
  })

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 24 }}>
      <div {...getRootProps({ style: {
        border: `2px dashed ${isDragActive ? T.accent : T.line}`,
        borderRadius: 12, padding: '48px 24px', textAlign: 'center',
        cursor: 'pointer',
        background: isDragActive ? T.accentSoft : T.paper,
        transition: 'border-color 0.2s, background 0.2s',
      }})}>
        <input {...getInputProps()} />
        <div style={{ fontSize: 40, marginBottom: 12, color: T.accent }}>⊕</div>
        <div style={{ fontSize: 16, fontWeight: 600, color: T.ink, marginBottom: 6 }}>
          {isDragActive ? '放開以加入照片…' : '拖曳照片至此，或點擊選擇'}
        </div>
        <div style={{ fontSize: 13, color: T.inkMute }}>支援 JPG、PNG、WEBP、HEIC · 可多選</div>
      </div>

      {files.length > 0 && (
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
          {files.map((f, i) => (
            <div key={i} style={{ position: 'relative', width: 80, height: 80, borderRadius: 8, overflow: 'hidden', flexShrink: 0 }}>
              <img src={f.preview} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
              <div style={{
                position: 'absolute', bottom: 0, left: 0, right: 0,
                background: 'rgba(0,0,0,0.5)', color: '#fff',
                fontSize: 9, padding: '2px 4px',
                overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
              }}>{f.file.name}</div>
            </div>
          ))}
        </div>
      )}

      <div style={{ display: 'flex', justifyContent: 'flex-end' }}>
        <button
          onClick={onNext}
          disabled={disabled || files.length === 0}
          style={{
            background: files.length === 0 || disabled ? T.paperTwo : T.accent,
            color: files.length === 0 || disabled ? T.inkMute : '#fff',
            border: 'none', borderRadius: 8, padding: '10px 28px',
            fontSize: 14, fontWeight: 600, cursor: files.length === 0 || disabled ? 'not-allowed' : 'pointer',
            transition: 'background 0.15s',
          }}
        >
          下一步 →
        </button>
      </div>
    </div>
  )
}
export default DropStep
