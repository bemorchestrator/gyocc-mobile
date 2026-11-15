// Account: a short, airy list of what a member can see and change.
import React from "react";
import { ActivityIndicator, KeyboardAvoidingView, Modal, Platform, Pressable, ScrollView, StyleSheet, Text, TextInput, View } from "react-native";
import { useNavigation } from "@react-navigation/native";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { StatusBar } from "expo-status-bar";
import Toast from "react-native-toast-message";
import { updateProfile } from "../../api/profile";
import { DEFAULT_MEMBER_SETTINGS, getPreferences, MemberSettingsPreferences, updatePreferencesRemote } from "../../api/preferences";
import { forgotPassword } from "../../api/auth";
import { emailSupport, openPrivacyPolicy, SUPPORT_EMAIL } from "../../constants/links";
import { C, ClockFab, F, GUTTER, Headline, TopBar, usePortal } from "./kit";

type Editing = { key: "phone" | "voicePart"; label: string; value: string } | null;

export default function AccountScreen() {
  const navigation = useNavigation<any>();
  const queryClient = useQueryClient();
  const query = usePortal();
  const portal = query.data;
  const [editing, setEditing] = React.useState<Editing>(null);

  const preferences = useQuery({ queryKey: ["member-preferences"], queryFn: getPreferences, initialData: DEFAULT_MEMBER_SETTINGS });
  const reminders = preferences.data.scheduleReminders && preferences.data.rsvpReminders;
  const setReminders = useMutation({
    mutationFn: (on: boolean) => updatePreferencesRemote({ scheduleReminders: on, rsvpReminders: on }),
    onSuccess: (data: MemberSettingsPreferences) => queryClient.setQueryData(["member-preferences"], data),
    onError: (error: { message?: string }) => Toast.show({ type: "error", text1: "Could not save", text2: error.message }),
  });
  const save = useMutation({
    mutationFn: (patch: { phone?: string; voicePart?: string }) => updateProfile(patch),
    onSuccess: async () => {
      setEditing(null);
      await queryClient.invalidateQueries({ queryKey: ["member-portal"] });
      Toast.show({ type: "success", text1: "Saved" });
    },
    onError: (error: { message?: string }) => Toast.show({ type: "error", text1: "Could not save", text2: error.message }),
  });
  const reset = useMutation({
    mutationFn: () => forgotPassword(portal?.user.email || ""),
    onSuccess: () => Toast.show({ type: "success", text1: "Reset code sent", text2: portal?.user.email }),
    onError: (error: { message?: string }) => Toast.show({ type: "error", text1: "Could not send", text2: error.message }),
  });

  const name = (portal?.member.name || portal?.user.name || "Member").split(" ")[0];
  const part = portal?.member.voicePart || portal?.member.rank || "";

  return (
    <View style={styles.root}>
      <StatusBar style="dark" />
      <TopBar left={{ kind: "back", label: "Back", onPress: () => (navigation.canGoBack() ? navigation.goBack() : navigation.navigate("Home")) }} />
      <ScrollView contentContainerStyle={{ paddingBottom: 160 }} showsVerticalScrollIndicator={false}>
        <Headline strong={name} light={part} />
        {query.isLoading ? <ActivityIndicator style={{ marginTop: 80 }} color={C.grey} /> : null}
        {portal ? (
          <View style={{ marginTop: 22 }}>
            <Row label="Phone" value={portal.member.phone || "Add a number"} onPress={() => setEditing({ key: "phone", label: "Phone", value: portal.member.phone || "" })} />
            <Row label="Part" value={portal.member.voicePart || "Add your part"} onPress={() => setEditing({ key: "voicePart", label: "Part", value: portal.member.voicePart || "" })} />
            <Row label="Section" value={`${portal.member.section} · ${portal.member.rank}`} />
            <Row label="Email" value={portal.member.email || portal.user.email} />
            <Row label="Reminders" value={reminders ? "On" : "Off"} onPress={() => setReminders.mutate(!reminders)} />
            <Row label="Password" value={reset.isPending ? "Sending…" : "Send reset code"} onPress={() => reset.mutate()} />
          </View>
        ) : null}
        {/* Always reachable, even if the member record fails to load (store requirement). */}
        {!query.isLoading ? (
          <View style={{ marginTop: portal ? 0 : 22 }}>
            <Row label="Help" value={SUPPORT_EMAIL} onPress={() => emailSupport()} />
            <Row label="Privacy policy" value="gyocc.org/privacy" onPress={() => openPrivacyPolicy()} />
            <Row label="Delete account" value="Remove your login and personal details" onPress={() => navigation.navigate("DeleteAccount")} danger />
          </View>
        ) : null}
      </ScrollView>
      <ClockFab onPress={() => navigation.navigate("Clock", { focusNonce: Date.now() })} />

      <Modal visible={Boolean(editing)} transparent animationType="fade" onRequestClose={() => setEditing(null)}>
        <KeyboardAvoidingView behavior={Platform.OS === "ios" ? "padding" : undefined} style={styles.editBackdrop}>
          <View style={styles.editCard}>
            <Text style={styles.label}>{editing?.label}</Text>
            <TextInput
              autoFocus
              value={editing?.value ?? ""}
              onChangeText={(value) => setEditing((current) => (current ? { ...current, value } : current))}
              keyboardType={editing?.key === "phone" ? "phone-pad" : "default"}
              style={styles.input}
              selectionColor={C.maroon}
            />
            <View style={styles.editActions}>
              <Pressable onPress={() => setEditing(null)} hitSlop={10}><Text style={styles.editCancel}>Cancel</Text></Pressable>
              <Pressable disabled={save.isPending} onPress={() => editing && save.mutate({ [editing.key]: editing.value.trim() })} hitSlop={10}>
                <Text style={styles.editSave}>{save.isPending ? "Saving…" : "Save"}</Text>
              </Pressable>
            </View>
          </View>
        </KeyboardAvoidingView>
        {/* A Modal covers the app-level toast, so a failed save showed nothing. */}
        <Toast />
      </Modal>
    </View>
  );
}

function Row({ label, value, onPress, danger }: { label: string; value: string; onPress?: () => void; danger?: boolean }) {
  return (
    <Pressable disabled={!onPress} onPress={onPress} style={styles.row} accessibilityRole={onPress ? "button" : undefined}>
      <Text style={[styles.label, danger && { color: C.maroon }]}>{label}</Text>
      <Text style={styles.value} numberOfLines={1}>{value}</Text>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: C.paper },
  row: { paddingHorizontal: GUTTER, paddingVertical: 22 },
  label: { fontFamily: F.medium, fontSize: 15.5, color: C.ink },
  value: { marginTop: 6, fontFamily: F.regular, fontSize: 14, color: C.grey },
  editBackdrop: { flex: 1, backgroundColor: "rgba(17,17,17,0.28)", justifyContent: "center", padding: 24 },
  editCard: { backgroundColor: C.paper, padding: 28 },
  input: { marginTop: 14, borderBottomWidth: 1.5, borderBottomColor: C.ink, paddingVertical: 8, fontFamily: F.regular, fontSize: 17, color: C.ink },
  editActions: { flexDirection: "row", justifyContent: "flex-end", gap: 28, marginTop: 28 },
  editCancel: { fontFamily: F.regular, fontSize: 15, color: C.grey },
  editSave: { fontFamily: F.demi, fontSize: 15, color: C.maroon },
});
