// ============================================================
// NativeMap — Mobile-only wrapper around react-native-maps
//
// Provides a consistent interface for the map tab and any
// location pickers. Handles permission requests internally.
// ============================================================

import React from 'react'
import { StyleSheet, View } from 'react-native'
import MapView, { Marker, type Region } from 'react-native-maps'
import type { Location } from '@shared/types'

interface NativeMapProps {
  locations?: Location[]
  initialRegion?: Region
  onLocationPress?: (location: Location) => void
  onMapPress?: (coordinate: { latitude: number; longitude: number }) => void
  style?: object
}

const DEFAULT_REGION: Region = {
  latitude: 25.033,
  longitude: 121.5654,
  latitudeDelta: 0.0922,
  longitudeDelta: 0.0421,
}

export function NativeMap({
  locations = [],
  initialRegion = DEFAULT_REGION,
  onLocationPress,
  onMapPress,
  style,
}: NativeMapProps) {
  return (
    <View style={[styles.container, style]}>
      <MapView
        style={StyleSheet.absoluteFill}
        initialRegion={initialRegion}
        showsUserLocation
        showsMyLocationButton
        onPress={(e) => onMapPress?.(e.nativeEvent.coordinate)}
      >
        {locations.map((location) => (
          <Marker
            key={location.id}
            coordinate={{ latitude: location.latitude, longitude: location.longitude }}
            title={location.name}
            description={location.description}
            onPress={() => onLocationPress?.(location)}
          />
        ))}
      </MapView>
    </View>
  )
}

const styles = StyleSheet.create({
  container: { flex: 1 },
})
