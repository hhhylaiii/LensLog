import React, { useEffect, useState } from 'react'
import { NavLink, useNavigate, Outlet } from 'react-router-dom'
import api from '../lib/api'
import { clearTokens } from '../lib/auth'
import { useBreakpoint } from '../hooks/useBreakpoint'
import T from '../styles/tokens'

interface User {
  id: string
  username: string
  email: string
  is_admin: boolean
}

const styles: Record<string, React.CSSProperties> = {
  shell: {
    display: 'flex',
    height: '100vh',
    overflow: 'hidden',
    background: '#0a0a0f',
    fontFamily: "'Inter', system-ui, sans-serif",
  },
  sidebar: {
    width: '220px',
    height: '100vh',
    flexShrink: 0,
    background: T.sideBgTwo,
    borderRight: `1px solid ${T.sideLine}`,
    display: 'flex',
    flexDirection: 'column',
    padding: '0',
    overflowY: 'auto' as const,
  },
  logoArea: {
    padding: '24px 20px 20px',
    borderBottom: `1px solid ${T.sideLine}`,
  },
  logoText: {
    fontSize: '22px',
    fontWeight: 700,
    color: T.sideText,
    letterSpacing: '-0.5px',
  },
  logoAccent: {
    color: T.accentNeon,
  },
  logoSub: {
    color: T.sideMute,
    fontSize: '11px',
    marginTop: '2px',
  },
  nav: {
    flex: 1,
    padding: '16px 12px',
    display: 'flex',
    flexDirection: 'column',
    gap: '4px',
  },
  navLabel: {
    fontSize: '10px',
    fontWeight: 600,
    color: T.sideMute,
    letterSpacing: '0.08em',
    textTransform: 'uppercase' as const,
    padding: '8px 8px 4px',
  },
  navLink: {
    display: 'flex',
    alignItems: 'center',
    gap: '10px',
    padding: '9px 12px',
    borderRadius: '8px',
    color: T.sideText,
    textDecoration: 'none',
    fontSize: '14px',
    fontWeight: 500,
    transition: 'background 0.15s, color 0.15s',
  },
  navLinkActive: {
    background: T.sideBg,
    color: '#e8e8f0',
  },
  footer: {
    borderTop: `1px solid ${T.sideLine}`,
    padding: '16px',
  },
  userInfo: {
    marginBottom: '10px',
  },
  userName: {
    fontSize: '13px',
    fontWeight: 600,
    color: T.sideText,
  },
  userEmail: {
    fontSize: '11px',
    color: T.sideMute,
    marginTop: '2px',
  },
  logoutBtn: {
    width: '100%',
    background: 'transparent',
    border: `1px solid ${T.sideLine}`,
    borderRadius: '8px',
    padding: '8px 12px',
    color: T.sideMute,
    fontSize: '13px',
    cursor: 'pointer',
    textAlign: 'left' as const,
    transition: 'background 0.15s, color 0.15s',
  },
  content: {
    flex: 1,
    height: '100vh',
    overflow: 'auto',
  },
}

const NAV_ITEMS = [
  { to: '/upload', label: 'Upload', icon: '⊕', end: false },
  { to: '/map', label: 'Map', icon: '◎', end: false },
  { to: '/gear', label: 'Gear Vault', icon: '⬡', end: false },
  { to: '/profile', label: 'Profile', icon: '◉', end: false },
]

const ADMIN_NAV_ITEM = { to: '/admin', label: 'Admin', icon: '⚙', end: false }

// Bottom tab bar items (mobile)
const TAB_ITEMS = [
  {
    to: '/map', label: '地圖', end: false,
    icon: (
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" width={22} height={22}>
        <path d="M15 10.5a3 3 0 11-6 0 3 3 0 016 0z"/>
        <path d="M19.5 10.5c0 7.142-7.5 11.25-7.5 11.25S4.5 17.642 4.5 10.5a7.5 7.5 0 1115 0z"/>
      </svg>
    ),
  },
  {
    to: '/upload', label: '上傳', end: false,
    icon: (
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" width={22} height={22}>
        <path d="M3 16.5v2.25A2.25 2.25 0 005.25 21h13.5A2.25 2.25 0 0021 18.75V16.5m-13.5-9L12 3m0 0l4.5 4.5M12 3v13.5"/>
      </svg>
    ),
  },
  {
    to: '/gear', label: '器材', end: false,
    icon: (
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" width={22} height={22}>
        <path d="M21.75 6.75a4.5 4.5 0 01-4.884 4.484c-1.076-.091-2.264.071-2.95.904l-7.152 8.684a2.548 2.548 0 11-3.586-3.586l8.684-7.152c.833-.686.995-1.874.904-2.95a4.5 4.5 0 016.336-4.486l-3.276 3.276a3.004 3.004 0 002.25 2.25l3.276-3.276c.256.565.398 1.192.398 1.852z"/>
      </svg>
    ),
  },
  {
    to: '/profile', label: '我', end: false,
    icon: (
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" width={22} height={22}>
        <path d="M17.982 18.725A7.488 7.488 0 0012 15.75a7.488 7.488 0 00-5.982 2.975m11.963 0a9 9 0 10-11.963 0m11.963 0A8.966 8.966 0 0112 21a8.966 8.966 0 01-5.982-2.275M15 9.75a3 3 0 11-6 0 3 3 0 016 0z"/>
      </svg>
    ),
  },
]

const Layout: React.FC = () => {
  const navigate = useNavigate()
  const { isMobile } = useBreakpoint()
  const [user, setUser] = useState<User | null>(null)

  useEffect(() => {
    api.get('/auth/me').then((res) => setUser(res.data)).catch(() => {})
  }, [])

  const handleLogout = async () => {
    try {
      await api.post('/auth/logout')
    } catch {
      // ignore
    }
    clearTokens()
    navigate('/login')
  }

  // ── Mobile layout ──────────────────────────────────────────────
  if (isMobile) {
    return (
      <div style={{ display: 'flex', flexDirection: 'column', minHeight: '100vh', background: T.paper, fontFamily: "'Inter', system-ui, sans-serif" }}>
        {/* Content */}
        <main style={{ flex: 1, paddingBottom: 62, overflow: 'auto' }}>
          <Outlet />
        </main>

        {/* Bottom tab bar */}
        <nav style={{
          position: 'fixed', bottom: 0, left: 0, right: 0,
          height: 62, background: T.card,
          borderTop: `1px solid ${T.line}`,
          display: 'flex', alignItems: 'flex-start',
          padding: '8px 0 0',
          zIndex: 100,
        }}>
          {TAB_ITEMS.map(({ to, label, end, icon }) => (
            <NavLink
              key={to}
              to={to}
              end={end}
              style={({ isActive }) => ({
                flex: 1,
                display: 'flex',
                flexDirection: 'column' as const,
                alignItems: 'center',
                gap: 2,
                color: isActive ? T.accent : T.inkMute,
                textDecoration: 'none',
                fontSize: 10,
                fontWeight: isActive ? 600 : 400,
              })}
            >
              {icon}
              {label}
            </NavLink>
          ))}
        </nav>
      </div>
    )
  }

  // ── Desktop layout ─────────────────────────────────────────────
  return (
    <div style={styles.shell}>
      <aside style={styles.sidebar}>
        <div style={styles.logoArea}>
          <div style={styles.logoText}>
            Lens<span style={styles.logoAccent}>Log</span>
          </div>
          <div style={styles.logoSub}>Photography Platform</div>
        </div>

        <nav style={styles.nav}>
          <div style={styles.navLabel}>Navigation</div>
          {NAV_ITEMS.map(({ to, label, icon, end }) => (
            <NavLink
              key={to}
              to={to}
              end={end}
              style={({ isActive }) => ({
                ...styles.navLink,
                ...(isActive ? styles.navLinkActive : {}),
              })}
            >
              <span>{icon}</span>
              {label}
            </NavLink>
          ))}
          {user?.is_admin && (
            <NavLink
              to={ADMIN_NAV_ITEM.to}
              end={ADMIN_NAV_ITEM.end}
              style={({ isActive }) => ({
                ...styles.navLink,
                ...(isActive ? styles.navLinkActive : {}),
              })}
            >
              <span>{ADMIN_NAV_ITEM.icon}</span>
              {ADMIN_NAV_ITEM.label}
            </NavLink>
          )}
        </nav>

        <div style={styles.footer}>
          {user && (
            <div style={styles.userInfo}>
              <div style={styles.userName}>{user.username}</div>
              <div style={styles.userEmail}>{user.email}</div>
            </div>
          )}
          <button style={styles.logoutBtn} onClick={handleLogout}>
            ⎋ Sign out
          </button>
        </div>
      </aside>

      <main style={styles.content}>
        <Outlet />
      </main>
    </div>
  )
}

export default Layout
