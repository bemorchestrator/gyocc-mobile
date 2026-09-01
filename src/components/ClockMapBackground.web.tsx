import React from "react";
import { StyleSheet, View } from "react-native";
import type { ClockMapBackgroundProps } from "./ClockMapBackground";

export default function ClockMapBackground({
  venueName,
  venueAddress,
  venueLatitude,
  venueLongitude,
}: ClockMapBackgroundProps) {
  const query = Number.isFinite(venueLatitude) && Number.isFinite(venueLongitude)
    ? `${venueLatitude},${venueLongitude}`
    : venueAddress
      ? `${venueAddress}, Philippines`
      : "General Santos City, Philippines";
  const src = `https://www.google.com/maps?q=${encodeURIComponent(query)}&z=16&output=embed`;

  return (
    <View style={StyleSheet.absoluteFill}>
      {React.createElement("iframe", {
        src,
        title: `${venueName || "Activity venue"} map`,
        style: { width: "100%", height: "100%", border: 0 },
      })}
    </View>
  );
}
