import React from 'react'
import T from '../../styles/tokens'
import type { GearFilter, FilterPillConfig } from '../../types/gear'

interface GearFilterBarProps {
  pills: FilterPillConfig[]
  activeFilter: GearFilter
  onFilterChange: (filter: GearFilter) => void
}

const styles: Record<string, React.CSSProperties> = {
  bar: {
    display: 'flex',
    gap: '8px',
    overflowX: 'auto',
    padding: '2px 0 10px',
    // Hide scrollbar while keeping scroll behaviour
    scrollbarWidth: 'none' as const,
    msOverflowStyle: 'none' as const,
  },
  pillBase: {
    display: 'inline-flex',
    alignItems: 'center',
    gap: '5px',
    borderRadius: '99px',
    padding: '5px 14px',
    fontSize: '13px',
    fontWeight: 500,
    cursor: 'pointer',
    whiteSpace: 'nowrap' as const,
    flexShrink: 0,
    transition: 'background 0.12s, color 0.12s',
  },
  pillDefault: {
    background: T.card,
    color: T.inkMute,
    border: `1px solid ${T.line}`,
  },
  pillActive: {
    background: T.ink,
    color: T.card,
    border: `1px solid ${T.ink}`,
  },
  pillWarnDefault: {
    background: T.warnSoft,
    color: T.warn,
    border: `1px solid ${T.warn}`,
  },
  pillWarnActive: {
    background: T.warn,
    color: '#ffffff',
    border: `1px solid ${T.warn}`,
  },
  count: {
    fontSize: '12px',
    fontWeight: 600,
    opacity: 0.85,
  },
}

export default function GearFilterBar({ pills, activeFilter, onFilterChange }: GearFilterBarProps) {
  return (
    <div style={styles.bar}>
      {pills.map(pill => {
        const isActive = pill.key === activeFilter
        const isMaintenance = pill.key === 'maintenance_due'

        const variantStyle = isMaintenance
          ? isActive ? styles.pillWarnActive : styles.pillWarnDefault
          : isActive ? styles.pillActive : styles.pillDefault

        return (
          <button
            key={pill.key}
            style={{ ...styles.pillBase, ...variantStyle }}
            onClick={() => onFilterChange(pill.key)}
          >
            {pill.label}
            <span style={styles.count}>{pill.count}</span>
          </button>
        )
      })}
    </div>
  )
}
