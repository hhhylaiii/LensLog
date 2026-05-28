import React from 'react'
import T from '../../styles/tokens'
import { useBreakpoint } from '../../hooks/useBreakpoint'
import type { ExifData } from '../../lib/uploadTypes'

const mono = "'IBM Plex Mono', monospace"

interface ExifPanelProps { exif?: ExifData }

const ExifPanel: React.FC<ExifPanelProps> = ({ exif }) => {
  const { isMobile } = useBreakpoint()
  const fields = [
    { label: '機身', value: exif?.make },
    { label: '鏡頭', value: exif?.lens },
    { label: '光圈', value: exif?.aperture },
    { label: '快門', value: exif?.shutter },
    { label: 'ISO',  value: exif?.iso },
    { label: '焦距', value: exif?.focalLength },
  ]

  if (isMobile) {
    return (
      <div style={{ border: `1px solid ${T.line}`, borderRadius: 8, overflow: 'hidden' }}>
        <div style={{ padding: '6px 10px 4px', background: T.card, borderBottom: `1px solid ${T.lineSoft}`, display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <span style={{ fontFamily: mono, fontSize: 8.5, textTransform: 'uppercase', letterSpacing: '0.04em', color: T.inkMute }}>EXIF · 自動讀取</span>
          <span style={{ fontFamily: mono, fontSize: 9, color: exif ? T.ok : T.inkMute }}>● {exif ? '已偵測' : '處理中'}</span>
        </div>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3,1fr)' }}>
          {fields.map(({ label, value }, idx) => (
            <div key={label} style={{
              background: T.card, padding: '7px 10px',
              borderRight: (idx + 1) % 3 !== 0 ? `1px solid ${T.lineSoft}` : undefined,
              borderBottom: idx < 3 ? `1px solid ${T.lineSoft}` : undefined,
            }}>
              <div style={{ fontFamily: mono, fontSize: 8, textTransform: 'uppercase', letterSpacing: '0.04em', color: T.inkMute, marginBottom: 2 }}>{label}</div>
              <div style={{ fontSize: 11.5, fontWeight: 600, color: T.ink }}>{value ?? '—'}</div>
            </div>
          ))}
        </div>
      </div>
    )
  }

  return (
    <div style={{ background: T.card, border: `1px solid ${T.line}`, borderRadius: 10, padding: 14 }}>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 10 }}>
        <span style={{ fontFamily: mono, textTransform: 'uppercase', letterSpacing: '0.04em', fontSize: 10.5, color: T.inkMute }}>EXIF · 自動讀取</span>
        <span style={{ fontFamily: mono, fontSize: 10.5, color: exif ? T.ok : T.inkMute }}>
          {exif ? '● 已偵測' : '● 處理中'}
        </span>
      </div>
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px 14px', fontSize: 12.5 }}>
        {fields.map(f => (
          <div key={f.label}>
            <div style={{ fontFamily: mono, fontSize: 10.5, color: T.inkMute }}>{f.label}</div>
            <div style={{ fontWeight: 500, color: T.ink }}>{f.value ?? '—'}</div>
          </div>
        ))}
        <div style={{ gridColumn: 'span 2' }}>
          <div style={{ fontFamily: mono, fontSize: 10.5, color: T.inkMute }}>拍攝時間</div>
          <div style={{ fontWeight: 500, color: T.ink }}>{exif?.takenAt ?? '—'}</div>
        </div>
      </div>
    </div>
  )
}

export default ExifPanel
