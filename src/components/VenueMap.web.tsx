import React from "react";
import { View } from "react-native";
import type { VenueMapProps } from "./VenueMap";

export default function VenueMap({ latitude, longitude, height = 220 }: VenueMapProps) {
  const src = `https://www.google.com/maps?q=${encodeURIComponent(`${latitude},${longitude}`)}&z=16&output=embed`;
  return (
    <View style={{ height }}>
      {React.createElement("iframe", {
        src,
        title: "Venue map",
        style: { border: 0, width: "100%", height: "100%" },
        loading: "lazy",
        referrerPolicy: "no-referrer-when-downgrade",
      })}
    </View>
  );
}
