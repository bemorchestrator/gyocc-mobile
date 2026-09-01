import React, { useEffect, useRef } from "react";
import * as Location from "expo-location";
import { StyleSheet, View } from "react-native";
import MapView, { Circle, Marker, type LatLng, type Region } from "react-native-maps";
import { googleMapsProvider } from "../services/googleMaps";

export interface ClockMapBackgroundProps {
  venueName?: string;
  venueAddress?: string;
  venueLatitude?: number;
  venueLongitude?: number;
  geofenceRadiusMeters?: number;
}

const GENERAL_SANTOS: Region = {
  latitude: 6.1164,
  longitude: 125.1716,
  latitudeDelta: 0.055,
  longitudeDelta: 0.055,
};

export default function ClockMapBackground({
  venueName,
  venueAddress,
  venueLatitude,
  venueLongitude,
  geofenceRadiusMeters = 100,
}: ClockMapBackgroundProps) {
  const mapRef = useRef<MapView>(null);
  const venue = Number.isFinite(venueLatitude) && Number.isFinite(venueLongitude)
    ? { latitude: venueLatitude as number, longitude: venueLongitude as number }
    : undefined;

  useEffect(() => {
    let active = true;

    void (async () => {
      const permission = await Location.requestForegroundPermissionsAsync();
      if (!active || permission.status !== "granted") return;

      try {
        const current = await Location.getCurrentPositionAsync({ accuracy: Location.Accuracy.Balanced });
        if (!active) return;
        const member: LatLng = {
          latitude: current.coords.latitude,
          longitude: current.coords.longitude,
        };
        const points = venue ? [venue, member] : [member];
        mapRef.current?.fitToCoordinates(points, {
          edgePadding: { top: 150, right: 56, bottom: 340, left: 56 },
          animated: true,
        });
      } catch {
        if (venue) {
          mapRef.current?.animateToRegion({
            ...venue,
            latitudeDelta: 0.022,
            longitudeDelta: 0.022,
          });
        }
      }
    })();

    return () => { active = false; };
  }, [venueLatitude, venueLongitude]);

  const initialRegion = venue
    ? { ...venue, latitudeDelta: 0.022, longitudeDelta: 0.022 }
    : GENERAL_SANTOS;

  return (
    <View style={StyleSheet.absoluteFill}>
      <MapView
        ref={mapRef}
        provider={googleMapsProvider}
        style={StyleSheet.absoluteFill}
        initialRegion={initialRegion}
        loadingEnabled
        loadingBackgroundColor="#E8ECE8"
        loadingIndicatorColor="#840016"
        showsUserLocation
        showsMyLocationButton
        toolbarEnabled={false}
      >
        {venue ? (
          <>
            <Circle
              center={venue}
              radius={geofenceRadiusMeters}
              fillColor="rgba(132,0,22,0.14)"
              strokeColor="#840016"
              strokeWidth={2}
            />
            <Marker
              coordinate={venue}
              title={venueName || "Activity venue"}
              description={venueAddress}
              pinColor="#840016"
            />
          </>
        ) : null}
      </MapView>
    </View>
  );
}
