import React, { useState } from 'react'
import T from '../../styles/tokens'
import { useBreakpoint } from '../../hooks/useBreakpoint'
import type { FileItem } from '../../lib/uploadTypes'
import PhotoPreview from './PhotoPreview'

const mono = "'IBM Plex Mono', monospace"

interface PreviewPaneProps {
  item: FileItem
  onChange: (patch: Partial<FileItem>) => void
}

const PreviewPane: React.FC<PreviewPaneProps> = ({ item, onChange }) => {
  const { isMobile } = useBreakpoint()
  const [addingTag, setAddingTag] = useState(false)
  const [tagInput, setTagInput] = useState('')

  const commitTag = () => {
    const t = tagInput.trim()
    if (t && !item.tags.includes(t)) onChange({ tags: [...item.tags, t] })
    setTagInput(''); setAddingTag(false)
  }

  const removeTag = (tag: string) => onChange({ tags: item.tags.filter(t => t !== tag) })

  const tagRow = (
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
  )

  // ── Mobile：只顯示說明 + 標籤（圖片由 PhotoPreview 單獨負責）
  if (isMobile) {
    return (
      <>
        <div style={{ margin: '8px 10px 0', background: T.card, border: `1px solid ${T.line}`, borderRadius: 8, padding: '8px 10px' }}>
          <div style={{ fontFamily: mono, fontSize: 8.5, textTransform: 'uppercase', letterSpacing: '0.04em', color: T.inkMute, marginBottom: 4 }}>說明</div>
          <textarea
            value={item.caption}
            onChange={e => onChange({ caption: e.target.value })}
            placeholder="為這張照片加上說明…"
            style={{ width: '100%', background: 'transparent', border: 'none', outline: 'none', color: T.ink, fontSize: 11, lineHeight: 1.45, minHeight: 48, resize: 'none', fontFamily: 'inherit', boxSizing: 'border-box' }}
          />
        </div>
        <div style={{ padding: '8px 10px', display: 'flex', flexWrap: 'wrap', gap: 4, alignItems: 'center' }}>
          {item.tags.map(tag => (
            <span key={tag} style={{ border: `1px solid ${T.line}`, borderRadius: 20, padding: '3px 10px', fontSize: 11, color: T.ink, display: 'inline-flex', alignItems: 'center', gap: 4 }}>
              #{tag}
              <button onClick={() => removeTag(tag)} style={{ background: 'none', border: 'none', cursor: 'pointer', color: T.inkMute, padding: 0, fontSize: 11, lineHeight: 1 }}>✕</button>
            </span>
          ))}
          {addingTag ? (
            <input autoFocus value={tagInput} onChange={e => setTagInput(e.target.value)}
              onBlur={commitTag}
              onKeyDown={e => { if (e.key === 'Enter') { e.preventDefault(); commitTag() } if (e.key === 'Escape') { setTagInput(''); setAddingTag(false) } }}
              style={{ border: `1px solid ${T.accent}`, borderRadius: 20, padding: '3px 10px', fontSize: 11, outline: 'none', color: T.ink, width: 80 }}
            />
          ) : (
            <span onClick={() => setAddingTag(true)} style={{ border: `1px dashed ${T.line}`, borderRadius: 20, padding: '3px 10px', fontSize: 11, color: T.inkMute, cursor: 'pointer' }}>
              ＋ 標籤
            </span>
          )}
        </div>
      </>
    )
  }

  // ── Desktop：圖片 + 說明 + 標籤
  const cardStyle: React.CSSProperties = {
    background: T.card, border: `1px solid ${T.line}`, borderRadius: 10, padding: '12px 14px',
  }
  const labelStyle: React.CSSProperties = {
    fontFamily: mono, textTransform: 'uppercase',
    letterSpacing: '0.04em', fontSize: 10.5, color: T.inkMute, marginBottom: 6,
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
      <PhotoPreview item={item} />

      <div style={cardStyle}>
        <div style={labelStyle}>說明</div>
        <textarea
          value={item.caption}
          onChange={e => onChange({ caption: e.target.value })}
          placeholder="為這張照片加上說明…"
          style={{ width: '100%', background: 'transparent', border: 'none', outline: 'none', color: T.ink, fontSize: 13.5, lineHeight: 1.55, minHeight: 64, resize: 'vertical', fontFamily: 'inherit', boxSizing: 'border-box' }}
        />
        <div style={{ display: 'flex', justifyContent: 'flex-end', fontSize: 11.5, color: T.inkMute, fontFamily: mono, marginTop: 4 }}>
          {item.caption.length} / 280 字
        </div>
      </div>

      <div style={cardStyle}>
        <div style={labelStyle}>標籤</div>
        {tagRow}
        <div style={{ fontSize: 11, color: T.inkMute, marginTop: 8 }}>上傳時會一併儲存到照片資料</div>
      </div>
    </div>
  )
}

export default PreviewPane
