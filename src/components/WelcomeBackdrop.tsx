import React from "react";
import { Image, StyleSheet, View, useWindowDimensions } from "react-native";
import { LinearGradient } from "expo-linear-gradient";

const BG = "#840016";
const HEADER = "#F1F0EC";

// The rehearsal shot is landscape, so a full-bleed `cover` fill would crop it to
// a narrow vertical slice — barely two players. Laying it out at full screen
// width instead keeps the whole ensemble in frame; the scrim windows it
// vertically so only the players' band shows.
const BAND_ASPECT = 1600 / 1067;
// Starts under the opaque part of the scrim so the photo's top edge is never a
// visible seam; the full frame keeps that headroom available to hide.
const BAND_TOP = .13;

// Cream behind the wordmark, photo through the middle, maroon under the content.
const SCRIM_COLORS = [
  HEADER,
  "rgba(241,240,236,.97)",
  "rgba(241,240,236,.12)",
  "rgba(132,0,22,.3)",
  "rgba(132,0,22,.97)",
  BG,
  "#66000F",
] as const;
const SCRIM_STOPS = [0, .13, .22, .33, .43, .53, 1] as const;

/** Shared photo backdrop for the welcome, register and app-loading screens. */
export default function WelcomeBackdrop() {
  const { width, height } = useWindowDimensions();

  return (
    <>
      {/* Cream base so the semi-transparent top of the scrim never reveals the
          maroon root colour above the photo. */}
      <View style={[styles.creamBase, { height: height * (BAND_TOP + .03) }]} />
      <Image
        source={require("../../assets/welcome-backdrop.jpg")}
        style={[styles.band, { top: height * BAND_TOP, height: width / BAND_ASPECT }]}
        resizeMode="cover"
      />
      <LinearGradient colors={SCRIM_COLORS} locations={SCRIM_STOPS} style={styles.fill} pointerEvents="none" />
    </>
  );
}

const styles = StyleSheet.create({
  fill: { position: "absolute", top: 0, left: 0, right: 0, bottom: 0, width: "100%", height: "100%" },
  creamBase: { position: "absolute", top: 0, left: 0, right: 0, backgroundColor: HEADER },
  band: { position: "absolute", left: 0, right: 0, width: "100%" },
});
