import React from 'react'
import T from '../../styles/tokens'
import type { Visibility } from '../../lib/uploadTypes'

const VISIBILITY_OPTIONS: { value: Visibility; label: string; desc: string }[] = [
  { value: 'public',  label: '公開',  desc: '所有人可見' },
  { value: 'private', label: '私人',  desc: '僅自己可見' },
  // { value: 'followers', label: '僅追蹤者', desc: '追蹤者可見' },
]

interface VisibilityPanelProps {
  visibility: Visibility
  onChange: (v: Visibility) => void
  hidePreciseGps: boolean
  onToggleGps: () => void
}

const VisibilityPanel: React.FC<VisibilityPanelProps> = ({ visibility, onChange, hidePreciseGps, onToggleGps }) => {
  return (
    <div style={{ background: T.card, border: `1px solid ${T.line}`, borderRadius: 10, padding: 14 }}>
      <div style={{ fontFamily: "'IBM Plex Mono', monospace", textTransform: 'uppercase', letterSpacing: '0.04em', fontSize: 10.5, color: T.inkMute, marginBottom: 10 }}>
        可見度
      </div>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 8, fontSize: 13 }}>
        {VISIBILITY_OPTIONS.map(opt => {
          const sel = visibility === opt.value
          return (
            <label key={opt.value} onClick={() => onChange(opt.value)} style={{ display: 'flex', alignItems: 'center', gap: 8, cursor: 'pointer', color: sel ? T.ink : T.inkSoft }}>
              <span style={{
                width: 14, height: 14, borderRadius: '50%', flexShrink: 0,
                border: `1.5px solid ${sel ? T.accent : T.line}`,
                display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
              }}>
                {sel && <span style={{ width: 7, height: 7, borderRadius: '50%', background: T.accent }} />}
              </span>
              <span>{opt.label}</span>
              <span style={{ marginLeft: 'auto', fontSize: 11, color: T.inkMute }}>{opt.desc}</span>
            </label>
          )
        })}
      </div>
      <div style={{ borderTop: `1px solid ${T.line}`, marginTop: 12, paddingTop: 10, display: 'flex', alignItems: 'center', justifyContent: 'space-between', fontSize: 12.5, color: T.inkSoft }}>
        <span>隱藏精確 GPS</span>
        <div onClick={onToggleGps} style={{ width: 32, height: 18, borderRadius: 10, background: hidePreciseGps ? T.accent : T.paperTwo, border: `1px solid ${T.line}`, position: 'relative', cursor: 'pointer', transition: 'background 0.15s' }}>
          <span style={{ position: 'absolute', top: 1.5, left: hidePreciseGps ? 16 : 2, width: 12, height: 12, borderRadius: '50%', background: T.card, border: `1px solid ${T.line}`, transition: 'left 0.15s' }} />
        </div>
      </div>
    </div>
  )
}
export default VisibilityPanel
