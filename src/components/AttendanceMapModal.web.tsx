import React, { useEffect, useState } from "react";
import { Ionicons } from "@expo/vector-icons";
import { ActivityIndicator, Modal, StyleSheet, Text, TouchableOpacity, View } from "react-native";
import { font } from "../constants/fonts";
import type { AttendanceMapModalProps } from "./AttendanceMapModal";
import type { ClockLocationEvidence } from "../api/memberPortal";

function distanceMeters(from: { latitude: number; longitude: number }, to: { latitude: number; longitude: number }) {
  const radians = (value: number) => value * Math.PI / 180;
  const earthRadius = 6_371_000;
  const latitudeDelta = radians(to.latitude - from.latitude);
  const longitudeDelta = radians(to.longitude - from.longitude);
  const value = Math.sin(latitudeDelta / 2) ** 2
    + Math.cos(radians(from.latitude)) * Math.cos(radians(to.latitude)) * Math.sin(longitudeDelta / 2) ** 2;
  return 2 * earthRadius * Math.asin(Math.sqrt(value));
}

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
  const [location, setLocation] = useState<ClockLocationEvidence>();
  const [locationMessage, setLocationMessage] = useState("Finding your location…");
  const venue = Number.isFinite(venueLatitude) && Number.isFinite(venueLongitude)
    ? { latitude: venueLatitude as number, longitude: venueLongitude as number }
    : undefined;

  useEffect(() => {
    if (!visible || action !== "in") return;
    setLocation(undefined);
    setLocationMessage("Finding your location…");
    navigator.geolocation?.getCurrentPosition(
      (position) => {
        const next = {
          latitude: position.coords.latitude,
          longitude: position.coords.longitude,
          accuracyMeters: position.coords.accuracy,
          capturedAt: new Date(position.timestamp).toISOString(),
        };
        setLocation(next);
        if (!venue) setLocationMessage("The venue pin is not configured.");
        else {
          const distance = distanceMeters(next, venue);
          setLocationMessage(distance <= geofenceRadiusMeters && next.accuracyMeters <= 50
            ? `Inside clock-in area (${Math.round(distance)} m away).`
            : `Outside the verified clock-in area or GPS accuracy is too low.`);
        }
      },
      () => setLocationMessage("Location permission and an accurate GPS fix are required."),
      { enableHighAccuracy: true, maximumAge: 0, timeout: 15_000 }
    );
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [visible, action, venueLatitude, venueLongitude, geofenceRadiusMeters]);

  const query = Number.isFinite(venueLatitude) && Number.isFinite(venueLongitude)
    ? `${venueLatitude},${venueLongitude}`
    : venueAddress || venueName || "General Santos City";
  const src = `https://www.google.com/maps?q=${encodeURIComponent(query)}&z=16&output=embed`;
  const actionLabel = action === "in" ? "Clock in" : "Clock out";

  const confirm = async () => {
    try {
      await onConfirm(location);
      onClose();
    } catch {
      // The parent mutation owns error feedback.
    }
  };
  const accepted = Boolean(location && venue && location.accuracyMeters <= 50 && distanceMeters(location, venue) <= geofenceRadiusMeters);
  const confirmDisabled = busy || (action === "in" && !accepted);

  return (
    <Modal visible={visible} animationType="slide" onRequestClose={onClose}>
      <View style={styles.screen}>
        {React.createElement("iframe", {
          src,
          title: `${venueName || "Venue"} map`,
          style: { width: "100%", height: "100%", border: 0 },
        })}
        <TouchableOpacity style={styles.close} onPress={onClose} disabled={busy} accessibilityLabel="Close map">
          <Ionicons name="close" size={24} color="#15231D" />
        </TouchableOpacity>
        <View style={styles.sheet}>
          <Text style={styles.eyebrow}>CONFIRM LOCATION</Text>
          <Text style={styles.venue}>{venueName || "Activity venue"}</Text>
          <Text style={styles.address}>{venueAddress || "No venue address was provided."}</Text>
          <Text style={styles.location}>{locationMessage}</Text>
          <TouchableOpacity style={[styles.confirm, confirmDisabled && { opacity: 0.65 }]} onPress={() => void confirm()} disabled={confirmDisabled}>
            {busy ? <ActivityIndicator color="#FFFFFF" /> : null}
            <Text style={styles.confirmText}>{busy ? `${actionLabel}…` : `Confirm ${actionLabel.toLowerCase()}`}</Text>
          </TouchableOpacity>
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: "#EAF1ED" },
  close: { position: "absolute", top: 24, left: 24, width: 46, height: 46, borderRadius: 23, backgroundColor: "#FFFFFF", alignItems: "center", justifyContent: "center", shadowColor: "#000000", shadowOpacity: 0.14, shadowRadius: 10 },
  sheet: { position: "absolute", left: 18, right: 18, bottom: 18, borderRadius: 26, backgroundColor: "#FFFFFF", padding: 22, shadowColor: "#000000", shadowOpacity: 0.16, shadowRadius: 18 },
  eyebrow: { color: "#0D9488", fontSize: 10.5, letterSpacing: 1.25, fontFamily: font.extraBold },
  venue: { color: "#15231D", fontSize: 22, fontFamily: font.extraBold, marginTop: 5 },
  address: { color: "#5F7069", fontSize: 13.5, fontFamily: font.regular, marginTop: 4 },
  location: { color: "#5F7069", fontSize: 12.5, fontFamily: font.semiBold, marginTop: 12 },
  confirm: { height: 56, borderRadius: 17, backgroundColor: "#0D9488", marginTop: 18, flexDirection: "row", gap: 9, alignItems: "center", justifyContent: "center" },
  confirmText: { color: "#FFFFFF", fontSize: 16, fontFamily: font.bold },
});
