import React from 'react'
import T from '../../styles/tokens'
import GearCard from './GearCard'
import type { GearItem } from '../../types/gear'

interface GearGridProps {
  items: GearItem[]
  onAddGear: () => void
}

const styles: Record<string, React.CSSProperties> = {
  grid: {
    display: 'grid',
    gridTemplateColumns: 'repeat(auto-fill, minmax(260px, 1fr))',
    gap: '20px',
  },
  addCard: {
    border: `2px dashed ${T.line}`,
    borderRadius: '14px',
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    justifyContent: 'center',
    gap: '8px',
    cursor: 'pointer',
    minHeight: '260px',
    background: 'transparent',
    transition: 'border-color 0.15s, background 0.15s',
  },
  addIcon: {
    fontSize: '28px',
    color: T.inkMute,
    lineHeight: 1,
  },
  addLabel: {
    color: T.inkMute,
    fontSize: '13px',
    fontWeight: 500,
  },
}

export default function GearGrid({ items, onAddGear }: GearGridProps) {
  return (
    <div style={styles.grid}>
      {items.map(item => (
        <GearCard key={item.id} item={item} />
      ))}
      <div
        style={styles.addCard}
        onClick={onAddGear}
        role="button"
        tabIndex={0}
        onKeyDown={e => e.key === 'Enter' && onAddGear()}
        aria-label="新增一件器材"
      >
        <span style={styles.addIcon}>+</span>
        <span style={styles.addLabel}>新增一件器材</span>
      </div>
    </div>
  )
}
