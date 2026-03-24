import React from 'react'
import { MapContainer, TileLayer, Marker, Popup } from 'react-leaflet'
import 'leaflet/dist/leaflet.css'

const MapExplore: React.FC = () => {
  return (
    <div className="map-explore">
      <h1>📍 攝影地圖探索</h1>
      <MapContainer
        center={[25.0330, 121.5654]}
        zoom={13}
        style={{ height: '80vh', width: '100%' }}
      >
        <TileLayer
          url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
          attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'
        />
      </MapContainer>
    </div>
  )
}

export default MapExplore
