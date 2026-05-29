import React, { useState, useMemo } from 'react'
import T from '../styles/tokens'
import type { GearItem, GearFilter, FilterPillConfig } from '../types/gear'
import type { Gear } from '@shared/types'
import GearHeader from '../components/gear/GearHeader'
import GearFilterBar from '../components/gear/GearFilterBar'
import GearGrid from '../components/gear/GearGrid'
import AddGearModal from '../components/gear/AddGearModal'
import DeleteGearModal from '../components/gear/DeleteGearModal'
import EditGearModal from '../components/gear/EditGearModal'
import { filterGear, computePillCounts } from '../utils/gearUtils'
import { useGear } from '@shared/hooks/useGear'
import { api } from '../api'
import { useBreakpoint } from '../hooks/useBreakpoint'
import GearList from '../components/gear/GearList'

// ─── Mapping ─────────────────────────────────────────────────────────────────

function formatPurchaseDate(date?: string): string | undefined {
  if (!date) return undefined
  const parts = date.split('-')
  return parts.length >= 2 ? `${parts[0]}/${parts[1]}` : date
}

function mapGearToGearItem(gear: Gear): GearItem {
  const msPerDay = 86_400_000
  let status: GearItem['status'] = 'normal'
  let overdueDays: number | undefined
  const referenceDate = gear.last_maintained || gear.purchase_date

  if (referenceDate && gear.maintenance_interval_days) {
    const daysSince = Math.floor(
      (Date.now() - new Date(referenceDate).getTime()) / msPerDay,
    )
    if (daysSince > gear.maintenance_interval_days) {
      status = 'maintenance_due'
      overdueDays = daysSince - gear.maintenance_interval_days
    }
  }

  return {
    id: gear.id,
    type: gear.type as GearItem['type'],
    brand: gear.brand,
    model: gear.model,
    serialNumber: gear.serial_number,
    purchaseDate: formatPurchaseDate(gear.purchase_date),
    lastMaintained: referenceDate,
    maintenanceIntervalDays: gear.maintenance_interval_days,
    status,
    overdueDays,
  }
}

// ─── Constants ────────────────────────────────────────────────────────────────

const PILL_DEFS: ReadonlyArray<{ key: GearFilter; label: string }> = [
  { key: 'all', label: '全部' },
  { key: 'body', label: '機身' },
  { key: 'lens', label: '鏡頭' },
  { key: 'flash', label: '閃燈' },
  { key: 'tripod', label: '腳架' },
  { key: 'filter', label: '濾鏡' },
  { key: 'maintenance_due', label: '待保養' },
]

// ─── Styles ───────────────────────────────────────────────────────────────────

const styles: Record<string, React.CSSProperties> = {
  page: {
    background: T.card,
    minHeight: '100%',
    fontFamily: "'Inter', system-ui, sans-serif",
    display: 'flex',
    flexDirection: 'column',
  },
  body: {
    padding: '24px 32px',
    flex: 1,
  },
  titleSection: {
    marginBottom: '20px',
  },
  title: {
    fontSize: '28px',
    fontWeight: 700,
    color: T.ink,
    letterSpacing: '-0.5px',
    lineHeight: 1.2,
    display: 'inline-block',
    paddingBottom: '2px',
    paddingRight: '4px',
    borderBottom: `3px solid ${T.accent}`,
  },
  statsSubtitle: {
    color: T.inkMute,
    fontSize: '14px',
    marginTop: '8px',
  },
  filterSection: {
    marginBottom: '16px',
  },
  loadingText: {
    color: T.inkMute,
    fontSize: '14px',
    padding: '48px 0',
    textAlign: 'center' as const,
  },
  errorText: {
    color: T.warn,
    fontSize: '14px',
    padding: '48px 0',
    textAlign: 'center' as const,
  },
}

// ─── GearVault ────────────────────────────────────────────────────────────────

const GearVault: React.FC = () => {
  const { data: rawGear, isLoading, isError } = useGear(api)

  const gearItems = useMemo(
    () => (rawGear ?? []).map(mapGearToGearItem),
    [rawGear],
  )

  const [activeFilter, setActiveFilter] = useState<GearFilter>('all')
  const [searchQuery, setSearchQuery] = useState('')
  const [showAddModal, setShowAddModal] = useState(false)
  const [deletingGearItem, setDeletingGearItem] = useState<GearItem | null>(null)
  const [viewingGearId, setViewingGearId] = useState<string | null>(null)

  const pillCounts = useMemo(() => computePillCounts(gearItems), [gearItems])

  const pills: FilterPillConfig[] = useMemo(
    () => PILL_DEFS.map(d => ({ ...d, count: pillCounts[d.key] })),
    [pillCounts],
  )

  const filteredGear = useMemo(
    () => filterGear(gearItems, activeFilter, searchQuery),
    [gearItems, activeFilter, searchQuery],
  )

  const maintenanceCount = pillCounts.maintenance_due

  const { isMobile } = useBreakpoint()

  if (isMobile) {
    return (
      <div style={{
        padding: '14px 16px 62px',
        fontFamily: "'Inter', 'Noto Sans TC', sans-serif",
        background: T.paper,
        color: T.ink,
        minHeight: '100%',
        boxSizing: 'border-box' as const,
      }}>
        {/* Mobile header: title + add button */}
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 12 }}>
          <h1 style={{ fontSize: 20, fontWeight: 600, margin: 0, letterSpacing: '-0.025em', color: T.ink }}>
            器材<span style={{ color: T.accent }}>庫</span>
          </h1>
          <button
            onClick={() => setShowAddModal(true)}
            style={{ height: 34, padding: '0 14px', background: T.accent, color: '#fff', border: 'none', borderRadius: 8, fontSize: 13, fontWeight: 600, cursor: 'pointer' }}
          >
            ＋ 新增
          </button>
        </div>

        {/* Filter bar — same props as desktop */}
        <GearFilterBar
          pills={pills}
          activeFilter={activeFilter}
          onFilterChange={setActiveFilter}
        />

        {/* Mobile list */}
        <GearList
          items={filteredGear}
          onAddGear={() => setShowAddModal(true)}
          onDeleteClick={setDeletingGearItem}
          onCardClick={setViewingGearId}
        />

        {showAddModal && <AddGearModal onClose={() => setShowAddModal(false)} />}
        {deletingGearItem && (
          <DeleteGearModal
            item={deletingGearItem}
            onClose={() => setDeletingGearItem(null)}
          />
        )}
        {viewingGearId && (
          <EditGearModal
            gearId={viewingGearId}
            onClose={() => setViewingGearId(null)}
          />
        )}
      </div>
    )
  }

  return (
    <div style={styles.page}>
      <GearHeader
        searchQuery={searchQuery}
        onSearchChange={setSearchQuery}
        onAddGear={() => setShowAddModal(true)}
      />

      <div style={styles.body}>
        <div style={styles.titleSection}>
          <div style={styles.title}>器材庫</div>
          <div style={styles.statsSubtitle}>
            {isLoading ? (
              '載入中...'
            ) : (
              <>
                共 {gearItems.length} 件
                {maintenanceCount > 0 && (
                  <>
                    {' · '}
                    <span style={{ color: T.accent, fontWeight: 600 }}>
                      {maintenanceCount} 件待保養
                    </span>
                  </>
                )}
              </>
            )}
          </div>
        </div>

        {isError ? (
          <div style={styles.errorText}>載入器材資料失敗，請重新整理頁面</div>
        ) : isLoading ? (
          <div style={styles.loadingText}>載入中...</div>
        ) : (
          <>
            <div style={styles.filterSection}>
              <GearFilterBar
                pills={pills}
                activeFilter={activeFilter}
                onFilterChange={setActiveFilter}
              />
            </div>
            <GearGrid
              items={filteredGear}
              onAddGear={() => setShowAddModal(true)}
              onDeleteClick={setDeletingGearItem}
              onCardClick={setViewingGearId}
            />
          </>
        )}
      </div>

      {showAddModal && <AddGearModal onClose={() => setShowAddModal(false)} />}
      {deletingGearItem && (
        <DeleteGearModal
          item={deletingGearItem}
          onClose={() => setDeletingGearItem(null)}
        />
      )}
      {viewingGearId && (
        <EditGearModal
          gearId={viewingGearId}
          onClose={() => setViewingGearId(null)}
        />
      )}
    </div>
  )
}

export default GearVault
