import T from '../../styles/tokens'
import type { GearItem } from '../../types/gear'
import GearListItem from './GearListItem'

interface GearListProps {
  items: GearItem[]
  onAddGear: () => void
  onDeleteClick: (item: GearItem) => void
  onCardClick: (id: string) => void
}

export default function GearList({ items, onAddGear, onDeleteClick, onCardClick }: GearListProps) {
  return (
    <div style={{ display: 'flex', flexDirection: 'column' as const }}>
      {items.map((item, idx) => (
        <div
          key={item.id}
          style={{ borderBottom: idx < items.length - 1 ? `1px solid ${T.lineSoft}` : 'none' }}
        >
          <GearListItem item={item} onDeleteClick={onDeleteClick} onCardClick={onCardClick} />
        </div>
      ))}
      {/* Add gear row */}
      <div
        onClick={onAddGear}
        style={{
          height: 52, display: 'flex', alignItems: 'center', gap: 8,
          color: T.inkMute, fontSize: 13, cursor: 'pointer',
          borderTop: items.length > 0 ? `1px solid ${T.lineSoft}` : 'none',
          paddingLeft: 4,
        }}
      >
        <span style={{ color: T.accent, fontSize: 18, fontWeight: 600, lineHeight: 1 }}>＋</span>
        新增一件器材
      </div>
    </div>
  )
}
