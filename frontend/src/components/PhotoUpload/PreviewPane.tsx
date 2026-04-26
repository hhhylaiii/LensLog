import React, { useState } from 'react'
import T from '../../styles/tokens'
import type { FileItem } from '../../lib/uploadTypes'

interface PreviewPaneProps {
  item: FileItem
  onChange: (patch: Partial<FileItem>) => void
}

const PreviewPane: React.FC<PreviewPaneProps> = ({ item, onChange }) => {
  const [addingTag, setAddingTag] = useState(false)
  const [tagInput, setTagInput] = useState('')

  const commitTag = () => {
    const t = tagInput.trim()
    if (t && !item.tags.includes(t)) onChange({ tags: [...item.tags, t] })
    setTagInput(''); setAddingTag(false)
  }

  const removeTag = (tag: string) => onChange({ tags: item.tags.filter(t => t !== tag) })

  const cardStyle: React.CSSProperties = {
    background: T.card, border: `1px solid ${T.line}`, borderRadius: 10, padding: '12px 14px',
  }
  const labelStyle: React.CSSProperties = {
    fontFamily: "'IBM Plex Mono', monospace", textTransform: 'uppercase',
    letterSpacing: '0.04em', fontSize: 10.5, color: T.inkMute, marginBottom: 6,
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
      {item.preview
        ? <img src={item.preview} alt="" style={{ flex: 1, minHeight: 360, borderRadius: 8, objectFit: 'cover', width: '100%', display: 'block' }} />
        : <div style={{ flex: 1, minHeight: 360, borderRadius: 8, background: T.paperTwo, display: 'flex', alignItems: 'center', justifyContent: 'center', color: T.inkMute }} />
      }

      <div style={cardStyle}>
        <div style={labelStyle}>說明</div>
        <textarea
          value={item.caption}
          onChange={e => onChange({ caption: e.target.value })}
          placeholder="為這張照片加上說明…"
          style={{ width: '100%', background: 'transparent', border: 'none', outline: 'none', color: T.ink, fontSize: 13.5, lineHeight: 1.55, minHeight: 64, resize: 'vertical', fontFamily: 'inherit', boxSizing: 'border-box' }}
        />
        <div style={{ display: 'flex', justifyContent: 'flex-end', fontSize: 11.5, color: T.inkMute, fontFamily: "'IBM Plex Mono', monospace", marginTop: 4 }}>
          {item.caption.length} / 280 字
        </div>
      </div>

      <div style={cardStyle}>
        <div style={labelStyle}>標籤</div>
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6, alignItems: 'center' }}>
          {item.tags.map(tag => (
            <span key={tag} style={{ border: `1px solid ${T.line}`, borderRadius: 20, padding: '3px 10px', fontSize: 12, color: T.ink, display: 'inline-flex', alignItems: 'center', gap: 4 }}>
              #{tag}
              <button onClick={() => removeTag(tag)} style={{ background: 'none', border: 'none', cursor: 'pointer', color: T.inkMute, padding: 0, fontSize: 12, lineHeight: 1 }}>✕</button>
            </span>
          ))}
          {addingTag ? (
            <input autoFocus value={tagInput} onChange={e => setTagInput(e.target.value)}
              onBlur={commitTag}
              onKeyDown={e => { if (e.key === 'Enter') { e.preventDefault(); commitTag() } if (e.key === 'Escape') { setTagInput(''); setAddingTag(false) } }}
              style={{ border: `1px solid ${T.accent}`, borderRadius: 20, padding: '3px 10px', fontSize: 12, outline: 'none', color: T.ink, width: 80 }}
            />
          ) : (
            <span onClick={() => setAddingTag(true)} style={{ border: `1px dashed ${T.line}`, borderRadius: 20, padding: '3px 10px', fontSize: 12, color: T.inkMute, cursor: 'pointer' }}>
              ＋ 新增
            </span>
          )}
        </div>
        <div style={{ fontSize: 11, color: T.inkMute, marginTop: 8 }}>僅本機顯示，未來支援儲存</div>
      </div>
    </div>
  )
}
export default PreviewPane
