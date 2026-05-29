import React from 'react'
import { ExploreLocation, MapSource, t, Icon, ICON } from './types'

interface MobileSpotsSheetProps {
  open: boolean
  onClose: () => void
  filtered: ExploreLocation[]
  search: string
  source: MapSource
  onSourceChange: (src: MapSource) => void
  selectedTag: string | null
  onTagSelect: (tag: string | null) => void
  allTags: string[]
  selectedId: string | null
  onSelect: (loc: ExploreLocation) => void
}

const MobileSpotsSheet: React.FC<MobileSpotsSheetProps> = ({
  open,
  onClose,
  filtered,
  search,
  source,
  onSourceChange,
  selectedTag,
  onTagSelect,
  allTags,
  selectedId,
  onSelect,
}) => {
  const mBtnBase: React.CSSProperties = { height: 26, padding: '0 10px', borderRadius: 13, fontSize: 11, whiteSpace: 'nowrap', flexShrink: 0, cursor: 'pointer' }

  return (
    <div style={{ position: 'absolute', left: 0, right: 0, bottom: 0, height: '63%', background: t.card, borderRadius: '22px 22px 0 0', border: `1px solid ${t.line}`, borderBottom: 0, boxShadow: '0 -10px 32px rgba(15,30,56,0.18)', zIndex: 36, overflow: 'hidden', display: 'flex', flexDirection: 'column', transform: open ? 'translateY(0)' : 'translateY(105%)', transition: 'transform 0.32s cubic-bezier(0.32,0.72,0,1)' }}>
      {/* Drag handle */}
      <div style={{ height: 22, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
        <div style={{ width: 36, height: 4, borderRadius: 2, background: t.line }} />
      </div>

      {/* Header */}
      <div style={{ padding: '0 14px 10px', flexShrink: 0, display: 'flex', alignItems: 'center', justifyContent: 'space-between', borderBottom: `1px solid ${t.lineSoft}` }}>
        <div style={{ fontSize: 14, fontWeight: 600, letterSpacing: '-0.01em', display: 'flex', alignItems: 'center', gap: 7 }}>
          附近景點
          <span style={{ fontFamily: "'IBM Plex Mono',monospace", fontSize: 10, color: t.accentInk, background: t.accentSoft, border: '1px solid #c8dcef', padding: '2px 7px', borderRadius: 10 }}>{filtered.length} 處</span>
        </div>
        <button onClick={onClose} style={{ width: 26, height: 26, borderRadius: '50%', background: t.paper, border: `1px solid ${t.line}`, display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer', color: t.inkMute, padding: 0 }}>
          <Icon path={ICON.xmark} size={12} />
        </button>
      </div>

      {/* Source + tag chips row */}
      <div style={{ display: 'flex', gap: 5, padding: '8px 12px', overflowX: 'auto', flexShrink: 0, borderBottom: `1px solid ${t.lineSoft}`, scrollbarWidth: 'none' as const }}>
        {(['user', 'global'] as MapSource[]).map((src) => (
          <button key={src} style={{ ...mBtnBase, background: source === src ? t.ink : t.card, border: `1px solid ${source === src ? t.ink : t.line}`, color: source === src ? '#fff' : t.inkSoft }} onClick={() => onSourceChange(src)}>{src === 'user' ? '我的景點' : '大家景點'}</button>
        ))}
        <button style={{ ...mBtnBase, background: selectedTag === null ? t.accent : t.card, border: `1px solid ${selectedTag === null ? t.accent : t.line}`, color: selectedTag === null ? '#fff' : t.inkSoft }} onClick={() => onTagSelect(null)}>全部</button>
        {allTags.slice(0, 5).map((tag) => (
          <button key={tag} style={{ ...mBtnBase, background: selectedTag === tag ? t.ink : t.card, border: `1px solid ${selectedTag === tag ? t.ink : t.line}`, color: selectedTag === tag ? '#fff' : t.inkSoft }} onClick={() => onTagSelect(selectedTag === tag ? null : tag)}>{tag}</button>
        ))}
      </div>

      {/* Scrollable list */}
      <div style={{ flex: 1, overflowY: 'auto', padding: 6, display: 'flex', flexDirection: 'column', gap: 2 }}>
        {filtered.length === 0 ? (
          <div style={{ padding: '20px', color: t.inkMute, fontSize: '13px', textAlign: 'center' }}>{search ? '沒有符合的景點' : '還沒有景點'}</div>
        ) : (
          filtered.map((loc) => {
            const active = selectedId === loc.id
            return (
              <div key={loc.id} style={{ display: 'flex', gap: 10, padding: '9px 10px', borderRadius: 10, cursor: 'pointer', border: `1px solid ${active ? '#c6dbf3' : 'transparent'}`, background: active ? t.accentSoft : 'transparent' }} onClick={() => onSelect(loc)}>
                <div style={{ width: 42, height: 42, borderRadius: 8, flexShrink: 0, background: 'linear-gradient(160deg,#6b82a8,#1a2942)' }} />
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ fontSize: 13, fontWeight: 600, letterSpacing: '-0.01em', lineHeight: 1.25 }}>{loc.name}</div>
                  <div style={{ fontSize: 11, color: t.inkSoft, margin: '1px 0' }}>{loc.tags[0] || (loc.source === 'global' ? '全站景點' : '景點')} · ★ 4.{(loc.id.charCodeAt(0) % 9) + 1}</div>
                  <div style={{ fontFamily: "'IBM Plex Mono',monospace", fontSize: 10, color: t.inkMute }}>{Number(loc.latitude).toFixed(3)}, {Number(loc.longitude).toFixed(3)}</div>
                </div>
              </div>
            )
          })
        )}
      </div>
    </div>
  )
}

export default MobileSpotsSheet
