import React, { useEffect, useState } from 'react'
import { NavLink, useNavigate, Outlet } from 'react-router-dom'
import api from '../lib/api'
import { clearTokens } from '../lib/auth'

interface User {
  id: string
  username: string
  email: string
  is_admin: boolean
}

const styles: Record<string, React.CSSProperties> = {
  shell: {
    display: 'flex',
    minHeight: '100vh',
    background: '#0a0a0f',
    fontFamily: "'Inter', system-ui, sans-serif",
  },
  sidebar: {
    width: '220px',
    flexShrink: 0,
    background: '#13131a',
    borderRight: '1px solid #2a2a38',
    display: 'flex',
    flexDirection: 'column',
    padding: '0',
  },
  logoArea: {
    padding: '24px 20px 20px',
    borderBottom: '1px solid #2a2a38',
  },
  logoText: {
    fontSize: '22px',
    fontWeight: 700,
    color: '#e8e8f0',
    letterSpacing: '-0.5px',
  },
  logoAccent: {
    color: '#6366f1',
  },
  logoSub: {
    color: '#555',
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
    color: '#444',
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
    color: '#888',
    textDecoration: 'none',
    fontSize: '14px',
    fontWeight: 500,
    transition: 'background 0.15s, color 0.15s',
  },
  navLinkActive: {
    background: '#1e1e2e',
    color: '#e8e8f0',
  },
  footer: {
    borderTop: '1px solid #2a2a38',
    padding: '16px',
  },
  userInfo: {
    marginBottom: '10px',
  },
  userName: {
    fontSize: '13px',
    fontWeight: 600,
    color: '#e8e8f0',
  },
  userEmail: {
    fontSize: '11px',
    color: '#555',
    marginTop: '2px',
  },
  logoutBtn: {
    width: '100%',
    background: 'transparent',
    border: '1px solid #2a2a38',
    borderRadius: '8px',
    padding: '8px 12px',
    color: '#888',
    fontSize: '13px',
    cursor: 'pointer',
    textAlign: 'left' as const,
    transition: 'background 0.15s, color 0.15s',
  },
  content: {
    flex: 1,
    overflow: 'auto',
  },
}

const NAV_ITEMS = [
  { to: '/', label: 'Dashboard', icon: '◈', end: true },
  { to: '/map', label: 'Map', icon: '◎', end: false },
  { to: '/gear', label: 'Gear Vault', icon: '⬡', end: false },
]

const ADMIN_NAV_ITEM = { to: '/admin', label: 'Admin', icon: '⚙', end: false }

const Layout: React.FC = () => {
  const navigate = useNavigate()
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
