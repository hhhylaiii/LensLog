import React, { useState } from 'react'
import { useDeleteGear } from '@shared/hooks/useGear'
import { api } from '../../api'
import T from '../../styles/tokens'
import type { GearItem } from '../../types/gear'

interface DeleteGearModalProps {
  item: GearItem
  onClose: () => void
}

const styles: Record<string, React.CSSProperties> = {
  overlay: {
    position: 'fixed',
    inset: 0,
    background: 'rgba(26,41,66,0.55)',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    zIndex: 100,
  },
  modal: {
    background: T.card,
    borderRadius: '16px',
    padding: '28px 32px',
    maxWidth: '400px',
    width: '90%',
    boxShadow: '0 8px 40px rgba(26,41,66,0.22)',
    display: 'flex',
    flexDirection: 'column',
    gap: '20px',
  },
  header: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  title: {
    fontSize: '18px',
    fontWeight: 700,
    color: T.ink,
  },
  closeBtn: {
    background: 'transparent',
    border: 'none',
    cursor: 'pointer',
    color: T.inkMute,
    fontSize: '18px',
    padding: '4px 6px',
    lineHeight: 1,
    borderRadius: '6px',
  },
  message: {
    fontSize: '14px',
    color: T.inkSoft,
    lineHeight: 1.5,
  },
  field: {
    display: 'flex',
    flexDirection: 'column',
    gap: '5px',
  },
  label: {
    fontSize: '13px',
    fontWeight: 600,
    color: T.ink,
  },
  input: {
    border: `1px solid ${T.line}`,
    borderRadius: '8px',
    padding: '9px 12px',
    fontSize: '14px',
    color: T.ink,
    background: T.paper,
    outline: 'none',
    boxSizing: 'border-box' as const,
    width: '100%',
  },
  submitBtn: {
    background: T.ink,
    color: '#ffffff',
    border: 'none',
    borderRadius: '8px',
    padding: '11px',
    fontSize: '15px',
    fontWeight: 600,
    cursor: 'pointer',
    width: '100%',
    marginTop: '4px',
    transition: 'opacity 0.15s, background 0.15s',
  },
  submitBtnDisabled: {
    background: T.lineSoft,
    color: T.inkMute,
    cursor: 'not-allowed',
  },
  submitBtnPending: {
    opacity: 0.6,
    cursor: 'not-allowed',
  },
  apiError: {
    color: T.warn,
    fontSize: '13px',
    textAlign: 'center' as const,
    marginTop: '8px',
  },
}

export default function DeleteGearModal({ item, onClose }: DeleteGearModalProps) {
  const [inputValue, setInputValue] = useState('')
  const { mutate: deleteGear, isPending, error } = useDeleteGear(api)

  const isMatch = inputValue === item.model

  const handleDelete = () => {
    if (!isMatch) return
    deleteGear(item.id, {
      onSuccess: () => {
        onClose()
      },
    })
  }

  return (
    <div style={styles.overlay} onClick={onClose}>
      <div style={styles.modal} onClick={e => e.stopPropagation()}>
        <div style={styles.header}>
          <div style={styles.title}>刪除器材確認</div>
          <button style={styles.closeBtn} onClick={onClose}>
            ✕
          </button>
        </div>

        <div style={styles.message}>
          你確定要刪除 <strong>{item.model}</strong> 嗎？此動作無法復原。
          <br />
          請在下方輸入器材型號以確認刪除。
        </div>

        <div style={styles.field}>
          <label style={styles.label}>輸入器材型號以確認</label>
          <input
            style={styles.input}
            type="text"
            placeholder={`輸入 ${item.model}`}
            value={inputValue}
            onChange={e => setInputValue(e.target.value)}
          />
        </div>

        <button
          onClick={handleDelete}
          style={{
            ...styles.submitBtn,
            ...(!isMatch ? styles.submitBtnDisabled : {}),
            ...(isPending ? styles.submitBtnPending : {}),
          }}
          disabled={!isMatch || isPending}
        >
          {isPending ? '刪除中...' : '確認刪除'}
        </button>

        {error && <div style={styles.apiError}>刪除失敗，請稍後再試</div>}
      </div>
    </div>
  )
}
