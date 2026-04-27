import React, { useEffect } from 'react'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { gearSchema } from '@shared/schemas'
import { z } from 'zod'
import { useGearItem, useUpdateGear } from '@shared/hooks/useGear'
import { api } from '../../api'
import T from '../../styles/tokens'

const editGearSchema = gearSchema.extend({
  last_maintained: z.string().optional(),
})

type EditGearFormValues = z.infer<typeof editGearSchema>

interface EditGearModalProps {
  gearId: string
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
    transition: 'opacity 0.15s, background 0.15s',
  },
  submitBtnDisabled: {
    background: T.lineSoft,
    color: T.inkMute,
    cursor: 'not-allowed',
  },
  imageUploadPlaceholder: {
    height: '140px',
    border: `2px dashed ${T.line}`,
    borderRadius: '12px',
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    justifyContent: 'center',
    gap: '8px',
    background: T.paper,
    cursor: 'pointer',
    transition: 'background 0.15s, border-color 0.15s',
    marginBottom: '8px',
  },
  uploadIcon: {
    fontSize: '24px',
    color: T.inkMute,
    lineHeight: 1,
  },
  uploadText: {
    fontSize: '13px',
    color: T.inkMute,
    fontWeight: 500,
  },
  apiError: {
    color: T.warn,
    fontSize: '13px',
    textAlign: 'center' as const,
    marginTop: '8px',
  },
  loadingText: {
    color: T.inkMute,
    fontSize: '14px',
    textAlign: 'center',
    padding: '40px 0',
  },
}

export default function EditGearModal({ gearId, onClose }: EditGearModalProps) {
  const { data: gearData, isLoading, isError } = useGearItem(api, gearId)
  const { mutate: updateGear, isPending, error: updateError } = useUpdateGear(api)

  const {
    register,
    handleSubmit,
    reset,
    formState: { errors, isDirty },
  } = useForm<EditGearFormValues>({
    resolver: zodResolver(editGearSchema),
  })

  useEffect(() => {
    if (gearData) {
      reset({
        type: gearData.type,
        brand: gearData.brand || '',
        model: gearData.model || '',
        serial_number: gearData.serial_number || '',
        purchase_date: gearData.purchase_date || '',
        notes: gearData.notes || '',
        maintenance_interval_days: gearData.maintenance_interval_days || undefined,
        last_maintained: gearData.last_maintained || '',
      })
    }
  }, [gearData, reset])

  const onSubmit = (data: EditGearFormValues) => {
    const payload = {
      ...data,
      maintenance_interval_days: data.maintenance_interval_days
        ? Number(data.maintenance_interval_days)
        : undefined,
      last_maintained: data.last_maintained || undefined,
      purchase_date: data.purchase_date || undefined,
    }
    updateGear(
      { id: gearId, data: payload },
      {
        onSuccess: () => {
          onClose()
        },
      }
    )
  }

  return (
    <div style={styles.overlay} onClick={onClose}>
      <div style={styles.modal} onClick={e => e.stopPropagation()}>
        <div style={styles.header}>
          <div style={styles.title}>器材詳細資訊</div>
          <button style={styles.closeBtn} onClick={onClose}>
            ✕
          </button>
        </div>

        {isLoading ? (
          <div style={styles.loadingText}>載入中...</div>
        ) : isError ? (
          <div style={styles.apiError}>無法載入器材資訊</div>
        ) : (
          <form onSubmit={handleSubmit(onSubmit)} style={styles.form}>
            <div
              style={styles.imageUploadPlaceholder}
              onClick={() => alert('上傳器材照片功能即將推出！')}
            >
              <div style={styles.uploadIcon}>📷</div>
              <div style={styles.uploadText}>點擊上傳器材照片 (即將推出)</div>
            </div>

            <div style={styles.field}>
              <label style={styles.label}>
                器材類型<span style={styles.required}>*</span>
              </label>
              <select style={styles.select} {...register('type')}>
                <option value="">請選擇類型</option>
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

            <div style={styles.field}>
              <label style={styles.label}>序號</label>
              <input
                style={styles.input}
                type="text"
                placeholder="序號（選填）"
                {...register('serial_number')}
              />
              {errors.serial_number && (
                <span style={styles.errorMsg}>{errors.serial_number.message}</span>
              )}
            </div>

            <div style={styles.row}>
              <div style={styles.field}>
                <label style={styles.label}>購入日期</label>
                <input style={styles.input} type="date" {...register('purchase_date')} />
                {errors.purchase_date && (
                  <span style={styles.errorMsg}>{errors.purchase_date.message}</span>
                )}
              </div>

              <div style={styles.field}>
                <label style={styles.label}>上次保養日期</label>
                <input style={styles.input} type="date" {...register('last_maintained')} />
                {errors.last_maintained && (
                  <span style={styles.errorMsg}>{errors.last_maintained.message}</span>
                )}
              </div>
            </div>

            <div style={styles.field}>
              <label style={styles.label}>保養週期 (天)</label>
              <input
                style={styles.input}
                type="number"
                placeholder="例：365（選填）"
                {...register('maintenance_interval_days', { valueAsNumber: true })}
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
              style={{
                ...styles.submitBtn,
                ...(!isDirty || isPending ? styles.submitBtnDisabled : {}),
              }}
              disabled={!isDirty || isPending}
            >
              {isPending ? '更新中...' : '更新器材'}
            </button>

            {updateError && <div style={styles.apiError}>更新失敗，請稍後再試</div>}
          </form>
        )}
      </div>
    </div>
  )
}
