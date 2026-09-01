import React from "react";
import { Image, StyleSheet, Text, TouchableOpacity, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { StatusBar } from "expo-status-bar";
import WelcomeBackdrop from "../components/WelcomeBackdrop";
import { font } from "../constants/fonts";

const BG = "#840016";
const HEADER = "#F1F0EC";
const INK = "#F1F0EC";
const PRIMARY = "#840016";
const ON_PRIMARY = "#F4F5F0";


export default function WelcomeScreen({ navigation }: { navigation: { navigate: (screen: string) => void } }) {
  const insets = useSafeAreaInsets();

  return (
    <View style={styles.root}>
      <StatusBar style="dark" />
      <WelcomeBackdrop />

      <View style={[styles.content, { paddingTop: insets.top + 18, paddingBottom: insets.bottom + 30 }]}>
        <Image source={require("../../assets/portal-logo-transparent.png")} style={styles.logo} resizeMode="contain" />

        <View style={styles.actions}>
          <Text style={styles.title}>Welcome</Text>
          <Text style={styles.subtitle}>
            Rehearsals, schedules, attendance and stipends — everything your music family runs on, in one place.
          </Text>

          <TouchableOpacity style={styles.primaryBtn} onPress={() => navigation.navigate("Login")}>
            <Text style={styles.primaryBtnText}>Log in</Text>
          </TouchableOpacity>

          <TouchableOpacity style={styles.secondaryBtn} onPress={() => navigation.navigate("Register")}>
            <Text style={styles.secondaryBtnText}>Sign up</Text>
          </TouchableOpacity>

          <Text style={styles.footer}>New accounts are reviewed by your conductor or section admin.</Text>
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: BG },
  content: { flex: 1, paddingHorizontal: 26 },
  logo: { width: "100%", height: 118 },
  actions: { flex: 1, justifyContent: "flex-end" },
  title: { color: INK, fontSize: 34, lineHeight: 40, fontFamily: font.extraBold, textShadowColor: "rgba(46,0,8,.45)", textShadowOffset: { width: 0, height: 2 }, textShadowRadius: 12 },
  subtitle: { color: ON_PRIMARY, opacity: 0.82, fontSize: 13, lineHeight: 20, fontFamily: font.regular, marginTop: 9, marginBottom: 26, maxWidth: 320 },
  primaryBtn: { height: 56, borderRadius: 16, backgroundColor: HEADER, alignItems: "center", justifyContent: "center", shadowColor: "#2E0008", shadowOpacity: 0.32, shadowRadius: 14, shadowOffset: { width: 0, height: 7 }, elevation: 4 },
  primaryBtnText: { color: PRIMARY, fontSize: 14, fontFamily: font.bold },
  secondaryBtn: { height: 56, borderRadius: 16, borderWidth: 1.5, borderColor: "rgba(244,245,240,.55)", alignItems: "center", justifyContent: "center", marginTop: 12 },
  secondaryBtnText: { color: ON_PRIMARY, fontSize: 14, fontFamily: font.bold },
  footer: { color: ON_PRIMARY, opacity: 0.66, fontSize: 11, lineHeight: 17, fontFamily: font.regular, textAlign: "center", marginTop: 22 },
});
