import React, { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { useForm } from 'react-hook-form'
import api from '../lib/api'

// ─── Types ────────────────────────────────────────────────────────────────────

interface GearItem {
  id: string
  type: string
  brand?: string
  model: string
  notes?: string
  serial_number?: string
  purchase_date?: string
  maintenance_interval_days?: number
  last_maintained?: string
  created_at: string
  user_id: string
}

interface GearForm {
  type: string
  brand: string
  model: string
  notes: string
}

// ─── Constants ────────────────────────────────────────────────────────────────

const GEAR_TYPES = ['body', 'lens', 'flash', 'tripod', 'filter', 'memory_card']

const TYPE_COLORS: Record<string, string> = {
  body: '#6366f1',
  lens: '#06b6d4',
  flash: '#f59e0b',
  tripod: '#10b981',
  filter: '#ec4899',
  memory_card: '#8b5cf6',
}

// ─── Styles ───────────────────────────────────────────────────────────────────

const s: Record<string, React.CSSProperties> = {
  page: {
    padding: '32px',
    color: '#e8e8f0',
    fontFamily: "'Inter', system-ui, sans-serif",
    maxWidth: '1100px',
  },
  header: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: '32px',
  },
  heading: { fontSize: '24px', fontWeight: 700, letterSpacing: '-0.3px' },
  sub: { color: '#666', fontSize: '14px', marginTop: '4px' },
  addBtn: {
    background: '#6366f1',
    color: '#fff',
    border: 'none',
    borderRadius: '8px',
    padding: '10px 18px',
    fontSize: '14px',
    fontWeight: 600,
    cursor: 'pointer',
  },
  grid: {
    display: 'grid',
    gridTemplateColumns: 'repeat(auto-fill, minmax(220px, 1fr))',
    gap: '16px',
  },
  card: {
    background: '#13131a',
    border: '1px solid #2a2a38',
    borderRadius: '12px',
    padding: '20px',
  },
  badge: {
    display: 'inline-block',
    borderRadius: '6px',
    padding: '3px 10px',
    fontSize: '11px',
    fontWeight: 600,
    marginBottom: '12px',
    color: '#fff',
  },
  cardBrand: { fontSize: '12px', color: '#888', marginBottom: '2px' },
  cardModel: { fontSize: '16px', fontWeight: 600, color: '#e8e8f0', marginBottom: '8px' },
  cardNotes: {
    fontSize: '12px',
    color: '#666',
    overflow: 'hidden',
    display: '-webkit-box',
    WebkitLineClamp: 2,
    WebkitBoxOrient: 'vertical',
    marginBottom: '16px',
  } as React.CSSProperties,
  deleteBtn: {
    background: 'transparent',
    border: '1px solid #3a1a1a',
    borderRadius: '6px',
    padding: '6px 12px',
    color: '#f87171',
    fontSize: '12px',
    cursor: 'pointer',
  },
  empty: {
    textAlign: 'center',
    padding: '80px 0',
    color: '#555',
  },
  emptyIcon: { fontSize: '48px', marginBottom: '12px' },
  emptyText: { fontSize: '15px', marginBottom: '4px', color: '#666' },
  emptySub: { fontSize: '13px', color: '#444' },
  // Modal
  overlay: {
    position: 'fixed',
    inset: 0,
    background: 'rgba(0,0,0,0.7)',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    zIndex: 1000,
  },
  modal: {
    background: '#13131a',
    border: '1px solid #2a2a38',
    borderRadius: '12px',
    padding: '32px',
    width: '100%',
    maxWidth: '400px',
  },
  modalTitle: { fontSize: '18px', fontWeight: 600, marginBottom: '24px' },
  field: { marginBottom: '16px' },
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
  textarea: {
    width: '100%',
    background: '#0a0a0f',
    border: '1px solid #2a2a38',
    borderRadius: '8px',
    padding: '10px 14px',
    color: '#e8e8f0',
    fontSize: '14px',
    outline: 'none',
    boxSizing: 'border-box',
    resize: 'vertical',
    minHeight: '80px',
  },
  select: {
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
  modalActions: { display: 'flex', gap: '10px', marginTop: '8px' },
  submitBtn: {
    flex: 1,
    background: '#6366f1',
    color: '#fff',
    border: 'none',
    borderRadius: '8px',
    padding: '11px',
    fontSize: '14px',
    fontWeight: 600,
    cursor: 'pointer',
  },
  cancelBtn: {
    flex: 1,
    background: 'transparent',
    color: '#888',
    border: '1px solid #2a2a38',
    borderRadius: '8px',
    padding: '11px',
    fontSize: '14px',
    cursor: 'pointer',
  },
  errText: { color: '#f87171', fontSize: '12px', marginTop: '4px' },
  skeletonCard: {
    background: '#13131a',
    border: '1px solid #2a2a38',
    borderRadius: '12px',
    padding: '20px',
    height: '140px',
    opacity: 0.5,
  },
}

// ─── AddGearModal ─────────────────────────────────────────────────────────────

interface AddGearModalProps {
  onClose: () => void
  onAdded: () => void
}

const AddGearModal: React.FC<AddGearModalProps> = ({ onClose, onAdded }) => {
  const { register, handleSubmit, formState: { errors } } = useForm<GearForm>({
    defaultValues: { type: 'body' },
  })
  const [apiError, setApiError] = useState('')

  const mutation = useMutation({
    mutationFn: (data: GearForm) => api.post('/gear', data),
    onSuccess: () => { onAdded(); onClose() },
    onError: (err: any) => setApiError(err.response?.data?.detail || 'Failed to add gear'),
  })

  return (
    <div style={s.overlay} onClick={onClose}>
      <div style={s.modal} onClick={(e) => e.stopPropagation()}>
        <div style={s.modalTitle}>Add Gear</div>
        {apiError && <div style={{ ...s.errText, marginBottom: '12px' }}>{apiError}</div>}
        <form onSubmit={handleSubmit((d) => mutation.mutate(d))}>
          <div style={s.field}>
            <label style={s.label}>Type</label>
            <select style={s.select} {...register('type', { required: true })}>
              {GEAR_TYPES.map((t) => (
                <option key={t} value={t}>{t.replace('_', ' ')}</option>
              ))}
            </select>
          </div>
          <div style={s.field}>
            <label style={s.label}>Brand</label>
            <input style={s.input} placeholder="Canon, Sony, Nikon…" {...register('brand')} />
          </div>
          <div style={s.field}>
            <label style={s.label}>Model *</label>
            <input
              style={s.input}
              placeholder="EOS R5, A7 IV…"
              {...register('model', { required: 'Model is required' })}
            />
            {errors.model && <div style={s.errText}>{errors.model.message}</div>}
          </div>
          <div style={s.field}>
            <label style={s.label}>Notes</label>
            <textarea style={s.textarea} placeholder="Any notes…" {...register('notes')} />
          </div>
          <div style={s.modalActions}>
            <button type="button" style={s.cancelBtn} onClick={onClose}>Cancel</button>
            <button type="submit" style={s.submitBtn} disabled={mutation.isPending}>
              {mutation.isPending ? 'Adding…' : 'Add Gear'}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}

// ─── GearVault ────────────────────────────────────────────────────────────────

const GearVault: React.FC = () => {
  const queryClient = useQueryClient()
  const [showModal, setShowModal] = useState(false)

  const { data: gear = [], isLoading } = useQuery<GearItem[]>({
    queryKey: ['gear'],
    queryFn: () => api.get('/gear').then((r) => r.data),
  })

  const deleteMutation = useMutation({
    mutationFn: (id: string) => api.delete(`/gear/${id}`),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['gear'] }),
  })

  return (
    <div style={s.page}>
      <div style={s.header}>
        <div>
          <div style={s.heading}>Gear Vault</div>
          <div style={s.sub}>Manage your cameras, lenses, and accessories</div>
        </div>
        <button style={s.addBtn} onClick={() => setShowModal(true)}>+ Add Gear</button>
      </div>

      {isLoading ? (
        <div style={s.grid}>
          {[...Array(4)].map((_, i) => <div key={i} style={s.skeletonCard} />)}
        </div>
      ) : gear.length === 0 ? (
        <div style={s.empty}>
          <div style={s.emptyIcon}>⬡</div>
          <div style={s.emptyText}>No gear yet.</div>
          <div style={s.emptySub}>Add your first item to get started.</div>
        </div>
      ) : (
        <div style={s.grid}>
          {gear.map((item) => (
            <div key={item.id} style={s.card}>
              <div
                style={{
                  ...s.badge,
                  background: TYPE_COLORS[item.type] ?? '#6366f1',
                }}
              >
                {item.type.replace('_', ' ')}
              </div>
              {item.brand && <div style={s.cardBrand}>{item.brand}</div>}
              <div style={s.cardModel}>{item.model}</div>
              {item.notes && <div style={s.cardNotes}>{item.notes}</div>}
              <button
                style={s.deleteBtn}
                onClick={() => deleteMutation.mutate(item.id)}
                disabled={deleteMutation.isPending}
              >
                Delete
              </button>
            </div>
          ))}
        </div>
      )}

      {showModal && (
        <AddGearModal
          onClose={() => setShowModal(false)}
          onAdded={() => queryClient.invalidateQueries({ queryKey: ['gear'] })}
        />
      )}
    </div>
  )
}

export default GearVault
