# Expo & React Native

## 版本

```json
"expo": "~51.0.0",
"react-native": "0.74.0",
"react": "18.2.0"
```

## 在此專案中的用途與角色

Expo SDK 51 是 LensLog Mobile 的基礎框架，提供：
- 跨平台（iOS / Android）的 React Native 開發環境
- 原生 API 的 JavaScript 封裝（相機、相片庫、安全儲存、通知等）
- Metro bundler 與開發工具（Expo Go、EAS Build）

Mobile 應用與 Web 共用 `@lenslog/shared` 中的業務邏輯、型別定義與 API client。

## 應用程式設定（`mobile/app.json`）

```json
{
  "expo": {
    "name": "LensLog",
    "slug": "lenslog",
    "version": "0.1.0",
    "scheme": "lenslog",           // Deep link scheme
    "orientation": "portrait",
    "experiments": {
      "typedRoutes": true          // Expo Router 型別安全路由
    }
  }
}
```

## 原生權限設定

### iOS（`app.json` infoPlist）

```json
"NSCameraUsageDescription": "LensLog 需要相機權限以拍攝照片",
"NSPhotoLibraryUsageDescription": "LensLog 需要相片庫權限以選取照片",
"NSLocationWhenInUseUsageDescription": "LensLog 需要位置權限以標記拍攝地點"
```

### Android（`app.json` permissions）

```json
["CAMERA", "READ_EXTERNAL_STORAGE", "WRITE_EXTERNAL_STORAGE",
 "ACCESS_FINE_LOCATION", "RECEIVE_BOOT_COMPLETED", "VIBRATE"]
```

## Expo SDK 套件與用途

| 套件 | 版本 | 用途 |
|---|---|---|
| `expo-router` | ~3.5.0 | 檔案系統路由（見 mobile-expo-router.md） |
| `expo-secure-store` | ~13.0.0 | JWT token 安全儲存（iOS Keychain / Android Keystore） |
| `expo-image-picker` | ~15.0.0 | 從相片庫選取照片 |
| `expo-camera` | ~15.0.0 | 相機捕捉（live preview + capture） |
| `expo-notifications` | ~0.28.0 | 推播通知（器材保養提醒等） |
| `expo-file-system` | ~17.0.0 | 本機檔案系統操作 |
| `expo-constants` | ~16.0.0 | 讀取 app.json 設定與 Expo manifest |
| `expo-status-bar` | ~1.12.1 | 狀態列樣式控制 |

## 開發啟動

Mobile **不在** Docker 環境中，需在本機啟動：

```bash
cd mobile
npm install

# 啟動 Metro bundler（可選擇平台）
npx expo start

# 指定平台
npx expo start --ios
npx expo start --android

# 使用 Expo Go 掃描 QR code 在實機測試
```

### 環境變數

Mobile 使用 `EXPO_PUBLIC_` 前綴的環境變數，這些變數在 Expo build 時被內嵌（inlined）：

```bash
# .env（mobile 目錄下）
EXPO_PUBLIC_API_URL=http://192.168.1.x:8000/api/v1
```

開發時需將 `localhost` 改為本機 IP，因為手機設備無法存取 `localhost`。

## expo-secure-store Token 儲存

`mobile/src/store/authStorage.ts` 將 `expo-secure-store` 包裝成 Zustand `StateStorage` 介面：

```typescript
import * as SecureStore from 'expo-secure-store'

export const secureStorage = {
  getItem: (key: string) => SecureStore.getItemAsync(key),
  setItem: (key: string, value: string) => SecureStore.setItemAsync(key, value),
  removeItem: (key: string) => SecureStore.deleteItemAsync(key),
}
```

## NativeWind（Tailwind CSS for React Native）

```json
"nativewind": "^4.0.1",
"tailwindcss": "^3.4.0"
```

NativeWind v4 讓 React Native 元件可以使用 Tailwind CSS class 名稱，需在 `babel.config.js` 中加入 plugin：

```js
plugins: ['nativewind/babel', ...]
```

## 相關資源

- [Expo 官方文件](https://docs.expo.dev/)
- [Expo SDK 51 Changelog](https://expo.dev/changelog/2024/05-07-sdk-51)
- [expo-secure-store](https://docs.expo.dev/versions/latest/sdk/securestore/)
- [NativeWind v4 文件](https://www.nativewind.dev/)
