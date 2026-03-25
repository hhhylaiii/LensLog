# React Native 原生功能套件

## 版本

```json
"react-native-maps": "1.14.0",
"react-native-safe-area-context": "4.10.0",
"react-native-screens": "3.31.1",
"@react-navigation/native": "^6.1.17",
"victory-native": "^41.0.0"
```

## 在此專案中的用途與角色

這些套件補充了 Expo SDK 沒有涵蓋的原生 UI 功能，為 LensLog Mobile 提供：

- **地圖顯示**：使用 `react-native-maps` 在 App 內顯示互動地圖（對應 Web 端的 Leaflet）
- **安全區域**：使用 `react-native-safe-area-context` 處理 iPhone 瀏海（notch）、Android 導覽列等裝置邊界
- **原生螢幕**：`react-native-screens` 提供原生 navigation screen 容器，改善效能與動畫
- **圖表**：`victory-native` 提供行動端統計圖表（對應 Web 端的 D3.js）

## react-native-maps

### 用途

在 `mobile/app/(tabs)/map.tsx` 中顯示拍攝景點地圖，功能上對應 Web 的 `MapExplore` 頁面（Leaflet 地圖）。

### 基本使用

```tsx
import MapView, { Marker, Callout } from 'react-native-maps'

function MapScreen() {
  const { data: locations } = useLocations()

  return (
    <MapView
      style={{ flex: 1 }}
      initialRegion={{
        latitude: 25.0330,
        longitude: 121.5654,
        latitudeDelta: 0.1,
        longitudeDelta: 0.1,
      }}
    >
      {locations?.map(loc => (
        <Marker
          key={loc.id}
          coordinate={{ latitude: loc.latitude, longitude: loc.longitude }}
          title={loc.name}
        >
          <Callout>
            <Text>{loc.description}</Text>
          </Callout>
        </Marker>
      ))}
    </MapView>
  )
}
```

### 平台差異

- **iOS**：使用 Apple Maps 底圖（不需要 API key）
- **Android**：使用 Google Maps，需要在 `AndroidManifest.xml` 設定 `MAPS_API_KEY`

```json
// app.json Android 設定
"android": {
  "config": {
    "googleMaps": {
      "apiKey": "YOUR_GOOGLE_MAPS_API_KEY"
    }
  }
}
```

## react-native-safe-area-context

處理不同裝置的安全區域，避免 UI 元素被系統 UI 遮擋：

```tsx
import { SafeAreaView } from 'react-native-safe-area-context'

function Screen() {
  return (
    <SafeAreaView style={{ flex: 1 }}>
      {/* 內容不會被瀏海或 Home indicator 遮蓋 */}
    </SafeAreaView>
  )
}
```

Expo Router 會自動設定 `SafeAreaProvider`，無需手動加入。

## react-native-screens

由 React Navigation 和 Expo Router 在底層使用，**通常不需要直接操作**。它提供原生的 View Controller（iOS）和 Fragment（Android），讓 navigation 動畫更流暢，並減少記憶體使用。

啟用方式（已由 Expo Router 自動處理）：

```typescript
import { enableScreens } from 'react-native-screens'
enableScreens()
```

## victory-native（統計圖表）

Mobile 版 Dashboard（`mobile/app/(tabs)/stats.tsx`）使用 `victory-native` 繪製統計圖表，對應 Web 端 Dashboard 使用的 D3.js。

```tsx
import { VictoryBar, VictoryChart, VictoryAxis } from 'victory-native'

function FocalLengthChart({ data }) {
  return (
    <VictoryChart>
      <VictoryAxis />
      <VictoryBar
        data={data}
        x="focal_length"
        y="count"
        style={{ data: { fill: '#3b82f6' } }}
      />
    </VictoryChart>
  )
}
```

統計資料來源為共用的 `useStats()` hook（`@lenslog/shared`），型別定義見 [shared-package.md](./shared-package.md)。

## expo-camera & expo-image-picker（相機與相片庫）

```tsx
import * as ImagePicker from 'expo-image-picker'
import { CameraView, useCameraPermissions } from 'expo-camera'

// 從相片庫選取
const pickImage = async () => {
  const result = await ImagePicker.launchImageLibraryAsync({
    mediaTypes: ImagePicker.MediaTypeOptions.Images,
    quality: 0.8,
    allowsEditing: true,
  })
  if (!result.canceled) {
    // result.assets[0].uri → 上傳至 S3
  }
}

// 使用相機拍攝
// 見 mobile/components/CameraCapture/
```

相機元件位於 `mobile/components/CameraCapture/` 目錄。

## 相關資源

- [react-native-maps 文件](https://github.com/react-native-maps/react-native-maps)
- [react-native-safe-area-context](https://docs.expo.dev/versions/latest/sdk/safe-area-context/)
- [victory-native 文件](https://commerce.nearform.com/open-source/victory-native/)
- [expo-camera 文件](https://docs.expo.dev/versions/latest/sdk/camera/)
- [expo-image-picker 文件](https://docs.expo.dev/versions/latest/sdk/imagepicker/)
