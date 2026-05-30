import React, { useEffect } from 'react'
import { useMap } from 'react-leaflet'
import L from 'leaflet'
import { ExploreLocation } from './types'
import { pinIcon, activePinIcon } from './mapIcons'

import markerIconUrl from 'leaflet/dist/images/marker-icon.png'
import markerIconRetinaUrl from 'leaflet/dist/images/marker-icon-2x.png'
import markerShadowUrl from 'leaflet/dist/images/marker-shadow.png'

delete (L.Icon.Default.prototype as any)._getIconUrl
L.Icon.Default.mergeOptions({
  iconUrl: markerIconUrl,
  iconRetinaUrl: markerIconRetinaUrl,
  shadowUrl: markerShadowUrl,
})

// ─── PulseStyle ───────────────────────────────────────────────────────────────

export const PulseStyle: React.FC = () => (
  <style>{`
    @keyframes lensLogPulse {
      0%   { box-shadow: 0 0 0 0   rgba(30, 95, 179, 0.5); }
      70%  { box-shadow: 0 0 0 8px rgba(30, 95, 179, 0);   }
      100% { box-shadow: 0 0 0 0   rgba(30, 95, 179, 0);   }
    }
    @keyframes lensLogGoldPulse {
      0%   { box-shadow: 0 0 0 0   rgba(217, 119, 6, 0.5); }
      70%  { box-shadow: 0 0 0 6px rgba(217, 119, 6, 0);   }
      100% { box-shadow: 0 0 0 0   rgba(217, 119, 6, 0);   }
    }
    .lenslog-pin {
      background: transparent !important;
      border: 0 !important;
      filter: drop-shadow(0 2px 3px rgba(26, 41, 66, 0.3));
    }
    .lenslog-cluster {
      background: transparent !important;
      border: 0 !important;
    }
    .lenslog-cluster-shape {
      width: 32px;
      height: 32px;
      border-radius: 50%;
      background: #ffffff;
      color: #1a2942;
      border: 1px solid #dde3ee;
      display: flex;
      align-items: center;
      justify-content: center;
      font-family: 'Inter', 'Noto Sans TC', sans-serif;
      font-weight: 600;
      font-size: 12px;
      box-shadow: 0 2px 6px rgba(26, 41, 66, 0.18);
    }
  `}</style>
)

// ─── ClusterMarkers ───────────────────────────────────────────────────────────

interface ClusterMarkersProps {
  locations: ExploreLocation[]
  onSelect: (loc: ExploreLocation) => void
  selectedId: string | null
}

export const ClusterMarkers: React.FC<ClusterMarkersProps> = ({ locations, onSelect, selectedId }) => {
  const map = useMap()

  useEffect(() => {
    const cluster = (L as any).markerClusterGroup({
      iconCreateFunction: (c: any) =>
        L.divIcon({
          className: 'lenslog-cluster',
          html: `<div class="lenslog-cluster-shape">${c.getChildCount()}</div>`,
          iconSize: [32, 32],
          iconAnchor: [16, 16],
        }),
      showCoverageOnHover: false,
      spiderfyOnMaxZoom: true,
    })

    locations.forEach((loc) => {
      const icon = loc.id === selectedId ? activePinIcon : pinIcon
      const marker = L.marker([loc.latitude, loc.longitude], { icon })
      marker.on('click', () => onSelect(loc))
      cluster.addLayer(marker)
    })

    map.addLayer(cluster)
    return () => {
      map.removeLayer(cluster)
    }
  }, [map, locations, onSelect, selectedId])

  return null
}

// ─── MapController ────────────────────────────────────────────────────────────

export const MapController: React.FC<{ target: [number, number] | null }> = ({ target }) => {
  const map = useMap()
  useEffect(() => {
    if (target) map.flyTo(target, 14, { duration: 1 })
  }, [target, map])
  return null
}

// ─── MapRefSetter ─────────────────────────────────────────────────────────────

export const MapRefSetter: React.FC<{ onReady: (map: L.Map) => void }> = ({ onReady }) => {
  const map = useMap()
  useEffect(() => {
    onReady(map)
  }, [map, onReady])
  return null
}
