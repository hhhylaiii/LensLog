import React, { useState } from 'react'
import { useNavigate, Link } from 'react-router-dom'
import { useForm } from 'react-hook-form'
import api from '../lib/api'

interface RegisterForm {
  username: string
  email: string
  password: string
  confirmPassword: string
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

const Register: React.FC = () => {
  const navigate = useNavigate()
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
    <div style={styles.page}>
      <div style={styles.card}>
        <div style={styles.logo}>
          <div style={styles.logoText}>
            Lens<span style={styles.logoAccent}>Log</span>
          </div>
          <div style={styles.logoSub}>Photography Community Platform</div>
        </div>

        <div style={styles.title}>Create your account</div>

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

          <button style={styles.button} type="submit" disabled={loading}>
            {loading ? 'Creating account…' : 'Create account'}
          </button>
        </form>

        <div style={styles.footer}>
          Already have an account?{' '}
          <Link to="/login" style={styles.link}>Sign in</Link>
        </div>
      </div>
    </div>
  )
}

export default Register
