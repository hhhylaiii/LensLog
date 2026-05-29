import T from '../../styles/tokens'
import type { GearItem } from '../../types/gear'

const CATEGORY_LABEL: Record<string, string> = {
  body: '機身', lens: '鏡頭', flash: '閃燈',
  tripod: '腳架', filter: '濾鏡', memory_card: '記憶卡',
}

interface GearListItemProps {
  item: GearItem
  onDeleteClick?: (item: GearItem) => void
  onCardClick?: (id: string) => void
}

export default function GearListItem({ item, onCardClick }: GearListItemProps) {
  let usedPct: number | null = null
  if (item.type === 'body' && item.shutterCount != null && item.shutterLifeMax) {
    usedPct = (item.shutterCount / item.shutterLifeMax) * 100
  } else if (item.lastMaintained && item.maintenanceIntervalDays) {
    const daysSince = Math.floor((Date.now() - new Date(item.lastMaintained).getTime()) / 86400000)
    usedPct = Math.min((daysSince / item.maintenanceIntervalDays) * 100, 100)
  }

  return (
    <div onClick={() => onCardClick?.(item.id)} style={{
      display: 'flex', alignItems: 'center', gap: 12, padding: '10px 0',
      cursor: 'pointer',
      background: item.status === 'maintenance_due' ? T.warnSoft : 'transparent',
      borderRadius: 8, paddingLeft: 8, paddingRight: 8,
    }}>
      {/* Thumbnail placeholder */}
      <div style={{ width: 44, height: 44, borderRadius: 8, background: T.paperTwo, flexShrink: 0 }} />

      {/* Middle: name + badge + sub info + progress bar */}
      <div style={{ flex: 1, minWidth: 0 }}>
        {/* Row 1: model name + category badge */}
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 8, marginBottom: 2 }}>
          <span style={{ fontSize: 12.5, fontWeight: 600, color: T.ink, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' as const }}>
            {item.model}
          </span>
          <span style={{ fontSize: 11, fontWeight: 600, color: T.inkSoft, background: T.paper, border: `1px solid ${T.line}`, borderRadius: 10, padding: '1px 7px', flexShrink: 0 }}>
            {CATEGORY_LABEL[item.type] ?? item.type}
          </span>
        </div>

        {/* Row 2: sub info */}
        {item.status === 'maintenance_due' && item.overdueDays ? (
          <div style={{ fontSize: 11.5, color: T.warn, fontWeight: 500 }}>⚠ 逾期 {item.overdueDays} 天</div>
        ) : item.purchaseDate ? (
          <div style={{ fontSize: 11.5, color: T.inkMute }}>購入 {item.purchaseDate}</div>
        ) : item.daysSinceLastUsed ? (
          <div style={{ fontSize: 11.5, color: T.inkMute }}>{item.daysSinceLastUsed} 天未使用</div>
        ) : null}

        {/* Row 3: progress bar (if applicable) */}
        {usedPct != null && (
          <div style={{ marginTop: 4, background: T.paperTwo, borderRadius: 99, height: 3, overflow: 'hidden' }}>
            <div style={{
              width: `${usedPct}%`, height: '100%', borderRadius: 99,
              background: item.status === 'maintenance_due' ? T.warn : T.accent,
            }} />
          </div>
        )}
      </div>
    </div>
  )
}
