import React, { useState, useEffect } from 'react'
import { MapContainer, TileLayer, useMap } from 'react-leaflet'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { useForm } from 'react-hook-form'
import L from 'leaflet'
import 'leaflet/dist/leaflet.css'
import 'leaflet.markercluster/dist/MarkerCluster.css'
import 'leaflet.markercluster/dist/MarkerCluster.Default.css'
import 'leaflet.markercluster'
import api from '../lib/api'

// Fix Leaflet default marker icons in bundled apps
import markerIconUrl from 'leaflet/dist/images/marker-icon.png'
import markerIconRetinaUrl from 'leaflet/dist/images/marker-icon-2x.png'
import markerShadowUrl from 'leaflet/dist/images/marker-shadow.png'

delete (L.Icon.Default.prototype as any)._getIconUrl
L.Icon.Default.mergeOptions({
  iconUrl: markerIconUrl,
  iconRetinaUrl: markerIconRetinaUrl,
  shadowUrl: markerShadowUrl,
})

// ─── Types ────────────────────────────────────────────────────────────────────

interface Location {
  id: string
  name: string
  description?: string
  latitude: number
  longitude: number
  user_id: string
  created_at: string
}

interface LocationForm {
  name: string
  description: string
  latitude: string
  longitude: string
}

// ─── Styles ───────────────────────────────────────────────────────────────────

const s: Record<string, React.CSSProperties> = {
  page: {
    display: 'flex',
    height: '100vh',
    fontFamily: "'Inter', system-ui, sans-serif",
    overflow: 'hidden',
  },
  sidebar: {
    width: '300px',
    flexShrink: 0,
    background: '#13131a',
    borderRight: '1px solid #2a2a38',
    display: 'flex',
    flexDirection: 'column',
    color: '#e8e8f0',
  },
  sidebarHeader: {
    padding: '20px',
    borderBottom: '1px solid #2a2a38',
  },
  sidebarTitle: { fontSize: '18px', fontWeight: 700, marginBottom: '12px' },
  searchInput: {
    width: '100%',
    background: '#0a0a0f',
    border: '1px solid #2a2a38',
    borderRadius: '8px',
    padding: '9px 14px',
    color: '#e8e8f0',
    fontSize: '13px',
    outline: 'none',
    boxSizing: 'border-box',
    marginBottom: '10px',
  },
  addBtn: {
    width: '100%',
    background: '#6366f1',
    color: '#fff',
    border: 'none',
    borderRadius: '8px',
    padding: '9px',
    fontSize: '13px',
    fontWeight: 600,
    cursor: 'pointer',
  },
  locationList: { flex: 1, overflowY: 'auto', padding: '8px' },
  locationItem: {
    padding: '12px',
    borderRadius: '8px',
    cursor: 'pointer',
    marginBottom: '4px',
    transition: 'background 0.15s',
  },
  locationName: { fontSize: '14px', fontWeight: 500, color: '#e8e8f0' },
  locationDesc: { fontSize: '12px', color: '#666', marginTop: '2px', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' },
  locationCoords: { fontSize: '11px', color: '#444', marginTop: '4px' },
  mapArea: { flex: 1 },
  // Modal
  overlay: {
    position: 'fixed',
    inset: 0,
    background: 'rgba(0,0,0,0.7)',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    zIndex: 2000,
  },
  modal: {
    background: '#13131a',
    border: '1px solid #2a2a38',
    borderRadius: '12px',
    padding: '32px',
    width: '100%',
    maxWidth: '400px',
    color: '#e8e8f0',
  },
  modalTitle: { fontSize: '18px', fontWeight: 600, marginBottom: '24px' },
  field: { marginBottom: '16px' },
  label: { display: 'block', fontSize: '13px', fontWeight: 500, color: '#aaa', marginBottom: '6px' },
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
    minHeight: '70px',
  },
  coordRow: { display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px' },
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
  emptyList: { padding: '20px', color: '#555', fontSize: '13px', textAlign: 'center' },
}

// ─── ClusterMarkers — renders all locations as a clustered layer ──────────────

interface ClusterMarkersProps {
  locations: Location[]
}

const ClusterMarkers: React.FC<ClusterMarkersProps> = ({ locations }) => {
  const map = useMap()

  useEffect(() => {
    const cluster = (L as any).markerClusterGroup()

    locations.forEach((loc) => {
      const marker = L.marker([loc.latitude, loc.longitude])
      marker.bindPopup(
        `<strong>${loc.name}</strong>${loc.description ? `<br/>${loc.description}` : ''}`
      )
      cluster.addLayer(marker)
    })

    map.addLayer(cluster)
    return () => { map.removeLayer(cluster) }
  }, [map, locations])

  return null
}

// ─── MapController — fly to target when selected ──────────────────────────────

interface MapControllerProps {
  target: [number, number] | null
}

const MapController: React.FC<MapControllerProps> = ({ target }) => {
  const map = useMap()
  useEffect(() => {
    if (target) {
      map.flyTo(target, 14, { duration: 1 })
    }
  }, [target, map])
  return null
}

// ─── AddLocationModal ─────────────────────────────────────────────────────────

interface AddLocationModalProps {
  onClose: () => void
  onAdded: () => void
}

const AddLocationModal: React.FC<AddLocationModalProps> = ({ onClose, onAdded }) => {
  const [apiError, setApiError] = useState('')
  const { register, handleSubmit, formState: { errors } } = useForm<LocationForm>()

  const mutation = useMutation({
    mutationFn: (data: LocationForm) =>
      api.post('/locations', {
        name: data.name,
        description: data.description || null,
        latitude: parseFloat(data.latitude),
        longitude: parseFloat(data.longitude),
        tags: [],
      }),
    onSuccess: () => { onAdded(); onClose() },
    onError: (err: any) => setApiError(err.response?.data?.detail || 'Failed to add location'),
  })

  return (
    <div style={s.overlay} onClick={onClose}>
      <div style={s.modal} onClick={(e) => e.stopPropagation()}>
        <div style={s.modalTitle}>Add Location</div>
        {apiError && <div style={{ ...s.errText, marginBottom: '12px' }}>{apiError}</div>}
        <form onSubmit={handleSubmit((d) => mutation.mutate(d))}>
          <div style={s.field}>
            <label style={s.label}>Name *</label>
            <input
              style={s.input}
              placeholder="Location name"
              {...register('name', { required: 'Name is required' })}
            />
            {errors.name && <div style={s.errText}>{errors.name.message}</div>}
          </div>
          <div style={s.field}>
            <label style={s.label}>Description</label>
            <textarea style={s.textarea} placeholder="Notes about this spot…" {...register('description')} />
          </div>
          <div style={{ ...s.field, ...s.coordRow }}>
            <div>
              <label style={s.label}>Latitude *</label>
              <input
                style={s.input}
                placeholder="25.0330"
                {...register('latitude', {
                  required: 'Required',
                  validate: (v) => !isNaN(parseFloat(v)) || 'Must be a number',
                })}
              />
              {errors.latitude && <div style={s.errText}>{errors.latitude.message}</div>}
            </div>
            <div>
              <label style={s.label}>Longitude *</label>
              <input
                style={s.input}
                placeholder="121.5654"
                {...register('longitude', {
                  required: 'Required',
                  validate: (v) => !isNaN(parseFloat(v)) || 'Must be a number',
                })}
              />
              {errors.longitude && <div style={s.errText}>{errors.longitude.message}</div>}
            </div>
          </div>
          <div style={s.modalActions}>
            <button type="button" style={s.cancelBtn} onClick={onClose}>Cancel</button>
            <button type="submit" style={s.submitBtn} disabled={mutation.isPending}>
              {mutation.isPending ? 'Adding…' : 'Add Location'}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}

// ─── MapExplore ───────────────────────────────────────────────────────────────

const MapExplore: React.FC = () => {
  const queryClient = useQueryClient()
  const [search, setSearch] = useState('')
  const [target, setTarget] = useState<[number, number] | null>(null)
  const [showModal, setShowModal] = useState(false)
  const [hoveredId, setHoveredId] = useState<string | null>(null)

  const { data: locations = [] } = useQuery<Location[]>({
    queryKey: ['locations'],
    queryFn: () => api.get('/locations').then((r) => r.data),
  })

  const filtered = locations.filter((l) =>
    l.name.toLowerCase().includes(search.toLowerCase()),
  )

  const handleSelectLocation = (loc: Location) => {
    setTarget([loc.latitude, loc.longitude])
  }

  return (
    <div style={s.page}>
      {/* Left sidebar */}
      <div style={s.sidebar}>
        <div style={s.sidebarHeader}>
          <div style={s.sidebarTitle}>Locations</div>
          <input
            style={s.searchInput}
            placeholder="Search locations…"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
          <button style={s.addBtn} onClick={() => setShowModal(true)}>
            + Add Location
          </button>
        </div>

        <div style={s.locationList}>
          {filtered.length === 0 ? (
            <div style={s.emptyList}>
              {search ? 'No matching locations.' : 'No locations yet.'}
            </div>
          ) : (
            filtered.map((loc) => (
              <div
                key={loc.id}
                style={{
                  ...s.locationItem,
                  background: hoveredId === loc.id ? '#1e1e2e' : 'transparent',
                }}
                onClick={() => handleSelectLocation(loc)}
                onMouseEnter={() => setHoveredId(loc.id)}
                onMouseLeave={() => setHoveredId(null)}
              >
                <div style={s.locationName}>{loc.name}</div>
                {loc.description && <div style={s.locationDesc}>{loc.description}</div>}
                <div style={s.locationCoords}>
                  {Number(loc.latitude).toFixed(4)}, {Number(loc.longitude).toFixed(4)}
                </div>
              </div>
            ))
          )}
        </div>
      </div>

      {/* Map */}
      <div style={s.mapArea}>
        <MapContainer
          center={[25.033, 121.5654]}
          zoom={11}
          style={{ height: '100%', width: '100%' }}
        >
          <TileLayer
            url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
            attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'
          />
          <MapController target={target} />
          <ClusterMarkers locations={locations} />
        </MapContainer>
      </div>

      {/* Add location modal */}
      {showModal && (
        <AddLocationModal
          onClose={() => setShowModal(false)}
          onAdded={() => queryClient.invalidateQueries({ queryKey: ['locations'] })}
        />
      )}
    </div>
  )
}

export default MapExplore
