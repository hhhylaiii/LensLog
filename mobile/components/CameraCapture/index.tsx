// ============================================================
// CameraCapture — Mobile-only component
//
// Uses expo-image-picker to let the user pick from their library
// or take a new photo. Returns a local URI for upload.
// ============================================================

import React from 'react'
import { TouchableOpacity, Text, StyleSheet, Alert } from 'react-native'
import * as ImagePicker from 'expo-image-picker'

interface CameraCaptureProps {
  onImageSelected: (uri: string, fileName: string) => void
}

export function CameraCapture({ onImageSelected }: CameraCaptureProps) {
  const openCamera = async () => {
    const permission = await ImagePicker.requestCameraPermissionsAsync()
    if (!permission.granted) {
      Alert.alert('需要相機權限', '請在設定中允許 LensLog 存取相機')
      return
    }

    const result = await ImagePicker.launchCameraAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      quality: 0.9,
      exif: true,
    })

    if (!result.canceled && result.assets[0]) {
      const asset = result.assets[0]
      const fileName = asset.fileName ?? `photo_${Date.now()}.jpg`
      onImageSelected(asset.uri, fileName)
    }
  }

  const openLibrary = async () => {
    const permission = await ImagePicker.requestMediaLibraryPermissionsAsync()
    if (!permission.granted) {
      Alert.alert('需要相片庫權限', '請在設定中允許 LensLog 存取相片庫')
      return
    }

    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      quality: 0.9,
      exif: true,
    })

    if (!result.canceled && result.assets[0]) {
      const asset = result.assets[0]
      const fileName = asset.fileName ?? `photo_${Date.now()}.jpg`
      onImageSelected(asset.uri, fileName)
    }
  }

  return (
    <>
      <TouchableOpacity style={styles.btn} onPress={openCamera}>
        <Text style={styles.btnText}>拍攝照片</Text>
      </TouchableOpacity>
      <TouchableOpacity style={[styles.btn, styles.btnSecondary]} onPress={openLibrary}>
        <Text style={styles.btnText}>從相片庫選取</Text>
      </TouchableOpacity>
    </>
  )
}

const styles = StyleSheet.create({
  btn: {
    backgroundColor: '#3b82f6',
    borderRadius: 8,
    paddingVertical: 12,
    paddingHorizontal: 20,
    alignItems: 'center',
    marginVertical: 6,
  },
  btnSecondary: { backgroundColor: '#334155' },
  btnText: { color: '#fff', fontSize: 15, fontWeight: '600' },
})
