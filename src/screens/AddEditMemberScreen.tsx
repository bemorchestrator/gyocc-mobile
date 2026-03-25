import React, { useState } from "react";
import {
  View, Text, TextInput, TouchableOpacity, StyleSheet,
  ScrollView, KeyboardAvoidingView, Platform, Image, ActivityIndicator,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useForm, Controller } from "react-hook-form";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { Ionicons } from "@expo/vector-icons";
import * as ImagePicker from "expo-image-picker";
import { createMember, updateMember } from "../api/members";
import { Member } from "../types";
import Toast from "react-native-toast-message";
import type { NativeStackScreenProps } from "@react-navigation/native-stack";
import { font } from "../constants/fonts";
import client from "../api/client";

const TEAL = "#0D9488";

const RANKS   = ["Conductor", "Senior", "Junior", "Apprentice"] as const;
const SECTIONS = ["Choir", "Orchestra", "Both"] as const;
const STATUSES = ["Active", "Inactive", "On Leave"] as const;
const LEVELS   = [null, 1, 2] as const;

const RANK_COLORS: Record<string, string> = {
  Conductor: "#7C3AED", Senior: "#0D9488", Junior: "#0284C7", Apprentice: "#64748B",
};

type Props = NativeStackScreenProps<any>;

interface FormData {
  name: string;
  email: string;
  phone: string;
  notes: string;
  rank: typeof RANKS[number];
  section: typeof SECTIONS[number];
  status: typeof STATUSES[number];
  level: 1 | 2 | null;
  joinDate: string;
}

export default function AddEditMemberScreen({ route, navigation }: Props) {
  const params = route.params as { id?: string; member?: Member } | undefined;
  const existing = params?.member;
  const isEdit = !!existing;
  const insets = useSafeAreaInsets();
  const queryClient = useQueryClient();

  const [avatarUri, setAvatarUri] = useState<string | null>(null);
  const [uploadingAvatar, setUploadingAvatar] = useState(false);
  const [savedMemberId, setSavedMemberId] = useState<string | null>(existing?._id ?? null);

  const { control, handleSubmit, watch, setValue, formState: { errors } } = useForm<FormData>({
    defaultValues: {
      name:     existing?.name     ?? "",
      email:    existing?.email    ?? "",
      phone:    existing?.phone    ?? "",
      notes:    existing?.notes    ?? "",
      rank:     existing?.rank     ?? "Junior",
      section:  existing?.section  ?? "Choir",
      status:   existing?.status   ?? "Active",
      level:    existing?.level    ?? null,
      joinDate: existing?.joinDate
        ? existing.joinDate.slice(0, 10)
        : new Date().toISOString().slice(0, 10),
    },
  });

  const rank   = watch("rank");
  const level  = watch("level");
  const section = watch("section");
  const status = watch("status");

  // ── Save member ────────────────────────────────────────────────────────────
  const saveMutation = useMutation({
    mutationFn: (data: Partial<Member>) =>
      isEdit
        ? updateMember(existing!._id, data)
        : createMember(data),
    onSuccess: async (saved) => {
      queryClient.invalidateQueries({ queryKey: ["members"] });
      if (isEdit) queryClient.invalidateQueries({ queryKey: ["member", existing!._id] });

      // Fix #10: upload avatar before navigating back to avoid race condition
      if (avatarUri) {
        const memberId = saved._id ?? existing!._id;
        setSavedMemberId(memberId);
        await uploadAvatar(memberId, avatarUri);
      } else {
        Toast.show({ type: "success", text1: isEdit ? "Member updated" : "Member added" });
        navigation.goBack();
      }
    },
    onError: (err: Error) => {
      Toast.show({ type: "error", text1: "Error", text2: err.message });
    },
  });

  // ── Avatar upload ──────────────────────────────────────────────────────────
  async function pickAvatar() {
    const { status: perm } = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (perm !== "granted") {
      Toast.show({ type: "error", text1: "Permission denied" });
      return;
    }
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      quality: 0.85,
      allowsEditing: true,
      aspect: [1, 1],
    });
    if (!result.canceled && result.assets[0]) {
      setAvatarUri(result.assets[0].uri);
      // If editing, upload immediately
      if (isEdit && existing?._id) {
        await uploadAvatar(existing._id, result.assets[0].uri, result.assets[0].mimeType);
      }
    }
  }

  async function uploadAvatar(memberId: string, uri: string, mimeType?: string | null) {
    setUploadingAvatar(true);
    try {
      const form = new FormData();
      const filename = uri.split("/").pop() ?? "avatar.jpg";
      form.append("avatar", { uri, name: filename, type: mimeType ?? "image/jpeg" } as any);
      await client.post(`/api/members/${memberId}/avatar`, form, {
        headers: { "Content-Type": "multipart/form-data" },
      });
      queryClient.invalidateQueries({ queryKey: ["member", memberId] });
      queryClient.invalidateQueries({ queryKey: ["members"] });
      Toast.show({ type: "success", text1: isEdit ? "Member updated" : "Member added" });
      navigation.goBack(); // Fix #10: navigate only after upload completes
    } catch {
      Toast.show({ type: "error", text1: "Saved, but photo upload failed" });
      navigation.goBack(); // still navigate even if avatar fails
    } finally {
      setUploadingAvatar(false);
    }
  }

  function onSubmit(data: FormData) {
    // Fix #9: validate join date
    const parsed = new Date(data.joinDate);
    if (isNaN(parsed.getTime())) {
      Toast.show({ type: "error", text1: "Invalid join date", text2: "Use format YYYY-MM-DD" });
      return;
    }
    saveMutation.mutate({
      ...data,
      joinDate: parsed.toISOString(),
    } as Partial<Member>);
  }

  const currentAvatar = avatarUri ?? existing?.avatarUrl ?? null;
  const initials = watch("name")?.split(" ").map((n) => n[0]).join("").toUpperCase().slice(0, 2) || "?";
  const rankColor = RANK_COLORS[rank] ?? TEAL;

  return (
    <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === "ios" ? "padding" : undefined}>
      <View style={styles.root}>
        {/* ── Header ── */}
        <View style={[styles.header, { paddingTop: insets.top + 12 }]}>
          <TouchableOpacity style={styles.navBtn} onPress={() => navigation.goBack()}>
            <Ionicons name="chevron-back" size={20} color="#fff" />
          </TouchableOpacity>
          <Text style={styles.headerTitle}>{isEdit ? "Edit Member" : "Add Member"}</Text>
          <View style={{ width: 38 }} />
        </View>

        <ScrollView contentContainerStyle={[styles.scroll, { paddingBottom: insets.bottom + 40 }]} showsVerticalScrollIndicator={false}>

          {/* ── Avatar picker ── */}
          <View style={styles.avatarSection}>
            <TouchableOpacity style={styles.avatarWrap} onPress={pickAvatar} activeOpacity={0.8}>
              {uploadingAvatar ? (
                <ActivityIndicator size="large" color={TEAL} />
              ) : currentAvatar ? (
                <Image source={{ uri: currentAvatar }} style={styles.avatarImg} />
              ) : (
                <View style={[styles.avatarPlaceholder, { backgroundColor: rankColor + "33" }]}>
                  <Text style={[styles.avatarInitials, { color: rankColor }]}>{initials}</Text>
                </View>
              )}
              <View style={styles.cameraBtn}>
                <Ionicons name="camera" size={14} color="#fff" />
              </View>
            </TouchableOpacity>
            <Text style={styles.avatarHint}>Tap to {currentAvatar ? "change" : "add"} photo</Text>
          </View>

          {/* ── Fields ── */}
          <View style={styles.card}>
            <SectionLabel text="Basic Info" />

            <Field label="Full Name *" error={errors.name?.message}>
              <Controller control={control} name="name"
                rules={{ required: "Name is required" }}
                render={({ field: { value, onChange, onBlur } }) => (
                  <TextInput style={[styles.input, errors.name && styles.inputError]}
                    placeholder="e.g. Juan dela Cruz"
                    placeholderTextColor="#CBD5E1"
                    value={value} onChangeText={onChange} onBlur={onBlur} />
                )}
              />
            </Field>

            <Field label="Email" divider>
              <Controller control={control} name="email"
                render={({ field: { value, onChange, onBlur } }) => (
                  <TextInput style={styles.input}
                    placeholder="email@example.com"
                    placeholderTextColor="#CBD5E1"
                    keyboardType="email-address" autoCapitalize="none"
                    value={value} onChangeText={onChange} onBlur={onBlur} />
                )}
              />
            </Field>

            <Field label="Phone" divider>
              <Controller control={control} name="phone"
                render={({ field: { value, onChange, onBlur } }) => (
                  <TextInput style={styles.input}
                    placeholder="+63 9XX XXX XXXX"
                    placeholderTextColor="#CBD5E1"
                    keyboardType="phone-pad"
                    value={value} onChangeText={onChange} onBlur={onBlur} />
                )}
              />
            </Field>

            <Field label="Join Date *" error={errors.joinDate?.message} divider>
              <Controller control={control} name="joinDate"
                rules={{ required: "Join date is required" }}
                render={({ field: { value, onChange, onBlur } }) => (
                  <TextInput style={[styles.input, errors.joinDate && styles.inputError]}
                    placeholder="YYYY-MM-DD"
                    placeholderTextColor="#CBD5E1"
                    value={value} onChangeText={onChange} onBlur={onBlur} />
                )}
              />
            </Field>
          </View>

          {/* ── Rank ── */}
          <View style={styles.card}>
            <SectionLabel text="Rank" />
            <View style={styles.pillGroup}>
              {RANKS.map((r) => (
                <TouchableOpacity
                  key={r}
                  style={[styles.pill, rank === r && { backgroundColor: RANK_COLORS[r], borderColor: RANK_COLORS[r] }]}
                  onPress={() => setValue("rank", r)}
                >
                  <Text style={[styles.pillText, rank === r && styles.pillTextActive]}>{r}</Text>
                </TouchableOpacity>
              ))}
            </View>

            <View style={[styles.divider, { marginVertical: 14 }]} />
            <Text style={styles.subLabel}>Level</Text>
            <View style={styles.pillGroup}>
              {LEVELS.map((l) => (
                <TouchableOpacity
                  key={String(l)}
                  style={[styles.pill, level === l && styles.pillActive]}
                  onPress={() => setValue("level", l)}
                >
                  <Text style={[styles.pillText, level === l && styles.pillTextActive]}>
                    {l === null ? "None" : `Level ${l}`}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>
          </View>

          {/* ── Section ── */}
          <View style={styles.card}>
            <SectionLabel text="Section" />
            <View style={styles.pillGroup}>
              {SECTIONS.map((s) => (
                <TouchableOpacity
                  key={s}
                  style={[styles.pill, section === s && styles.pillActive]}
                  onPress={() => setValue("section", s)}
                >
                  <Text style={[styles.pillText, section === s && styles.pillTextActive]}>{s}</Text>
                </TouchableOpacity>
              ))}
            </View>
          </View>

          {/* ── Status ── */}
          <View style={styles.card}>
            <SectionLabel text="Status" />
            <View style={styles.pillGroup}>
              {STATUSES.map((s) => (
                <TouchableOpacity
                  key={s}
                  style={[styles.pill, status === s && styles.pillActive]}
                  onPress={() => setValue("status", s)}
                >
                  <Text style={[styles.pillText, status === s && styles.pillTextActive]}>{s}</Text>
                </TouchableOpacity>
              ))}
            </View>
          </View>

          {/* ── Notes ── */}
          <View style={styles.card}>
            <SectionLabel text="Notes" />
            <Controller control={control} name="notes"
              render={({ field: { value, onChange, onBlur } }) => (
                <TextInput style={[styles.input, styles.textarea]}
                  placeholder="Any additional notes..."
                  placeholderTextColor="#CBD5E1"
                  multiline numberOfLines={4}
                  textAlignVertical="top"
                  value={value} onChangeText={onChange} onBlur={onBlur} />
              )}
            />
          </View>

          {/* ── Save ── */}
          <TouchableOpacity
            style={[styles.saveBtn, (saveMutation.isPending || uploadingAvatar) && styles.saveBtnDisabled]}
            onPress={handleSubmit(onSubmit)}
            disabled={saveMutation.isPending || uploadingAvatar}
          >
            {saveMutation.isPending ? (
              <ActivityIndicator color="#fff" />
            ) : (
              <>
                <Ionicons name="checkmark-circle-outline" size={20} color="#fff" />
                <Text style={styles.saveBtnText}>{isEdit ? "Save Changes" : "Add Member"}</Text>
              </>
            )}
          </TouchableOpacity>
        </ScrollView>
      </View>
    </KeyboardAvoidingView>
  );
}

function SectionLabel({ text }: { text: string }) {
  return <Text style={styles.sectionLabel}>{text}</Text>;
}

function Field({ label, children, divider, error }: { label: string; children: React.ReactNode; divider?: boolean; error?: string }) {
  return (
    <View style={[styles.fieldWrap, divider && styles.divider]}>
      <Text style={styles.fieldLabel}>{label}</Text>
      {children}
      {error && <Text style={styles.fieldError}>{error}</Text>}
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: "#F8FAFC" },

  header: {
    backgroundColor: TEAL, paddingBottom: 18, paddingHorizontal: 20,
    flexDirection: "row", alignItems: "center", justifyContent: "space-between",
  },
  navBtn: {
    width: 38, height: 38, borderRadius: 19,
    backgroundColor: "rgba(255,255,255,0.2)", alignItems: "center", justifyContent: "center",
  },
  headerTitle: { fontSize: 17, fontFamily: font.bold, color: "#fff" },

  scroll: { padding: 20, gap: 14 },

  avatarSection: { alignItems: "center", marginBottom: 4 },
  avatarWrap: { position: "relative" },
  avatarImg: { width: 90, height: 90, borderRadius: 45, borderWidth: 3, borderColor: TEAL + "44" },
  avatarPlaceholder: {
    width: 90, height: 90, borderRadius: 45,
    alignItems: "center", justifyContent: "center",
    borderWidth: 2, borderColor: TEAL + "33",
  },
  avatarInitials: { fontSize: 30, fontFamily: font.bold },
  cameraBtn: {
    position: "absolute", bottom: 0, right: 0,
    width: 28, height: 28, borderRadius: 14,
    backgroundColor: TEAL, alignItems: "center", justifyContent: "center",
    borderWidth: 2, borderColor: "#fff",
  },
  avatarHint: { marginTop: 8, fontSize: 12, fontFamily: font.regular, color: "#94A3B8" },

  card: {
    backgroundColor: "#fff", borderRadius: 16,
    borderWidth: 1, borderColor: "#E2E8F0", padding: 16,
  },
  sectionLabel: { fontSize: 12, fontFamily: font.bold, color: "#94A3B8", textTransform: "uppercase", letterSpacing: 0.7, marginBottom: 12 },
  subLabel: { fontSize: 12, fontFamily: font.bold, color: "#94A3B8", textTransform: "uppercase", letterSpacing: 0.7, marginBottom: 10 },

  fieldWrap: { paddingVertical: 6 },
  divider: { borderTopWidth: 1, borderTopColor: "#F1F5F9", paddingTop: 14, marginTop: 6 },
  fieldLabel: { fontSize: 12, fontFamily: font.medium, color: "#64748B", marginBottom: 6 },
  fieldError: { fontSize: 11, color: "#EF4444", marginTop: 4 },
  input: {
    backgroundColor: "#F8FAFC", borderRadius: 10, borderWidth: 1, borderColor: "#E2E8F0",
    paddingHorizontal: 14, paddingVertical: 11, fontSize: 14, fontFamily: font.regular, color: "#1E293B",
  },
  inputError: { borderColor: "#FCA5A5" },
  textarea: { height: 100, paddingTop: 12 },

  pillGroup: { flexDirection: "row", flexWrap: "wrap", gap: 8 },
  pill: {
    paddingHorizontal: 16, paddingVertical: 8, borderRadius: 20,
    backgroundColor: "#F1F5F9", borderWidth: 1.5, borderColor: "transparent",
  },
  pillActive: { backgroundColor: TEAL, borderColor: TEAL },
  pillText: { fontSize: 13, fontFamily: font.semiBold, color: "#64748B" },
  pillTextActive: { color: "#fff" },

  saveBtn: {
    flexDirection: "row", alignItems: "center", justifyContent: "center",
    gap: 8, backgroundColor: TEAL, borderRadius: 14, paddingVertical: 16,
    shadowColor: TEAL, shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.3, shadowRadius: 8, elevation: 4,
  },
  saveBtnDisabled: { opacity: 0.6 },
  saveBtnText: { fontSize: 16, fontFamily: font.bold, color: "#fff" },
});
