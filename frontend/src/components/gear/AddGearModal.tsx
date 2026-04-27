import React from 'react'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { gearSchema } from '@shared/schemas'
import type { GearFormValues } from '@shared/schemas'
import { useCreateGear } from '@shared/hooks/useGear'
import { api } from '../../api'
import T from '../../styles/tokens'

interface AddGearModalProps {
  onClose: () => void
}

const GEAR_TYPE_OPTIONS = [
  { value: 'body', label: '機身' },
  { value: 'lens', label: '鏡頭' },
  { value: 'flash', label: '閃燈' },
  { value: 'tripod', label: '腳架' },
  { value: 'filter', label: '濾鏡' },
  { value: 'memory_card', label: '記憶卡' },
]

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
    maxWidth: '460px',
    width: '90%',
    boxShadow: '0 8px 40px rgba(26,41,66,0.22)',
    display: 'flex',
    flexDirection: 'column',
    gap: '20px',
    maxHeight: '90vh',
    overflowY: 'auto',
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
  form: {
    display: 'flex',
    flexDirection: 'column',
    gap: '14px',
  },
  field: {
    display: 'flex',
    flexDirection: 'column',
    gap: '5px',
  },
  row: {
    display: 'grid',
    gridTemplateColumns: '1fr 1fr',
    gap: '12px',
  },
  label: {
    fontSize: '13px',
    fontWeight: 600,
    color: T.ink,
  },
  required: {
    color: T.warn,
    marginLeft: '2px',
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
  select: {
    border: `1px solid ${T.line}`,
    borderRadius: '8px',
    padding: '9px 12px',
    fontSize: '14px',
    color: T.ink,
    background: T.paper,
    outline: 'none',
    boxSizing: 'border-box' as const,
    width: '100%',
    cursor: 'pointer',
  },
  textarea: {
    border: `1px solid ${T.line}`,
    borderRadius: '8px',
    padding: '9px 12px',
    fontSize: '14px',
    color: T.ink,
    background: T.paper,
    outline: 'none',
    boxSizing: 'border-box' as const,
    width: '100%',
    resize: 'vertical' as const,
    minHeight: '72px',
  },
  errorMsg: {
    color: T.warn,
    fontSize: '12px',
  },
  submitBtn: {
    background: T.accent,
    color: '#ffffff',
    border: 'none',
    borderRadius: '8px',
    padding: '11px',
    fontSize: '15px',
    fontWeight: 600,
    cursor: 'pointer',
    width: '100%',
    marginTop: '4px',
    transition: 'opacity 0.15s',
  },
  submitBtnPending: {
    opacity: 0.6,
    cursor: 'not-allowed',
  },
  apiError: {
    color: T.warn,
    fontSize: '13px',
    textAlign: 'center' as const,
    marginTop: '-8px',
  },
}

export default function AddGearModal({ onClose }: AddGearModalProps) {
  const createGear = useCreateGear(api)

  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<GearFormValues>({
    resolver: zodResolver(gearSchema),
  })

  const onSubmit = handleSubmit(async (data) => {
    try {
      await createGear.mutateAsync(data)
      onClose()
    } catch {
      // error displayed via createGear.isError
    }
  })

  const isPending = isSubmitting || createGear.isPending

  return (
    <div style={styles.overlay} onClick={onClose}>
      <div style={styles.modal} onClick={e => e.stopPropagation()}>
        <div style={styles.header}>
          <span style={styles.title}>新增器材</span>
          <button style={styles.closeBtn} onClick={onClose} aria-label="關閉">
            ✕
          </button>
        </div>

        <form style={styles.form} onSubmit={onSubmit}>
          <div style={styles.field}>
            <label style={styles.label}>
              類型<span style={styles.required}>*</span>
            </label>
            <select style={styles.select} {...register('type')}>
              <option value="">請選擇器材類型</option>
              {GEAR_TYPE_OPTIONS.map(opt => (
                <option key={opt.value} value={opt.value}>
                  {opt.label}
                </option>
              ))}
            </select>
            {errors.type && <span style={styles.errorMsg}>{errors.type.message}</span>}
          </div>

          <div style={styles.row}>
            <div style={styles.field}>
              <label style={styles.label}>品牌</label>
              <input
                style={styles.input}
                type="text"
                placeholder="例：Sony（選填）"
                {...register('brand')}
              />
              {errors.brand && <span style={styles.errorMsg}>{errors.brand.message}</span>}
            </div>

            <div style={styles.field}>
              <label style={styles.label}>
                型號<span style={styles.required}>*</span>
              </label>
              <input
                style={styles.input}
                type="text"
                placeholder="例：A7 IV"
                {...register('model')}
              />
              {errors.model && <span style={styles.errorMsg}>{errors.model.message}</span>}
            </div>
          </div>

          <div style={styles.row}>
            <div style={styles.field}>
              <label style={styles.label}>序號</label>
              <input
                style={styles.input}
                type="text"
                placeholder="序列號（選填）"
                {...register('serial_number')}
              />
              {errors.serial_number && (
                <span style={styles.errorMsg}>{errors.serial_number.message}</span>
              )}
            </div>

            <div style={styles.field}>
              <label style={styles.label}>購入日期</label>
              <input
                style={styles.input}
                type="date"
                {...register('purchase_date', {
                  setValueAs: (v: string) => (v === '' ? undefined : v),
                })}
              />
              {errors.purchase_date && (
                <span style={styles.errorMsg}>{errors.purchase_date.message}</span>
              )}
            </div>
          </div>

          <div style={styles.field}>
            <label style={styles.label}>保養週期（天）</label>
            <input
              style={styles.input}
              type="number"
              min={1}
              placeholder="例：180（選填）"
              {...register('maintenance_interval_days', {
                setValueAs: (v: string) => {
                  if (v === '') return undefined
                  const n = parseInt(v, 10)
                  return isNaN(n) ? undefined : n
                },
              })}
            />
            {errors.maintenance_interval_days && (
              <span style={styles.errorMsg}>
                {errors.maintenance_interval_days.message}
              </span>
            )}
          </div>

          <div style={styles.field}>
            <label style={styles.label}>備註</label>
            <textarea
              style={styles.textarea}
              placeholder="備註（選填）"
              {...register('notes')}
            />
            {errors.notes && <span style={styles.errorMsg}>{errors.notes.message}</span>}
          </div>

          <button
            type="submit"
            style={{ ...styles.submitBtn, ...(isPending ? styles.submitBtnPending : {}) }}
            disabled={isPending}
          >
            {isPending ? '新增中...' : '新增器材'}
          </button>

          {createGear.isError && (
            <div style={styles.apiError}>新增失敗，請稍後再試</div>
          )}
        </form>
      </div>
    </div>
  )
}
