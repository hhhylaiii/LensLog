import React, { useState } from 'react'
import { useNavigate, Link } from 'react-router-dom'
import { useForm } from 'react-hook-form'
import api from '../lib/api'
import { useBreakpoint } from '../hooks/useBreakpoint'
import T from '../styles/tokens'

interface RegisterForm {
  username: string
  email: string
  password: string
  confirmPassword: string
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
    minHeight: '600px',
  },
  brandPanel: {
    background: T.sideBgTwo,
    color: T.sideText,
    padding: '40px',
    display: 'flex',
    flexDirection: 'column',
    justifyContent: 'space-between',
    position: 'relative',
    overflow: 'hidden',
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
    fontSize: '30px',
    fontWeight: 650,
    lineHeight: 1.35,
    margin: 0,
    maxWidth: '320px',
    letterSpacing: '0',
  },
  brandEyebrow: {
    color: T.accentNeon,
    fontSize: '11px',
    fontWeight: 700,
    letterSpacing: '0.12em',
    textTransform: 'uppercase',
    marginBottom: '18px',
  },
  brandCopyBlock: {
    position: 'relative',
    paddingLeft: '22px',
    zIndex: 1,
  },
  brandCopyRule: {
    position: 'absolute',
    left: 0,
    top: 2,
    bottom: 4,
    width: 3,
    borderRadius: 999,
    background: T.accentNeon,
  },
  brandMeta: {
    borderTop: `1px solid ${T.sideLine}`,
    paddingTop: '18px',
    color: T.sideMute,
    fontSize: '13px',
    lineHeight: 1.6,
  },
  formPanel: {
    padding: '44px 48px',
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
    marginTop: '20px',
    color: T.inkMute,
    fontSize: '13px',
  },
  link: {
    color: T.accent,
    textDecoration: 'none',
    fontWeight: 600,
  },
}

const Register: React.FC = () => {
  const navigate = useNavigate()
  const { isMobile } = useBreakpoint()
  const [apiError, setApiError] = useState('')
  const [loading, setLoading] = useState(false)
  const { register, handleSubmit, watch, formState: { errors } } = useForm<RegisterForm>()
  const password = watch('password')

  const onSubmit = async (data: RegisterForm) => {
    setApiError('')
    setLoading(true)
    try {
      await api.post('/auth/register', {
        username: data.username,
        email: data.email,
        password: data.password,
      })
      navigate('/login')
    } catch (err: any) {
      setApiError(err.response?.data?.detail || 'Registration failed')
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
            <div style={styles.brandCopyBlock}>
              <div style={styles.brandCopyRule} />
              <div style={styles.brandEyebrow}>Start your archive</div>
              <h1 style={styles.brandHeading}>
                <span style={{ display: 'block' }}>整理你的照片，</span>
                <span style={{ display: 'block' }}>記錄拍攝地點。</span>
              </h1>
            </div>
            <div style={styles.brandMeta}>讓照片、地點與器材保持好找、好管理，也方便日後回顧。</div>
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
            <div style={styles.title}>建立你的帳號</div>
            <p style={styles.subtitle}>設定 LensLog 帳號，開始建立你的攝影工作區。</p>
          </div>

          {apiError && <div style={styles.apiError}>{apiError}</div>}

          <form onSubmit={handleSubmit(onSubmit)}>
            <div style={styles.field}>
              <label style={styles.label}>Username</label>
              <input
                style={styles.input}
                type="text"
                placeholder="photolover42"
                {...register('username', {
                  required: 'Username is required',
                  minLength: { value: 3, message: 'At least 3 characters' },
                })}
              />
              {errors.username && <div style={styles.error}>{errors.username.message}</div>}
            </div>

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
                {...register('password', {
                  required: 'Password is required',
                  minLength: { value: 8, message: 'At least 8 characters' },
                })}
              />
              {errors.password && <div style={styles.error}>{errors.password.message}</div>}
            </div>

            <div style={styles.field}>
              <label style={styles.label}>Confirm Password</label>
              <input
                style={styles.input}
                type="password"
                placeholder="••••••••"
                {...register('confirmPassword', {
                  required: 'Please confirm your password',
                  validate: (v) => v === password || 'Passwords do not match',
                })}
              />
              {errors.confirmPassword && <div style={styles.error}>{errors.confirmPassword.message}</div>}
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
              {loading ? 'Creating account…' : 'Create account'}
            </button>
          </form>

          <div style={styles.footer}>
            Already have an account?{' '}
            <Link to="/login" style={styles.link}>Sign in</Link>
          </div>
        </main>
      </div>
    </div>
  )
}

export default Register
