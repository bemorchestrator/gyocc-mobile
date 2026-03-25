import React, { useState } from "react";
import {
  View, Text, TextInput, TouchableOpacity, StyleSheet,
  ScrollView, KeyboardAvoidingView, Platform,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { Ionicons } from "@expo/vector-icons";
import { updateProfile, ProfileData } from "../api/profile";
import { font } from "../constants/fonts";
import Toast from "react-native-toast-message";
import type { NativeStackScreenProps } from "@react-navigation/native-stack";

const TEAL = "#0D9488";
type Props = NativeStackScreenProps<any>;

const POSITIONS = [
  "Member", "Conductor", "Choir Director", "Orchestra Director",
  "Artistic Director", "Music Director", "Secretary", "Treasurer", "Administrator",
];
const SECTIONS = ["Choir", "Orchestra", "Admin", "Both"];

export default function EditProfileScreen({ route, navigation }: Props) {
  const insets = useSafeAreaInsets();
  const queryClient = useQueryClient();
  const existing: Partial<ProfileData> = route.params?.profile ?? {};

  const [name,     setName]     = useState(existing.name     ?? "");
  const [phone,    setPhone]    = useState(existing.phone    ?? "");
  const [position, setPosition] = useState(existing.position ?? "");
  const [section,  setSection]  = useState(existing.section  ?? "");
  const [bio,      setBio]      = useState(existing.bio      ?? "");

  const mutation = useMutation({
    mutationFn: () => updateProfile({ name, phone, position, section, bio }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["profile"] });
      Toast.show({ type: "success", text1: "Profile updated" });
      navigation.goBack();
    },
    onError: () => Toast.show({ type: "error", text1: "Failed to update profile" }),
  });

  return (
    <KeyboardAvoidingView
      style={styles.root}
      behavior={Platform.OS === "ios" ? "padding" : "height"}
    >
      {/* ── Hero ── */}
      <View style={[styles.hero, { paddingTop: insets.top + 12 }]}>
        <View style={styles.decCircle1} />
        <View style={styles.decCircle2} />
        <View style={styles.heroTopRow}>
          <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backBtn}>
            <Ionicons name="chevron-back" size={20} color="#fff" />
          </TouchableOpacity>
        </View>
        <View style={styles.heroIcon}>
          <Ionicons name="create-outline" size={28} color={TEAL} />
        </View>
        <Text style={styles.heroTitle}>Edit Profile</Text>
        <Text style={styles.heroSub}>Update your personal info</Text>
      </View>

      {/* ── White Sheet ── */}
      <ScrollView
        style={styles.sheet}
        contentContainerStyle={styles.sheetContent}
        keyboardShouldPersistTaps="handled"
        showsVerticalScrollIndicator={false}
      >
        <FormLabel text="Full Name" />
        <TextInput
          style={styles.input}
          value={name}
          onChangeText={setName}
          placeholder="Your full name"
          placeholderTextColor="#A0AEC0"
        />

        <FormLabel text="Phone" />
        <TextInput
          style={styles.input}
          value={phone}
          onChangeText={setPhone}
          placeholder="+63..."
          placeholderTextColor="#A0AEC0"
          keyboardType="phone-pad"
        />

        <FormLabel text="Position" />
        <View style={styles.chipWrap}>
          {POSITIONS.map((p) => (
            <TouchableOpacity
              key={p}
              style={[styles.chip, position === p && styles.chipActive]}
              onPress={() => setPosition(p === position ? "" : p)}
            >
              <Text style={[styles.chipText, position === p && styles.chipTextActive]}>{p}</Text>
            </TouchableOpacity>
          ))}
        </View>

        <FormLabel text="Section" />
        <View style={styles.chipRow}>
          {SECTIONS.map((s) => (
            <TouchableOpacity
              key={s}
              style={[styles.chip, section === s && styles.chipActive]}
              onPress={() => setSection(s === section ? "" : s)}
            >
              <Text style={[styles.chipText, section === s && styles.chipTextActive]}>{s}</Text>
            </TouchableOpacity>
          ))}
        </View>

        <FormLabel text="Bio" />
        <TextInput
          style={[styles.input, styles.textArea]}
          value={bio}
          onChangeText={setBio}
          placeholder="Tell something about yourself..."
          placeholderTextColor="#A0AEC0"
          multiline
          textAlignVertical="top"
          maxLength={500}
        />
        <Text style={styles.charCount}>{bio.length}/500</Text>

        <TouchableOpacity
          style={[styles.submitBtn, mutation.isPending && styles.submitBtnDisabled]}
          onPress={() => mutation.mutate()}
          disabled={mutation.isPending}
          activeOpacity={0.85}
        >
          <Ionicons name="checkmark-outline" size={20} color="#fff" />
          <Text style={styles.submitText}>
            {mutation.isPending ? "Saving..." : "Save Changes"}
          </Text>
        </TouchableOpacity>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

function FormLabel({ text }: { text: string }) {
  return <Text style={styles.formLabel}>{text}</Text>;
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: TEAL },

  hero: {
    backgroundColor: TEAL, paddingHorizontal: 24,
    paddingBottom: 44, alignItems: "center", overflow: "hidden",
  },
  decCircle1: {
    position: "absolute", width: 200, height: 200, borderRadius: 100,
    borderWidth: 30, borderColor: "rgba(255,255,255,0.07)", top: -50, right: -50,
  },
  decCircle2: {
    position: "absolute", width: 140, height: 140, borderRadius: 70,
    borderWidth: 22, borderColor: "rgba(255,255,255,0.05)", bottom: -30, left: -20,
  },
  heroTopRow: { alignSelf: "stretch", marginBottom: 12 },
  backBtn: {
    width: 36, height: 36, borderRadius: 18,
    backgroundColor: "rgba(255,255,255,0.2)",
    alignItems: "center", justifyContent: "center",
  },
  heroIcon: {
    width: 62, height: 62, borderRadius: 31, backgroundColor: "#fff",
    alignItems: "center", justifyContent: "center", marginBottom: 10,
    shadowColor: "#000", shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.12, shadowRadius: 8, elevation: 4,
  },
  heroTitle: { fontSize: 22, fontFamily: font.extraBold, color: "#fff", letterSpacing: -0.3 },
  heroSub: { fontSize: 13, fontFamily: font.regular, color: "rgba(255,255,255,0.65)", marginTop: 4 },

  sheet: {
    flex: 1, backgroundColor: "#fff",
    borderTopLeftRadius: 28, borderTopRightRadius: 28, marginTop: -24,
  },
  sheetContent: { padding: 24, paddingBottom: 48 },

  formLabel: { fontSize: 13, fontFamily: font.bold, color: TEAL, marginBottom: 8, marginTop: 18 },
  input: {
    backgroundColor: "#F3F4F6", borderRadius: 10,
    paddingHorizontal: 16, paddingVertical: 13,
    fontSize: 14, fontFamily: font.regular, color: "#1A202C",
  },
  textArea: { minHeight: 96 },
  charCount: { fontSize: 11, fontFamily: font.regular, color: "#94A3B8", textAlign: "right", marginTop: 4 },

  chipWrap: { flexDirection: "row", flexWrap: "wrap", gap: 8 },
  chipRow: { flexDirection: "row", gap: 8 },
  chip: {
    paddingHorizontal: 14, paddingVertical: 9, borderRadius: 20,
    backgroundColor: "#F1F5F9", borderWidth: 1, borderColor: "#E2E8F0",
  },
  chipActive: { backgroundColor: TEAL, borderColor: TEAL },
  chipText: { fontSize: 13, fontFamily: font.semiBold, color: "#64748B" },
  chipTextActive: { color: "#fff" },

  submitBtn: {
    flexDirection: "row", alignItems: "center", justifyContent: "center",
    gap: 8, backgroundColor: TEAL, borderRadius: 12, paddingVertical: 16, marginTop: 28,
    shadowColor: TEAL, shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.35, shadowRadius: 8, elevation: 6,
  },
  submitBtnDisabled: { opacity: 0.6 },
  submitText: { color: "#fff", fontSize: 16, fontFamily: font.bold, letterSpacing: 0.3 },
});
