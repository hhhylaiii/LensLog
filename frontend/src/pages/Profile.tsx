import React, { useState, useMemo, useRef, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import api from '../lib/api'
import T from '../styles/tokens'

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
  user_location_id?: string
  global_location_id?: string
  location_id?: string
  location_source?: 'user' | 'global'
  s3_key: string
  thumb_key?: string
  thumb_url?: string
  url?: string
  caption?: string
  tags: string[]
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

interface GlobalLocation {
  id: string
  name: string
  description?: string
  latitude: number
  longitude: number
}

interface GearItem {
  id: string
  type: string
  brand?: string
  model: string
}

const privacyStyles = {
  shared: {
    background: [
      'linear-gradient(145deg, rgba(10,92,50,0.96), rgba(3,42,25,0.88))',
      'radial-gradient(circle at 28% 18%, rgba(255,255,255,0.34), transparent 30%)',
      'linear-gradient(180deg, rgba(255,255,255,0.18), rgba(255,255,255,0.02) 42%, rgba(0,0,0,0.18))',
    ].join(', '),
    border: '1px solid rgba(90,255,168,0.58)',
    color: '#c8ffdf',
    boxShadow: [
      'inset 0 1px 0 rgba(255,255,255,0.38)',
      'inset 0 -10px 18px rgba(0,0,0,0.22)',
      '0 0 0 1px rgba(33,200,117,0.18)',
      '0 12px 30px rgba(6,63,36,0.32)',
      '0 0 22px rgba(33,200,117,0.24)',
    ].join(', '),
    textShadow: '0 1px 1px rgba(0,0,0,0.35)',
  },
  private: {
    background: [
      'linear-gradient(145deg, rgba(111,20,58,0.96), rgba(50,12,32,0.88))',
      'radial-gradient(circle at 28% 18%, rgba(255,255,255,0.36), transparent 30%)',
      'linear-gradient(180deg, rgba(255,210,226,0.24), rgba(255,255,255,0.03) 44%, rgba(0,0,0,0.2))',
    ].join(', '),
    border: '1px solid rgba(255,145,184,0.66)',
    color: '#ffe0eb',
    boxShadow: [
      'inset 0 1px 0 rgba(255,255,255,0.4)',
      'inset 0 -10px 18px rgba(0,0,0,0.24)',
      '0 0 0 1px rgba(255,145,184,0.18)',
      '0 12px 30px rgba(76,31,50,0.34)',
      '0 0 24px rgba(240,111,157,0.3)',
    ].join(', '),
    textShadow: '0 1px 1px rgba(0,0,0,0.38)',
  },
}

// ─── Styles ───────────────────────────────────────────────────────────────────

const s: Record<string, React.CSSProperties> = {
  page: {
    padding: '24px',
    color: T.ink,
    background: T.paper,
    fontFamily: "'Inter', system-ui, sans-serif",
    minHeight: '100%',
    boxSizing: 'border-box',
  },

  // ── Banner ──
  bannerWrap: {
    position: 'relative',
    width: '100%',
    height: '160px',
    marginBottom: '24px',
    borderRadius: '14px',
    overflow: 'hidden',
    cursor: 'pointer',
    flexShrink: 0,
  },
  bannerImg: {
    width: '100%',
    height: '100%',
    objectFit: 'cover' as const,
  },
  bannerOverlay: {
    position: 'absolute',
    inset: 0,
    background: 'rgba(0,0,0,0.38)',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    gap: '8px',
    fontSize: '14px',
    color: '#fff',
    transition: 'opacity 0.15s',
  },
  bannerFadeBottom: {
    position: 'absolute' as const,
    bottom: 0,
    left: 0,
    right: 0,
    height: '80px',
    background: 'linear-gradient(to bottom, transparent, rgba(26,41,66,0.18))',
    pointerEvents: 'none' as const,
    zIndex: 3,
  },

  // ── Header ──
  profileHeader: {
    display: 'flex',
    alignItems: 'flex-start',
    gap: '28px',
    marginBottom: '18px',
  },
  avatar: {
    width: '90px',
    height: '90px',
    borderRadius: '50%',
    background: T.card,
    border: `1px solid ${T.line}`,
    flexShrink: 0,
    overflow: 'hidden',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    fontSize: '30px',
    color: T.inkMute,
  },
  avatarImg: { width: '100%', height: '100%', objectFit: 'cover' as const },
  profileInfo: { flex: 1 },
  nameRow: { display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '8px' },
  displayName: { fontSize: '22px', fontWeight: 700, letterSpacing: '-0.3px' },
  proBadge: {
    background: T.accent,
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
    color: T.inkMute,
    fontSize: '13px',
    marginBottom: '12px',
    flexWrap: 'wrap' as const,
  },
  metaDot: { color: T.inkMute },
  bio: {
    color: T.inkSoft,
    fontSize: '14px',
    lineHeight: 1.5,
    margin: 0,
    maxWidth: '720px',
    overflow: 'hidden',
    textOverflow: 'ellipsis',
    whiteSpace: 'nowrap' as const,
  },

  // ── Stats bar (5 items) ──
  statsBar: {
    display: 'flex',
    borderTop: `1px solid ${T.line}`,
    borderBottom: `1px solid ${T.line}`,
  },
  statItem: { flex: 1, padding: '20px 24px', borderRight: `1px solid ${T.line}` },
  statItemLast: { flex: 1, padding: '20px 24px' },
  statNumber: { fontSize: '26px', fontWeight: 700, lineHeight: 1, marginBottom: '5px' },
  statLabel: { fontSize: '12px', color: T.inkMute },

  // ── Tabs ──
  tabBar: {
    display: 'flex',
    alignItems: 'center',
    borderBottom: `1px solid ${T.line}`,
    marginBottom: '20px',
  },
  tab: {
    padding: '14px 20px',
    fontSize: '14px',
    fontWeight: 500,
    color: T.inkMute,
    cursor: 'pointer',
    borderBottom: '2px solid transparent',
    marginBottom: '-1px',
    display: 'flex',
    alignItems: 'center',
    gap: '5px',
    userSelect: 'none' as const,
    transition: 'color 0.15s',
  },
  tabActive: { color: T.ink, borderBottomColor: T.accent },
  tabCount: { fontSize: '12px', color: T.inkMute },
  tabCountActive: { fontSize: '12px', color: T.accent },

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
    border: `1px solid ${T.line}`,
    background: T.card,
    color: T.inkSoft,
    fontSize: '13px',
    cursor: 'pointer',
  },
  tagBtnActive: {
    background: T.sideBg,
    color: '#fff',
    borderColor: T.sideBg,
    fontWeight: 600,
  },
  viewToggle: { display: 'flex', gap: '4px', flexShrink: 0, alignItems: 'center' },
  viewBtn: {
    width: '32px',
    height: '32px',
    borderRadius: '6px',
    border: `1px solid ${T.line}`,
    background: T.card,
    color: T.inkSoft,
    cursor: 'pointer',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    fontSize: '15px',
  },
  viewBtnActive: { background: T.accent, color: '#fff', borderColor: T.accent },
  sortSelect: {
    background: T.card,
    border: `1px solid ${T.line}`,
    borderRadius: '6px',
    color: T.inkSoft,
    fontSize: '12px',
    padding: '0 8px',
    height: '32px',
    cursor: 'pointer',
    outline: 'none',
    marginRight: '4px',
  },

  // ── Photo list (single column) ──
  photoList: {
    display: 'flex',
    flexDirection: 'column' as const,
    gap: '2px',
    marginBottom: '24px',
  },
  photoListRow: {
    display: 'flex',
    alignItems: 'center',
    gap: '14px',
    padding: '10px 12px',
    background: T.card,
    border: `1px solid ${T.line}`,
    borderRadius: '8px',
    cursor: 'pointer',
  },
  photoListThumb: {
    width: '56px',
    height: '56px',
    borderRadius: '6px',
    objectFit: 'cover' as const,
    flexShrink: 0,
    background: T.paperTwo,
    overflow: 'hidden',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    color: T.inkMute,
    fontSize: '11px',
    fontFamily: 'monospace',
  },
  photoListInfo: { flex: 1, minWidth: 0 },
  photoListTitle: {
    fontSize: '14px',
    fontWeight: 500,
    color: T.ink,
    overflow: 'hidden',
    textOverflow: 'ellipsis',
    whiteSpace: 'nowrap' as const,
    marginBottom: '3px',
  },
  photoListMeta: { fontSize: '12px', color: T.inkMute },
  lockBadgeInline: {
    display: 'flex',
    alignItems: 'center',
    gap: '4px',
    padding: '4px 10px',
    borderRadius: '20px',
    border: 'none',
    fontSize: '11px',
    fontWeight: 600,
    cursor: 'pointer',
    letterSpacing: '0.03em',
    whiteSpace: 'nowrap' as const,
    flexShrink: 0,
  },

  // ── Photo grid (4-col, first photo 2×2) ──
  photoGrid: {
    display: 'grid',
    gridTemplateColumns: 'repeat(4, 1fr)',
    gridAutoRows: '220px',
    gap: '4px',
    marginBottom: '24px',
  },
  photoCell: {
    background: T.paperTwo,
    overflow: 'hidden',
    borderRadius: '3px',
    position: 'relative',
    cursor: 'pointer',
  },
  photoCellFeatured: { gridColumn: 'span 2', gridRow: 'span 2' },
  photoCellFeaturedFull: {
    background: T.paperTwo,
    overflow: 'hidden',
    borderRadius: '3px',
    position: 'relative' as const,
    cursor: 'pointer',
    gridColumn: 'span 2',
    gridRow: 'span 2',
  },
  photoCaptionHover: {
    position: 'absolute' as const,
    bottom: 0, left: 0, right: 0,
    padding: '20px 8px 8px',
    background: 'linear-gradient(to top, rgba(0,0,0,0.72), transparent)',
    fontSize: '11px',
    color: '#fff',
    lineHeight: 1.4,
  },
  lockPublic: { position: 'absolute' as const, top: '8px', right: '8px', display: 'flex', alignItems: 'center', gap: '6px', padding: '5px 12px', borderRadius: '999px', fontSize: '11px', fontWeight: 700, cursor: 'pointer', zIndex: 2, backdropFilter: 'blur(14px) saturate(170%)', WebkitBackdropFilter: 'blur(14px) saturate(170%)', letterSpacing: '0.02em', whiteSpace: 'nowrap' as const, ...privacyStyles.shared, opacity: 1 },
  lockPrivate: { position: 'absolute' as const, top: '8px', right: '8px', display: 'flex', alignItems: 'center', gap: '6px', padding: '5px 12px', borderRadius: '999px', fontSize: '11px', fontWeight: 700, cursor: 'pointer', zIndex: 2, backdropFilter: 'blur(14px) saturate(170%)', WebkitBackdropFilter: 'blur(14px) saturate(170%)', letterSpacing: '0.02em', whiteSpace: 'nowrap' as const, ...privacyStyles.private, opacity: 1 },
  lockPublicPend: { position: 'absolute' as const, top: '8px', right: '8px', display: 'flex', alignItems: 'center', gap: '6px', padding: '5px 12px', borderRadius: '999px', fontSize: '11px', fontWeight: 700, cursor: 'pointer', zIndex: 2, backdropFilter: 'blur(14px) saturate(170%)', WebkitBackdropFilter: 'blur(14px) saturate(170%)', letterSpacing: '0.02em', whiteSpace: 'nowrap' as const, ...privacyStyles.shared, opacity: 0.48 },
  lockPrivatePend: { position: 'absolute' as const, top: '8px', right: '8px', display: 'flex', alignItems: 'center', gap: '6px', padding: '5px 12px', borderRadius: '999px', fontSize: '11px', fontWeight: 700, cursor: 'pointer', zIndex: 2, backdropFilter: 'blur(14px) saturate(170%)', WebkitBackdropFilter: 'blur(14px) saturate(170%)', letterSpacing: '0.02em', whiteSpace: 'nowrap' as const, ...privacyStyles.private, opacity: 0.48 },
  lockInlinePublic: { display: 'flex', alignItems: 'center', gap: '6px', padding: '5px 12px', borderRadius: '999px', fontSize: '11px', fontWeight: 700, cursor: 'pointer', letterSpacing: '0.02em', whiteSpace: 'nowrap' as const, flexShrink: 0, backdropFilter: 'blur(14px) saturate(170%)', WebkitBackdropFilter: 'blur(14px) saturate(170%)', ...privacyStyles.shared, opacity: 1 },
  lockInlinePrivate: { display: 'flex', alignItems: 'center', gap: '6px', padding: '5px 12px', borderRadius: '999px', fontSize: '11px', fontWeight: 700, cursor: 'pointer', letterSpacing: '0.02em', whiteSpace: 'nowrap' as const, flexShrink: 0, backdropFilter: 'blur(14px) saturate(170%)', WebkitBackdropFilter: 'blur(14px) saturate(170%)', ...privacyStyles.private, opacity: 1 },
  lockInlinePublicP: { display: 'flex', alignItems: 'center', gap: '6px', padding: '5px 12px', borderRadius: '999px', fontSize: '11px', fontWeight: 700, cursor: 'pointer', letterSpacing: '0.02em', whiteSpace: 'nowrap' as const, flexShrink: 0, backdropFilter: 'blur(14px) saturate(170%)', WebkitBackdropFilter: 'blur(14px) saturate(170%)', ...privacyStyles.shared, opacity: 0.48 },
  lockInlinePrivateP: { display: 'flex', alignItems: 'center', gap: '6px', padding: '5px 12px', borderRadius: '999px', fontSize: '11px', fontWeight: 700, cursor: 'pointer', letterSpacing: '0.02em', whiteSpace: 'nowrap' as const, flexShrink: 0, backdropFilter: 'blur(14px) saturate(170%)', WebkitBackdropFilter: 'blur(14px) saturate(170%)', ...privacyStyles.private, opacity: 0.48 },
  photoImg: { width: '100%', height: '100%', objectFit: 'cover' as const },
  photoPlaceholder: {
    width: '100%',
    height: '100%',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    background: T.paperTwo,
    color: T.inkMute,
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
    color: '#fff',
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
    color: '#fff',
  },
  likeBadge: {
    background: 'rgba(0,0,0,0.4)',
    borderRadius: '6px',
    padding: '3px 8px',
    fontSize: '12px',
    color: '#fff',
  },

  // Visibility pill (top-right of any photo)
  lockBadge: {
    position: 'absolute',
    top: '8px',
    right: '8px',
    display: 'flex',
    alignItems: 'center',
    gap: '4px',
    padding: '4px 10px',
    borderRadius: '20px',
    border: 'none',
    fontSize: '11px',
    fontWeight: 600,
    cursor: 'pointer',
    zIndex: 2,
    backdropFilter: 'blur(6px)',
    letterSpacing: '0.03em',
    whiteSpace: 'nowrap' as const,
  },

  // Empty placeholder cell (standalone, 2/3 of original 2×2 featured size)
  emptyCellWrap: {
    display: 'flex',
    justifyContent: 'center',
    marginBottom: '24px',
  },
  emptyCellSm: {
    width: '293px',
    height: '293px',
    background: 'transparent',
    border: `2px dashed ${T.line}`,
    borderRadius: '6px',
    display: 'flex',
    flexDirection: 'column' as const,
    alignItems: 'center',
    justifyContent: 'center',
    gap: '10px',
    cursor: 'pointer',
  },
  emptyCellIcon: { fontSize: '36px', color: T.accent },
  emptyCellLabel: { fontSize: '13px', color: T.inkSoft },

  // Load more
  loadMoreWrap: { display: 'flex', justifyContent: 'center', marginBottom: '48px' },
  loadMoreBtn: {
    background: T.card,
    border: `1px solid ${T.line}`,
    borderRadius: '8px',
    padding: '10px 28px',
    color: T.inkSoft,
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
    borderBottom: `1px solid ${T.lineSoft}`,
  },
  listIcon: {
    width: '38px',
    height: '38px',
    borderRadius: '9px',
    background: T.paperTwo,
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    fontSize: '15px',
    flexShrink: 0,
  },
  listName: { fontSize: '14px', fontWeight: 500, color: T.ink, marginBottom: '2px' },
  listMeta: { fontSize: '12px', color: T.inkMute },

  // Bottom stats cards
  bottomRow: { display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '20px' },
  bottomCard: {
    background: T.card,
    border: `1px solid ${T.line}`,
    borderRadius: '12px',
    padding: '20px 22px',
  },
  bottomCardHeader: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: '18px',
  },
  bottomCardTitle: { fontSize: '13px', fontWeight: 600, color: T.ink },
  topBadge: { fontSize: '11px', fontWeight: 600, color: T.inkMute, letterSpacing: '0.04em' },
  rankRow: { display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '14px' },
  rankIcon: {
    width: '36px',
    height: '36px',
    borderRadius: '8px',
    background: T.paperTwo,
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
    color: T.ink,
    marginBottom: '2px',
    overflow: 'hidden',
    textOverflow: 'ellipsis',
    whiteSpace: 'nowrap' as const,
  },
  rankMeta: { fontSize: '11px', color: T.inkMute },
  rankBar: { width: '72px', flexShrink: 0 },
  barTrack: { background: T.paperTwo, borderRadius: '4px', height: '4px', overflow: 'hidden' },
  barFill: { height: '100%', background: T.accent, borderRadius: '4px' },

  emptyNote: { color: T.inkMute, fontSize: '13px', padding: '12px 0' },

  // ── Avatar editing ──
  avatarWrap: {
    position: 'relative',
    flexShrink: 0,
  },
  avatarOverlay: {
    position: 'absolute',
    inset: 0,
    borderRadius: '50%',
    background: 'rgba(0,0,0,0.48)',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    fontSize: '22px',
    cursor: 'pointer',
    transition: 'opacity 0.15s',
  },
  badgePickerBtn: {
    position: 'absolute',
    bottom: '0',
    right: '-4px',
    width: '24px',
    height: '24px',
    borderRadius: '50%',
    background: T.accent,
    border: `2px solid ${T.paper}`,
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    fontSize: '11px',
    cursor: 'pointer',
    color: '#fff',
    padding: 0,
    zIndex: 2,
  },
  badgePicker: {
    position: 'absolute',
    top: '100px',
    left: 0,
    background: T.card,
    border: `1px solid ${T.line}`,
    borderRadius: '10px',
    padding: '8px',
    display: 'flex',
    flexWrap: 'wrap' as const,
    gap: '4px',
    width: '144px',
    zIndex: 10,
    boxShadow: '0 8px 24px rgba(26,41,66,0.16)',
  },
  badgeOption: {
    width: '32px',
    height: '32px',
    background: 'transparent',
    border: '1px solid transparent',
    borderRadius: '6px',
    cursor: 'pointer',
    fontSize: '18px',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
  },
  badgeOptionActive: {
    background: T.accentSoft,
    borderColor: T.accent,
  },
  hiddenInput: { display: 'none' },

  // FAB
  fab: {
    position: 'fixed',
    bottom: '36px',
    right: '36px',
    width: '54px',
    height: '54px',
    borderRadius: '50%',
    background: T.accent,
    border: 'none',
    color: '#fff',
    fontSize: '26px',
    lineHeight: 1,
    cursor: 'pointer',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    boxShadow: '0 4px 24px rgba(30,95,179,0.28)',
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

type TabKey = 'photos' | 'albums' | 'locations' | 'gear' | 'favorites'
const PAGE_SIZE = 8

const Profile: React.FC = () => {
  const navigate = useNavigate()
  const qc = useQueryClient()

  const [activeTab, setActiveTab] = useState<TabKey>('photos')
  const [activeTag, setActiveTag] = useState('全部')
  const [viewMode, setViewMode] = useState<'grid' | 'list'>('grid')
  const [sortBy, setSortBy] = useState<'time-desc' | 'time-asc' | 'name-asc' | 'name-desc'>('time-desc')
  const [photoLimit, setPhotoLimit] = useState(PAGE_SIZE)
  const [hoveredId, setHoveredId] = useState<string | null>(null)

  const [localAvatar, setLocalAvatar] = useState<string | null>(null)
  const [avatarHovered, setAvatarHovered] = useState(false)
  const [badgeEmoji, setBadgeEmoji] = useState('◈')
  const [showBadgePicker, setShowBadgePicker] = useState(false)
  const avatarInputRef = useRef<HTMLInputElement>(null)

  const [localBanner, setLocalBanner] = useState<string | null>(null)
  const [bannerHovered, setBannerHovered] = useState(false)
  const bannerInputRef = useRef<HTMLInputElement>(null)
  const bannerWrapRef = useRef<HTMLDivElement>(null)
  const bannerDragRef = useRef<{ x: number; y: number; px: number; py: number } | null>(null)
  const [bannerPosX, setBannerPosX] = useState(50)
  const [bannerPosY, setBannerPosY] = useState(50)
  const [featuredIdx, setFeaturedIdx] = useState(0)

  const BADGE_OPTIONS = ['◈', '◉', '◎', '⊕', '⬡', '★', '✦', '⬤', '🌙', '🔭', '📷', '🎞']


  const handleAvatarChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return
    const reader = new FileReader()
    reader.onload = (ev) => setLocalAvatar(ev.target?.result as string)
    reader.readAsDataURL(file)
    e.target.value = ''
  }

  const handleBannerChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return
    const reader = new FileReader()
    reader.onload = (ev) => {
      const dataUrl = ev.target?.result as string
      setLocalBanner(dataUrl)
      setBannerPosX(50)
      setBannerPosY(50)
    }
    reader.readAsDataURL(file)
    e.target.value = ''
  }

  const handleBannerPointerDown = (e: React.PointerEvent<HTMLDivElement>) => {
    e.currentTarget.setPointerCapture(e.pointerId)
    bannerDragRef.current = { x: e.clientX, y: e.clientY, px: bannerPosX, py: bannerPosY }
  }
  const handleBannerPointerMove = (e: React.PointerEvent<HTMLDivElement>) => {
    if (!bannerDragRef.current || !localBanner || !bannerWrapRef.current) return
    const rect = bannerWrapRef.current.getBoundingClientRect()
    const dx = ((e.clientX - bannerDragRef.current.x) / rect.width) * 100
    const dy = ((e.clientY - bannerDragRef.current.y) / rect.height) * 100
    setBannerPosX(Math.max(0, Math.min(100, bannerDragRef.current.px - dx)))
    setBannerPosY(Math.max(0, Math.min(100, bannerDragRef.current.py - dy)))
  }
  const handleBannerPointerUp = (e: React.PointerEvent<HTMLDivElement>) => {
    if (!bannerDragRef.current) return
    const moved = Math.abs(e.clientX - bannerDragRef.current.x) > 3 ||
      Math.abs(e.clientY - bannerDragRef.current.y) > 3
    if (!moved) bannerInputRef.current?.click()
    bannerDragRef.current = null
  }

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
  const { data: globalLocations = [] } = useQuery<GlobalLocation[]>({
    queryKey: ['global-locations'],
    queryFn: () => api.get('/global-locations').then((r) => r.data),
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

  useEffect(() => {
    if (allPhotos.length <= 1) return
    const t = setInterval(() => setFeaturedIdx(i => (i + 1) % allPhotos.length), 4000)
    return () => clearInterval(t)
  }, [allPhotos.length])

  const locationMap = useMemo(() => {
    const m: Record<string, Location> = {}
    locations.forEach((l) => { m[l.id] = l })
    return m
  }, [locations])

  const globalLocationMap = useMemo(() => {
    const m: Record<string, GlobalLocation> = {}
    globalLocations.forEach((l) => { m[l.id] = l })
    return m
  }, [globalLocations])

  const allTags = useMemo(() => {
    const set = new Set<string>()
    locations.forEach((l) => l.tags?.forEach((t) => set.add(t)))
    return ['全部', ...Array.from(set)]
  }, [locations])

  const filteredPhotos = useMemo(() => {
    const base = activeTag === '全部'
      ? allPhotos
      : allPhotos.filter((p) => p.location_id && locationMap[p.location_id]?.tags?.includes(activeTag))
    const arr = [...base]
    switch (sortBy) {
      case 'time-asc': return arr.sort((a, b) => new Date(a.created_at).getTime() - new Date(b.created_at).getTime())
      case 'time-desc': return arr.sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime())
      case 'name-asc': return arr.sort((a, b) => (a.caption ?? '').localeCompare(b.caption ?? ''))
      case 'name-desc': return arr.sort((a, b) => (b.caption ?? '').localeCompare(a.caption ?? ''))
      default: return arr
    }
  }, [allPhotos, activeTag, locationMap, sortBy])

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

  const bannerBg = localBanner ? undefined : `linear-gradient(135deg, ${T.accentSoft} 0%, ${T.paperTwo} 55%, ${T.card} 100%)`

  return (
    <>
      <div style={s.page}>

        {/* ── Banner ── */}
        <div
          ref={bannerWrapRef}
          style={{ ...s.bannerWrap, background: bannerBg, backgroundImage: bannerBg }}
          onMouseEnter={() => setBannerHovered(true)}
          onMouseLeave={() => setBannerHovered(false)}
          onPointerDown={handleBannerPointerDown}
          onPointerMove={handleBannerPointerMove}
          onPointerUp={handleBannerPointerUp}
          title={localBanner ? '拖曳調整位置 · 點擊更換圖片' : '點擊更換橫幅'}
        >
          {localBanner && (
            <img
              src={localBanner}
              alt="banner"
              style={{ ...s.bannerImg, objectPosition: `${bannerPosX}% ${bannerPosY}%` }}
            />
          )}
          {bannerHovered && (
            <div style={s.bannerOverlay}>
              <span>📷</span>
              <span style={{ fontSize: '13px' }}>{localBanner ? '拖曳調整 · 點擊更換' : '更換橫幅'}</span>
            </div>
          )}
          {/* Bottom fade */}
          <div style={s.bannerFadeBottom} />
        </div>
        <input
          ref={bannerInputRef}
          type="file"
          accept="image/*"
          title="上傳橫幅"
          style={s.hiddenInput}
          onChange={handleBannerChange}
        />

        {/* ── Profile header ── */}
        <div style={s.profileHeader}>
          <div style={s.avatarWrap}>
            <div
              style={s.avatar}
              onMouseEnter={() => setAvatarHovered(true)}
              onMouseLeave={() => setAvatarHovered(false)}
              onClick={() => avatarInputRef.current?.click()}
              title="點擊更換頭像"
            >
              {localAvatar || user?.avatar_url
                ? <SafeImage src={localAvatar ?? user!.avatar_url!} alt="avatar" style={s.avatarImg} />
                : (
                  <svg viewBox="0 0 24 24" width="44" height="44" fill="none" stroke={T.inkMute} strokeWidth="1.4" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2" />
                    <circle cx="12" cy="7" r="4" />
                  </svg>
                )}
              {avatarHovered && (
                <div style={s.avatarOverlay}>📷</div>
              )}
            </div>
            <input
              ref={avatarInputRef}
              type="file"
              accept="image/*"
              title="上傳頭像"
              style={s.hiddenInput}
              onChange={handleAvatarChange}
            />
            <button
              type="button"
              style={s.badgePickerBtn}
              title="更換 Badge"
              onClick={() => setShowBadgePicker(v => !v)}
            >
              ✎
            </button>
            {showBadgePicker && (
              <div style={s.badgePicker}>
                {BADGE_OPTIONS.map(e => (
                  <button
                    key={e}
                    type="button"
                    style={{ ...s.badgeOption, ...(badgeEmoji === e ? s.badgeOptionActive : {}) }}
                    onClick={() => { setBadgeEmoji(e); setShowBadgePicker(false) }}
                  >
                    {e}
                  </button>
                ))}
              </div>
            )}
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
            <p style={s.bio}>
              {user?.bio || '用影像記錄光線、地點與拍攝路線。'}
            </p>
          </div>
        </div>

        {/* ── Stats bar ── */}
        <div style={s.statsBar}>
          {[
            { n: allPhotos.length, label: '作品' },
            { n: locations.length, label: '路線' },
            { n: gear.length, label: '器材', last: true },
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
            { key: 'photos', label: '照片', count: allPhotos.length },
            { key: 'albums', label: '專輯', count: 0 },
            { key: 'locations', label: '景點', count: locations.length },
            { key: 'gear', label: '器材', count: gear.length },
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
                <select
                  style={s.sortSelect}
                  aria-label="排序方式"
                  value={sortBy}
                  onChange={(e) => { setSortBy(e.target.value as typeof sortBy); setPhotoLimit(PAGE_SIZE) }}
                >
                  <option value="time-desc">最新優先</option>
                  <option value="time-asc">最舊優先</option>
                  <option value="name-asc">名稱 A→Z</option>
                  <option value="name-desc">名稱 Z→A</option>
                </select>
                <button type="button" style={viewMode === 'grid' ? s.viewBtnActive : s.viewBtn} onClick={() => setViewMode('grid')}>⊞</button>
                <button type="button" style={viewMode === 'list' ? s.viewBtnActive : s.viewBtn} onClick={() => setViewMode('list')}>≡</button>
              </div>
            </div>

            {/* Photos — empty state */}
            {visiblePhotos.length === 0 ? (
              <div style={s.emptyCellWrap}>
                <div style={s.emptyCellSm} onClick={() => navigate('/upload')}>
                  <span style={s.emptyCellIcon}>⊕</span>
                  <span style={s.emptyCellLabel}>上傳第一張照片</span>
                </div>
              </div>
            ) : viewMode === 'list' ? (
              /* ── List view ── */
              <div style={s.photoList}>
                {visiblePhotos.map((photo) => {
                  const loc = photo.location_id
                    ? (photo.location_source === 'global'
                      ? globalLocationMap[photo.location_id]
                      : locationMap[photo.location_id])
                    : null
                  const thumbSrc = photo.thumb_url || photo.url
                  const isPending = pendingPhoto?.id === photo.id
                  return (
                    <div key={photo.id} style={s.photoListRow} onClick={() => navigate(`/photos/${photo.id}`)}>
                      {thumbSrc
                        ? <SafeImage src={thumbSrc} alt={photo.caption ?? ''} style={s.photoListThumb} />
                        : <div style={s.photoListThumb}>{photo.id.slice(-4).toUpperCase()}</div>
                      }
                      <div style={s.photoListInfo}>
                        <div style={s.photoListTitle}>{photo.caption || '未命名照片'}</div>
                        <div style={s.photoListMeta}>
                          {relativeTime(photo.created_at)}
                          {loc ? ` · ${loc.name}` : ''}
                          {photo.tags?.length ? ` · ${photo.tags.slice(0, 3).map((tag) => `#${tag}`).join(' ')}` : ''}
                        </div>
                      </div>
                      <button
                        type="button"
                        style={photo.is_public
                          ? (isPending ? s.lockInlinePublicP : s.lockInlinePublic)
                          : (isPending ? s.lockInlinePrivateP : s.lockInlinePrivate)}
                        title={photo.is_public ? '點擊設為私人' : '點擊設為公開'}
                        onClick={(e) => { e.stopPropagation(); if (!isPending) toggleVisibility(photo) }}
                      >
                        {photo.is_public ? '🔓 Shared' : '🔒 Private'}
                      </button>
                    </div>
                  )
                })}
              </div>
            ) : (
              /* ── Grid view ── */
              <div style={s.photoGrid}>
                {/* 獨立的輪播牆首圖 */}
                {allPhotos.length > 0 && (
                  (() => {
                    const fp = allPhotos[featuredIdx] || allPhotos[0]
                    const loc = fp.location_id
                      ? (fp.location_source === 'global'
                        ? globalLocationMap[fp.location_id]
                        : locationMap[fp.location_id])
                      : null
                    const thumbSrc = fp.thumb_url || fp.url
                    const exifLabel = fp.exif
                      ? [
                          fp.exif.focal_length != null ? `${fp.exif.focal_length}mm` : null,
                          fp.exif.aperture != null ? `f/${fp.exif.aperture}` : null,
                        ].filter(Boolean).join(' · ')
                      : null

                    return (
                      <div
                        style={s.photoCellFeaturedFull}
                        onClick={() => navigate(`/photos/${fp.id}`)}
                      >
                        {thumbSrc
                          ? <SafeImage src={thumbSrc} alt={fp.caption ?? ''} style={s.photoImg} />
                          : <div style={s.photoPlaceholder}>{fp.id.slice(-4).toUpperCase()}</div>
                        }
                        {loc && (
                          <div style={s.overlayTop}>{loc.name} · {relativeTime(fp.created_at)}</div>
                        )}
                        <div style={s.overlayBottom}>
                          <span style={s.exifBadge}>{exifLabel || '—'}</span>
                          <span style={s.likeBadge}>♡ 0</span>
                        </div>
                        {/* 沒有鎖頭按鈕，純粹輪播顯示用 */}
                      </div>
                    )
                  })()
                )}

                {/* 剩下的普通照片（包含原本第一張，現在獨立出來） */}
                {visiblePhotos.map((photo) => {
                  const p = photo
                  const thumbSrc = p.thumb_url || p.url
                  const isHovered = hoveredId === p.id
                  const isPending = pendingPhoto?.id === p.id

                  return (
                    <div
                      key={p.id}
                      style={s.photoCell}
                      onMouseEnter={() => setHoveredId(p.id)}
                      onMouseLeave={() => setHoveredId(null)}
                      onClick={() => navigate(`/photos/${p.id}`)}
                    >
                      {thumbSrc
                        ? <SafeImage src={thumbSrc} alt={p.caption ?? ''} style={s.photoImg} />
                        : <div style={s.photoPlaceholder}>{p.id.slice(-4).toUpperCase()}</div>
                      }
                      {isHovered && p.caption && (
                        <div style={s.photoCaptionHover}>{p.caption}</div>
                      )}
                      <button
                        type="button"
                        style={p.is_public
                          ? (isPending ? s.lockPublicPend : s.lockPublic)
                          : (isPending ? s.lockPrivatePend : s.lockPrivate)}
                        title={p.is_public ? '點擊設為私人' : '點擊設為公開'}
                        onClick={(e) => { e.stopPropagation(); if (!isPending) toggleVisibility(p) }}
                      >
                        {p.is_public ? '🔓 Shared' : '🔒 Private'}
                      </button>
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

        {/* ── Albums tab ── */}
        {activeTab === 'albums' && (
          <div style={s.listWrap}>
            <div style={s.emptyNote}>尚無專輯</div>
          </div>
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
