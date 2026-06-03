import React, { useState, useMemo, useRef, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import api from '../lib/api'
import { clearTokens } from '../lib/auth'
import T from '../styles/tokens'
import { useBreakpoint } from '../hooks/useBreakpoint'

// ─── Types ────────────────────────────────────────────────────────────────────

interface User {
  id: string
  username: string
  email: string
  avatar_url?: string
  banner_url?: string
  banner_pos_x?: number
  banner_pos_y?: number
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

interface StoryItem {
  id: string
  type: 'photo' | 'text'
  photoId?: string
  content?: string
  caption?: string
}

interface Story {
  id: string
  name: string
  photoIds: string[]
  notes: Record<string, string>
  items: StoryItem[]
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
    height: '400px',
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
    height: '100px',
    background: `linear-gradient(to bottom, transparent 0%, ${T.paper} 100%)`,
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
  tabActive: { color: T.ink, borderBottom: `2px solid ${T.accent}` },
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

// ─── Mobile Styles ───────────────────────────────────────────────────────────

const m: Record<string, React.CSSProperties> = {
  page: {
    paddingBottom: 62,
    background: T.paper,
    color: T.ink,
    fontFamily: "'Inter', system-ui, sans-serif",
    minHeight: '100%',
    boxSizing: 'border-box' as const,
  },
  banner: {
    position: 'relative' as const,
    zIndex: 0,
    width: '100%',
    height: '76px',
    overflow: 'hidden',
    flexShrink: 0,
    borderRadius: 0,
  },
  bannerImg: {
    width: '100%',
    height: '100%',
    objectFit: 'cover' as const,
  },
  avRowCard: {
    position: 'relative' as const,
    zIndex: 1,
    background: T.card,
    padding: '0 14px 10px',
  },
  avatarWrap: {
    position: 'relative' as const,
    display: 'inline-block',
  },
  avatar: {
    width: '52px',
    height: '52px',
    borderRadius: '50%',
    background: T.card,
    border: `3px solid ${T.paper}`,
    boxShadow: '0 2px 8px rgba(16,24,40,0.1)',
    marginTop: -26,
    overflow: 'hidden',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    cursor: 'pointer',
    flexShrink: 0,
  },
  infoRow: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginTop: 4,
  },
  nameRow: {
    display: 'flex',
    alignItems: 'center',
    gap: '6px',
  },
  name: {
    fontSize: '14px',
    fontWeight: 600,
    letterSpacing: '-0.01em',
  },
  proBadge: {
    fontFamily: "'IBM Plex Mono', monospace",
    fontSize: '9px',
    padding: '1px 5px',
    background: T.paperTwo,
    borderRadius: '3px',
    verticalAlign: 'middle' as const,
    color: T.ink,
  },
  handle: {
    fontSize: '10px',
    color: T.inkMute,
    fontFamily: "'IBM Plex Mono', monospace",
    marginTop: 2,
  },
  bio: {
    fontSize: '10.5px',
    color: T.inkSoft,
    marginTop: 3,
    lineHeight: 1.4,
  },
  editBtn: {
    height: '26px',
    padding: '0 10px',
    border: `1px solid ${T.line}`,
    borderRadius: '6px',
    background: T.card,
    color: T.ink,
    fontSize: '10.5px',
    fontWeight: 500,
    cursor: 'pointer',
    display: 'inline-flex',
    alignItems: 'center',
    flexShrink: 0,
  },
  statsBar: {
    display: 'flex',
    borderTop: `1px solid ${T.lineSoft}`,
    borderBottom: `1px solid ${T.lineSoft}`,
    background: T.card,
  },
  statItem: {
    flex: 1,
    textAlign: 'center' as const,
    padding: '7px 4px',
    borderRight: `1px solid ${T.lineSoft}`,
  },
  statItemLast: {
    flex: 1,
    textAlign: 'center' as const,
    padding: '7px 4px',
  },
  statNum: {
    fontSize: '13px',
    fontWeight: 600,
    letterSpacing: '-0.01em',
  },
  statLabel: {
    fontSize: '8.5px',
    color: T.inkMute,
    fontFamily: "'IBM Plex Mono', monospace",
    textTransform: 'uppercase' as const,
    letterSpacing: '0.06em',
  },
  tabBar: {
    display: 'flex',
    borderBottom: `1px solid ${T.line}`,
    background: T.card,
  },
  tab: {
    flex: 1,
    textAlign: 'center' as const,
    padding: '8px 4px',
    fontSize: '11px',
    color: T.inkMute,
    borderBottom: '2px solid transparent',
    cursor: 'pointer',
    userSelect: 'none' as const,
  },
  tabActive: {
    color: T.ink,
    borderBottom: `2px solid ${T.accent}`,
    fontWeight: 600,
  },
  photoGrid: {
    display: 'grid',
    gridTemplateColumns: 'repeat(3, 1fr)',
    gap: '1.5px',
  },
  photoCellFeatured: {
    gridColumn: 'span 2',
    gridRow: 'span 2',
    position: 'relative' as const,
    overflow: 'hidden',
    background: T.paperTwo,
    cursor: 'pointer',
  },
  photoCell: {
    aspectRatio: '1',
    position: 'relative' as const,
    overflow: 'hidden',
    background: T.paperTwo,
    cursor: 'pointer',
  },
  emptyCellWrap: {
    display: 'flex',
    justifyContent: 'center',
    padding: '32px 16px',
  },
  emptyCell: {
    width: '200px',
    height: '200px',
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
  listWrap: {
    padding: '4px 14px 24px',
  },
  listRow: {
    display: 'flex',
    alignItems: 'center',
    gap: '12px',
    padding: '10px 0',
    borderBottom: `1px solid ${T.lineSoft}`,
  },
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

function migrateStory(raw: Partial<Story> & { id: string; name: string }): Story {
  if (Array.isArray((raw as Story).items)) return raw as Story
  const photoIds = raw.photoIds ?? []
  const notes = raw.notes ?? {}
  const items: StoryItem[] = []
  for (const pid of photoIds) {
    items.push({ id: `photo-${pid}`, type: 'photo', photoId: pid, caption: notes[pid] || undefined })
  }
  return { id: raw.id, name: raw.name, photoIds, notes, items }
}

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
  return <img src={src} alt={alt ?? ''} style={{ imageOrientation: 'from-image', ...style }} loading="lazy" onError={() => setErr(true)} />
}

// ─── Profile ──────────────────────────────────────────────────────────────────

type TabKey = 'photos' | 'albums' | 'locations' | 'gear' | 'favorites'
const PAGE_SIZE = 8

const Profile: React.FC = () => {
  const navigate = useNavigate()
  const qc = useQueryClient()
  const { isMobile } = useBreakpoint()

  const handleSignOut = async () => {
    try { await api.post('/auth/logout') } catch { /* ignore */ }
    clearTokens()
    navigate('/login')
  }

  const [activeTab, setActiveTab] = useState<TabKey>('photos')
  const [activeTag, setActiveTag] = useState('全部')
  const [viewMode, setViewMode] = useState<'grid' | 'list'>('grid')
  const [sortBy, setSortBy] = useState<'time-desc' | 'time-asc' | 'taken-desc' | 'taken-asc' | 'name-asc' | 'name-desc'>('time-desc')
  const [photoLimit, setPhotoLimit] = useState(PAGE_SIZE)
  const [hoveredId, setHoveredId] = useState<string | null>(null)
  const [stories, setStories] = useState<Story[]>([])
  const [storiesInitialized, setStoriesInitialized] = useState(false)
  const [selectedStoryId, setSelectedStoryId] = useState<string | null>(null)
  const [storyEditing, setStoryEditing] = useState(false)
  const [editingStoryName, setEditingStoryName] = useState(false)
  const [storyNameDraft, setStoryNameDraft] = useState('')
  const [storySortOrder, setStorySortOrder] = useState<'custom' | 'taken-asc' | 'taken-desc'>('taken-asc')
  const [showCreateStoryModal, setShowCreateStoryModal] = useState(false)
  const [newStoryName, setNewStoryName] = useState('')

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
  const bannerPosRef = useRef({ x: 50, y: 50 })
  const [featuredIdx, setFeaturedIdx] = useState(0)

  const BADGE_OPTIONS = ['◈', '◉', '◎', '⊕', '⬡', '★', '✦', '⬤', '🌙', '🔭', '📷', '🎞']


  const uploadProfileImage = async (file: File, type: 'avatar' | 'banner') => {
    const presignRes = await api.post(`/users/me/${type}/presign`, null, {
      params: { filename: file.name, content_type: file.type || 'image/jpeg' },
    })
    const { presigned_url, s3_key } = presignRes.data
    await fetch(presigned_url, {
      method: 'PUT',
      headers: { 'Content-Type': file.type || 'image/jpeg' },
      body: file,
    })
    const confirmRes = await api.post(`/users/me/${type}/confirm`, { s3_key })
    return confirmRes.data
  }

  const handleAvatarChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return
    const reader = new FileReader()
    reader.onload = (ev) => setLocalAvatar(ev.target?.result as string)
    reader.readAsDataURL(file)
    e.target.value = ''
    uploadProfileImage(file, 'avatar')
      .then(() => qc.invalidateQueries({ queryKey: ['me'] }))
      .catch(() => {})
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
    uploadProfileImage(file, 'banner')
      .then(() => qc.invalidateQueries({ queryKey: ['me'] }))
      .catch(() => {})
  }

  const handleBannerPointerDown = (e: React.PointerEvent<HTMLDivElement>) => {
    e.currentTarget.setPointerCapture(e.pointerId)
    bannerDragRef.current = { x: e.clientX, y: e.clientY, px: bannerPosX, py: bannerPosY }
  }
  const handleBannerPointerMove = (e: React.PointerEvent<HTMLDivElement>) => {
    if (!bannerDragRef.current || !activeBanner || !bannerWrapRef.current) return
    const rect = bannerWrapRef.current.getBoundingClientRect()
    const dx = ((e.clientX - bannerDragRef.current.x) / rect.width) * 100
    const dy = ((e.clientY - bannerDragRef.current.y) / rect.height) * 100
    const nx = Math.max(0, Math.min(100, bannerDragRef.current.px - dx))
    const ny = Math.max(0, Math.min(100, bannerDragRef.current.py - dy))
    bannerPosRef.current = { x: nx, y: ny }
    setBannerPosX(nx)
    setBannerPosY(ny)
  }
  const handleBannerPointerUp = (e: React.PointerEvent<HTMLDivElement>) => {
    if (!bannerDragRef.current) return
    const moved = Math.abs(e.clientX - bannerDragRef.current.x) > 3 ||
      Math.abs(e.clientY - bannerDragRef.current.y) > 3
    if (!moved) {
      bannerInputRef.current?.click()
    } else if (activeBanner) {
      api.patch('/users/me/banner/position', {
        pos_x: bannerPosRef.current.x,
        pos_y: bannerPosRef.current.y,
      }).catch(() => {})
    }
    bannerDragRef.current = null
  }

  const { data: user } = useQuery<User>({
    queryKey: ['me'],
    queryFn: () => api.get('/auth/me').then((r) => r.data),
  })

  useEffect(() => {
    if (!user) return
    const raw = localStorage.getItem(`lenslog_stories_${user.id}`)
    try {
      const parsed: Story[] = raw ? JSON.parse(raw) : []
      setStories(parsed.map(migrateStory))
    } catch {
      setStories([])
    }
    setStoriesInitialized(true)
  }, [user])

  useEffect(() => {
    if (!user || !storiesInitialized) return
    localStorage.setItem(`lenslog_stories_${user.id}`, JSON.stringify(stories))
  }, [stories, user, storiesInitialized])

  const selectedStory = stories.find((story) => story.id === selectedStoryId)
  const createStory = () => {
    setNewStoryName('')
    setShowCreateStoryModal(true)
  }
  const confirmCreateStory = () => {
    if (!newStoryName.trim()) return
    const story: Story = { id: crypto.randomUUID(), name: newStoryName.trim(), photoIds: [], notes: {}, items: [] }
    setStories((current) => [...current, story])
    setSelectedStoryId(story.id)
    setStoryEditing(true)
    setShowCreateStoryModal(false)
    setNewStoryName('')
  }
  const updateSelectedStory = (update: (story: Story) => Story) => {
    if (!selectedStoryId) return
    setStories((current) => current.map((story) => story.id === selectedStoryId ? update(story) : story))
  }

  const insertTextNode = (afterItemId: string) => {
    updateSelectedStory(story => {
      const idx = story.items.findIndex(it => it.id === afterItemId)
      if (idx < 0) return story
      const next = [...story.items]
      next.splice(idx + 1, 0, { id: crypto.randomUUID(), type: 'text' as const, content: '' })
      return { ...story, items: next }
    })
  }

  const insertTextNodeAtStart = () => {
    updateSelectedStory(story => ({
      ...story,
      items: [{ id: crypto.randomUUID(), type: 'text' as const, content: '' }, ...story.items],
    }))
  }

  const removeStoryItem = (itemId: string) => {
    updateSelectedStory(story => ({ ...story, items: story.items.filter(item => item.id !== itemId) }))
  }

  const updateTextNodeContent = (itemId: string, content: string) => {
    updateSelectedStory(story => ({
      ...story,
      items: story.items.map(item => item.id === itemId ? { ...item, content } : item),
    }))
  }

  const updatePhotoCaption = (photoItemId: string, caption: string) => {
    updateSelectedStory(story => ({
      ...story,
      items: story.items.map(item => item.id === photoItemId ? { ...item, caption } : item),
    }))
  }

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

  const bannerPosInitialized = useRef(false)
  useEffect(() => {
    if (!user || bannerPosInitialized.current) return
    bannerPosInitialized.current = true
    const x = user.banner_pos_x ?? 50
    const y = user.banner_pos_y ?? 50
    bannerPosRef.current = { x, y }
    setBannerPosX(x)
    setBannerPosY(y)
  }, [user])

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
      case 'taken-desc': return arr.sort((a, b) => new Date(b.taken_at ?? b.created_at).getTime() - new Date(a.taken_at ?? a.created_at).getTime())
      case 'taken-asc': return arr.sort((a, b) => new Date(a.taken_at ?? a.created_at).getTime() - new Date(b.taken_at ?? b.created_at).getTime())
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

  const activeBanner = localBanner ?? user?.banner_url ?? null
  const bannerBg = activeBanner ? undefined : `linear-gradient(135deg, ${T.accentSoft} 0%, ${T.paperTwo} 55%, ${T.card} 100%)`

  const mob: Record<string, React.CSSProperties> = isMobile ? {
    page: { padding: '12px' },
    bannerWrap: { height: '320px', borderRadius: '10px' },
    profileHeader: { gap: '14px' },
    avatar: { width: '72px', height: '72px', fontSize: '24px' },
    displayName: { fontSize: '18px' },
    statsBar: { overflowX: 'auto' as const },
    statItem: { padding: '14px 16px', minWidth: '80px' },
    statItemLast: { padding: '14px 16px', minWidth: '80px' },
    statNumber: { fontSize: '20px' },
    fab: { bottom: '20px', right: '16px', width: '46px', height: '46px', fontSize: '22px' },
  } : {}

  const createStoryModal = showCreateStoryModal && (
    <div
      style={{
        position: 'fixed', inset: 0, zIndex: 100,
        background: 'rgba(0,0,0,0.4)',
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        padding: '0 24px',
      }}
      onClick={() => setShowCreateStoryModal(false)}
    >
      <div
        style={{
          background: T.paper, borderRadius: 14, padding: 24,
          width: '100%', maxWidth: 360,
          boxShadow: '0 8px 32px rgba(0,0,0,0.18)',
        }}
        onClick={e => e.stopPropagation()}
      >
        <div style={{ fontSize: 16, fontWeight: 600, color: T.ink, marginBottom: 16 }}>新增故事集</div>
        <input
          autoFocus
          value={newStoryName}
          onChange={e => setNewStoryName(e.target.value)}
          onKeyDown={e => { if (e.key === 'Enter') confirmCreateStory(); if (e.key === 'Escape') setShowCreateStoryModal(false) }}
          placeholder="故事集名稱"
          style={{
            width: '100%', boxSizing: 'border-box' as const,
            height: 40, padding: '0 12px',
            border: `1px solid ${T.accent}`, borderRadius: 8,
            fontSize: 15, color: T.ink, background: T.card,
            outline: 'none', marginBottom: 16,
          }}
        />
        <div style={{ display: 'flex', gap: 8, justifyContent: 'flex-end' }}>
          <button type="button"
            onClick={() => setShowCreateStoryModal(false)}
            style={{ padding: '8px 16px', borderRadius: 8, border: `1px solid ${T.line}`, background: 'none', color: T.inkSoft, fontSize: 14, cursor: 'pointer' }}
          >取消</button>
          <button type="button"
            onClick={confirmCreateStory}
            disabled={!newStoryName.trim()}
            style={{ padding: '8px 16px', borderRadius: 8, border: 'none', background: newStoryName.trim() ? T.accent : T.paperTwo, color: newStoryName.trim() ? '#fff' : T.inkMute, fontSize: 14, fontWeight: 600, cursor: newStoryName.trim() ? 'pointer' : 'not-allowed' }}
          >建立</button>
        </div>
      </div>
    </div>
  )

  const renderAlbums = (): React.ReactNode => {
    if (!selectedStory) {
      if (isMobile) {
        return (
          <div style={{ padding: '0 16px' }}>
            {stories.length === 0
              ? <div style={s.emptyNote}>尚無故事集。照片預設不會加入任何故事集。</div>
              : (
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
                  {stories.map((story) => {
                    const firstPhotoItem = story.items.find(i => i.type === 'photo')
                    const coverPhoto = firstPhotoItem && allPhotos.find(p => p.id === (firstPhotoItem as any).photoId)
                    const coverSrc = coverPhoto?.thumb_url || coverPhoto?.url
                    const photoCount = story.items.filter(i => i.type === 'photo').length
                    return (
                      <div
                        key={story.id}
                        onClick={() => setSelectedStoryId(story.id)}
                        style={{ borderRadius: 10, overflow: 'hidden', cursor: 'pointer', background: T.paperTwo, position: 'relative', aspectRatio: '1 / 1' }}
                      >
                        {coverSrc
                          ? <img src={coverSrc} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover', display: 'block' }} />
                          : <div style={{ width: '100%', height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 32, color: T.inkMute }}>▤</div>
                        }
                        <div style={{
                          position: 'absolute',
                          bottom: 0,
                          left: 0,
                          right: 0,
                          background: 'linear-gradient(transparent, rgba(0,0,0,0.6))',
                          padding: '24px 10px 10px',
                        }}>
                          <div style={{ fontSize: 13, fontWeight: 600, color: '#fff', lineHeight: 1.3 }}>{story.name}</div>
                          <div style={{ fontSize: 11, color: 'rgba(255,255,255,0.75)', marginTop: 2 }}>{photoCount} 張照片</div>
                        </div>
                      </div>
                    )
                  })}
                </div>
              )
            }
          </div>
        )
      }
      return (
        <div style={{ display: 'flex', flexDirection: 'column', alignItems: isMobile ? 'center' : undefined }}>
          <button type="button" style={s.loadMoreBtn} onClick={createStory}>＋ 新增故事集</button>
          {stories.length === 0
            ? <div style={s.emptyNote}>尚無故事集。照片預設不會加入任何故事集。</div>
            : <div style={{ ...s.listWrap, marginTop: 16 }}>
                {stories.map((story) => (
                  <div key={story.id} style={{ ...s.listRow, cursor: 'pointer', padding: '16px 0' }} onClick={() => setSelectedStoryId(story.id)}>
                    <div style={s.listIcon}>▤</div>
                    <div>
                      <div style={s.listName}>{story.name}</div>
                      <div style={s.listMeta}>{story.items.filter(i => i.type === 'photo').length} 張照片</div>
                    </div>
                  </div>
                ))}
              </div>
          }
        </div>
      )
    }

    // Group items by shooting date (photos define the date; text nodes attach to the current date bucket)
    type DayBucket = { dateKey: string; label: string; entries: Array<{ item: StoryItem; photo: Photo | undefined; itemIdx: number }> }
    type BucketEntry = DayBucket['entries'][number]
    type RowEntry =
      | { kind: 'photo'; entry: BucketEntry }
      | { kind: 'note'; entry: BucketEntry }
    const dayBuckets: DayBucket[] = []
    let curBucket: DayBucket | null = null
    let curDateKey = ''

    // Sort items before bucketing so same-day photos always group together
    const storyItemsSorted = storySortOrder === 'custom'
      ? selectedStory.items
      : [...selectedStory.items].sort((a, b) => {
          const allItems = selectedStory.items
          const getTime = (item: StoryItem): number => {
            if (item.type === 'photo') {
              const p = allPhotos.find(ph => ph.id === item.photoId)
              return new Date(p?.taken_at ?? p?.created_at ?? 0).getTime()
            }
            // Text notes inherit time from nearest preceding photo so they stay in place
            const selfIdx = allItems.indexOf(item)
            for (let i = selfIdx - 1; i >= 0; i--) {
              if (allItems[i].type === 'photo') {
                const p = allPhotos.find(ph => ph.id === allItems[i].photoId)
                return new Date(p?.taken_at ?? p?.created_at ?? 0).getTime() + 1
              }
            }
            for (let i = selfIdx + 1; i < allItems.length; i++) {
              if (allItems[i].type === 'photo') {
                const p = allPhotos.find(ph => ph.id === allItems[i].photoId)
                return new Date(p?.taken_at ?? p?.created_at ?? 0).getTime() - 1
              }
            }
            return storySortOrder === 'taken-asc' ? 0 : Infinity
          }
          const ta = getTime(a), tb = getTime(b)
          return storySortOrder === 'taken-asc' ? ta - tb : tb - ta
        })

    storyItemsSorted.forEach((item, itemIdx) => {
      if (item.type === 'photo') {
        const photo = allPhotos.find(p => p.id === item.photoId)
        if (!photo) return
        const d = new Date(photo.taken_at ?? photo.created_at)
        const dk = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`
        if (dk !== curDateKey) {
          curDateKey = dk
          curBucket = { dateKey: dk, label: new Date(dk + 'T12:00:00').toLocaleDateString('zh-TW', { year: 'numeric', month: 'long', day: 'numeric' }), entries: [] }
          dayBuckets.push(curBucket)
        }
        curBucket!.entries.push({ item, photo, itemIdx })
      } else {
        if (!curBucket) {
          curBucket = { dateKey: '_top', label: '', entries: [] }
          dayBuckets.push(curBucket)
        }
        curBucket.entries.push({ item, photo: undefined, itemIdx })
      }
    })

    const PHOTO_INDENT = 24

    const renderItemCard = (item: StoryItem, photo: Photo | undefined) => {
      if (item.type === 'photo' && photo) {
        const thumbSrc = photo.thumb_url || photo.url
        return (
          <div>
            <div style={{ display: isMobile ? 'block' : 'inline-block', borderRadius: 10, overflow: 'hidden', border: `1px solid ${T.line}`, cursor: 'pointer', background: T.card }} onClick={() => navigate(`/photos/${photo.id}`)}>
              {thumbSrc
                ? <img src={thumbSrc} alt="" style={{ display: 'block', width: '100%', height: 'auto', imageOrientation: 'from-image' }} />
                : <div style={{ width: 100, height: 100, ...s.photoPlaceholder }}>{photo.id.slice(-4).toUpperCase()}</div>
              }
              {(photo.caption || photo.exif || (photo.tags?.length ?? 0) > 0) && (
                <div style={{ padding: '10px 14px' }}>
                  {photo.caption && <div style={{ fontSize: 13, fontWeight: 500, color: T.ink, marginBottom: 4 }}>{photo.caption}</div>}
                  {photo.exif && (
                    <div style={{ fontSize: 11, color: T.inkMute }}>
                      {[photo.exif.make, photo.exif.focal_length != null && `${photo.exif.focal_length}mm`, photo.exif.aperture != null && `f/${photo.exif.aperture}`].filter(Boolean).join(' · ')}
                    </div>
                  )}
                  {(photo.tags?.length ?? 0) > 0 && (
                    <div style={{ marginTop: 6, display: 'flex', flexWrap: 'wrap' as const, gap: 4 }}>
                      {photo.tags.slice(0, 3).map(t => <span key={t} style={{ fontSize: 10, color: T.accent, background: T.accentSoft, borderRadius: 10, padding: '1px 6px' }}>#{t}</span>)}
                    </div>
                  )}
                </div>
              )}
            </div>
            {storyEditing && (
              <div style={{ display: 'flex', gap: 6, marginTop: 6 }}>
                <button type="button" style={{ fontSize: 11, padding: '3px 8px', borderRadius: 5, border: `1px solid ${T.line}`, background: 'none', color: T.inkMute, cursor: 'pointer' }} onClick={e => { e.stopPropagation(); navigate(`/upload?edit=${photo.id}`) }}>✎ 編輯照片</button>
                <button type="button" style={{ fontSize: 11, padding: '3px 8px', borderRadius: 5, border: `1px solid ${T.line}`, background: 'none', color: T.inkMute, cursor: 'pointer' }} onClick={() => removeStoryItem(item.id)}>× 移除</button>
              </div>
            )}
          </div>
        )
      }
      if (item.type === 'text') {
        return storyEditing ? (
          <div style={{ position: 'relative' }}>
            <textarea
              value={item.content ?? ''}
              placeholder="在這裡輸入文字…"
              onChange={e => updateTextNodeContent(item.id, e.target.value)}
              style={{ width: '100%', boxSizing: 'border-box' as const, minHeight: 72, border: `1px solid ${T.accent}`, borderRadius: 8, padding: '8px 28px 8px 10px', fontSize: 13, color: T.ink, background: T.paper, resize: 'vertical' as const, outline: 'none' }}
            />
            <button type="button" onClick={() => removeStoryItem(item.id)} style={{ position: 'absolute', top: 4, right: 6, background: 'none', border: 'none', cursor: 'pointer', fontSize: 15, color: T.inkMute, lineHeight: 1 }}>×</button>
          </div>
        ) : item.content ? (
          <div style={{ fontSize: 13, color: T.ink, lineHeight: 1.8, whiteSpace: 'pre-wrap' as const }}>
            {item.content}
          </div>
        ) : null
      }
      return null
    }

    const hasItems = dayBuckets.some(b => b.entries.length > 0)

    return (
      <div style={isMobile ? { padding: '20px 16px 0' } : undefined}>
        {/* ── Header ── */}
        <div style={{ marginBottom: 20 }}>
          {/* Row 1: actions */}
          <div style={{ display: 'flex', gap: 8, alignItems: 'center', marginBottom: 8 }}>
            <button type="button" style={{ ...s.loadMoreBtn, height: 32, padding: '0 14px' }} onClick={() => { setSelectedStoryId(null); setStoryEditing(false); setEditingStoryName(false) }}>← 故事集列表</button>
            <button type="button" style={{ ...s.loadMoreBtn, height: 32, padding: '0 14px' }} onClick={() => setStoryEditing(e => !e)}>
              {storyEditing ? '完成編輯' : '編輯故事'}
            </button>
            <select
              value={storySortOrder}
              onChange={e => setStorySortOrder(e.target.value as typeof storySortOrder)}
              style={{ ...s.sortSelect, marginLeft: 'auto' }}
              aria-label="故事排序"
            >
              <option value="custom">自訂順序</option>
              <option value="taken-asc">拍攝時間（舊→新）</option>
              <option value="taken-desc">拍攝時間（新→舊）</option>
            </select>
          </div>
          {/* Row 2: story name */}
          <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
            {editingStoryName ? (
              <>
                <input
                  value={storyNameDraft}
                  autoFocus
                  title="故事集名稱"
                  placeholder="故事集名稱"
                  onChange={e => setStoryNameDraft(e.target.value)}
                  onKeyDown={e => {
                    if (e.key === 'Enter') { updateSelectedStory(st => ({ ...st, name: storyNameDraft })); setEditingStoryName(false) }
                    if (e.key === 'Escape') setEditingStoryName(false)
                  }}
                  style={{ height: 32, fontSize: 15, fontWeight: 600, padding: '0 10px', border: `1px solid ${T.accent}`, borderRadius: 6, outline: 'none', color: T.ink, background: T.card, boxSizing: 'border-box' as const }}
                />
                <button type="button" style={{ ...s.loadMoreBtn, height: 32, padding: '0 14px', borderColor: T.accent, color: T.accent }} onClick={() => { updateSelectedStory(st => ({ ...st, name: storyNameDraft })); setEditingStoryName(false) }}>確定</button>
                <button type="button" style={{ ...s.loadMoreBtn, height: 32, padding: '0 14px' }} onClick={() => setEditingStoryName(false)}>取消</button>
              </>
            ) : (
              <>
                <strong style={{ fontSize: 16, color: T.ink, lineHeight: '32px' }}>{selectedStory.name}</strong>
                <button type="button" style={{ ...s.loadMoreBtn, height: 32, width: 32, padding: 0, display: 'flex', alignItems: 'center', justifyContent: 'center' }} title="重新命名故事集" onClick={() => { setStoryNameDraft(selectedStory.name); setEditingStoryName(true) }}>✎</button>
              </>
            )}
          </div>
        </div>

        {/* ── Edit mode: photo grid selector ── */}
        {storyEditing && (
          <div style={{ background: T.card, border: `1px solid ${T.line}`, borderRadius: 10, padding: 16, marginBottom: 24 }}>
            <div style={{ fontSize: 13, fontWeight: 600, marginBottom: 12, color: T.ink }}>選擇要加入的照片</div>
            {allPhotos.length === 0
              ? <div style={s.emptyNote}>尚無照片可選擇</div>
              : <div style={{ display: 'flex', flexWrap: 'nowrap' as const, overflowX: 'auto' as const, gap: 8, paddingBottom: 4 }}>
                  {allPhotos.map(photo => {
                    const included = selectedStory.items.some(item => item.type === 'photo' && item.photoId === photo.id)
                    const thumbSrc = photo.thumb_url || photo.url
                    return (
                      <div key={photo.id} style={{ position: 'relative', cursor: 'pointer', flexShrink: 0 }}
                        onClick={() => {
                          if (included) {
                            updateSelectedStory(st => ({ ...st, items: st.items.filter(item => !(item.type === 'photo' && item.photoId === photo.id)) }))
                          } else {
                            updateSelectedStory(st => ({ ...st, items: [...st.items, { id: `photo-${photo.id}`, type: 'photo' as const, photoId: photo.id }] }))
                          }
                        }}>
                        <div style={{ width: 72, height: 54, borderRadius: 6, overflow: 'hidden', border: `2px solid ${included ? T.accent : 'transparent'}`, opacity: included ? 1 : 0.65 }}>
                          {thumbSrc
                            ? <img src={thumbSrc} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                            : <div style={{ ...s.photoPlaceholder, fontSize: 10 }}>{photo.id.slice(-4)}</div>
                          }
                        </div>
                        {included && <div style={{ position: 'absolute', top: 2, right: 2, width: 16, height: 16, borderRadius: '50%', background: T.accent, color: '#fff', fontSize: 10, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>✓</div>}
                      </div>
                    )
                  })}
                </div>
            }
          </div>
        )}

        {/* ── Timeline (left-1/3 line, content right, staggered by type) ── */}
        {!hasItems
          ? <div style={s.emptyNote}>此故事集尚無照片，請進入編輯模式加入照片。</div>
          : <div style={{ position: 'relative', paddingTop: 8, paddingBottom: 48 }}>
              {/* Vertical line at left 1/3 (desktop only) */}
              {!isMobile && <div style={{ position: 'absolute', left: 'calc(33% - 1px)', top: 0, bottom: 0, width: 2, background: T.lineSoft, zIndex: 0 }} />}

              {/* Insert-at-start button (edit mode) */}
              {storyEditing && (
                <div style={{ marginBottom: 10 }}>
                  <button type="button" onClick={insertTextNodeAtStart} style={{ background: T.card, border: `1px dashed ${T.line}`, borderRadius: 20, padding: '3px 14px', fontSize: 11, color: T.inkMute, cursor: 'pointer' }}>+ 在開頭加入文字</button>
                </div>
              )}

              {dayBuckets.map((bucket, bucketIdx, arr) => {
                const rows: RowEntry[] = bucket.entries.map(entry =>
                  entry.item.type === 'photo'
                    ? { kind: 'photo' as const, entry }
                    : { kind: 'note' as const, entry }
                )

                return (
                  <div key={bucket.dateKey} style={{ marginBottom: bucketIdx < arr.length - 1 ? 36 : 0 }}>
                    {/* Date label row */}
                    {bucket.label && (
                      isMobile ? (
                        <div style={{ fontSize: 14, fontWeight: 600, color: T.ink, lineHeight: 1.4, marginBottom: 12, paddingBottom: 6, borderBottom: `2px solid ${T.accent}` }}>
                          {bucket.label}
                        </div>
                      ) : (
                        <div style={{ display: 'flex', marginBottom: 12, position: 'relative' }}>
                          <div style={{ width: '33%', paddingRight: '1.5rem', boxSizing: 'border-box' as const, textAlign: 'right' as const, flexShrink: 0, paddingTop: 2 }}>
                            <div style={{ fontSize: 15, fontWeight: 600, color: T.ink, lineHeight: 1.4 }}>{bucket.label}</div>
                          </div>
                          <div style={{ position: 'absolute', left: 'calc(33% - 5.5px)', top: 4, width: 11, height: 11, borderRadius: '50%', background: T.accent, border: `2px solid ${T.paper}`, zIndex: 2 }} />
                        </div>
                      )
                    )}

                    {/* Items */}
                    <div style={{ display: 'flex', flexDirection: 'column' as const, gap: 24 }}>
                      {rows.map((row) => {
                        if (row.kind === 'photo') {
                          return (
                            <React.Fragment key={row.entry.item.id}>
                              {isMobile ? (
                                <div style={{ display: 'flex', flexDirection: 'column' as const, gap: 4 }}>
                                  <div>{renderItemCard(row.entry.item, row.entry.photo)}</div>
                                  {storyEditing ? (
                                    <textarea
                                      value={row.entry.item.caption ?? ''}
                                      placeholder="在此輸入圖說…"
                                      onChange={e => updatePhotoCaption(row.entry.item.id, e.target.value)}
                                      style={{ width: '100%', boxSizing: 'border-box' as const, minHeight: 80, border: `1px solid ${T.accent}`, borderRadius: 8, padding: '10px 12px', fontSize: 14, color: T.ink, background: T.paper, resize: 'vertical' as const, outline: 'none' }}
                                    />
                                  ) : row.entry.item.caption ? (
                                    <div style={{ fontSize: 14, color: T.inkMute, lineHeight: 1.7, whiteSpace: 'pre-wrap' as const }}>
                                      {row.entry.item.caption}
                                    </div>
                                  ) : null}
                                </div>
                              ) : (
                                <div style={{ display: 'flex', position: 'relative' }}>
                                  <div style={{ width: '33%', flexShrink: 0, paddingRight: '1.5rem', boxSizing: 'border-box' as const, display: 'flex', alignItems: 'center', justifyContent: 'flex-end' }}>
                                    {storyEditing ? (
                                      <textarea
                                        value={row.entry.item.caption ?? ''}
                                        placeholder="在此輸入圖說…"
                                        onChange={e => updatePhotoCaption(row.entry.item.id, e.target.value)}
                                        style={{ width: '100%', boxSizing: 'border-box' as const, minHeight: 64, border: `1px solid ${T.line}`, borderRadius: 8, padding: '6px 8px', fontSize: 12, color: T.ink, background: T.paper, resize: 'vertical' as const, outline: 'none', textAlign: 'right' as const }}
                                      />
                                    ) : row.entry.item.caption ? (
                                      <div style={{ fontSize: 12, color: T.inkMute, lineHeight: 1.6, whiteSpace: 'pre-wrap' as const, textAlign: 'right' as const }}>
                                        {row.entry.item.caption}
                                      </div>
                                    ) : null}
                                  </div>
                                  <div style={{ position: 'absolute', left: 'calc(33% + 1px)', top: 22, width: PHOTO_INDENT - 2, height: 2, background: T.lineSoft, zIndex: 1 }} />
                                  <div style={{ flex: 1, paddingLeft: PHOTO_INDENT }}>
                                    {renderItemCard(row.entry.item, row.entry.photo)}
                                  </div>
                                </div>
                              )}
                              {storyEditing && (
                                <div style={{ marginTop: 4 }}>
                                  <button type="button" onClick={() => insertTextNode(row.entry.item.id)} style={{ background: T.card, border: `1px dashed ${T.line}`, borderRadius: 20, padding: '2px 12px', fontSize: 10, color: T.inkMute, cursor: 'pointer' }}>+ 插入文字</button>
                                </div>
                              )}
                            </React.Fragment>
                          )
                        }
                        return (
                          <React.Fragment key={row.entry.item.id}>
                            {(storyEditing || !!row.entry.item.content) && (
                              <div style={{ position: 'relative', zIndex: 2, background: T.paper, borderTop: `1px solid ${T.lineSoft}`, borderBottom: `1px solid ${T.lineSoft}`, padding: '10px 16px' }}>
                                {!isMobile && (
                                  <div style={{ position: 'absolute', left: 'calc(33% - 5px)', top: '50%', transform: 'translateY(-50%)', width: 10, height: 10, borderRadius: '50%', background: T.lineSoft, border: `2px solid ${T.paper}`, zIndex: 3 }} />
                                )}
                                {renderItemCard(row.entry.item, undefined)}
                              </div>
                            )}
                            {storyEditing && (
                              <div style={{ marginTop: 4 }}>
                                <button type="button" onClick={() => insertTextNode(row.entry.item.id)} style={{ background: T.card, border: `1px dashed ${T.line}`, borderRadius: 20, padding: '2px 12px', fontSize: 10, color: T.inkMute, cursor: 'pointer' }}>+ 插入文字</button>
                              </div>
                            )}
                          </React.Fragment>
                        )
                      })}
                    </div>
                  </div>
                )
              })}
            </div>
        }
      </div>
    )
  }

  // ─── Mobile branch ───────────────────────────────────────────────────────────
  if (isMobile) return (
    <div style={m.page}>
      {createStoryModal}

      {/* Hidden file inputs (shared with desktop handlers) */}
      <input ref={bannerInputRef} type="file" accept="image/*" title="上傳橫幅" style={s.hiddenInput} onChange={handleBannerChange} />
      <input ref={avatarInputRef} type="file" accept="image/*" title="上傳頭像" style={s.hiddenInput} onChange={handleAvatarChange} />

      {/* ── Banner ── */}
      <div
        ref={bannerWrapRef}
        style={{ ...m.banner, background: bannerBg, backgroundImage: bannerBg }}
        onPointerDown={handleBannerPointerDown}
        onPointerMove={handleBannerPointerMove}
        onPointerUp={handleBannerPointerUp}
        title={localBanner ? '拖曳調整位置 · 點擊更換圖片' : '點擊更換橫幅'}
      >
        {activeBanner && (
          <img
            src={activeBanner}
            alt="banner"
            style={{ ...m.bannerImg, objectPosition: `${bannerPosX}% ${bannerPosY}%` }}
          />
        )}
        <div style={s.bannerFadeBottom} />
      </div>

      {/* ── Avatar row card ── */}
      <div style={m.avRowCard}>
        <div style={m.avatarWrap}>
          <div
            style={m.avatar}
            onClick={() => avatarInputRef.current?.click()}
            title="點擊更換頭像"
          >
            {localAvatar || user?.avatar_url
              ? <SafeImage src={localAvatar ?? user!.avatar_url!} alt="avatar" style={s.avatarImg} />
              : (
                <svg viewBox="0 0 24 24" width="26" height="26" fill="none" stroke={T.inkMute} strokeWidth="1.4" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2" />
                  <circle cx="12" cy="7" r="4" />
                </svg>
              )}
          </div>
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

        {/* Info row: name/handle/bio left, edit button right */}
        <div style={m.infoRow}>
          <div>
            <div style={m.nameRow}>
              <span style={m.name}>{user?.username ?? '—'}</span>
              <span style={m.proBadge}>PRO</span>
            </div>
            <div style={m.handle}>@{user?.username ?? '—'} · 📍 台北</div>
            <div style={m.bio}>{user?.bio || '用影像記錄光線、地點與拍攝路線。'}</div>
          </div>
          <button
            type="button"
            onClick={handleSignOut}
            style={{ ...m.editBtn, color: T.inkMute }}
          >
            登出
          </button>
        </div>
      </div>

      {/* ── Stats bar ── */}
      <div style={m.statsBar}>
        {[
          { n: allPhotos.length, label: '作品' },
          { n: locations.length, label: '路線' },
          { n: gear.length, label: '器材', last: true },
        ].map(({ n, label, last }) => (
          <div key={label} style={last ? m.statItemLast : m.statItem}>
            <div style={m.statNum}>{n.toLocaleString()}</div>
            <div style={m.statLabel}>{label}</div>
          </div>
        ))}
      </div>

      {/* ── Tab bar ── */}
      <div style={m.tabBar}>
        {([
          { key: 'photos', label: '照片' },
          { key: 'albums', label: '故事集' },
          { key: 'locations', label: '景點' },
          { key: 'gear', label: '器材' },
        ] as { key: TabKey; label: string }[]).map(({ key, label }) => (
          <div
            key={key}
            style={{ ...m.tab, ...(activeTab === key ? m.tabActive : {}) }}
            onClick={() => setActiveTab(key)}
          >
            {label}
          </div>
        ))}
      </div>

      {/* ── Photos tab ── */}
      {activeTab === 'photos' && (
        <>
          {visiblePhotos.length === 0 ? (
            <div style={m.emptyCellWrap}>
              <div style={m.emptyCell} onClick={() => navigate('/upload')}>
                <span style={s.emptyCellIcon}>⊕</span>
                <span style={s.emptyCellLabel}>上傳第一張照片</span>
              </div>
            </div>
          ) : (
            <div style={m.photoGrid}>
              {/* Featured 2×2 carousel cell */}
              {allPhotos.length > 0 && (() => {
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
                  <div style={m.photoCellFeatured} onClick={() => navigate(`/photos/${fp.id}`)}>
                    {thumbSrc
                      ? <SafeImage src={thumbSrc} alt={fp.caption ?? ''} style={s.photoImg} />
                      : <div style={s.photoPlaceholder}>{fp.id.slice(-4).toUpperCase()}</div>
                    }
                    {loc && <div style={s.overlayTop}>{loc.name} · {relativeTime(fp.created_at)}</div>}
                    <div style={s.overlayBottom}>
                      <span style={s.exifBadge}>{exifLabel || '—'}</span>
                      <span style={s.likeBadge}>♡ 0</span>
                    </div>
                  </div>
                )
              })()}

              {/* Regular grid cells */}
              {visiblePhotos.map((photo) => {
                const thumbSrc = photo.thumb_url || photo.url
                const isPending = pendingPhoto?.id === photo.id
                return (
                  <div
                    key={photo.id}
                    style={m.photoCell}
                    onClick={() => navigate(`/photos/${photo.id}`)}
                  >
                    {thumbSrc
                      ? <SafeImage src={thumbSrc} alt={photo.caption ?? ''} style={s.photoImg} />
                      : <div style={s.photoPlaceholder}>{photo.id.slice(-4).toUpperCase()}</div>
                    }
                    <button
                      type="button"
                      style={photo.is_public
                        ? (isPending ? s.lockPublicPend : s.lockPublic)
                        : (isPending ? s.lockPrivatePend : s.lockPrivate)}
                      title={photo.is_public ? '點擊設為私人' : '點擊設為公開'}
                      onClick={(e) => { e.stopPropagation(); if (!isPending) toggleVisibility(photo) }}
                    >
                      {photo.is_public ? '🔓' : '🔒'}
                    </button>
                  </div>
                )
              })}
            </div>
          )}

          {remaining > 0 && (
            <div style={s.loadMoreWrap}>
              <button type="button" style={s.loadMoreBtn} onClick={() => setPhotoLimit(l => l + PAGE_SIZE)}>
                載入更多 · {remaining} 張
              </button>
            </div>
          )}
        </>
      )}

      {/* ── Locations tab ── */}
      {activeTab === 'locations' && (
        <div style={m.listWrap}>
          {locations.length === 0
            ? <div style={s.emptyNote}>尚無景點</div>
            : locations.map((loc) => (
              <div key={loc.id} style={m.listRow}>
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
        <div style={m.listWrap}>
          {gear.length === 0
            ? <div style={s.emptyNote}>尚無器材</div>
            : gear.map((g) => (
              <div key={g.id} style={m.listRow}>
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

      {activeTab === 'albums' && <div style={{ paddingTop: 16 }}>{renderAlbums()}</div>}

      {/* FAB */}
      {activeTab === 'albums' && !selectedStory && (
        <button
          type="button"
          onClick={createStory}
          style={{
            position: 'fixed',
            bottom: 80,
            right: 20,
            width: 44,
            height: 44,
            borderRadius: '50%',
            background: 'rgba(255,255,255,0.85)',
            border: '1px solid rgba(0,0,0,0.12)',
            color: '#8a9bb0',
            fontSize: 24,
            fontWeight: 300,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            cursor: 'pointer',
            boxShadow: '0 2px 10px rgba(0,0,0,0.10)',
            backdropFilter: 'blur(4px)',
            zIndex: 10,
            lineHeight: 1,
          }}
        >+</button>
      )}
      {activeTab === 'photos' && (
        <button
          type="button"
          onClick={() => navigate('/upload')}
          style={{
            position: 'fixed',
            bottom: 80,
            right: 20,
            width: 44,
            height: 44,
            borderRadius: '50%',
            background: 'rgba(255,255,255,0.85)',
            border: '1px solid rgba(0,0,0,0.12)',
            color: '#8a9bb0',
            fontSize: 24,
            fontWeight: 300,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            cursor: 'pointer',
            boxShadow: '0 2px 10px rgba(0,0,0,0.10)',
            backdropFilter: 'blur(4px)',
            zIndex: 10,
            lineHeight: 1,
          }}
        >+</button>
      )}
    </div>
  )

  return (
    <>
      <div style={{ ...s.page, ...mob.page }}>
        {createStoryModal}

        {/* ── Banner ── */}
        <div
          ref={bannerWrapRef}
          style={{ ...s.bannerWrap, ...mob.bannerWrap, background: bannerBg, backgroundImage: bannerBg }}
          onMouseEnter={() => setBannerHovered(true)}
          onMouseLeave={() => setBannerHovered(false)}
          onPointerDown={handleBannerPointerDown}
          onPointerMove={handleBannerPointerMove}
          onPointerUp={handleBannerPointerUp}
          title={activeBanner ? '拖曳調整位置 · 點擊更換圖片' : '點擊更換橫幅'}
        >
          {activeBanner && (
            <img
              src={activeBanner}
              alt="banner"
              style={{ ...s.bannerImg, objectPosition: `${bannerPosX}% ${bannerPosY}%` }}
            />
          )}
          {bannerHovered && (
            <div style={s.bannerOverlay}>
              <span>📷</span>
              <span style={{ fontSize: '13px' }}>{activeBanner ? '拖曳調整 · 點擊更換' : '更換橫幅'}</span>
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
        <div style={{ ...s.profileHeader, ...mob.profileHeader }}>
          <div style={s.avatarWrap}>
            <div
              style={{ ...s.avatar, ...mob.avatar }}
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
              <span style={{ ...s.displayName, ...mob.displayName }}>{user?.username ?? '—'}</span>
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
        <div style={{ ...s.statsBar, ...mob.statsBar }}>
          {[
            { n: allPhotos.length, label: '作品' },
            { n: locations.length, label: '路線' },
            { n: gear.length, label: '器材', last: true },
          ].map(({ n, label, last }) => (
            <div key={label} style={last ? { ...s.statItemLast, ...mob.statItemLast } : { ...s.statItem, ...mob.statItem }}>
              <div style={{ ...s.statNumber, ...mob.statNumber }}>{n.toLocaleString()}</div>
              <div style={s.statLabel}>{label}</div>
            </div>
          ))}
        </div>

        {/* ── Tabs ── */}
        <div style={s.tabBar}>
          {([
            { key: 'photos', label: '照片', count: allPhotos.length },
            { key: 'albums', label: '故事集', count: stories.length },
            { key: 'locations', label: '景點', count: locations.length },
            { key: 'gear', label: '器材', count: gear.length },
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
                  <option value="time-desc">上傳（新→舊）</option>
                  <option value="time-asc">上傳（舊→新）</option>
                  <option value="taken-desc">拍攝（新→舊）</option>
                  <option value="taken-asc">拍攝（舊→新）</option>
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
                        style={{ background: 'none', border: `1px solid ${T.line}`, borderRadius: '6px', color: T.inkMute, fontSize: '12px', padding: '4px 10px', cursor: 'pointer', flexShrink: 0, marginRight: '6px' }}
                        title="編輯照片"
                        onClick={(e) => { e.stopPropagation(); navigate(`/upload?edit=${photo.id}`) }}
                      >
                        ✎
                      </button>
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
                      {isHovered && (
                        <button
                          type="button"
                          style={{ position: 'absolute', bottom: '8px', right: '8px', background: 'rgba(0,0,0,0.55)', backdropFilter: 'blur(6px)', border: 'none', borderRadius: '6px', color: '#fff', fontSize: '12px', padding: '4px 10px', cursor: 'pointer', zIndex: 3 }}
                          title="編輯照片"
                          onClick={(e) => { e.stopPropagation(); navigate(`/upload?edit=${p.id}`) }}
                        >
                          ✎ 編輯
                        </button>
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

        {/* ── Stories tab ── */}
        {activeTab === 'albums' && renderAlbums()}

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
      <button type="button" style={{ ...s.fab, ...mob.fab }} title="上傳照片" onClick={() => navigate('/upload')}>⊕</button>
    </>
  )
}

export default Profile
