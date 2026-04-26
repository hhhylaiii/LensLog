import React, { useState, useMemo } from 'react'
import { useNavigate } from 'react-router-dom'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import api from '../lib/api'

// ─── Types ────────────────────────────────────────────────────────────────────

interface User {
  id: string
  username: string
  email: string
  avatar_url?: string
  bio?: string
  created_at: string
}

interface ExifData {
  focal_length?: number
  aperture?: number
  make?: string
  model?: string
}

interface Photo {
  id: string
  location_id?: string
  s3_key: string
  thumb_key?: string
  thumb_url?: string
  url?: string
  caption?: string
  is_public: boolean
  taken_at?: string
  created_at: string
  exif?: ExifData
}

interface Location {
  id: string
  name: string
  description?: string
  latitude: number
  longitude: number
  tags: string[]
}

interface GearItem {
  id: string
  type: string
  brand?: string
  model: string
}

// ─── Styles ───────────────────────────────────────────────────────────────────

const s: Record<string, React.CSSProperties> = {
  page: {
    padding: '36px 40px',
    color: '#e8e8f0',
    fontFamily: "'Inter', system-ui, sans-serif",
    maxWidth: '1040px',
    margin: '0 auto',
  },

  // ── Header ──
  profileHeader: {
    display: 'flex',
    alignItems: 'flex-start',
    gap: '28px',
    marginBottom: '32px',
  },
  avatar: {
    width: '90px',
    height: '90px',
    borderRadius: '50%',
    background: '#2a2a3e',
    flexShrink: 0,
    overflow: 'hidden',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    fontSize: '30px',
    color: '#444',
  },
  avatarImg: { width: '100%', height: '100%', objectFit: 'cover' as const },
  profileInfo: { flex: 1 },
  nameRow: { display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '8px' },
  displayName: { fontSize: '22px', fontWeight: 700, letterSpacing: '-0.3px' },
  proBadge: {
    background: '#6366f1',
    color: '#fff',
    fontSize: '10px',
    fontWeight: 700,
    padding: '2px 7px',
    borderRadius: '4px',
    letterSpacing: '0.08em',
  },
  metaRow: {
    display: 'flex',
    alignItems: 'center',
    gap: '8px',
    color: '#888',
    fontSize: '13px',
    marginBottom: '12px',
    flexWrap: 'wrap' as const,
  },
  metaDot: { color: '#444' },
  bio: { color: '#aaa', fontSize: '14px', lineHeight: 1.65, maxWidth: '560px' },

  // ── Stats bar (5 items) ──
  statsBar: {
    display: 'flex',
    borderTop: '1px solid #2a2a38',
    borderBottom: '1px solid #2a2a38',
  },
  statItem: { flex: 1, padding: '20px 24px', borderRight: '1px solid #2a2a38' },
  statItemLast: { flex: 1, padding: '20px 24px' },
  statNumber: { fontSize: '26px', fontWeight: 700, lineHeight: 1, marginBottom: '5px' },
  statLabel: { fontSize: '12px', color: '#666' },

  // ── Tabs ──
  tabBar: {
    display: 'flex',
    alignItems: 'center',
    borderBottom: '1px solid #2a2a38',
    marginBottom: '20px',
  },
  tab: {
    padding: '14px 20px',
    fontSize: '14px',
    fontWeight: 500,
    color: '#666',
    cursor: 'pointer',
    borderBottom: '2px solid transparent',
    marginBottom: '-1px',
    display: 'flex',
    alignItems: 'center',
    gap: '5px',
    userSelect: 'none' as const,
    transition: 'color 0.15s',
  },
  tabActive: { color: '#e8e8f0', borderBottomColor: '#6366f1' },
  tabCount: { fontSize: '12px', color: '#555' },
  tabCountActive: { fontSize: '12px', color: '#888' },

  // ── Controls (filters + view toggle) ──
  controlsRow: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: '16px',
  },
  tagFilters: { display: 'flex', gap: '8px', flexWrap: 'wrap' as const },
  tagBtn: {
    padding: '5px 14px',
    borderRadius: '20px',
    border: '1px solid #2a2a38',
    background: 'transparent',
    color: '#888',
    fontSize: '13px',
    cursor: 'pointer',
  },
  tagBtnActive: {
    background: '#e8e8f0',
    color: '#0a0a0f',
    borderColor: '#e8e8f0',
    fontWeight: 600,
  },
  viewToggle: { display: 'flex', gap: '4px', flexShrink: 0 },
  viewBtn: {
    width: '32px',
    height: '32px',
    borderRadius: '6px',
    border: '1px solid #2a2a38',
    background: 'transparent',
    color: '#666',
    cursor: 'pointer',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    fontSize: '15px',
  },
  viewBtnActive: { background: '#6366f1', color: '#fff', borderColor: '#6366f1' },

  // ── Photo grid (4-col, first photo 2×2) ──
  photoGrid: {
    display: 'grid',
    gridTemplateColumns: 'repeat(4, 1fr)',
    gridAutoRows: '220px',
    gap: '4px',
    marginBottom: '24px',
  },
  photoCell: {
    background: '#13131a',
    overflow: 'hidden',
    borderRadius: '3px',
    position: 'relative',
    cursor: 'pointer',
  },
  photoCellFeatured: { gridColumn: 'span 2', gridRow: 'span 2' },
  photoImg: { width: '100%', height: '100%', objectFit: 'cover' as const },
  photoPlaceholder: {
    width: '100%',
    height: '100%',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    background: '#111122',
    color: '#333',
    fontSize: '12px',
    fontFamily: 'monospace',
  },

  // Featured overlays
  overlayTop: {
    position: 'absolute',
    top: '10px',
    left: '10px',
    background: 'rgba(0,0,0,0.5)',
    backdropFilter: 'blur(6px)',
    borderRadius: '6px',
    padding: '4px 9px',
    fontSize: '12px',
    color: '#e8e8f0',
    maxWidth: 'calc(100% - 20px)',
    overflow: 'hidden',
    textOverflow: 'ellipsis',
    whiteSpace: 'nowrap' as const,
  },
  overlayBottom: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    padding: '10px 12px',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-between',
    background: 'linear-gradient(to top, rgba(0,0,0,0.65), transparent)',
  },
  exifBadge: {
    background: 'rgba(255,255,255,0.13)',
    backdropFilter: 'blur(4px)',
    borderRadius: '6px',
    padding: '3px 8px',
    fontSize: '11px',
    color: '#e8e8f0',
  },
  likeBadge: {
    background: 'rgba(0,0,0,0.4)',
    borderRadius: '6px',
    padding: '3px 8px',
    fontSize: '12px',
    color: '#e8e8f0',
  },

  // Lock badge (top-right of any photo)
  lockBadge: {
    position: 'absolute',
    top: '7px',
    right: '7px',
    background: 'rgba(0,0,0,0.55)',
    backdropFilter: 'blur(4px)',
    borderRadius: '6px',
    width: '26px',
    height: '26px',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    fontSize: '12px',
    cursor: 'pointer',
    border: 'none',
    padding: 0,
    zIndex: 2,
  },

  // Empty placeholder cell
  emptyCell: {
    gridColumn: 'span 2',
    gridRow: 'span 2',
    background: 'transparent',
    border: '2px dashed #2a2a38',
    borderRadius: '6px',
    display: 'flex',
    flexDirection: 'column' as const,
    alignItems: 'center',
    justifyContent: 'center',
    gap: '10px',
    cursor: 'pointer',
  },

  // Load more
  loadMoreWrap: { display: 'flex', justifyContent: 'center', marginBottom: '48px' },
  loadMoreBtn: {
    background: 'transparent',
    border: '1px solid #2a2a38',
    borderRadius: '8px',
    padding: '10px 28px',
    color: '#888',
    fontSize: '13px',
    cursor: 'pointer',
  },

  // Simple list (locations / gear tab)
  listWrap: { paddingTop: '8px', paddingBottom: '40px' },
  listRow: {
    display: 'flex',
    alignItems: 'center',
    gap: '14px',
    padding: '12px 0',
    borderBottom: '1px solid #1e1e2e',
  },
  listIcon: {
    width: '38px',
    height: '38px',
    borderRadius: '9px',
    background: '#1e1e2e',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    fontSize: '15px',
    flexShrink: 0,
  },
  listName: { fontSize: '14px', fontWeight: 500, color: '#e8e8f0', marginBottom: '2px' },
  listMeta: { fontSize: '12px', color: '#666' },

  // Bottom stats cards
  bottomRow: { display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '20px' },
  bottomCard: {
    background: '#13131a',
    border: '1px solid #2a2a38',
    borderRadius: '12px',
    padding: '20px 22px',
  },
  bottomCardHeader: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: '18px',
  },
  bottomCardTitle: { fontSize: '13px', fontWeight: 600, color: '#e8e8f0' },
  topBadge: { fontSize: '11px', fontWeight: 600, color: '#555', letterSpacing: '0.04em' },
  rankRow: { display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '14px' },
  rankIcon: {
    width: '36px',
    height: '36px',
    borderRadius: '8px',
    background: '#1e1e2e',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    fontSize: '14px',
    flexShrink: 0,
  },
  rankContent: { flex: 1, minWidth: 0 },
  rankName: {
    fontSize: '13px',
    fontWeight: 500,
    color: '#e8e8f0',
    marginBottom: '2px',
    overflow: 'hidden',
    textOverflow: 'ellipsis',
    whiteSpace: 'nowrap' as const,
  },
  rankMeta: { fontSize: '11px', color: '#666' },
  rankBar: { width: '72px', flexShrink: 0 },
  barTrack: { background: '#2a2a38', borderRadius: '4px', height: '4px', overflow: 'hidden' },
  barFill: { height: '100%', background: '#6366f1', borderRadius: '4px' },

  emptyNote: { color: '#555', fontSize: '13px', padding: '12px 0' },

  // FAB
  fab: {
    position: 'fixed',
    bottom: '36px',
    right: '36px',
    width: '54px',
    height: '54px',
    borderRadius: '50%',
    background: '#6366f1',
    border: 'none',
    color: '#fff',
    fontSize: '26px',
    lineHeight: 1,
    cursor: 'pointer',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    boxShadow: '0 4px 24px rgba(99,102,241,0.45)',
    zIndex: 100,
  },
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

function formatJoinDate(iso: string) {
  const d = new Date(iso)
  return `加入於 ${d.getFullYear()}/${String(d.getMonth() + 1).padStart(2, '0')}`
}

function relativeTime(iso: string) {
  const diff = Date.now() - new Date(iso).getTime()
  const h = Math.floor(diff / 3600000)
  const d = Math.floor(diff / 86400000)
  if (h < 1) return '剛剛'
  if (h < 24) return `${h} 小時前`
  if (d < 30) return `${d} 天前`
  return new Date(iso).toLocaleDateString('zh-TW', { month: 'short', day: 'numeric' })
}

// ─── SafeImage ────────────────────────────────────────────────────────────────

function SafeImage({ src, alt, style }: { src: string; alt?: string; style?: React.CSSProperties }) {
  const [err, setErr] = useState(false)
  if (err) return null
  return <img src={src} alt={alt ?? ''} style={style} loading="lazy" onError={() => setErr(true)} />
}

// ─── Profile ──────────────────────────────────────────────────────────────────

type TabKey = 'photos' | 'locations' | 'gear' | 'favorites'
const PAGE_SIZE = 12

const Profile: React.FC = () => {
  const navigate = useNavigate()
  const qc = useQueryClient()

  const [activeTab, setActiveTab] = useState<TabKey>('photos')
  const [activeTag, setActiveTag] = useState('全部')
  const [viewMode, setViewMode] = useState<'grid' | 'list'>('grid')
  const [photoLimit, setPhotoLimit] = useState(PAGE_SIZE)
  const [hoveredId, setHoveredId] = useState<string | null>(null)

  const { data: user } = useQuery<User>({
    queryKey: ['me'],
    queryFn: () => api.get('/auth/me').then((r) => r.data),
  })

  const { data: allPhotos = [] } = useQuery<Photo[]>({
    queryKey: ['photos', 'profile-all'],
    queryFn: () => api.get('/photos?limit=500').then((r) => r.data),
  })

  const { data: locations = [] } = useQuery<Location[]>({
    queryKey: ['locations'],
    queryFn: () => api.get('/locations').then((r) => r.data),
  })

  const { data: gear = [] } = useQuery<GearItem[]>({
    queryKey: ['gear'],
    queryFn: () => api.get('/gear').then((r) => r.data),
  })

  const { mutate: toggleVisibility, variables: pendingPhoto } = useMutation({
    mutationFn: (photo: Photo) =>
      api.patch(`/photos/${photo.id}`, { is_public: !photo.is_public }).then((r) => r.data),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['photos', 'profile-all'] }),
  })

  const locationMap = useMemo(() => {
    const m: Record<string, Location> = {}
    locations.forEach((l) => { m[l.id] = l })
    return m
  }, [locations])

  const allTags = useMemo(() => {
    const set = new Set<string>()
    locations.forEach((l) => l.tags?.forEach((t) => set.add(t)))
    return ['全部', ...Array.from(set)]
  }, [locations])

  const filteredPhotos = useMemo(() => {
    if (activeTag === '全部') return allPhotos
    return allPhotos.filter((p) => {
      if (!p.location_id) return false
      return locationMap[p.location_id]?.tags?.includes(activeTag)
    })
  }, [allPhotos, activeTag, locationMap])

  const visiblePhotos = filteredPhotos.slice(0, photoLimit)
  const remaining = filteredPhotos.length - photoLimit

  const topLocations = useMemo(() => {
    const counts: Record<string, number> = {}
    allPhotos.forEach((p) => { if (p.location_id) counts[p.location_id] = (counts[p.location_id] || 0) + 1 })
    return locations
      .map((l) => ({ ...l, photoCount: counts[l.id] || 0 }))
      .sort((a, b) => b.photoCount - a.photoCount)
      .slice(0, 3)
  }, [allPhotos, locations])

  const topGear = gear.slice(0, 3)
  const maxLocCount = topLocations[0]?.photoCount || 1

  return (
    <>
      <div style={s.page}>

        {/* ── Profile header ── */}
        <div style={s.profileHeader}>
          <div style={s.avatar}>
            {user?.avatar_url
              ? <SafeImage src={user.avatar_url} alt="avatar" style={s.avatarImg} />
              : '◈'}
          </div>
          <div style={s.profileInfo}>
            <div style={s.nameRow}>
              <span style={s.displayName}>{user?.username ?? '—'}</span>
              <span style={s.proBadge}>PRO</span>
            </div>
            <div style={s.metaRow}>
              <span>@{user?.username ?? '—'}</span>
              <span style={s.metaDot}>·</span>
              <span>📍 台北</span>
              <span style={s.metaDot}>·</span>
              <span>{user?.created_at ? formatJoinDate(user.created_at) : '—'}</span>
            </div>
            {user?.bio && <div style={s.bio}>{user.bio}</div>}
          </div>
        </div>

        {/* ── Stats bar (5 items) ── */}
        <div style={s.statsBar}>
          {[
            { n: allPhotos.length, label: '作品' },
            { n: locations.length, label: '路線' },
            { n: gear.length,      label: '器材' },
            { n: 0,                label: '追蹤者' },
            { n: 0,                label: '追蹤中', last: true },
          ].map(({ n, label, last }) => (
            <div key={label} style={last ? s.statItemLast : s.statItem}>
              <div style={s.statNumber}>{n.toLocaleString()}</div>
              <div style={s.statLabel}>{label}</div>
            </div>
          ))}
        </div>

        {/* ── Tabs ── */}
        <div style={s.tabBar}>
          {([
            { key: 'photos',    label: '照片', count: allPhotos.length },
            { key: 'locations', label: '景點', count: locations.length },
            { key: 'gear',      label: '器材', count: gear.length },
            { key: 'favorites', label: '收藏', count: 0 },
          ] as { key: TabKey; label: string; count: number }[]).map(({ key, label, count }) => (
            <div
              key={key}
              style={{ ...s.tab, ...(activeTab === key ? s.tabActive : {}) }}
              onClick={() => setActiveTab(key)}
            >
              {label}
              <span style={activeTab === key ? s.tabCountActive : s.tabCount}>{count}</span>
            </div>
          ))}
        </div>

        {/* ── Photos tab ── */}
        {activeTab === 'photos' && (
          <>
            {/* Controls: tag filters + view toggle */}
            <div style={s.controlsRow}>
              <div style={s.tagFilters}>
                {allTags.map((tag) => (
                  <button
                    key={tag}
                    type="button"
                    style={{ ...s.tagBtn, ...(activeTag === tag ? s.tagBtnActive : {}) }}
                    onClick={() => { setActiveTag(tag); setPhotoLimit(PAGE_SIZE) }}
                  >
                    {tag}
                  </button>
                ))}
              </div>
              <div style={s.viewToggle}>
                <button type="button" style={{ ...s.viewBtn, ...(viewMode === 'grid' ? s.viewBtnActive : {}) }} onClick={() => setViewMode('grid')}>⊞</button>
                <button type="button" style={{ ...s.viewBtn, ...(viewMode === 'list' ? s.viewBtnActive : {}) }} onClick={() => setViewMode('list')}>≡</button>
              </div>
            </div>

            {/* Photo grid */}
            {visiblePhotos.length === 0 ? (
              <div style={s.photoGrid}>
                <div style={s.emptyCell} onClick={() => navigate('/upload')}>
                  <span style={{ fontSize: '36px', color: '#2a2a4e' }}>⊕</span>
                  <span style={{ fontSize: '13px', color: '#555' }}>上傳第一張照片</span>
                </div>
              </div>
            ) : (
              <div style={s.photoGrid}>
                {visiblePhotos.map((photo, idx) => {
                  const isFeatured = idx === 0
                  const loc = photo.location_id ? locationMap[photo.location_id] : null
                  const thumbSrc = photo.thumb_url || photo.url
                  const isHovered = hoveredId === photo.id
                  const isPending = pendingPhoto?.id === photo.id

                  const exifLabel = photo.exif
                    ? [
                        photo.exif.focal_length != null ? `${photo.exif.focal_length}mm` : null,
                        photo.exif.aperture != null ? `f/${photo.exif.aperture}` : null,
                      ].filter(Boolean).join(' · ')
                    : null

                  return (
                    <div
                      key={photo.id}
                      style={{ ...s.photoCell, ...(isFeatured ? s.photoCellFeatured : {}) }}
                      onMouseEnter={() => setHoveredId(photo.id)}
                      onMouseLeave={() => setHoveredId(null)}
                      onClick={() => navigate(`/photos/${photo.id}`)}
                    >
                      {/* Thumbnail */}
                      {thumbSrc
                        ? <SafeImage src={thumbSrc} alt={photo.caption ?? ''} style={s.photoImg} />
                        : <div style={s.photoPlaceholder}>{photo.id.slice(-4).toUpperCase()}</div>
                      }

                      {/* Featured: location + time (top-left) */}
                      {isFeatured && loc && (
                        <div style={s.overlayTop}>
                          {loc.name} · {relativeTime(photo.created_at)}
                        </div>
                      )}

                      {/* Featured: EXIF + like (bottom) */}
                      {isFeatured && (
                        <div style={s.overlayBottom}>
                          <span style={s.exifBadge}>{exifLabel || '—'}</span>
                          <span style={s.likeBadge}>♡ 0</span>
                        </div>
                      )}

                      {/* Hover caption (non-featured) */}
                      {!isFeatured && isHovered && photo.caption && (
                        <div style={{
                          position: 'absolute', bottom: 0, left: 0, right: 0,
                          padding: '20px 8px 8px',
                          background: 'linear-gradient(to top, rgba(0,0,0,0.72), transparent)',
                          fontSize: '11px', color: '#e8e8f0', lineHeight: 1.4,
                        }}>
                          {photo.caption}
                        </div>
                      )}

                      {/* Lock icon */}
                      {(!photo.is_public || isHovered) && (
                        <button
                          type="button"
                          style={{ ...s.lockBadge, opacity: isPending ? 0.4 : 1 }}
                          title={photo.is_public ? '點擊設為私人' : '點擊設為公開'}
                          onClick={(e) => { e.stopPropagation(); if (!isPending) toggleVisibility(photo) }}
                        >
                          {photo.is_public ? '🔓' : '🔒'}
                        </button>
                      )}
                    </div>
                  )
                })}
              </div>
            )}

            {/* Load more */}
            {remaining > 0 && (
              <div style={s.loadMoreWrap}>
                <button type="button" style={s.loadMoreBtn} onClick={() => setPhotoLimit((l) => l + PAGE_SIZE)}>
                  載入更多 · {remaining} 張
                </button>
              </div>
            )}
          </>
        )}

        {/* ── Locations tab ── */}
        {activeTab === 'locations' && (
          <div style={s.listWrap}>
            {locations.length === 0
              ? <div style={s.emptyNote}>尚無景點</div>
              : locations.map((loc) => (
                <div key={loc.id} style={s.listRow}>
                  <div style={s.listIcon}>📍</div>
                  <div>
                    <div style={s.listName}>{loc.name}</div>
                    <div style={s.listMeta}>
                      {loc.tags?.length ? loc.tags.join(' · ') : `${loc.latitude.toFixed(4)}, ${loc.longitude.toFixed(4)}`}
                    </div>
                  </div>
                </div>
              ))
            }
          </div>
        )}

        {/* ── Gear tab ── */}
        {activeTab === 'gear' && (
          <div style={s.listWrap}>
            {gear.length === 0
              ? <div style={s.emptyNote}>尚無器材</div>
              : gear.map((g) => (
                <div key={g.id} style={s.listRow}>
                  <div style={s.listIcon}>◈</div>
                  <div>
                    <div style={s.listName}>{g.brand ? `${g.brand} ` : ''}{g.model}</div>
                    <div style={s.listMeta}>{g.type}</div>
                  </div>
                </div>
              ))
            }
          </div>
        )}

        {/* ── Favorites tab ── */}
        {activeTab === 'favorites' && (
          <div style={s.listWrap}>
            <div style={s.emptyNote}>尚無收藏</div>
          </div>
        )}

        {/* ── Bottom stats ── */}
        <div style={s.bottomRow}>
          <div style={s.bottomCard}>
            <div style={s.bottomCardHeader}>
              <span style={s.bottomCardTitle}>最常拍的景點</span>
              <span style={s.topBadge}>TOP {topLocations.length}</span>
            </div>
            {topLocations.length === 0
              ? <div style={s.emptyNote}>尚無資料</div>
              : topLocations.map((loc) => (
                <div key={loc.id} style={s.rankRow}>
                  <div style={s.rankIcon}>📍</div>
                  <div style={s.rankContent}>
                    <div style={s.rankName}>{loc.name}</div>
                    <div style={s.rankMeta}>{loc.photoCount} 張{loc.tags?.[0] ? ` · ${loc.tags[0]}` : ''}</div>
                  </div>
                  <div style={s.rankBar}>
                    <div style={s.barTrack}>
                      <div style={{ ...s.barFill, width: `${(loc.photoCount / maxLocCount) * 100}%` }} />
                    </div>
                  </div>
                </div>
              ))
            }
          </div>

          <div style={s.bottomCard}>
            <div style={s.bottomCardHeader}>
              <span style={s.bottomCardTitle}>最常使用的器材</span>
              <span style={s.topBadge}>TOP {topGear.length}</span>
            </div>
            {topGear.length === 0
              ? <div style={s.emptyNote}>尚無資料</div>
              : topGear.map((g, i) => (
                <div key={g.id} style={s.rankRow}>
                  <div style={s.rankIcon}>◈</div>
                  <div style={s.rankContent}>
                    <div style={s.rankName}>{g.brand ? `${g.brand} ` : ''}{g.model}</div>
                    <div style={s.rankMeta}>{g.type}</div>
                  </div>
                  <div style={s.rankBar}>
                    <div style={s.barTrack}>
                      <div style={{ ...s.barFill, width: `${100 - i * 28}%` }} />
                    </div>
                  </div>
                </div>
              ))
            }
          </div>
        </div>

      </div>

      {/* ── FAB: upload ── */}
      <button type="button" style={s.fab} title="上傳照片" onClick={() => navigate('/upload')}>⊕</button>
    </>
  )
}

export default Profile
