import React, { useDeferredValue, useEffect, useState } from 'react'
import api from '../../lib/api'
import type { LocationMatch } from '../../lib/uploadTypes'
import type { DirectoryLocation } from '@shared/types'
import T from '../../styles/tokens'

interface LocationPanelProps {
  gpsLat?: number
  gpsLng?: number
  value?: LocationMatch
  onChange: (value: LocationMatch) => void
}

const mono = "'IBM Plex Mono', monospace"

const LocationPanel: React.FC<LocationPanelProps> = ({ gpsLat, gpsLng, value, onChange }) => {
  const [search, setSearch] = useState('')
  const [results, setResults] = useState<DirectoryLocation[]>([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const deferredSearch = useDeferredValue(search.trim())
  const hasGps = gpsLat != null && gpsLng != null

  useEffect(() => {
    let alive = true
    const controller = new AbortController()

    const fetchDirectory = async () => {
      if (!hasGps && !deferredSearch) {
        setResults([])
        setLoading(false)
        setError(null)
        return
      }
      setLoading(true)
      setError(null)
      try {
        const { data } = await api.get<DirectoryLocation[]>('/location-directory', {
          params: {
            ...(hasGps ? { lat: gpsLat, lng: gpsLng, radius: 1500 } : {}),
            ...(deferredSearch ? { query: deferredSearch } : {}),
          },
          signal: controller.signal,
        })
        if (!alive) return
        setResults(data)
        if (value?.status === 'pending' && data.length > 0) {
          const top = data[0]
          onChange({
            status: 'matched',
            loc: {
              id: top.id,
              name: top.name,
              source: top.source,
              distance: top.distance_m,
            },
          })
        }
      } catch (err: unknown) {
        if (!alive) return
        setError(err instanceof Error ? err.message : '景點搜尋失敗')
      } finally {
        if (alive) setLoading(false)
      }
    }

    fetchDirectory()
    return () => {
      alive = false
      controller.abort()
    }
  }, [deferredSearch, gpsLat, gpsLng, hasGps, onChange, value?.status])

  const chooseLocation = (item: DirectoryLocation) => {
    onChange({
      status: deferredSearch ? 'manual' : 'matched',
      loc: {
        id: item.id,
        name: item.name,
        source: item.source,
        distance: item.distance_m,
      },
    })
  }

  const clearSelection = () => {
    onChange({ status: 'none' })
  }

  return (
    <div style={{ background: T.paperTwo, border: `1px solid ${T.line}`, borderRadius: 10, padding: 14 }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 10 }}>
        <div style={{ fontFamily: mono, textTransform: 'uppercase', letterSpacing: '0.04em', fontSize: 10.5, color: T.inkMute }}>
          景點配對
        </div>
        <span style={{ fontFamily: mono, fontSize: 10.5, color: hasGps ? T.ok : T.inkMute }}>
          {hasGps ? 'GPS 已讀取' : '無 GPS'}
        </span>
      </div>

      <input
        value={search}
        onChange={(e) => setSearch(e.target.value)}
        placeholder="搜尋全站或你的景點"
        style={{
          width: '100%',
          background: T.paper,
          border: `1px solid ${T.line}`,
          borderRadius: 8,
          padding: '9px 10px',
          color: T.ink,
          fontSize: 13,
          boxSizing: 'border-box',
          outline: 'none',
          marginBottom: 10,
        }}
      />

      {value?.loc && (
        <div style={{ display: 'flex', justifyContent: 'space-between', gap: 10, alignItems: 'center', border: `1px solid ${T.ok}`, background: T.okSoft, borderRadius: 8, padding: '9px 10px', marginBottom: 10 }}>
          <div>
            <div style={{ fontSize: 13, fontWeight: 600, color: T.ok }}>{value.loc.name}</div>
            <div style={{ fontSize: 11.5, color: T.inkMute }}>
              {value.loc.source === 'global' ? '全站景點' : '我的景點'}
              {value.loc.distance != null ? ` · ${Math.round(value.loc.distance)}m` : ''}
            </div>
          </div>
          <button onClick={clearSelection} style={{ background: 'none', border: 'none', color: T.inkMute, cursor: 'pointer', fontSize: 12 }}>
            清除
          </button>
        </div>
      )}

      {loading && <div style={{ fontSize: 12, color: T.inkMute }}>尋找景點中…</div>}
      {error && <div style={{ fontSize: 12, color: T.warn }}>{error}</div>}
      {!loading && !error && results.length === 0 && (
        <div style={{ fontSize: 12, color: T.inkMute, lineHeight: 1.5 }}>
          {hasGps ? '附近沒有找到可用景點，試試手動搜尋。' : '這張照片沒有 GPS，可直接手動搜尋景點。'}
        </div>
      )}

      {!loading && results.length > 0 && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 8, marginTop: 8 }}>
          {results.slice(0, 6).map((item) => {
            const selected = value?.loc?.id === item.id && value.loc.source === item.source
            return (
              <button
                key={`${item.source}:${item.id}`}
                type="button"
                onClick={() => chooseLocation(item)}
                style={{
                  textAlign: 'left',
                  background: selected ? T.accentSoft : T.paper,
                  border: `1px solid ${selected ? T.accent : T.line}`,
                  borderRadius: 8,
                  padding: '9px 10px',
                  cursor: 'pointer',
                }}
              >
                <div style={{ display: 'flex', justifyContent: 'space-between', gap: 10 }}>
                  <span style={{ fontSize: 13, fontWeight: 600, color: T.ink }}>{item.name}</span>
                  <span style={{ fontFamily: mono, fontSize: 10.5, color: T.inkMute }}>
                    {item.source === 'global' ? 'GLOBAL' : 'MINE'}
                  </span>
                </div>
                <div style={{ fontSize: 11.5, color: T.inkMute, marginTop: 3 }}>
                  {item.description || '未提供描述'}
                  {item.distance_m != null ? ` · ${Math.round(item.distance_m)}m` : ''}
                </div>
              </button>
            )
          })}
        </div>
      )}
    </div>
  )
}

export default LocationPanel
