import React from "react";
import { ActivityIndicator, Image, Platform, StatusBar, StyleSheet, View } from "react-native";
import WelcomeBackdrop from "./WelcomeBackdrop";

const BG = "#840016";
const HEADER = "#F1F0EC";


// Rendered before SafeAreaProvider mounts, so insets are unavailable here.
const TOP_INSET = Platform.OS === "android" ? StatusBar.currentHeight ?? 24 : 47;

export default function LoadingSpinner() {
  return (
    <View style={styles.root}>
      <WelcomeBackdrop />

      <View style={[styles.content, { paddingTop: TOP_INSET + 18 }]}>
        <Image source={require("../../assets/portal-logo-transparent.png")} style={styles.logo} resizeMode="contain" />
        <View style={styles.spinnerWrap}>
          <ActivityIndicator size="large" color={HEADER} />
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: BG },
  content: { flex: 1, paddingHorizontal: 26 },
  logo: { width: "100%", height: 118 },
  spinnerWrap: { flex: 1, alignItems: "center", justifyContent: "center", paddingBottom: 40 },
});
