import React from 'react'
import { useQuery } from '@tanstack/react-query'
import api from '../lib/api'

// ─── Types ────────────────────────────────────────────────────────────────────

interface Photo {
  id: string
  caption?: string
  s3_key: string
  url?: string
  created_at: string
  is_public: boolean
}

interface FocalLengthStat { focal_length: number; count: number }
interface ApertureStat { aperture: number; count: number }
interface MonthlyStat { month: string; count: number }

// ─── Styles ───────────────────────────────────────────────────────────────────

const s: Record<string, React.CSSProperties> = {
  page: {
    padding: '32px',
    color: '#e8e8f0',
    fontFamily: "'Inter', system-ui, sans-serif",
    maxWidth: '1100px',
  },
  heading: {
    fontSize: '24px',
    fontWeight: 700,
    marginBottom: '8px',
    letterSpacing: '-0.3px',
  },
  sub: { color: '#666', fontSize: '14px', marginBottom: '32px' },
  sectionTitle: {
    fontSize: '13px',
    fontWeight: 600,
    color: '#888',
    textTransform: 'uppercase',
    letterSpacing: '0.07em',
    marginBottom: '16px',
  },
  statRow: {
    display: 'grid',
    gridTemplateColumns: 'repeat(3, 1fr)',
    gap: '16px',
    marginBottom: '40px',
  },
  statCard: {
    background: '#13131a',
    border: '1px solid #2a2a38',
    borderRadius: '12px',
    padding: '20px 24px',
  },
  statLabel: { fontSize: '12px', color: '#666', marginBottom: '8px' },
  statValue: { fontSize: '32px', fontWeight: 700, color: '#e8e8f0' },
  chartsRow: {
    display: 'grid',
    gridTemplateColumns: '1fr 1fr',
    gap: '20px',
    marginBottom: '40px',
  },
  chart: {
    background: '#13131a',
    border: '1px solid #2a2a38',
    borderRadius: '12px',
    padding: '20px',
  },
  chartTitle: { fontSize: '14px', fontWeight: 600, marginBottom: '16px', color: '#e8e8f0' },
  barRow: {
    display: 'flex',
    alignItems: 'center',
    gap: '10px',
    marginBottom: '8px',
    fontSize: '12px',
  },
  barLabel: { width: '60px', color: '#888', textAlign: 'right', flexShrink: 0 },
  barTrack: {
    flex: 1,
    background: '#1e1e2e',
    borderRadius: '4px',
    height: '18px',
    overflow: 'hidden',
  },
  barFill: {
    height: '100%',
    background: '#6366f1',
    borderRadius: '4px',
    transition: 'width 0.4s ease',
  },
  barCount: { width: '28px', color: '#666', flexShrink: 0 },
  emptyChart: { color: '#555', fontSize: '13px', textAlign: 'center', padding: '24px 0' },
  photosGrid: {
    display: 'grid',
    gridTemplateColumns: 'repeat(5, 1fr)',
    gap: '12px',
  },
  photoCard: {
    background: '#13131a',
    border: '1px solid #2a2a38',
    borderRadius: '10px',
    overflow: 'hidden',
  },
  photoThumb: {
    width: '100%',
    aspectRatio: '1',
    background: '#1e1e2e',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    color: '#444',
    fontSize: '28px',
  },
  photoCaption: {
    padding: '8px',
    fontSize: '11px',
    color: '#888',
    whiteSpace: 'nowrap',
    overflow: 'hidden',
    textOverflow: 'ellipsis',
  },
  skeleton: {
    background: 'linear-gradient(90deg, #1e1e2e 25%, #252535 50%, #1e1e2e 75%)',
    borderRadius: '8px',
    animation: 'shimmer 1.2s infinite',
  },
  monthlyChart: {
    background: '#13131a',
    border: '1px solid #2a2a38',
    borderRadius: '12px',
    padding: '20px',
    marginBottom: '40px',
  },
  monthBars: {
    display: 'flex',
    alignItems: 'flex-end',
    gap: '8px',
    height: '100px',
    marginTop: '12px',
  },
  monthBarWrap: {
    flex: 1,
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    gap: '4px',
    height: '100%',
    justifyContent: 'flex-end',
  },
  monthBarFill: {
    width: '100%',
    background: '#6366f1',
    borderRadius: '4px 4px 0 0',
    minHeight: '4px',
    transition: 'height 0.4s ease',
  },
  monthLabel: { fontSize: '9px', color: '#555' },
}

// ─── SimpleBarChart ───────────────────────────────────────────────────────────

function SimpleBarChart({ data, labelKey, countKey, title }: {
  data: any[]
  labelKey: string
  countKey: string
  title: string
}) {
  const max = Math.max(...data.map((d) => d[countKey]), 1)
  const top = data.slice(0, 8)
  return (
    <div style={s.chart}>
      <div style={s.chartTitle}>{title}</div>
      {top.length === 0 ? (
        <div style={s.emptyChart}>No data yet</div>
      ) : (
        top.map((d, i) => (
          <div key={i} style={s.barRow}>
            <div style={s.barLabel}>{d[labelKey]}</div>
            <div style={s.barTrack}>
              <div style={{ ...s.barFill, width: `${(d[countKey] / max) * 100}%` }} />
            </div>
            <div style={s.barCount}>{d[countKey]}</div>
          </div>
        ))
      )}
    </div>
  )
}

// ─── MonthlyChart ─────────────────────────────────────────────────────────────

function MonthlyChart({ data }: { data: MonthlyStat[] }) {
  const max = Math.max(...data.map((d) => d.count), 1)
  return (
    <div style={s.monthlyChart}>
      <div style={s.chartTitle}>Monthly Activity</div>
      {data.length === 0 ? (
        <div style={s.emptyChart}>No data yet</div>
      ) : (
        <div style={s.monthBars}>
          {data.slice(-12).map((d) => (
            <div key={d.month} style={s.monthBarWrap}>
              <div
                style={{
                  ...s.monthBarFill,
                  height: `${(d.count / max) * 88}px`,
                }}
              />
              <div style={s.monthLabel}>{d.month.slice(5)}</div>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}

// ─── Dashboard ────────────────────────────────────────────────────────────────

const Dashboard: React.FC = () => {
  const { data: photos = [], isLoading: loadingPhotos } = useQuery<Photo[]>({
    queryKey: ['photos'],
    queryFn: () => api.get('/photos').then((r) => r.data),
  })
  const { data: locations = [], isLoading: loadingLocs } = useQuery<any[]>({
    queryKey: ['locations'],
    queryFn: () => api.get('/locations').then((r) => r.data),
  })
  const { data: gear = [], isLoading: loadingGear } = useQuery<any[]>({
    queryKey: ['gear'],
    queryFn: () => api.get('/gear').then((r) => r.data),
  })
  const { data: focalStats = [] } = useQuery<FocalLengthStat[]>({
    queryKey: ['stats', 'focal-length'],
    queryFn: () => api.get('/stats/me/focal-length').then((r) => r.data),
  })
  const { data: apertureStats = [] } = useQuery<ApertureStat[]>({
    queryKey: ['stats', 'aperture'],
    queryFn: () => api.get('/stats/me/aperture').then((r) => r.data),
  })
  const { data: monthlyStats = [] } = useQuery<MonthlyStat[]>({
    queryKey: ['stats', 'monthly'],
    queryFn: () => api.get('/stats/me/monthly').then((r) => r.data),
  })

  const recentPhotos = photos.slice(0, 5)

  return (
    <div style={s.page}>
      <div style={s.heading}>Dashboard</div>
      <div style={s.sub}>Your photography stats at a glance</div>

      {/* Stat cards */}
      <div style={s.sectionTitle}>Overview</div>
      <div style={s.statRow}>
        <div style={s.statCard}>
          <div style={s.statLabel}>Photos</div>
          <div style={s.statValue}>{loadingPhotos ? '—' : photos.length}</div>
        </div>
        <div style={s.statCard}>
          <div style={s.statLabel}>Locations</div>
          <div style={s.statValue}>{loadingLocs ? '—' : locations.length}</div>
        </div>
        <div style={s.statCard}>
          <div style={s.statLabel}>Gear items</div>
          <div style={s.statValue}>{loadingGear ? '—' : gear.length}</div>
        </div>
      </div>

      {/* Charts */}
      <div style={s.sectionTitle}>EXIF Stats</div>
      <div style={s.chartsRow}>
        <SimpleBarChart
          data={focalStats.map((d) => ({ label: `${d.focal_length}mm`, count: d.count }))}
          labelKey="label"
          countKey="count"
          title="Focal Length Distribution"
        />
        <SimpleBarChart
          data={apertureStats.map((d) => ({ label: `f/${d.aperture}`, count: d.count }))}
          labelKey="label"
          countKey="count"
          title="Aperture Distribution"
        />
      </div>

      <MonthlyChart data={monthlyStats} />

      {/* Recent photos */}
      <div style={s.sectionTitle}>Recent Photos</div>
      {recentPhotos.length === 0 ? (
        <div style={{ color: '#555', fontSize: '14px' }}>No photos yet.</div>
      ) : (
        <div style={s.photosGrid}>
          {recentPhotos.map((p) => (
            <div key={p.id} style={s.photoCard}>
              <div style={s.photoThumb}>
                {p.url
                  ? <img src={p.url} alt={p.caption || 'photo'} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                  : '◈'}
              </div>
              <div style={s.photoCaption}>{p.caption || 'Untitled'}</div>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}

export default Dashboard
