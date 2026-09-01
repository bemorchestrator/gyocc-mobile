import React, { useCallback, useEffect, useState } from "react";
import {
  ActivityIndicator,
  Image,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { StatusBar } from "expo-status-bar";
import Toast from "react-native-toast-message";
import { useAuth } from "../context/AuthContext";
import WelcomeBackdrop from "../components/WelcomeBackdrop";
import {
  acceptInvitation,
  createOrganization,
  listMyInvitations,
  rejectInvitation,
  type OrgInvitation,
} from "../api/organizations";
import { font } from "../constants/fonts";

const BG = "#840016";
const HEADER = "#F1F0EC";
const FIELD = "#F4F5F0";
const INK = "#F1F0EC";
const FIELD_INK = "#3F3230";
const MUTED = "#8A7E78";
const ON_PRIMARY = "#F4F5F0";
const PRIMARY = "#840016";

/**
 * Where a newly registered account lands.
 *
 * Everything in the API is scoped to an organization, so an account that
 * belongs to none gets 403 NO_ACTIVE_ORGANIZATION from every feature route.
 * Until this screen existed the app simply dropped those users at the login
 * screen with no explanation and no way forward. Two ways out: accept an
 * invitation someone sent you, or create an organization of your own.
 */
export default function OnboardingScreen() {
  const { user, logout, refreshOrganizations } = useAuth();
  const insets = useSafeAreaInsets();

  const [loading, setLoading] = useState(true);
  const [invitations, setInvitations] = useState<OrgInvitation[]>([]);
  const [orgName, setOrgName] = useState("");
  const [creating, setCreating] = useState(false);
  const [busyInvitation, setBusyInvitation] = useState<string | null>(null);
  const [error, setError] = useState("");

  const load = useCallback(async () => {
    try {
      setInvitations(await listMyInvitations());
    } catch {
      // A failed lookup shouldn't hide the "create one" path.
      setInvitations([]);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  const handleAccept = async (invitation: OrgInvitation) => {
    setError("");
    setBusyInvitation(invitation.id);
    try {
      await acceptInvitation(invitation.id);
      Toast.show({ type: "success", text1: `Welcome to ${invitation.organizationName}` });
      await refreshOrganizations(); // flips the navigator into the app
    } catch (err: unknown) {
      setError((err as { message?: string })?.message ?? "Could not accept the invitation.");
    } finally {
      setBusyInvitation(null);
    }
  };

  const handleDecline = async (invitation: OrgInvitation) => {
    setError("");
    setBusyInvitation(invitation.id);
    try {
      await rejectInvitation(invitation.id);
      setInvitations((current) => current.filter((inv) => inv.id !== invitation.id));
    } catch (err: unknown) {
      setError((err as { message?: string })?.message ?? "Could not decline the invitation.");
    } finally {
      setBusyInvitation(null);
    }
  };

  const handleCreate = async () => {
    const name = orgName.trim();
    if (name.length < 2) {
      setError("Give your organization a name of at least 2 characters.");
      return;
    }

    setError("");
    setCreating(true);
    try {
      await createOrganization(name);
      Toast.show({ type: "success", text1: "Organization created" });
      await refreshOrganizations();
    } catch (err: unknown) {
      setError((err as { message?: string })?.message ?? "Could not create the organization.");
    } finally {
      setCreating(false);
    }
  };

  if (loading) {
    return (
      <View style={[styles.root, styles.center]}>
        <WelcomeBackdrop />
        <ActivityIndicator color={HEADER} />
      </View>
    );
  }

  return (
    <View style={styles.root}>
      <StatusBar style="dark" />
      <WelcomeBackdrop />

      <KeyboardAvoidingView style={styles.fill} behavior={Platform.OS === "ios" ? "padding" : "height"}>
        <ScrollView
          contentContainerStyle={[
            styles.scroll,
            { paddingTop: insets.top + 18, paddingBottom: insets.bottom + 28 },
          ]}
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}
        >
          <View style={styles.brand}>
            <Image
              source={require("../../assets/portal-logo-transparent.png")}
              style={styles.logo}
              resizeMode="contain"
            />
          </View>

          <View style={{ height: 48 }} />

          <View style={styles.panel}>
            <Text style={styles.title}>
              {invitations.length > 0 ? "You've been invited" : "One more step"}
            </Text>
            <Text style={styles.subtitle}>
              {invitations.length > 0
                ? "Accept an invitation to join your group."
                : `You're signed in as ${user?.email ?? "your account"}, but you're not part of any group yet. Ask your conductor for an invitation, or create your own.`}
            </Text>

            {invitations.length > 0 && (
              <View style={styles.inviteList}>
                {invitations.map((invitation) => (
                  <View key={invitation.id} style={styles.inviteCard}>
                    <View style={styles.inviteText}>
                      <Text style={styles.inviteName} numberOfLines={1}>
                        {invitation.organizationName}
                      </Text>
                      <Text style={styles.inviteRole}>Join as {invitation.role}</Text>
                    </View>
                    <View style={styles.inviteActions}>
                      <TouchableOpacity
                        style={[styles.acceptBtn, busyInvitation !== null && { opacity: 0.6 }]}
                        disabled={busyInvitation !== null}
                        onPress={() => handleAccept(invitation)}
                      >
                        {busyInvitation === invitation.id ? (
                          <ActivityIndicator size="small" color={PRIMARY} />
                        ) : (
                          <Text style={styles.acceptBtnText}>Accept</Text>
                        )}
                      </TouchableOpacity>
                      <TouchableOpacity
                        accessibilityLabel={`Decline invitation from ${invitation.organizationName}`}
                        style={styles.declineBtn}
                        disabled={busyInvitation !== null}
                        onPress={() => handleDecline(invitation)}
                      >
                        <Ionicons name="close" size={18} color={ON_PRIMARY} />
                      </TouchableOpacity>
                    </View>
                  </View>
                ))}

                <View style={styles.divider}>
                  <View style={styles.dividerLine} />
                  <Text style={styles.dividerText}>or start fresh</Text>
                  <View style={styles.dividerLine} />
                </View>
              </View>
            )}

            <View style={styles.form}>
              <Text style={styles.inputLabel}>Organization name</Text>
              <TextInput
                style={styles.input}
                placeholder="e.g. GenSan Youth Orchestra"
                placeholderTextColor={MUTED}
                value={orgName}
                onChangeText={(next) => {
                  setOrgName(next);
                  if (error) setError("");
                }}
                autoCapitalize="words"
                returnKeyType="done"
                onSubmitEditing={handleCreate}
              />

              {error ? <Text style={styles.error}>{error}</Text> : null}

              <TouchableOpacity
                style={[styles.primaryBtn, creating && { opacity: 0.65 }]}
                disabled={creating}
                onPress={handleCreate}
              >
                <Text style={styles.primaryBtnText}>
                  {creating ? "Creating…" : "Create organization"}
                </Text>
              </TouchableOpacity>
            </View>

            <TouchableOpacity style={styles.footerLink} onPress={load}>
              <Text style={styles.footer}>Refresh invitations</Text>
            </TouchableOpacity>

            <TouchableOpacity style={styles.footerLink} onPress={logout}>
              <Text style={styles.footer}>Sign out</Text>
            </TouchableOpacity>
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: BG },
  center: { alignItems: "center", justifyContent: "center" },
  fill: { flex: 1 },
  scroll: { flexGrow: 1, paddingHorizontal: 26 },
  brand: { alignItems: "center", justifyContent: "center" },
  logo: { width: "100%", height: 118 },
  panel: { flexGrow: 1 },
  title: {
    color: INK,
    fontSize: 30,
    lineHeight: 36,
    fontFamily: font.extraBold,
    textShadowColor: "rgba(46,0,8,.45)",
    textShadowOffset: { width: 0, height: 2 },
    textShadowRadius: 12,
  },
  subtitle: {
    color: ON_PRIMARY,
    opacity: 0.82,
    fontSize: 13,
    lineHeight: 20,
    fontFamily: font.regular,
    marginTop: 7,
    maxWidth: 320,
  },
  inviteList: { marginTop: 24, gap: 10 },
  inviteCard: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    backgroundColor: "rgba(244,245,240,.12)",
    borderRadius: 16,
    borderWidth: 1,
    borderColor: "rgba(244,245,240,.22)",
    paddingVertical: 12,
    paddingHorizontal: 14,
  },
  inviteText: { flex: 1, minWidth: 0 },
  inviteName: { color: INK, fontSize: 14, fontFamily: font.bold },
  inviteRole: { color: ON_PRIMARY, opacity: 0.72, fontSize: 12, fontFamily: font.medium, marginTop: 2 },
  inviteActions: { flexDirection: "row", alignItems: "center", gap: 8 },
  acceptBtn: {
    height: 38,
    minWidth: 78,
    paddingHorizontal: 14,
    borderRadius: 12,
    backgroundColor: HEADER,
    alignItems: "center",
    justifyContent: "center",
  },
  acceptBtnText: { color: PRIMARY, fontSize: 13, fontFamily: font.bold },
  declineBtn: {
    width: 38,
    height: 38,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: "rgba(244,245,240,.3)",
    alignItems: "center",
    justifyContent: "center",
  },
  divider: { flexDirection: "row", alignItems: "center", gap: 12, marginTop: 12 },
  dividerLine: { flex: 1, height: 1, backgroundColor: "rgba(244,245,240,.25)" },
  dividerText: {
    color: ON_PRIMARY,
    opacity: 0.7,
    fontSize: 11,
    fontFamily: font.semiBold,
    textTransform: "uppercase",
    letterSpacing: 0.6,
  },
  form: { marginTop: 26, gap: 12 },
  inputLabel: { color: INK, fontSize: 12, fontFamily: font.semiBold, marginLeft: 2 },
  input: {
    height: 56,
    borderRadius: 16,
    backgroundColor: FIELD,
    color: FIELD_INK,
    fontSize: 14,
    fontFamily: font.medium,
    paddingHorizontal: 17,
  },
  error: { color: "#FFC9CE", fontSize: 11, fontFamily: font.medium, marginLeft: 3 },
  primaryBtn: {
    height: 56,
    borderRadius: 16,
    backgroundColor: HEADER,
    alignItems: "center",
    justifyContent: "center",
    marginTop: 5,
    shadowColor: "#2E0008",
    shadowOpacity: 0.32,
    shadowRadius: 14,
    shadowOffset: { width: 0, height: 7 },
    elevation: 4,
  },
  primaryBtnText: { color: PRIMARY, fontSize: 14, fontFamily: font.bold },
  footerLink: { marginTop: 18, alignSelf: "center" },
  footer: {
    color: ON_PRIMARY,
    opacity: 0.78,
    fontSize: 12,
    lineHeight: 17,
    fontFamily: font.semiBold,
    textAlign: "center",
  },
});
