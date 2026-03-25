# Leaflet、React Leaflet 與 D3.js

## 版本

```json
"leaflet": "^1.9.4",
"react-leaflet": "^4.2.1",
"leaflet.markercluster": "^1.5.3",
"@types/leaflet": "^1.9.12",
"d3": "^7.9.0",
"@types/d3": "^7.4.3"
```

## 在此專案中的用途與角色

- **Leaflet + React Leaflet**：Web 前端的互動地圖，用於 `MapExplore` 頁面，呈現使用者的拍攝景點分布。
- **leaflet.markercluster**：景點標記聚合套件，當地圖縮放層級較低時將鄰近景點合併為群集，保持地圖可讀性。
- **D3.js**：資料視覺化函式庫，用於 `Dashboard` 頁面的統計圖表（焦段分布、光圈分布、ISO 分布、每月拍攝量等）。

Mobile 端地圖使用 `react-native-maps`（見 [mobile-react-native.md](./mobile-react-native.md)）。

## Leaflet 地圖

### 地圖元件目錄

```
frontend/src/components/Map/
```

### 基本地圖設定

```tsx
import { MapContainer, TileLayer, Marker, Popup } from 'react-leaflet'
import 'leaflet/dist/leaflet.css'

function PhotoMap({ locations }) {
  return (
    <MapContainer
      center={[25.0330, 121.5654]}  // 台北作為預設中心
      zoom={12}
      style={{ height: '100vh', width: '100%' }}
    >
      <TileLayer
        url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
        attribution='© OpenStreetMap contributors'
      />
      {locations.map(loc => (
        <Marker key={loc.id} position={[loc.latitude, loc.longitude]}>
          <Popup>{loc.name}</Popup>
        </Marker>
      ))}
    </MapContainer>
  )
}
```

### MarkerCluster 聚合

```tsx
import MarkerClusterGroup from 'react-leaflet-markercluster'

<MarkerClusterGroup>
  {locations.map(loc => (
    <Marker key={loc.id} position={[loc.latitude, loc.longitude]} />
  ))}
</MarkerClusterGroup>
```

### Leaflet Icon 注意事項

Vite 打包時 Leaflet 的預設 marker icon 路徑會失效，需手動修正：

```typescript
import L from 'leaflet'
import iconUrl from 'leaflet/dist/images/marker-icon.png'
import iconShadowUrl from 'leaflet/dist/images/marker-shadow.png'

L.Icon.Default.mergeOptions({
  iconUrl,
  shadowUrl: iconShadowUrl,
})
```

## D3.js 統計圖表

### 圖表元件目錄

```
frontend/src/components/Charts/
```

### Dashboard 使用的統計資料

來自 `useStats()` hook，型別定義於 `@lenslog/shared`：

```typescript
interface UserStats {
  total_photos: number
  total_locations: number
  total_gear: number
  focal_length_distribution: { focal_length: number; count: number }[]
  aperture_distribution: { aperture: number; count: number }[]
  monthly_counts: { month: string; count: number }[]
}
```

### 典型 D3 圖表模式（React + D3）

```tsx
import { useRef, useEffect } from 'react'
import * as d3 from 'd3'

function BarChart({ data }: { data: { focal_length: number; count: number }[] }) {
  const ref = useRef<SVGSVGElement>(null)

  useEffect(() => {
    if (!ref.current || !data.length) return
    const svg = d3.select(ref.current)
    // D3 操作 SVG...
  }, [data])

  return <svg ref={ref} width={400} height={300} />
}
```

## 相關資源

- [Leaflet 官方文件](https://leafletjs.com/)
- [React Leaflet 文件](https://react-leaflet.js.org/)
- [leaflet.markercluster](https://github.com/Leaflet/Leaflet.markercluster)
- [D3.js 官方文件](https://d3js.org/)
- [OpenStreetMap Tile Usage Policy](https://operations.osmfoundation.org/policies/tiles/)
