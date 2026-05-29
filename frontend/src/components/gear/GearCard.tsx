import React from 'react'
import T from '../../styles/tokens'
import type { GearItem } from '../../types/gear'

const CATEGORY_LABEL: Record<string, string> = {
  body: '機身',
  lens: '鏡頭',
  flash: '閃燈',
  tripod: '腳架',
  filter: '濾鏡',
  memory_card: '記憶卡',
}

interface ProgressInfo {
  usedPct: number
  label: string
  color: string
  shutterCountText?: string
}

function getProgressInfo(item: GearItem): ProgressInfo | null {
  if (item.type === 'body' && item.shutterCount != null && item.shutterLifeMax) {
    const usedPct = (item.shutterCount / item.shutterLifeMax) * 100
    const remainingPct = 100 - usedPct
    return {
      usedPct,
      label: `快門數壽命 ${remainingPct.toFixed(1)}%`,
      color: T.accentNeon,
      shutterCountText: `快門 ${item.shutterCount.toLocaleString()} / ${item.shutterLifeMax.toLocaleString()}`,
    }
  }
  if (item.lastMaintained && item.maintenanceIntervalDays) {
    const msPerDay = 86_400_000
    const daysSince = Math.floor(
      (Date.now() - new Date(item.lastMaintained).getTime()) / msPerDay,
    )
    const usedPct = Math.min((daysSince / item.maintenanceIntervalDays) * 100, 100)
    const color = item.status === 'maintenance_due' ? T.warn : T.accentNeon
    const label = item.status === 'maintenance_due' ? '' : `保養進度 ${usedPct.toFixed(0)}%`
    return { usedPct, label, color }
  }
  return null
}



const styles: Record<string, React.CSSProperties> = {
  card: {
    background: T.card,
    borderRadius: '14px',
    padding: '14px',
    display: 'flex',
    flexDirection: 'column',
    gap: '8px',
    minHeight: '260px',
    border: `1px solid ${T.line}`,
    boxShadow: '0 2px 8px rgba(0,0,0,0.02)',
    transition: 'border-color 0.15s, background 0.15s',
    cursor: 'pointer',
  },
  cardHovered: {
    border: `1px solid ${T.accent}`,
    boxShadow: `0 0 0 1px ${T.accent}, 0 6px 16px rgba(0,0,0,0.06)`,
    background: T.paper,
  },
  topRow: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  categoryBadge: {
    background: T.card,
    color: T.inkSoft,
    borderRadius: '12px',
    padding: '4px 12px',
    fontSize: '12px',
    fontWeight: 600,
    border: `1px solid ${T.line}`,
  },
  badgeMostUsed: {
    background: T.accentSoft,
    color: T.accent,
    borderRadius: '12px',
    padding: '2px 9px',
    fontSize: '11px',
    fontWeight: 600,
    border: `1px solid ${T.lineSoft}`,
  },
  badgeMaintenance: {
    background: T.warnSoft,
    color: T.warn,
    borderRadius: '12px',
    padding: '2px 9px',
    fontSize: '11px',
    fontWeight: 600,
    border: `1px solid #fed7aa`,
  },
  badgeSerial: {
    color: T.inkMute,
    fontSize: '11px',
    fontWeight: 500,
  },
  imagePlaceholder: {
    background: `linear-gradient(135deg, ${T.sideBgTwo}, ${T.ink})`,
    borderRadius: '8px',
    height: '110px',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    overflow: 'hidden',
    flexShrink: 0,
  },
  placeholderDash: {
    background: 'rgba(255,255,255,0.85)',
    color: T.ink,
    fontSize: '11px',
    fontWeight: 600,
    padding: '2px 8px',
    borderRadius: '4px',
    userSelect: 'none',
  },
  image: {
    width: '100%',
    height: '100%',
    objectFit: 'cover' as const,
    borderRadius: '8px',
  },
  modelName: {
    color: T.ink,
    fontSize: '15px',
    fontWeight: 700,
    lineHeight: 1.25,
    overflow: 'hidden',
    display: '-webkit-box',
    WebkitLineClamp: 2,
    WebkitBoxOrient: 'vertical',
  } as React.CSSProperties,
  brandText: {
    color: T.inkMute,
    fontSize: '12px',
    marginTop: '-4px',
  },
  infoText: {
    color: T.inkSoft,
    fontSize: '12px',
    marginTop: '2px',
  },
  infoWarn: {
    color: T.warn,
    fontSize: '12px',
    fontWeight: 500,
    marginTop: '2px',
  },
  shutterCount: {
    color: T.inkSoft,
    fontSize: '11px',
  },
  progressWrap: {
    display: 'flex',
    flexDirection: 'column',
    gap: '4px',
  },
  progressTrack: {
    background: T.lineSoft,
    borderRadius: '99px',
    height: '4px',
    overflow: 'hidden',
  },
  progressLabel: {
    color: T.inkMute,
    fontSize: '11px',
  },
  communityRow: {
    display: 'flex',
    alignItems: 'center',
    gap: '4px',
    marginTop: 'auto',
    paddingTop: '4px',
  },
  avatarGroup: {
    display: 'flex',
  },
  avatarDot: {
    width: '16px',
    height: '16px',
    borderRadius: '50%',
    background: T.line,
    border: `2px solid ${T.card}`,
    marginRight: '-4px',
    flexShrink: 0,
  },
  communityText: {
    color: T.inkMute,
    fontSize: '11px',
    paddingLeft: '10px',
  },
  deleteBtn: {
    background: 'transparent',
    border: 'none',
    color: T.inkMute,
    cursor: 'pointer',
    fontSize: '16px',
    padding: '4px',
    lineHeight: 1,
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: '6px',
  },
}

interface GearCardProps {
  item: GearItem
  onDeleteClick?: (item: GearItem) => void
  onCardClick?: (id: string) => void
}

export default function GearCard({ item, onDeleteClick, onCardClick }: GearCardProps) {
  const [isHovered, setIsHovered] = React.useState(false)
  const [isDeleteHovered, setIsDeleteHovered] = React.useState(false)
  const progress = getProgressInfo(item)
  return (
    <div
      style={{
        ...styles.card,
        ...(isHovered && !isDeleteHovered ? styles.cardHovered : {}),
      }}
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
      onClick={() => onCardClick?.(item.id)}
    >
      <div style={styles.topRow}>
        <span style={styles.categoryBadge}>{CATEGORY_LABEL[item.type]}</span>
        <div style={{ display: 'flex', gap: '6px', alignItems: 'center' }}>
          {item.status === 'most_used' && (
            <span style={styles.badgeMostUsed}>最常用</span>
          )}
          {item.status === 'maintenance_due' && (
            <span style={styles.badgeMaintenance}>⚠️ 待保養</span>
          )}
          {item.status === 'normal' && item.serialNumber && (
            <span style={styles.badgeSerial}>#{item.serialNumber}</span>
          )}
          {onDeleteClick && (
            <button
              style={{
                ...styles.deleteBtn,
                ...(isDeleteHovered ? { background: T.lineSoft, color: T.warn } : {}),
              }}
              onMouseEnter={() => setIsDeleteHovered(true)}
              onMouseLeave={() => setIsDeleteHovered(false)}
              onClick={(e) => {
                e.stopPropagation()
                onDeleteClick(item)
              }}
              aria-label="刪除"
            >
              ✕
            </button>
          )}
        </div>
      </div>

      <div style={styles.imagePlaceholder}>
        {item.imageUrl ? (
          <img src={item.imageUrl} alt={item.model} style={styles.image} />
        ) : (
          <span style={styles.placeholderDash}>{CATEGORY_LABEL[item.type]}圖</span>
        )}
      </div>

      <div style={styles.modelName}>{item.model}</div>
      {item.brand && <div style={styles.brandText}>{item.brand}</div>}

      {item.status === 'maintenance_due' && item.overdueDays ? (
        <div style={styles.infoWarn}>逾期 {item.overdueDays} 天</div>
      ) : item.purchaseDate ? (
        <div style={styles.infoText}>購入 {item.purchaseDate}</div>
      ) : item.daysSinceLastUsed ? (
        <div style={styles.infoText}>{item.daysSinceLastUsed} 天未使用</div>
      ) : null}

      {progress?.shutterCountText && (
        <div style={styles.shutterCount}>{progress.shutterCountText}</div>
      )}

      {progress && (
        <div style={styles.progressWrap}>
          <div style={styles.progressTrack}>
            <div
              style={{
                width: `${progress.usedPct}%`,
                height: '100%',
                background: progress.color,
                borderRadius: '99px',
              }}
            />
          </div>
          {progress.label && <div style={styles.progressLabel}>{progress.label}</div>}
        </div>
      )}

      {(item.communityUserCount ?? 0) > 0 && (
        <div style={styles.communityRow}>
          <div style={styles.avatarGroup}>
            {[0, 1, 2].map(i => (
              <div key={i} style={styles.avatarDot} />
            ))}
          </div>
          <span style={styles.communityText}>{item.communityUserCount} 位用戶也有</span>
        </div>
      )}
    </div>
  )
}
