import React from 'react'
import T from '../../styles/tokens'

interface StepperProps { step: 1 | 2 }

const Stepper: React.FC<StepperProps> = ({ step }) => {
  const steps = [
    { label: '選擇檔案', n: 1 },
    { label: '檢閱 & 編輯', n: 2 },
    { label: '發布', n: 3 },
  ]
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '12.5px', color: T.inkMute }}>
      {steps.map((s, i) => {
        const done = step > s.n
        const active = step === s.n
        const circleStyle: React.CSSProperties = {
          width: 18, height: 18, borderRadius: '50%',
          display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
          fontSize: '10.5px', fontWeight: 600, flexShrink: 0,
          background: done ? T.okSoft : active ? T.accent : T.paperTwo,
          border: done ? `1px solid ${T.ok}` : active ? 'none' : `1px solid ${T.line}`,
          color: done ? T.ok : active ? '#fff' : T.inkMute,
        }
        return (
          <React.Fragment key={s.n}>
            {i > 0 && <span style={{ width: 24, height: 1, background: T.line, flexShrink: 0 }} />}
            <span style={{ display: 'inline-flex', alignItems: 'center', gap: 6,
              color: active ? T.ink : done ? T.inkSoft : T.inkMute,
              fontWeight: active ? 500 : 400,
            }}>
              <span style={circleStyle}>{done ? '✓' : s.n}</span>
              {s.label}
            </span>
          </React.Fragment>
        )
      })}
    </div>
  )
}
export default Stepper
