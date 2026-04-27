import React from 'react'
import T from '../../styles/tokens'

interface GearHeaderProps {
  searchQuery: string
  onSearchChange: (q: string) => void
  onAddGear: () => void
}

const styles: Record<string, React.CSSProperties> = {
  header: {
    display: 'flex',
    alignItems: 'center',
    gap: '12px',
    padding: '14px 32px',
    background: T.card,
  },
  searchWrap: {
    width: '480px',
    position: 'relative' as const,
  },
  searchIcon: {
    position: 'absolute' as const,
    left: '12px',
    top: '50%',
    transform: 'translateY(-50%)',
    color: T.inkMute,
    pointerEvents: 'none' as const,
  },
  searchInput: {
    width: '100%',
    border: `1px solid ${T.line}`,
    borderRadius: '8px',
    padding: '10px 16px 10px 36px',
    fontSize: '14px',
    color: T.ink,
    background: T.card,
    outline: 'none',
    boxSizing: 'border-box' as const,
  },
  spacer: {
    flex: 1,
  },
  addBtn: {
    background: T.accent,
    color: '#ffffff',
    border: 'none',
    borderRadius: '8px',
    padding: '9px 18px',
    fontSize: '14px',
    fontWeight: 600,
    cursor: 'pointer',
    whiteSpace: 'nowrap' as const,
    flexShrink: 0,
  },
  avatar: {
    width: '38px',
    height: '38px',
    borderRadius: '50%',
    background: T.paperTwo,
    border: `2px solid ${T.line}`,
    flexShrink: 0,
    cursor: 'pointer',
  },
}

export default function GearHeader({ searchQuery, onSearchChange, onAddGear }: GearHeaderProps) {
  return (
    <div style={styles.header}>
      <div style={styles.searchWrap}>
        <svg
          style={styles.searchIcon}
          width="16"
          height="16"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="2"
          strokeLinecap="round"
          strokeLinejoin="round"
        >
          <circle cx="11" cy="11" r="8"></circle>
          <line x1="21" y1="21" x2="16.65" y2="16.65"></line>
        </svg>
        <input
          type="text"
          style={styles.searchInput}
          placeholder="搜尋器材型號、品牌..."
          value={searchQuery}
          onChange={e => onSearchChange(e.target.value)}
          aria-label="搜尋器材"
        />
      </div>
      <button style={styles.addBtn} onClick={onAddGear}>
        + 新增器材
      </button>
      <div style={styles.spacer} />
      <div
        style={styles.avatar}
        role="img"
        aria-label="用戶頭像"
        title="個人頁面（即將推出）"
        onClick={() => alert('個人頁面功能即將推出！')}
      />
    </div>
  )
}
