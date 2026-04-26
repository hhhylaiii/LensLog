import React from 'react'
import T from '../../styles/tokens'

interface LocationPanelProps {
  gpsLat?: number
  gpsLng?: number
  onMatch?: (locationId: string) => void
}

const LocationPanel: React.FC<LocationPanelProps> = (_props) => {
  return (
    <div style={{ background: T.paperTwo, border: `1px solid ${T.line}`, borderRadius: 10, padding: 14 }}>
      <div style={{ fontFamily: "'IBM Plex Mono', monospace", textTransform: 'uppercase', letterSpacing: '0.04em', fontSize: 10.5, color: T.inkMute, marginBottom: 10 }}>
        景點配對
      </div>
      <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 8, padding: '12px 0', textAlign: 'center' }}>
        <span style={{ fontSize: 24 }}>📍</span>
        <div style={{ fontSize: 13, fontWeight: 500, color: T.ink }}>即將推出</div>
        <div style={{ fontSize: 12, color: T.inkMute, lineHeight: 1.5 }}>EXIF GPS 功能就緒後<br/>將自動配對附近景點</div>
      </div>
    </div>
  )
}
export default LocationPanel
