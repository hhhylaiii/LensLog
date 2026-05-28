import React, { useCallback } from 'react'
import { useDropzone } from 'react-dropzone'
import T from '../../styles/tokens'
import type { FileItem } from '../../lib/uploadTypes'
import { useBreakpoint } from '../../hooks/useBreakpoint'

interface FileListProps {
  items: FileItem[]
  selectedIdx: number
  onSelect: (i: number) => void
  onAddMore: (files: File[]) => void
}

const statusLabel = (s: FileItem['status']) => {
  if (s === 'uploading') return { text: '上傳中', color: T.accent }
  if (s === 'done') return { text: '✓ 完成', color: T.ok }
  if (s === 'error') return { text: '✗ 失敗', color: '#ef4444' }
  return { text: '待上傳', color: T.inkMute }
}

const FileList: React.FC<FileListProps> = ({ items, selectedIdx, onSelect, onAddMore }) => {
  const onDrop = useCallback((accepted: File[]) => onAddMore(accepted), [onAddMore])
  const { getRootProps, getInputProps } = useDropzone({ onDrop, accept: { 'image/*': [] }, multiple: true })
  const { isMobile } = useBreakpoint()

  const header = (
    <div style={{ fontFamily: "'IBM Plex Mono', monospace", textTransform: 'uppercase', letterSpacing: '0.04em', fontSize: 10.5, color: T.inkMute }}>
      待上傳 ({items.length})
    </div>
  )

  if (isMobile) {
    return (
      <div style={{ background: T.card, borderBottom: `1px solid ${T.lineSoft}` }}>
        <div style={{ display: 'flex', gap: 5, padding: '8px 10px', overflowX: 'auto' }}>
          {items.map((item, i) => {
            const sel = i === selectedIdx
            return (
              <div key={i} onClick={() => onSelect(i)} style={{
                flexShrink: 0,
                border: sel ? `1.5px solid ${T.accent}` : `1px solid ${T.line}`,
                borderRadius: 5, overflow: 'hidden', cursor: 'pointer',
                background: sel ? T.accentSoft : T.card,
              }}>
                <img src={item.preview} alt="" style={{ width: 40, height: 40, objectFit: 'cover', display: 'block' }} />
              </div>
            )
          })}
          <div {...getRootProps({ style: {
            flexShrink: 0, width: 40, height: 40,
            border: `1px dashed ${T.line}`, borderRadius: 5,
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            cursor: 'pointer', color: T.inkMute, fontSize: 16, background: T.card,
          }})}>
            <input {...getInputProps()} />
            ＋
          </div>
        </div>
      </div>
    )
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
      {header}

      {items.map((item, i) => {
        const sel = i === selectedIdx
        const st = statusLabel(item.status)
        return (
          <div key={i} onClick={() => onSelect(i)} style={{
            border: sel ? `1.5px solid ${T.accent}` : `1px solid ${T.line}`,
            borderRadius: 8, padding: 6, cursor: 'pointer',
            background: sel ? T.accentSoft : T.card,
          }}>
            <img src={item.preview} alt="" style={{ width: '100%', height: 110, objectFit: 'cover', borderRadius: 6, display: 'block' }} />
            <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: 6, alignItems: 'center' }}>
              <span style={{ fontFamily: "'IBM Plex Mono', monospace", fontSize: 10.5, color: T.inkSoft, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', maxWidth: '70%' }}>
                {item.file.name}
              </span>
              <span style={{ fontFamily: "'IBM Plex Mono', monospace", fontSize: 10.5, color: st.color, flexShrink: 0 }}>{st.text}</span>
            </div>
          </div>
        )
      })}

      <div {...getRootProps({ style: {
        border: `1px dashed ${T.line}`, borderRadius: 8, height: 36, color: T.inkMute,
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        cursor: 'pointer', fontSize: 13, background: T.card,
      }})}>
        <input {...getInputProps()} />
        ＋ 新增更多
      </div>
    </div>
  )
}
export default FileList
