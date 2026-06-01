import React from 'react'
import { useNavigate } from 'react-router-dom'
import { MapContainer, TileLayer } from 'react-leaflet'
import { ExploreLocation, MapSource, SheetState, WeatherForecast, t } from './types'
import { PulseStyle, ClusterMarkers, MapController, MapRefSetter } from './MapHelpers'
import MobileSearchBar from './MobileSearchBar'
import MobileSpotsSheet from './MobileSpotsSheet'
import MobileDetailSheet from './MobileDetailSheet'
import L from 'leaflet'
import type { Photo } from '@shared/types'

interface MobileMapViewProps {
  filtered: ExploreLocation[]
  allTags: string[]
  search: string
  onSearch: (v: string) => void
  selectedTag: string | null
  onTagSelect: (tag: string | null) => void
  source: MapSource
  onSourceChange: (src: MapSource) => void
  target: [number, number] | null
  onMapReady: (map: L.Map) => void
  selected: ExploreLocation | null
  onSelect: (loc: ExploreLocation) => void
  onCloseDetail: () => void
  sheetState: SheetState
  onAdvanceSheet: () => void
  spotsSheetOpen: boolean
  onToggleSpotsSheet: () => void
  weather: WeatherForecast | undefined
  weatherLoading: boolean
  weatherError: boolean
  goldenMin: number | null
  locationPhotos: Photo[]
  locationPhotosLoading: boolean
}

const MobileMapView: React.FC<MobileMapViewProps> = ({
  filtered,
  allTags,
  search,
  onSearch,
  selectedTag,
  onTagSelect,
  source,
  onSourceChange,
  target,
  onMapReady,
  selected,
  onSelect,
  onCloseDetail,
  sheetState,
  onAdvanceSheet,
  spotsSheetOpen,
  onToggleSpotsSheet,
  weather,
  weatherLoading,
  weatherError,
  goldenMin,
  locationPhotos,
  locationPhotosLoading,
}) => {
  const navigate = useNavigate()
  const openUploadForLocation = (loc: ExploreLocation) => {
    const params = new URLSearchParams({
      source: loc.source,
      locationId: loc.id,
      locationName: loc.name,
    })
    navigate(`/upload?${params.toString()}`)
  }

  return (
    <div style={{ height: 'calc(100vh - 62px)', overflow: 'hidden', position: 'relative', background: t.paper2, fontFamily: "'Inter','Noto Sans TC',system-ui,sans-serif", color: t.ink, letterSpacing: '-0.005em' }}>
      <PulseStyle />

      {/* Full-screen map (zIndex: 0) */}
      <div style={{ position: 'absolute', inset: 0, zIndex: 0 }}>
        <MapContainer center={[25.033, 121.5654]} zoom={11} zoomControl={false} style={{ height: '100%', width: '100%' }}>
          <TileLayer url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png" attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>' />
          <MapRefSetter onReady={onMapReady} />
          <MapController target={target} />
          <ClusterMarkers locations={filtered} onSelect={onSelect} selectedId={selected?.id ?? null} />
        </MapContainer>
      </div>

      {/* Floating search bar + filter chips */}
      <MobileSearchBar
        search={search}
        onSearch={onSearch}
        allTags={allTags}
        selectedTag={selectedTag}
        onTagSelect={onTagSelect}
      />

      {/* FAB — spots list toggle */}
      <button
        style={{ position: 'absolute', top: 120, right: 12, zIndex: 26, width: 44, height: 44, borderRadius: '50%', background: spotsSheetOpen ? t.accent : t.card, border: `1px solid ${spotsSheetOpen ? t.accent : t.line}`, color: spotsSheetOpen ? '#fff' : t.ink, display: 'flex', alignItems: 'center', justifyContent: 'center', boxShadow: spotsSheetOpen ? '0 1px 2px rgba(15,30,56,0.10),0 6px 14px rgba(30,95,179,0.28)' : '0 1px 2px rgba(15,30,56,0.06),0 6px 14px rgba(15,30,56,0.12)', cursor: 'pointer', padding: 0 }}
        onClick={onToggleSpotsSheet}
        aria-label="景點清單"
      >
        <svg width="20" height="20" viewBox="0 0 24 24" fill="none">
          <path stroke="currentColor" strokeWidth={1.5} strokeLinecap="round" strokeLinejoin="round" d="M8.25 6.75H20.25M8.25 12H20.25M8.25 17.25H20.25M3.75 6.75h.008v.008H3.75V6.75zm.375 0a.375.375 0 11-.75 0 .375.375 0 01.75 0zM3.75 12h.008v.008H3.75V12zm.375 0a.375.375 0 11-.75 0 .375.375 0 01.75 0zm-.375 5.25h.008v.008H3.75v-.008zm.375 0a.375.375 0 11-.75 0 .375.375 0 01.75 0z"/>
        </svg>
      </button>

      {/* Spots list bottom sheet */}
      <MobileSpotsSheet
        open={spotsSheetOpen}
        onClose={() => onToggleSpotsSheet()}
        filtered={filtered}
        search={search}
        source={source}
        onSourceChange={onSourceChange}
        selectedTag={selectedTag}
        onTagSelect={onTagSelect}
        allTags={allTags}
        selectedId={selected?.id ?? null}
        onSelect={onSelect}
      />

      {/* Detail bottom sheet */}
      {selected && sheetState && (
        <MobileDetailSheet
          selected={selected}
          sheetState={sheetState}
          onClose={onCloseDetail}
          onAdvance={onAdvanceSheet}
          onUploadHere={() => openUploadForLocation(selected)}
          weather={weather}
          weatherLoading={weatherLoading}
          weatherError={weatherError}
          goldenMin={goldenMin}
          locationPhotos={locationPhotos}
          locationPhotosLoading={locationPhotosLoading}
        />
      )}
    </div>
  )
}

export default MobileMapView
