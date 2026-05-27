import React, { useCallback, useState } from 'react'
import { useDropzone } from 'react-dropzone'
import { useBreakpoint } from '../../hooks/useBreakpoint'
import T from '../../styles/tokens'
import type { FileItem } from '../../lib/uploadTypes'
import FileList from './FileList'
import PreviewPane from './PreviewPane'
import ExifPanel from './ExifPanel'
import LocationPanel from './LocationPanel'
import VisibilityPanel from './VisibilityPanel'

const mono = "'IBM Plex Mono', monospace"

interface ReviewStepProps {
  items: FileItem[]
  selectedIdx: number
  onSelect: (i: number) => void
  onAddMore: (files: File[]) => void
  onChangeItem: (i: number, patch: Partial<FileItem>) => void
}

const ReviewStep: React.FC<ReviewStepProps> = ({ items, selectedIdx, onSelect, onAddMore, onChangeItem }) => {
  const { isMobile } = useBreakpoint()
  const item = items[selectedIdx]
  const [addingTag, setAddingTag] = useState(false)
  const [tagInput, setTagInput] = useState('')

  const onDrop = useCallback((accepted: File[]) => onAddMore(accepted), [onAddMore])
  const { getRootProps, getInputProps } = useDropzone({ onDrop, accept: { 'image/*': [] }, multiple: true })

  if (!item) return null

  const commitTag = () => {
    const t = tagInput.trim()
    if (t && !item.tags.includes(t)) onChangeItem(selectedIdx, { tags: [...item.tags, t] })
    setTagInput(''); setAddingTag(false)
  }

  if (isMobile) {
    return (
      <div style={{ display: 'flex', flexDirection: 'column', paddingBottom: 8 }}>

        {/* 預覽圖 */}
        <div style={{ position: 'relative', flexShrink: 0, background: T.paperTwo }}>
          <img src={item.preview} alt="" style={{ width: '100%', height: 'auto', maxHeight: 280, objectFit: 'contain', display: 'block' }} />
          <span style={{ position: 'absolute', bottom: 8, left: 8, fontFamily: mono, fontSize: 9, background: 'rgba(255,255,255,0.9)', color: T.inkMute, padding: '2px 6px', borderRadius: 3 }}>
            {item.file.name}
          </span>
        </div>

        {/* 縮圖列 */}
        <div style={{ display: 'flex', gap: 5, padding: '8px 10px', background: T.card, borderBottom: `1px solid ${T.lineSoft}`, flexShrink: 0, overflowX: 'auto' }}>
          {items.map((f, i) => (
            <div key={i} onClick={() => onSelect(i)} style={{
              border: i === selectedIdx ? `1.5px solid ${T.accent}` : `1px solid ${T.line}`,
              borderRadius: 5, overflow: 'hidden', width: 40, height: 40, flexShrink: 0, cursor: 'pointer',
            }}>
              <img src={f.preview} alt="" style={{ width: 40, height: 40, objectFit: 'cover', display: 'block' }} />
            </div>
          ))}
          <div {...getRootProps({ style: {
            border: `1px dashed ${T.line}`, borderRadius: 5, width: 40, height: 40,
            flexShrink: 0, display: 'flex', alignItems: 'center', justifyContent: 'center',
            color: T.inkMute, cursor: 'pointer', background: T.card,
          }})}>
            <input {...getInputProps()} />
            <span style={{ fontSize: 16 }}>＋</span>
          </div>
        </div>

        {/* EXIF 三欄 */}
        <div style={{ margin: '8px 10px 0', border: `1px solid ${T.line}`, borderRadius: 8, overflow: 'hidden' }}>
          <div style={{ padding: '6px 10px 4px', background: T.card, borderBottom: `1px solid ${T.lineSoft}`, display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
            <span style={{ fontFamily: mono, fontSize: 8.5, textTransform: 'uppercase', letterSpacing: '0.04em', color: T.inkMute }}>EXIF · 自動讀取</span>
            <span style={{ fontFamily: mono, fontSize: 9, color: item.exif ? T.ok : T.inkMute }}>● {item.exif ? '已偵測' : '處理中'}</span>
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3,1fr)' }}>
            {([
              { k: '機身', v: item.exif?.make },
              { k: '鏡頭', v: item.exif?.lens },
              { k: '光圈', v: item.exif?.aperture },
              { k: '快門', v: item.exif?.shutter },
              { k: 'ISO',  v: item.exif?.iso },
              { k: '焦距', v: item.exif?.focalLength },
            ] as { k: string; v: string | undefined }[]).map(({ k, v }, idx) => (
              <div key={k} style={{
                background: T.card, padding: '7px 10px',
                borderRight: (idx + 1) % 3 !== 0 ? `1px solid ${T.lineSoft}` : undefined,
                borderBottom: idx < 3 ? `1px solid ${T.lineSoft}` : undefined,
              }}>
                <div style={{ fontFamily: mono, fontSize: 8, textTransform: 'uppercase', letterSpacing: '0.04em', color: T.inkMute, marginBottom: 2 }}>{k}</div>
                <div style={{ fontSize: 11.5, fontWeight: 600, color: T.ink }}>{v ?? '—'}</div>
              </div>
            ))}
          </div>
        </div>

        {/* 景點配對 */}
        <div style={{ margin: '8px 10px 0' }}>
          <LocationPanel />
        </div>

        {/* 說明 */}
        <div style={{ margin: '8px 10px 0', background: T.card, border: `1px solid ${T.line}`, borderRadius: 8, padding: '8px 10px' }}>
          <div style={{ fontFamily: mono, fontSize: 8.5, textTransform: 'uppercase', letterSpacing: '0.04em', color: T.inkMute, marginBottom: 4 }}>說明</div>
          <textarea
            value={item.caption}
            onChange={e => onChangeItem(selectedIdx, { caption: e.target.value })}
            placeholder="為這張照片加上說明…"
            style={{ width: '100%', background: 'transparent', border: 'none', outline: 'none', color: T.ink, fontSize: 11, lineHeight: 1.45, minHeight: 48, resize: 'none', fontFamily: 'inherit', boxSizing: 'border-box' }}
          />
        </div>

        {/* 標籤 */}
        <div style={{ padding: '8px 10px', display: 'flex', gap: 4, flexWrap: 'wrap', alignItems: 'center' }}>
          {item.tags.map(tag => (
            <span key={tag} style={{ border: `1px solid ${T.line}`, borderRadius: 20, padding: '3px 10px', fontSize: 11, color: T.ink, display: 'inline-flex', alignItems: 'center', gap: 4 }}>
              #{tag}
              <button onClick={() => onChangeItem(selectedIdx, { tags: item.tags.filter(t => t !== tag) })} style={{ background: 'none', border: 'none', cursor: 'pointer', color: T.inkMute, padding: 0, fontSize: 11, lineHeight: 1 }}>✕</button>
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

        {/* 可見度 (compact) */}
        <div style={{ margin: '0 10px 8px', background: T.card, border: `1px solid ${T.line}`, borderRadius: 8, padding: '8px 10px', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <span style={{ fontSize: 11, fontWeight: 500 }}>
            {item.visibility === 'public' ? '🌐 公開' : '🔒 私人'}
          </span>
          <span style={{ fontSize: 10, color: T.inkMute }}>
            {item.visibility === 'public' ? '所有人可見' : '僅自己可見'}
          </span>
          <span
            onClick={() => onChangeItem(selectedIdx, { visibility: item.visibility === 'public' ? 'private' : 'public' })}
            style={{ fontSize: 10, color: T.accent, fontWeight: 500, cursor: 'pointer' }}
          >
            變更
          </span>
        </div>

      </div>
    )
  }

  // Desktop 三欄
  return (
    <div style={{ display: 'grid', gridTemplateColumns: '240px 1fr 320px', gap: 20, minHeight: 540 }}>
      <FileList items={items} selectedIdx={selectedIdx} onSelect={onSelect} onAddMore={onAddMore} />
      <PreviewPane item={item} onChange={patch => onChangeItem(selectedIdx, patch)} />
      <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
        <ExifPanel exif={item.exif} />
        <LocationPanel
          gpsLat={item.exif?.gpsLat}
          gpsLng={item.exif?.gpsLng}
          value={item.location}
          onChange={(location) => onChangeItem(selectedIdx, { location })}
        />
        <VisibilityPanel
          visibility={item.visibility}
          onChange={v => onChangeItem(selectedIdx, { visibility: v })}
          hidePreciseGps={item.hidePreciseGps}
          onToggleGps={() => onChangeItem(selectedIdx, { hidePreciseGps: !item.hidePreciseGps })}
        />
      </div>
    </div>
  )
}

export default ReviewStep
