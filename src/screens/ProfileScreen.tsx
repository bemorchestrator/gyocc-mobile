import React from "react";
import {
  View, Text, ScrollView, TouchableOpacity,
  StyleSheet, Image, RefreshControl,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useQuery } from "@tanstack/react-query";
import { Ionicons } from "@expo/vector-icons";
import { useAuth } from "../context/AuthContext";
import { getProfile } from "../api/profile";
import { font } from "../constants/fonts";
import type { NativeStackScreenProps } from "@react-navigation/native-stack";

const TEAL = "#0D9488";
type IoniconsName = React.ComponentProps<typeof Ionicons>["name"];
type Props = NativeStackScreenProps<any>;

export default function ProfileScreen({ navigation }: Props) {
  const insets = useSafeAreaInsets();
  const { user, logout } = useAuth();

  const { data: profile, refetch: refetchProfile, isRefetching } = useQuery({
    queryKey: ["profile"],
    queryFn: getProfile,
  });

  const initials =
    user?.name?.split(" ").map((n: string) => n[0]).join("").toUpperCase().slice(0, 2) ?? "U";
  const avatarUrl = profile?.avatarUrl || user?.image;

  return (
    <View style={styles.root}>
      <ScrollView
        contentContainerStyle={[styles.scroll, { paddingBottom: 120 }]}
        showsVerticalScrollIndicator={false}
        refreshControl={<RefreshControl refreshing={isRefetching} onRefresh={refetchProfile} tintColor="#fff" />}
      >

        {/* ── Hero ── */}
        <View style={[styles.hero, { paddingTop: insets.top + 20 }]}>
          <View style={styles.decCircle1} />
          <View style={styles.decCircle2} />

          <View style={styles.heroCenter}>
            {avatarUrl ? (
              <Image source={{ uri: avatarUrl }} style={styles.avatarImg} />
            ) : (
              <View style={styles.avatar}>
                <Text style={styles.avatarText}>{initials}</Text>
              </View>
            )}
            <Text style={styles.heroName}>{profile?.name || user?.name || "—"}</Text>
            <Text style={styles.heroEmail}>{user?.email || "—"}</Text>
            {profile?.position ? (
              <View style={styles.positionBadge}>
                <Text style={styles.positionText}>{profile.position}</Text>
              </View>
            ) : null}
          </View>

          <TouchableOpacity
            style={styles.editProfileBtn}
            onPress={() => navigation.navigate("EditProfile", { profile })}
          >
            <Ionicons name="create-outline" size={15} color={TEAL} />
            <Text style={styles.editProfileText}>Edit Profile</Text>
          </TouchableOpacity>
        </View>

        {/* ── White Sheet ── */}
        <View style={styles.sheet}>

          {/* Profile info */}
          <SectionTitle text="My Profile" />
          <View style={styles.card}>
            <InfoRow icon="person-outline"   label="Name"     value={profile?.name     || user?.name || "—"} />
            <InfoRow icon="mail-outline"      label="Email"    value={user?.email       || "—"} divider />
            <InfoRow icon="call-outline"      label="Phone"    value={profile?.phone    || "—"} divider />
            <InfoRow icon="ribbon-outline"    label="Position" value={profile?.position || "—"} divider />
            <InfoRow icon="people-outline"    label="Section"  value={profile?.section  || "—"} divider />
            {profile?.bio ? (
              <InfoRow icon="document-text-outline" label="Bio" value={profile.bio} divider />
            ) : null}
          </View>

          {/* Gig Settings */}
          <SectionTitle text="Gig Settings" top />
          <View style={styles.card}>
            <NavRow
              icon="musical-notes-outline"
              iconBg="#F0FDF9"
              iconColor={TEAL}
              label="Gig Types"
              sub="Manage booking categories"
              onPress={() => navigation.navigate("GigTypes")}
            />
            <NavRow
              icon="cash-outline"
              iconBg="#FEF3C7"
              iconColor="#D97706"
              label="Payout Rates"
              sub="View rate per rank & level"
              onPress={() => navigation.navigate("PayoutRates")}
              divider
            />
          </View>

          {/* Tools */}
          <SectionTitle text="Tools" top />
          <View style={styles.card}>
            <NavRow
              icon="receipt-outline"
              iconBg="#F0FDF4"
              iconColor="#16A34A"
              label="Equipment Loans"
              sub="Track borrowed equipment"
              onPress={() => navigation.navigate("LoanList")}
            />
          </View>

          {/* App */}
          <SectionTitle text="App" top />
          <View style={styles.card}>
            <NavRow
              icon="information-circle-outline"
              iconBg="#F0F9FF"
              iconColor="#0284C7"
              label="Version"
              sub="1.0.0"
              onPress={() => {}}
              noChevron
            />
          </View>

          {/* Logout */}
          <TouchableOpacity style={styles.logoutBtn} onPress={logout} activeOpacity={0.75}>
            <Ionicons name="log-out-outline" size={20} color="#EF4444" />
            <Text style={styles.logoutText}>Log Out</Text>
          </TouchableOpacity>
        </View>
      </ScrollView>
    </View>
  );
}

function SectionTitle({ text, top }: { text: string; top?: boolean }) {
  return <Text style={[styles.sectionTitle, top && { marginTop: 24 }]}>{text}</Text>;
}

function InfoRow({ icon, label, value, divider }: {
  icon: IoniconsName; label: string; value: string; divider?: boolean;
}) {
  return (
    <View style={[styles.infoRow, divider && styles.rowDivider]}>
      <Ionicons name={icon} size={16} color="#94A3B8" style={{ marginTop: 1 }} />
      <Text style={styles.infoLabel}>{label}</Text>
      <Text style={styles.infoValue} numberOfLines={2}>{value}</Text>
    </View>
  );
}

function NavRow({ icon, iconBg, iconColor, label, sub, onPress, divider, noChevron }: {
  icon: IoniconsName; iconBg: string; iconColor: string;
  label: string; sub: string;
  onPress: () => void; divider?: boolean; noChevron?: boolean;
}) {
  return (
    <TouchableOpacity
      style={[styles.navRow, divider && styles.rowDivider]}
      onPress={onPress}
      activeOpacity={noChevron ? 1 : 0.7}
    >
      <View style={[styles.navIconBox, { backgroundColor: iconBg }]}>
        <Ionicons name={icon} size={20} color={iconColor} />
      </View>
      <View style={styles.navText}>
        <Text style={styles.navLabel}>{label}</Text>
        <Text style={styles.navSub}>{sub}</Text>
      </View>
      {!noChevron && <Ionicons name="chevron-forward" size={16} color="#CBD5E1" />}
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: TEAL },
  scroll: { flexGrow: 1 },

  hero: {
    backgroundColor: TEAL,
    paddingBottom: 48,
    paddingHorizontal: 20,
    overflow: "hidden",
    alignItems: "center",
  },
  decCircle1: {
    position: "absolute", width: 280, height: 280, borderRadius: 140,
    borderWidth: 40, borderColor: "rgba(255,255,255,0.07)", top: -80, right: -80,
  },
  decCircle2: {
    position: "absolute", width: 200, height: 200, borderRadius: 100,
    borderWidth: 30, borderColor: "rgba(255,255,255,0.05)", bottom: -60, left: -40,
  },
  heroCenter: { alignItems: "center", marginBottom: 16 },
  avatar: {
    width: 88, height: 88, borderRadius: 44,
    backgroundColor: "rgba(255,255,255,0.2)",
    borderWidth: 3, borderColor: "rgba(255,255,255,0.4)",
    justifyContent: "center", alignItems: "center", marginBottom: 14,
  },
  avatarImg: {
    width: 88, height: 88, borderRadius: 44,
    borderWidth: 3, borderColor: "rgba(255,255,255,0.4)", marginBottom: 14,
  },
  avatarText: { color: "#fff", fontSize: 28, fontFamily: font.extraBold, letterSpacing: 1 },
  heroName: { fontSize: 22, fontFamily: font.extraBold, color: "#fff", letterSpacing: -0.3, marginBottom: 4 },
  heroEmail: { fontSize: 13, fontFamily: font.regular, color: "rgba(255,255,255,0.65)", marginBottom: 10 },
  positionBadge: {
    backgroundColor: "rgba(255,255,255,0.2)", borderRadius: 20,
    paddingHorizontal: 14, paddingVertical: 5,
  },
  positionText: { fontSize: 12, fontFamily: font.semiBold, color: "#fff" },
  editProfileBtn: {
    flexDirection: "row", alignItems: "center", gap: 6,
    backgroundColor: "#fff", borderRadius: 20,
    paddingHorizontal: 18, paddingVertical: 9,
    shadowColor: "#000", shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1, shadowRadius: 4, elevation: 3,
  },
  editProfileText: { fontSize: 13, fontFamily: font.bold, color: TEAL },

  sheet: {
    backgroundColor: "#fff",
    borderTopLeftRadius: 28, borderTopRightRadius: 28,
    marginTop: -24, padding: 24, flex: 1,
  },
  sectionTitle: { fontSize: 12, fontFamily: font.bold, color: "#94A3B8", textTransform: "uppercase", letterSpacing: 0.8, marginBottom: 12 },
  card: {
    backgroundColor: "#F8FAFC", borderRadius: 16,
    borderWidth: 1, borderColor: "#E2E8F0", overflow: "hidden",
  },
  rowDivider: { borderTopWidth: 1, borderTopColor: "#E2E8F0" },

  infoRow: {
    flexDirection: "row", alignItems: "flex-start", gap: 12,
    paddingHorizontal: 16, paddingVertical: 13,
  },
  infoLabel: { fontSize: 13, fontFamily: font.medium, color: "#64748B", width: 68 },
  infoValue: { fontSize: 13, fontFamily: font.semiBold, color: "#1E293B", flex: 1, textAlign: "right" },

  navRow: {
    flexDirection: "row", alignItems: "center", gap: 14,
    paddingHorizontal: 16, paddingVertical: 14,
  },
  navIconBox: { width: 42, height: 42, borderRadius: 12, alignItems: "center", justifyContent: "center" },
  navText: { flex: 1 },
  navLabel: { fontSize: 14, fontFamily: font.bold, color: "#1E293B" },
  navSub: { fontSize: 12, fontFamily: font.regular, color: "#94A3B8", marginTop: 1 },

  logoutBtn: {
    flexDirection: "row", alignItems: "center", justifyContent: "center",
    backgroundColor: "#FEF2F2", borderRadius: 16, paddingVertical: 16,
    marginTop: 24, gap: 8, borderWidth: 1, borderColor: "#FECACA",
  },
  logoutText: { color: "#EF4444", fontSize: 15, fontFamily: font.bold },
});
