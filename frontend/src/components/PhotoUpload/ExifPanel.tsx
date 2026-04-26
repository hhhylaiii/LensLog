import React from 'react'
import T from '../../styles/tokens'
import type { ExifData } from '../../lib/uploadTypes'

const mono = "'IBM Plex Mono', monospace"

interface ExifPanelProps { exif?: ExifData }

const ExifPanel: React.FC<ExifPanelProps> = ({ exif }) => {
  const fields = [
    { label: '機身', value: exif?.make },
    { label: '鏡頭', value: exif?.lens },
    { label: '光圈', value: exif?.aperture },
    { label: '快門', value: exif?.shutter },
    { label: 'ISO',  value: exif?.iso },
    { label: '焦距', value: exif?.focalLength },
  ]
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
