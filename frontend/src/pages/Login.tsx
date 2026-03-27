import React, { useState } from 'react'
import { useNavigate, Link } from 'react-router-dom'
import { useForm } from 'react-hook-form'
import api from '../lib/api'
import { setTokens } from '../lib/auth'

interface LoginForm {
  email: string
  password: string
}

const styles: Record<string, React.CSSProperties> = {
  page: {
    minHeight: '100vh',
    background: '#0a0a0f',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    fontFamily: "'Inter', system-ui, sans-serif",
  },
  card: {
    background: '#13131a',
    border: '1px solid #2a2a38',
    borderRadius: '12px',
    padding: '40px',
    width: '100%',
    maxWidth: '400px',
  },
  logo: {
    textAlign: 'center',
    marginBottom: '32px',
  },
  logoText: {
    fontSize: '28px',
    fontWeight: 700,
    color: '#e8e8f0',
    letterSpacing: '-0.5px',
  },
  logoAccent: {
    color: '#6366f1',
  },
  logoSub: {
    color: '#666',
    fontSize: '13px',
    marginTop: '4px',
  },
  title: {
    fontSize: '20px',
    fontWeight: 600,
    color: '#e8e8f0',
    marginBottom: '24px',
  },
  field: {
    marginBottom: '16px',
  },
  label: {
    display: 'block',
    fontSize: '13px',
    fontWeight: 500,
    color: '#aaa',
    marginBottom: '6px',
  },
  input: {
    width: '100%',
    background: '#0a0a0f',
    border: '1px solid #2a2a38',
    borderRadius: '8px',
    padding: '10px 14px',
    color: '#e8e8f0',
    fontSize: '14px',
    outline: 'none',
    boxSizing: 'border-box',
    transition: 'border-color 0.2s',
  },
  button: {
    width: '100%',
    background: '#6366f1',
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
    color: '#f87171',
    fontSize: '12px',
    marginTop: '4px',
  },
  apiError: {
    background: '#2a1515',
    border: '1px solid #7f1d1d',
    borderRadius: '8px',
    padding: '10px 14px',
    color: '#f87171',
    fontSize: '13px',
    marginBottom: '16px',
  },
  footer: {
    textAlign: 'center',
    marginTop: '20px',
    color: '#666',
    fontSize: '13px',
  },
  link: {
    color: '#6366f1',
    textDecoration: 'none',
  },
}

const Login: React.FC = () => {
  const navigate = useNavigate()
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
    <div style={styles.page}>
      <div style={styles.card}>
        <div style={styles.logo}>
          <div style={styles.logoText}>
            Lens<span style={styles.logoAccent}>Log</span>
          </div>
          <div style={styles.logoSub}>Photography Community Platform</div>
        </div>

        <div style={styles.title}>Sign in to your account</div>

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

          <button style={styles.button} type="submit" disabled={loading}>
            {loading ? 'Signing in…' : 'Sign in'}
          </button>
        </form>

        <div style={styles.footer}>
          Don't have an account?{' '}
          <Link to="/register" style={styles.link}>Create one</Link>
        </div>
      </div>
    </div>
  )
}

export default Login
