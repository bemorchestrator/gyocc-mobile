import React, { useEffect, useRef, useState } from "react";
import * as Location from "expo-location";
import { Ionicons } from "@expo/vector-icons";
import {
  ActivityIndicator,
  Modal,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from "react-native";
import MapView, { Circle, Marker, type LatLng, type Region } from "react-native-maps";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { font } from "../constants/fonts";
import { googleMapsConfigured, googleMapsProvider } from "../services/googleMaps";
import type { ClockLocationEvidence } from "../api/memberPortal";
import { clockInFailureFeedback } from "../utils/clockInFeedback";

export interface AttendanceMapModalProps {
  visible: boolean;
  action: "in" | "out";
  venueName?: string;
  venueAddress?: string;
  venueLatitude?: number;
  venueLongitude?: number;
  geofenceRadiusMeters?: number;
  busy: boolean;
  onClose: () => void;
  onConfirm: (location?: ClockLocationEvidence) => Promise<void>;
}

type LocatedMember = LatLng & { accuracyMeters: number; capturedAt: string; isMocked?: boolean };

function distanceMeters(from: LatLng, to: LatLng) {
  const radians = (value: number) => value * Math.PI / 180;
  const earthRadius = 6_371_000;
  const latitudeDelta = radians(to.latitude - from.latitude);
  const longitudeDelta = radians(to.longitude - from.longitude);
  const value = Math.sin(latitudeDelta / 2) ** 2
    + Math.cos(radians(from.latitude)) * Math.cos(radians(to.latitude)) * Math.sin(longitudeDelta / 2) ** 2;
  return 2 * earthRadius * Math.asin(Math.sqrt(value));
}

const FALLBACK_REGION: Region = {
  latitude: 6.1164,
  longitude: 125.1716,
  latitudeDelta: 0.08,
  longitudeDelta: 0.08,
};

export default function AttendanceMapModal({
  visible,
  action,
  venueName,
  venueAddress,
  venueLatitude,
  venueLongitude,
  geofenceRadiusMeters = 100,
  busy,
  onClose,
  onConfirm,
}: AttendanceMapModalProps) {
  const insets = useSafeAreaInsets();
  const mapRef = useRef<MapView>(null);
  const [memberLocation, setMemberLocation] = useState<LocatedMember>();
  const [resolvedVenue, setResolvedVenue] = useState<LatLng>();
  const [locationMessage, setLocationMessage] = useState("Finding your location…");
  const [refreshNonce, setRefreshNonce] = useState(0);
  const [clockMs, setClockMs] = useState(Date.now());
  const [submissionError, setSubmissionError] = useState<string>();

  useEffect(() => {
    if (!visible) return;
    let active = true;
    const suppliedVenue =
      Number.isFinite(venueLatitude) && Number.isFinite(venueLongitude)
        ? { latitude: venueLatitude as number, longitude: venueLongitude as number }
        : undefined;
    setResolvedVenue(suppliedVenue);
    setMemberLocation(undefined);
    setSubmissionError(undefined);
    setClockMs(Date.now());
    setLocationMessage("Finding your location…");
    if (action === "out") {
      setLocationMessage("Review the venue, then confirm that you are finishing this activity.");
      return;
    }

    void (async () => {
      try {
        const permission = await Location.requestForegroundPermissionsAsync();
        if (permission.status !== "granted") {
          if (active) setLocationMessage("Location permission is required to clock in.");
          return;
        }
        const servicesEnabled = await Location.hasServicesEnabledAsync();
        if (!servicesEnabled) {
          if (active) setLocationMessage("Turn on Location Services to clock in.");
          return;
        }
        const current = await Location.getCurrentPositionAsync({ accuracy: Location.Accuracy.High });
        if (!active) return;
        const located = {
          latitude: current.coords.latitude,
          longitude: current.coords.longitude,
          accuracyMeters: current.coords.accuracy ?? Number.POSITIVE_INFINITY,
          capturedAt: new Date(current.timestamp).toISOString(),
          isMocked: current.mocked === true,
        };
        setMemberLocation(located);
        if (!suppliedVenue) setLocationMessage("The venue pin is not configured. Contact an administrator.");
        else if (located.isMocked) setLocationMessage("Mock location data cannot be used to clock in.");
        else if (located.accuracyMeters > 50) setLocationMessage(`GPS accuracy is ${Math.round(located.accuracyMeters)} m. Move to an open area and retry.`);
        else {
          const distance = distanceMeters(located, suppliedVenue);
          setLocationMessage(distance + located.accuracyMeters <= geofenceRadiusMeters
            ? `You are inside the clock-in area (${Math.round(distance)} m from the venue).`
            : `You are ${Math.round(distance)} m away. Move within ${geofenceRadiusMeters} m to clock in.`);
        }
      } catch {
        if (active) setLocationMessage("Your current position is unavailable. Retry when GPS is ready.");
      }
    })();

    return () => {
      active = false;
    };
  }, [action, geofenceRadiusMeters, refreshNonce, visible, venueLatitude, venueLongitude]);

  useEffect(() => {
    if (!visible || action !== "in") return;
    const timer = setInterval(() => setClockMs(Date.now()), 1_000);
    return () => clearInterval(timer);
  }, [action, visible]);

  useEffect(() => {
    if (!visible) return;
    const points = [resolvedVenue, memberLocation].filter(Boolean) as LatLng[];
    if (!points.length) return;
    const timer = setTimeout(() => {
      if (points.length === 1) {
        mapRef.current?.animateToRegion({ ...points[0], latitudeDelta: 0.025, longitudeDelta: 0.025 });
      } else {
        mapRef.current?.fitToCoordinates(points, {
          edgePadding: { top: 130, right: 48, bottom: 300, left: 48 },
          animated: true,
        });
      }
    }, 250);
    return () => clearTimeout(timer);
  }, [memberLocation, resolvedVenue, visible]);

  const confirm = async () => {
    try {
      setSubmissionError(undefined);
      await onConfirm(memberLocation ? {
        latitude: memberLocation.latitude,
        longitude: memberLocation.longitude,
        accuracyMeters: memberLocation.accuracyMeters,
        capturedAt: memberLocation.capturedAt,
        isMocked: memberLocation.isMocked,
      } : undefined);
      onClose();
    } catch (error) {
      const feedback = clockInFailureFeedback(error);
      setSubmissionError(feedback.message);
      if (feedback.action === "refresh-activity") onClose();
    }
  };

  const initialRegion = resolvedVenue
    ? { ...resolvedVenue, latitudeDelta: 0.025, longitudeDelta: 0.025 }
    : FALLBACK_REGION;
  const actionLabel = action === "in" ? "Clock in" : "Clock out";
  const measuredDistance = resolvedVenue && memberLocation ? distanceMeters(memberLocation, resolvedVenue) : Number.POSITIVE_INFINITY;
  const locationAgeMs = memberLocation ? clockMs - new Date(memberLocation.capturedAt).getTime() : Number.POSITIVE_INFINITY;
  const locationExpired = Boolean(memberLocation && (locationAgeMs > 60_000 || locationAgeMs < -10_000));
  const locationAccepted = Boolean(
    resolvedVenue
    && memberLocation
    && memberLocation.accuracyMeters <= 50
    && memberLocation.isMocked !== true
    && !locationExpired
    && measuredDistance + memberLocation.accuracyMeters <= geofenceRadiusMeters
  );
  const displayedLocationMessage = submissionError
    ?? (locationExpired ? "Your GPS position expired. Refresh it before clocking in." : locationMessage);

  useEffect(() => {
    if (visible && action === "in" && locationExpired) setRefreshNonce((value) => value + 1);
  }, [action, locationExpired, visible]);
  const confirmDisabled = busy || (action === "in" && !locationAccepted);

  return (
    <Modal visible={visible} animationType="slide" presentationStyle="fullScreen" onRequestClose={onClose}>
      <View style={styles.screen}>
        <MapView
          ref={mapRef}
          provider={googleMapsProvider}
          style={StyleSheet.absoluteFill}
          initialRegion={initialRegion}
          loadingEnabled
          loadingBackgroundColor="#EAF1ED"
          loadingIndicatorColor="#0D9488"
          showsUserLocation
          showsMyLocationButton
        >
          {resolvedVenue ? (
            <>
              <Circle center={resolvedVenue} radius={geofenceRadiusMeters} fillColor="rgba(13,148,136,0.14)" strokeColor="#0D9488" strokeWidth={2} />
              <Marker coordinate={resolvedVenue} title={venueName || "Venue"} description={venueAddress} pinColor="#0D9488" />
            </>
          ) : null}
        </MapView>

        <View style={[styles.topBar, { paddingTop: insets.top + 10 }]}>
          <TouchableOpacity style={styles.iconButton} onPress={onClose} disabled={busy} accessibilityLabel="Close map">
            <Ionicons name="close" size={24} color="#15231D" />
          </TouchableOpacity>
          <View style={styles.titleChip}><Text style={styles.title}>{actionLabel}</Text></View>
          <View style={styles.iconSpacer} />
        </View>

        <View style={[styles.sheet, { paddingBottom: Math.max(insets.bottom + 16, 26) }]}>
          <View style={styles.handle} />
          <Text style={styles.eyebrow}>{action === "in" ? "CONFIRM LOCATION" : "FINISH ATTENDANCE"}</Text>
          <Text style={styles.venue}>{venueName || "Activity venue"}</Text>
          <Text style={styles.address}>{venueAddress || "No venue address was provided."}</Text>
          <View style={styles.locationRow}>
            <Ionicons name={action === "in" ? "navigate-circle" : "checkmark-circle"} size={19} color="#0D9488" />
            <Text style={styles.locationText}>{displayedLocationMessage}</Text>
          </View>
          {action === "in" ? (
            <TouchableOpacity style={styles.refreshButton} disabled={busy} onPress={() => { setSubmissionError(undefined); setRefreshNonce((value) => value + 1); }}>
              <Ionicons name="refresh" size={16} color="#0D9488" />
              <Text style={styles.refreshText}>Refresh GPS</Text>
            </TouchableOpacity>
          ) : null}
          {!googleMapsConfigured ? (
            <Text style={styles.warning}>Google map tiles require a new native build with the configured key.</Text>
          ) : null}
          <TouchableOpacity style={[styles.confirmButton, confirmDisabled && styles.disabled]} onPress={() => void confirm()} disabled={confirmDisabled}>
            {busy ? <ActivityIndicator color="#FFFFFF" /> : <Ionicons name={action === "in" ? "log-in-outline" : "log-out-outline"} size={21} color="#FFFFFF" />}
            <Text style={styles.confirmText}>{busy ? `${actionLabel}…` : `Confirm ${actionLabel.toLowerCase()}`}</Text>
          </TouchableOpacity>
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: "#EAF1ED" },
  topBar: { position: "absolute", top: 0, left: 0, right: 0, paddingHorizontal: 18, flexDirection: "row", alignItems: "center", justifyContent: "space-between" },
  iconButton: { width: 46, height: 46, borderRadius: 23, backgroundColor: "#FFFFFF", alignItems: "center", justifyContent: "center", shadowColor: "#000000", shadowOpacity: 0.12, shadowRadius: 10, shadowOffset: { width: 0, height: 4 }, elevation: 5 },
  iconSpacer: { width: 46 },
  titleChip: { minHeight: 44, borderRadius: 22, paddingHorizontal: 20, backgroundColor: "#FFFFFF", alignItems: "center", justifyContent: "center", shadowColor: "#000000", shadowOpacity: 0.1, shadowRadius: 10, shadowOffset: { width: 0, height: 4 }, elevation: 4 },
  title: { color: "#15231D", fontSize: 16, fontFamily: font.extraBold },
  sheet: { position: "absolute", left: 12, right: 12, bottom: 12, borderRadius: 28, backgroundColor: "#FFFFFF", paddingHorizontal: 22, paddingTop: 11, shadowColor: "#000000", shadowOpacity: 0.16, shadowRadius: 18, shadowOffset: { width: 0, height: -4 }, elevation: 12 },
  handle: { width: 44, height: 5, borderRadius: 3, backgroundColor: "#D4DDD8", alignSelf: "center", marginBottom: 17 },
  eyebrow: { color: "#0D9488", fontSize: 10.5, letterSpacing: 1.25, fontFamily: font.extraBold },
  venue: { color: "#15231D", fontSize: 22, fontFamily: font.extraBold, marginTop: 5 },
  address: { color: "#5F7069", fontSize: 13.5, lineHeight: 19, fontFamily: font.regular, marginTop: 4 },
  locationRow: { flexDirection: "row", alignItems: "center", gap: 7, marginTop: 14 },
  locationText: { color: "#5F7069", fontSize: 12.5, fontFamily: font.semiBold, flex: 1 },
  warning: { color: "#8A6117", fontSize: 11.5, lineHeight: 17, fontFamily: font.semiBold, marginTop: 10 },
  refreshButton: { alignSelf: "flex-start", flexDirection: "row", alignItems: "center", gap: 6, marginTop: 10, paddingVertical: 6 },
  refreshText: { color: "#0D9488", fontSize: 12.5, fontFamily: font.bold },
  confirmButton: { height: 56, borderRadius: 17, backgroundColor: "#0D9488", marginTop: 18, flexDirection: "row", gap: 9, alignItems: "center", justifyContent: "center" },
  disabled: { opacity: 0.65 },
  confirmText: { color: "#FFFFFF", fontSize: 16, fontFamily: font.bold },
});
