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

### 實作位置

```
frontend/src/pages/MapExplore.tsx
```

地圖頁採單檔元件設計：`MapContainer` + 自訂 `ClusterMarkers` 子元件 + `MapController`（飛入指定座標）皆寫在同一檔。

### 基本地圖設定

```tsx
import { MapContainer, TileLayer } from 'react-leaflet'
import 'leaflet/dist/leaflet.css'

function MapExplore({ locations }) {
  return (
    <MapContainer
      center={[25.0330, 121.5654]}  // 台北作為預設中心
      zoom={11}
      style={{ height: '100%', width: '100%' }}
    >
      <TileLayer
        url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
        attribution='© OpenStreetMap contributors'
      />
      <ClusterMarkers locations={locations} onSelect={...} selectedId={...} />
    </MapContainer>
  )
}
```

### MarkerCluster 聚合（直接用 leaflet.markercluster）

本專案**沒有**用 `react-leaflet-markercluster` 包裝套件，而是直接呼叫原生 Leaflet 的 `markerClusterGroup()`，搭配 React Leaflet 的 `useMap()` hook 在 `useEffect` 內管理 cluster lifecycle：

```tsx
import { useMap } from 'react-leaflet'
import L from 'leaflet'
import 'leaflet.markercluster/dist/MarkerCluster.css'
import 'leaflet.markercluster/dist/MarkerCluster.Default.css'
import 'leaflet.markercluster'

const ClusterMarkers: React.FC<Props> = ({ locations, onSelect, selectedId }) => {
  const map = useMap()

  useEffect(() => {
    const cluster = (L as any).markerClusterGroup({
      iconCreateFunction: (c) =>
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
    return () => { map.removeLayer(cluster) }   // 清理避免 memory leak
  }, [map, locations, onSelect, selectedId])

  return null
}
```

> **為什麼用 useEffect + useMap() 而非 React 元件？** `leaflet.markercluster` 是 imperative API，需要直接 mutate Leaflet map instance。把 lifecycle 包進 `useEffect` 比硬塞進 React 渲染流程更乾淨，cleanup function 能正確 remove layer。

### 自訂 divIcon（取代預設 marker 圖片）

本專案不用預設 marker 圖片（藍色海報釘圖），改用 CSS-only 的 `divIcon`，讓 marker 樣式跟設計稿（uiux/doc 的 web.html）保持一致：

```tsx
const pinIcon = L.divIcon({
  className: 'lenslog-pin',
  html: '<div class="lenslog-pin-shape"></div>',
  iconSize: [24, 24],
  iconAnchor: [12, 22],   // 旋轉 -45deg 後的尖端位置
  popupAnchor: [0, -22],
})

const activePinIcon = L.divIcon({
  className: 'lenslog-pin',
  html: '<div class="lenslog-pin-shape active"></div>',
  iconSize: [24, 24],
  iconAnchor: [12, 22],
  popupAnchor: [0, -22],
})
```

對應 CSS（注入在 `<style>` 區塊）：

```css
.lenslog-pin { background: transparent !important; border: 0 !important; }
.lenslog-pin-shape {
  width: 14px; height: 20px; margin: 2px 5px;
  background: #1e5fb3;
  border: 1.5px solid #ffffff;
  border-radius: 50% 50% 50% 0;
  transform: rotate(-45deg);
}
.lenslog-pin-shape.active {
  background: #60a5fa;     /* 霓虹藍：標示選中景點 */
  border-color: #1a2942;
}
.lenslog-cluster-shape {
  width: 32px; height: 32px; border-radius: 50%;
  background: #fff; color: #1a2942;
  border: 1px solid #dde3ee;
  display: flex; align-items: center; justify-content: center;
  font-weight: 600; font-size: 12px;
}
```

> **iconAnchor 為什麼是 `[12, 22]` 不是 `[7, 20]`？** 旋轉 `-45deg` 後 14×20 的淚滴形狀視覺上會撐到約 24×24，且尖端不在原本的中下方而是旋轉後的右下角。`iconAnchor` 必須對到旋轉後的尖端，否則 marker 會看起來「偏離」實際座標。

### Leaflet Icon 注意事項（fallback / 預設 marker）

如果你還是要用 Leaflet 預設的藍色 marker，Vite 打包時的圖片路徑會失效，需手動 merge：

```typescript
import L from 'leaflet'
import markerIconUrl from 'leaflet/dist/images/marker-icon.png'
import markerIconRetinaUrl from 'leaflet/dist/images/marker-icon-2x.png'
import markerShadowUrl from 'leaflet/dist/images/marker-shadow.png'

delete (L.Icon.Default.prototype as any)._getIconUrl
L.Icon.Default.mergeOptions({
  iconUrl: markerIconUrl,
  iconRetinaUrl: markerIconRetinaUrl,
  shadowUrl: markerShadowUrl,
})
```

> 即使全部 marker 都改用 `divIcon`，仍建議保留這段 — 某些 third-party 套件（如 `leaflet.markercluster` 的 spiderfy 動畫線段）內部會去抓預設 icon，沒設好會 console error。

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
