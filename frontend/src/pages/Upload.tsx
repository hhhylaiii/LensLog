import React, { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import PhotoUpload from '../components/PhotoUpload'

const s: Record<string, React.CSSProperties> = {
  page: {
    padding: '32px',
    color: '#e8e8f0',
    fontFamily: "'Inter', system-ui, sans-serif",
    maxWidth: '800px',
  },
  heading: { fontSize: '24px', fontWeight: 700, marginBottom: '8px', letterSpacing: '-0.3px' },
  sub: { color: '#666', fontSize: '14px', marginBottom: '32px' },
  successBanner: {
    background: '#14532d',
    border: '1px solid #22c55e',
    borderRadius: '10px',
    padding: '16px 20px',
    color: '#86efac',
    fontSize: '14px',
    marginBottom: '24px',
    display: 'flex',
    alignItems: 'center',
    gap: '10px',
  },
  dashLink: {
    color: '#6366f1',
    cursor: 'pointer',
    textDecoration: 'underline',
    background: 'none',
    border: 'none',
    fontSize: '14px',
    padding: 0,
  },
}

const Upload: React.FC = () => {
  const navigate = useNavigate()
  const [success, setSuccess] = useState(false)

  return (
    <div style={s.page}>
      <div style={s.heading}>Upload Photos</div>
      <div style={s.sub}>Upload your photos to LensLog — they'll appear in your Dashboard</div>

      {success && (
        <div style={s.successBanner}>
          <span>✓</span>
          <span>
            Photos uploaded successfully!{' '}
            <button style={s.dashLink} onClick={() => navigate('/')}>
              View Dashboard →
            </button>
          </span>
        </div>
      )}

      <PhotoUpload onSuccess={() => setSuccess(true)} />
    </div>
  )
}

export default Upload
