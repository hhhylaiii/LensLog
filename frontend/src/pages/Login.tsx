import React, { useState } from 'react'
import { useNavigate, Link } from 'react-router-dom'
import { useForm } from 'react-hook-form'
import api from '../lib/api'
import { setTokens } from '../lib/auth'
import { useBreakpoint } from '../hooks/useBreakpoint'
import T from '../styles/tokens'

interface LoginForm {
  email: string
  password: string
}

const styles: Record<string, React.CSSProperties> = {
  page: {
    minHeight: '100vh',
    background: T.paper,
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    fontFamily: "'Inter', 'Noto Sans TC', system-ui, sans-serif",
    boxSizing: 'border-box',
  },
  shell: {
    width: '100%',
    maxWidth: '900px',
    background: T.card,
    border: `1px solid ${T.line}`,
    borderRadius: '8px',
    boxShadow: '0 18px 45px rgba(26, 41, 66, 0.10)',
    overflow: 'hidden',
    display: 'grid',
    gridTemplateColumns: 'minmax(0, 0.9fr) minmax(380px, 1fr)',
    minHeight: '540px',
  },
  brandPanel: {
    background: T.sideBgTwo,
    color: T.sideText,
    padding: '40px',
    display: 'flex',
    flexDirection: 'column',
    justifyContent: 'space-between',
  },
  brandText: {
    fontSize: '24px',
    fontWeight: 700,
    letterSpacing: '-0.5px',
  },
  brandAccent: {
    color: T.accentNeon,
  },
  brandSub: {
    color: T.sideMute,
    fontSize: '12px',
    marginTop: '4px',
  },
  brandHeading: {
    color: T.sideText,
    fontSize: '28px',
    fontWeight: 650,
    lineHeight: 1.18,
    margin: 0,
    maxWidth: '300px',
  },
  brandMeta: {
    borderTop: `1px solid ${T.sideLine}`,
    paddingTop: '18px',
    color: T.sideMute,
    fontSize: '13px',
    lineHeight: 1.6,
  },
  formPanel: {
    padding: '48px',
    display: 'flex',
    flexDirection: 'column',
    justifyContent: 'center',
  },
  logo: {
    textAlign: 'center',
    marginBottom: '24px',
  },
  logoText: {
    fontSize: '24px',
    fontWeight: 700,
    color: T.ink,
    letterSpacing: '-0.5px',
  },
  logoAccent: {
    color: T.accent,
  },
  logoSub: {
    color: T.inkMute,
    fontSize: '12px',
    marginTop: '4px',
  },
  title: {
    fontSize: '26px',
    fontWeight: 650,
    color: T.ink,
    margin: 0,
    lineHeight: 1.2,
  },
  subtitle: {
    color: T.inkMute,
    fontSize: '14px',
    lineHeight: 1.55,
    margin: '8px 0 26px',
  },
  field: {
    marginBottom: '16px',
  },
  label: {
    display: 'block',
    fontSize: '13px',
    fontWeight: 500,
    color: T.inkSoft,
    marginBottom: '6px',
  },
  input: {
    width: '100%',
    background: T.card,
    border: `1px solid ${T.line}`,
    borderRadius: '8px',
    padding: '10px 14px',
    color: T.ink,
    fontSize: '14px',
    outline: 'none',
    boxSizing: 'border-box',
    transition: 'border-color 0.15s, box-shadow 0.15s',
  },
  button: {
    width: '100%',
    background: T.accent,
    color: '#fff',
    border: 'none',
    borderRadius: '8px',
    padding: '12px',
    fontSize: '14px',
    fontWeight: 600,
    cursor: 'pointer',
    marginTop: '8px',
    transition: 'background 0.2s',
  },
  error: {
    color: '#dc2626',
    fontSize: '12px',
    marginTop: '4px',
  },
  apiError: {
    background: '#fff0f0',
    border: '1px solid #fca5a5',
    borderRadius: '8px',
    padding: '10px 14px',
    color: '#dc2626',
    fontSize: '13px',
    marginBottom: '16px',
  },
  footer: {
    textAlign: 'center',
    marginTop: '22px',
    color: T.inkMute,
    fontSize: '13px',
  },
  link: {
    color: T.accent,
    textDecoration: 'none',
    fontWeight: 600,
  },
}

const Login: React.FC = () => {
  const navigate = useNavigate()
  const { isMobile } = useBreakpoint()
  const [apiError, setApiError] = useState('')
  const [loading, setLoading] = useState(false)
  const { register, handleSubmit, formState: { errors } } = useForm<LoginForm>()

  const onSubmit = async (data: LoginForm) => {
    setApiError('')
    setLoading(true)
    try {
      const res = await api.post('/auth/login', data)
      setTokens(res.data.access_token, res.data.refresh_token)
      navigate('/')
    } catch (err: any) {
      setApiError(err.response?.data?.detail || 'Login failed')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div style={{ ...styles.page, padding: isMobile ? '16px' : '32px' }}>
      <div
        style={isMobile
          ? { ...styles.shell, display: 'block', maxWidth: '420px', minHeight: 'auto' }
          : styles.shell}
      >
        {!isMobile && (
          <aside style={styles.brandPanel}>
            <div>
              <div style={styles.brandText}>
                Lens<span style={styles.brandAccent}>Log</span>
              </div>
              <div style={styles.brandSub}>Photography Platform</div>
            </div>
            <h1 style={styles.brandHeading}>安靜整理你的攝影作品與日常紀錄。</h1>
            <div style={styles.brandMeta}>為照片、地點、器材，以及每次拍攝之間的脈絡而設計。</div>
          </aside>
        )}

        <main style={{ ...styles.formPanel, padding: isMobile ? '30px 22px' : styles.formPanel.padding }}>
          {isMobile && (
            <div style={styles.logo}>
              <div style={styles.logoText}>
                Lens<span style={styles.logoAccent}>Log</span>
              </div>
              <div style={styles.logoSub}>Photography Platform</div>
            </div>
          )}

          <div>
            <div style={styles.title}>歡迎回來</div>
            <p style={styles.subtitle}>登入後繼續管理你的 LensLog 工作區。</p>
          </div>

          {apiError && <div style={styles.apiError}>{apiError}</div>}

          <form onSubmit={handleSubmit(onSubmit)}>
            <div style={styles.field}>
              <label style={styles.label}>Email</label>
              <input
                style={styles.input}
                type="email"
                placeholder="you@example.com"
                {...register('email', { required: 'Email is required' })}
              />
              {errors.email && <div style={styles.error}>{errors.email.message}</div>}
            </div>

            <div style={styles.field}>
              <label style={styles.label}>Password</label>
              <input
                style={styles.input}
                type="password"
                placeholder="••••••••"
                {...register('password', { required: 'Password is required' })}
              />
              {errors.password && <div style={styles.error}>{errors.password.message}</div>}
            </div>

            <button
              style={{
                ...styles.button,
                background: loading ? T.paperTwo : T.accent,
                color: loading ? T.inkMute : '#fff',
                cursor: loading ? 'not-allowed' : 'pointer',
              }}
              type="submit"
              disabled={loading}
            >
              {loading ? 'Signing in…' : 'Sign in'}
            </button>
          </form>

          <div style={styles.footer}>
            Don't have an account?{' '}
            <Link to="/register" style={styles.link}>Create one</Link>
          </div>
        </main>
      </div>
    </div>
  )
}

export default Login
