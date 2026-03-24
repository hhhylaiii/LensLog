import React from 'react'
import { View, Text, StyleSheet, ActivityIndicator } from 'react-native'
import MapView, { Marker } from 'react-native-maps'
import { useLocations } from '@shared/hooks/useLocations'
import { api } from '../../src/api'

export default function MapScreen() {
  const { data: locations, isLoading, isError } = useLocations(api)

  if (isLoading) {
    return (
      <View style={styles.centered}>
        <ActivityIndicator size="large" color="#3b82f6" />
      </View>
    )
  }

  if (isError) {
    return (
      <View style={styles.centered}>
        <Text style={styles.errorText}>無法載入景點資料，請稍後再試</Text>
      </View>
    )
  }

  return (
    <MapView
      style={styles.map}
      initialRegion={{
        latitude: 25.033,
        longitude: 121.5654,
        latitudeDelta: 0.0922,
        longitudeDelta: 0.0421,
      }}
      showsUserLocation
    >
      {locations?.map((location) => (
        <Marker
          key={location.id}
          coordinate={{ latitude: location.latitude, longitude: location.longitude }}
          title={location.name}
          description={location.description}
        />
      ))}
    </MapView>
  )
}

const styles = StyleSheet.create({
  map: { flex: 1 },
  centered: { flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: '#0f172a' },
  errorText: { color: '#f87171', fontSize: 16 },
})
