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

function getSubtitle(item: GearItem): { text: string; isWarn: boolean } {
  if (item.status === 'maintenance_due' && item.overdueDays) {
    return { text: `逾期 ${item.overdueDays} 天`, isWarn: true }
  }
  if (item.purchaseDate) {
    return { text: `購入 ${item.purchaseDate}`, isWarn: false }
  }
  if (item.daysSinceLastUsed) {
    return { text: `${item.daysSinceLastUsed} 天未使用`, isWarn: false }
  }
  return { text: item.brand ?? '', isWarn: false }
}

const styles: Record<string, React.CSSProperties> = {
  card: {
    background: T.ink,
    borderRadius: '14px',
    padding: '14px',
    display: 'flex',
    flexDirection: 'column',
    gap: '8px',
    minHeight: '260px',
  },
  topRow: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  categoryBadge: {
    background: T.sideBgTwo,
    color: T.sideText,
    borderRadius: '6px',
    padding: '2px 9px',
    fontSize: '11px',
    fontWeight: 600,
  },
  badgeMostUsed: {
    background: T.accentSoft,
    color: T.accent,
    borderRadius: '6px',
    padding: '2px 9px',
    fontSize: '11px',
    fontWeight: 600,
  },
  badgeMaintenance: {
    background: T.warnSoft,
    color: T.warn,
    borderRadius: '6px',
    padding: '2px 9px',
    fontSize: '11px',
    fontWeight: 600,
  },
  badgeSerial: {
    color: T.sideMute,
    fontSize: '11px',
    fontWeight: 500,
  },
  imagePlaceholder: {
    background: T.sideBgTwo,
    borderRadius: '8px',
    height: '110px',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    overflow: 'hidden',
    flexShrink: 0,
  },
  placeholderDash: {
    color: T.inkSoft,
    fontSize: '22px',
    fontWeight: 300,
    userSelect: 'none',
  },
  image: {
    width: '100%',
    height: '100%',
    objectFit: 'cover' as const,
    borderRadius: '8px',
  },
  modelName: {
    color: T.sideText,
    fontSize: '15px',
    fontWeight: 700,
    lineHeight: 1.25,
    overflow: 'hidden',
    display: '-webkit-box',
    WebkitLineClamp: 2,
    WebkitBoxOrient: 'vertical',
  } as React.CSSProperties,
  subtitleNormal: {
    color: T.sideMute,
    fontSize: '12px',
  },
  subtitleWarn: {
    color: T.warn,
    fontSize: '12px',
  },
  shutterCount: {
    color: T.sideMute,
    fontSize: '11px',
  },
  progressWrap: {
    display: 'flex',
    flexDirection: 'column',
    gap: '4px',
  },
  progressTrack: {
    background: T.sideLine,
    borderRadius: '99px',
    height: '4px',
    overflow: 'hidden',
  },
  progressLabel: {
    color: T.sideMute,
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
    background: T.inkSoft,
    border: `2px solid ${T.ink}`,
    marginRight: '-4px',
    flexShrink: 0,
  },
  communityText: {
    color: T.sideMute,
    fontSize: '11px',
    paddingLeft: '10px',
  },
}

interface GearCardProps {
  item: GearItem
}

export default function GearCard({ item }: GearCardProps) {
  const progress = getProgressInfo(item)
  const subtitle = getSubtitle(item)

  return (
    <div style={styles.card}>
      <div style={styles.topRow}>
        <span style={styles.categoryBadge}>{CATEGORY_LABEL[item.type]}</span>
        {item.status === 'most_used' && (
          <span style={styles.badgeMostUsed}>最常用</span>
        )}
        {item.status === 'maintenance_due' && (
          <span style={styles.badgeMaintenance}>⚠️ 待保養</span>
        )}
        {item.status === 'normal' && item.serialNumber && (
          <span style={styles.badgeSerial}>#{item.serialNumber}</span>
        )}
      </div>

      <div style={styles.imagePlaceholder}>
        {item.imageUrl ? (
          <img src={item.imageUrl} alt={item.model} style={styles.image} />
        ) : (
          <span style={styles.placeholderDash}>—</span>
        )}
      </div>

      <div style={styles.modelName}>{item.model}</div>

      {subtitle.text && (
        <div style={subtitle.isWarn ? styles.subtitleWarn : styles.subtitleNormal}>
          {subtitle.text}
        </div>
      )}

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
