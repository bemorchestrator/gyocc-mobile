import React from "react";
import { View } from "react-native";
import MapView, { Circle, Marker } from "react-native-maps";
import { googleMapsProvider } from "../services/googleMaps";
import type { VenueMapProps } from "./VenueMap";

export default function VenueMap({ latitude, longitude, title, geofenceRadiusMeters = 100, height = 220 }: VenueMapProps) {
  const venue = { latitude, longitude };
  // Frame the clock-in radius with some room around it.
  const delta = Math.max(0.004, (geofenceRadiusMeters / 111_000) * 5);
  return (
    <View style={{ height }}>
      <MapView
        provider={googleMapsProvider}
        style={{ flex: 1 }}
        initialRegion={{ ...venue, latitudeDelta: delta, longitudeDelta: delta }}
        loadingEnabled
        loadingBackgroundColor="#EEF0EE"
        loadingIndicatorColor="#840016"
        toolbarEnabled={false}
        rotateEnabled={false}
        pitchEnabled={false}
      >
        <Circle center={venue} radius={geofenceRadiusMeters} fillColor="rgba(132,0,22,0.12)" strokeColor="#840016" strokeWidth={1.5} />
        <Marker coordinate={venue} title={title} pinColor="#840016" />
      </MapView>
    </View>
  );
}
