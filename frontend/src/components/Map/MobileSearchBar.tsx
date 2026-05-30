import React from 'react'
import { t, Icon, ICON } from './types'

interface MobileSearchBarProps {
  search: string
  onSearch: (v: string) => void
  allTags: string[]
  selectedTag: string | null
  onTagSelect: (tag: string | null) => void
}

const ApertureMark: React.FC = () => (
  <div style={{ width: 40, height: 40, borderRadius: 11, background: 'linear-gradient(135deg, #1e5fb3, #0f3d80)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#fff', flexShrink: 0, boxShadow: 'inset 0 1px 0 rgba(255,255,255,0.18)' }}>
    <svg width={22} height={22} viewBox="0 0 24 24" fill="currentColor">
      <path fillRule="evenodd" d="M12 2.5a9.5 9.5 0 100 19 9.5 9.5 0 000-19zm0 1.8a7.7 7.7 0 016.33 3.32l-4.82 2.78-1.51-5.64a7.72 7.72 0 010-.46zm-1.96.21l1.51 5.64-5.64-1.51a7.72 7.72 0 014.13-4.13zm-4.79 5.56l5.64 1.51-4.13 4.13A7.7 7.7 0 014.3 12a7.7 7.7 0 01.95-3.93zm12.54.22A7.7 7.7 0 0119.7 12a7.7 7.7 0 01-.95 3.93l-4.13-4.13 4.17-1.12zM12 10.2a1.8 1.8 0 110 3.6 1.8 1.8 0 010-3.6zm-4.13 3.93l4.13-1.11 1.51 5.64a7.72 7.72 0 01-5.64-4.53zm8.26 0a7.72 7.72 0 01-4.13 4.13l1.51-5.64 2.62 1.51z" />
    </svg>
  </div>
)

const chipStyle = (active: boolean): React.CSSProperties => ({
  height: 30,
  padding: '0 12px',
  background: active ? t.ink : t.card,
  border: `1px solid ${active ? t.ink : t.line}`,
  borderRadius: 15,
  display: 'inline-flex',
  alignItems: 'center',
  fontSize: 12,
  color: active ? '#fff' : t.inkSoft,
  boxShadow: '0 2px 8px rgba(15,30,56,0.08)',
  whiteSpace: 'nowrap',
  flexShrink: 0,
  cursor: 'pointer',
  pointerEvents: 'auto',
})

const MobileSearchBar: React.FC<MobileSearchBarProps> = ({
  search,
  onSearch,
  allTags,
  selectedTag,
  onTagSelect,
}) => (
  <>
    {/* Floating search bar */}
    <div style={{ position: 'absolute', top: 12, left: 12, right: 12, height: 48, background: t.card, borderRadius: 14, boxShadow: '0 1px 2px rgba(15,30,56,0.06),0 6px 16px rgba(15,30,56,0.12)', display: 'flex', alignItems: 'center', padding: '0 4px', zIndex: 30, gap: 4 }}>
      <ApertureMark />
      <div style={{ flex: 1, display: 'flex', alignItems: 'center', gap: 5, padding: '0 4px', minWidth: 0, color: t.inkMute }}>
        <Icon path={ICON.search} size={13} />
        <input
          style={{ flex: 1, border: 0, outline: 0, background: 'transparent', fontFamily: 'inherit', fontSize: 14, color: search ? t.ink : t.inkMute, minWidth: 0 }}
          placeholder="搜尋景點、城市、標籤…"
          value={search}
          onChange={(e) => onSearch(e.target.value)}
        />
      </div>
      <div style={{ width: 36, height: 36, borderRadius: '50%', background: 'linear-gradient(135deg, #d9927d, #6b5a7a)', flexShrink: 0, border: `2px solid ${t.card}`, boxShadow: `0 0 0 1px ${t.line}`, marginRight: 4 }} />
    </div>

    {/* Filter chips row */}
    <div style={{ position: 'absolute', top: 72, left: 0, right: 0, padding: '0 12px', display: 'flex', gap: 6, overflowX: 'auto', zIndex: 25, scrollbarWidth: 'none', pointerEvents: 'none' }}>
      <button style={chipStyle(selectedTag === null)} onClick={() => onTagSelect(null)}>全部</button>
      {allTags.map((tag) => (
        <button key={tag} style={chipStyle(selectedTag === tag)} onClick={() => onTagSelect(selectedTag === tag ? null : tag)}>
          {tag}
        </button>
      ))}
    </div>
  </>
)

export default MobileSearchBar
