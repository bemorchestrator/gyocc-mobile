import React, { useState } from "react";
import {
  View, Text, StyleSheet, ScrollView, TouchableOpacity,
  Image, Alert, ActivityIndicator,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Ionicons } from "@expo/vector-icons";
import { getMember, deleteMember } from "../api/members";
import { font } from "../constants/fonts";
import { formatDate } from "../utils/formatDate";
import LoadingSpinner from "../components/LoadingSpinner";
import Toast from "react-native-toast-message";
import client from "../api/client";
import type { NativeStackScreenProps } from "@react-navigation/native-stack";

const TEAL = "#0D9488";

const RANK_COLORS: Record<string, string> = {
  Conductor: "#7C3AED", Senior: "#0D9488", Junior: "#0284C7", Apprentice: "#64748B",
};
const STATUS_COLORS: Record<string, { bg: string; text: string }> = {
  Active:     { bg: "#DCFCE7", text: "#16A34A" },
  Inactive:   { bg: "#FEE2E2", text: "#DC2626" },
  "On Leave": { bg: "#FEF3C7", text: "#D97706" },
};
const SECTION_ICONS: Record<string, string> = {
  Choir: "🎵", Orchestra: "🎻", Both: "🎼",
};

type Props = NativeStackScreenProps<any>;

export default function MemberDetailScreen({ route, navigation }: Props) {
  const { id } = route.params as { id: string };
  const insets = useSafeAreaInsets();
  const queryClient = useQueryClient();
  const [activeTab, setActiveTab] = useState<"info" | "attendance" | "loans">("info");

  const { data: member, isLoading } = useQuery({
    queryKey: ["member", id],
    queryFn: () => getMember(id),
  });

  const { data: attendance, isLoading: loadingAttendance } = useQuery({
    queryKey: ["member-attendance", id],
    queryFn: async () => {
      const { data } = await client.get(`/api/members/${id}/attendance`);
      return data;
    },
    enabled: activeTab === "attendance",
  });

  const { data: loansData, isLoading: loadingLoans } = useQuery({
    queryKey: ["member-loans", id],
    queryFn: async () => {
      const { data } = await client.get(`/api/members/${id}/equipment-loans`);
      return Array.isArray(data) ? data : data.loans ?? [];
    },
    enabled: activeTab === "loans",
  });

  const deleteMutation = useMutation({
    mutationFn: () => deleteMember(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["members"] });
      Toast.show({ type: "success", text1: "Member removed" });
      navigation.goBack();
    },
    onError: (err: Error) => {
      Toast.show({ type: "error", text1: "Delete failed", text2: err.message });
    },
  });

  function confirmDelete() {
    Alert.alert("Remove Member", `Remove ${member?.name}? This cannot be undone.`, [
      { text: "Cancel", style: "cancel" },
      { text: "Remove", style: "destructive", onPress: () => deleteMutation.mutate() },
    ]);
  }

  if (isLoading || !member) return <LoadingSpinner />;

  const rankColor = RANK_COLORS[member.rank] ?? TEAL;
  const statusStyle = STATUS_COLORS[member.status] ?? { bg: "#F1F5F9", text: "#64748B" };
  const initials = member.name.split(" ").map((n) => n[0]).join("").toUpperCase().slice(0, 2);

  const TABS = [
    { key: "info",       label: "Info" },
    { key: "attendance", label: "Attendance" },
    { key: "loans",      label: "Loans" },
  ] as const;

  return (
    <View style={styles.root}>
      {/* ── Hero ── */}
      <View style={[styles.hero, { paddingTop: insets.top + 12 }]}>
        <View style={styles.decCircle1} />
        <View style={styles.decCircle2} />

        {/* Back + Edit */}
        <View style={styles.heroNav}>
          <TouchableOpacity style={styles.navBtn} onPress={() => navigation.goBack()}>
            <Ionicons name="chevron-back" size={20} color="#fff" />
          </TouchableOpacity>
          <TouchableOpacity style={styles.navBtn} onPress={() => navigation.navigate("AddEditMember", { id, member })}>
            <Ionicons name="create-outline" size={20} color="#fff" />
          </TouchableOpacity>
        </View>

        {/* Avatar */}
        <View style={styles.heroCenter}>
          {member.avatarUrl ? (
            <Image source={{ uri: member.avatarUrl }} style={styles.avatar} />
          ) : (
            <View style={[styles.avatarPlaceholder, { backgroundColor: rankColor + "33" }]}>
              <Text style={[styles.avatarInitials, { color: "#fff" }]}>{initials}</Text>
            </View>
          )}
          <Text style={styles.heroName}>{member.name}</Text>

          <View style={styles.heroBadgeRow}>
            {/* Rank badge */}
            <View style={[styles.badge, { backgroundColor: rankColor }]}>
              <Text style={styles.badgeText}>
                {member.rank}{member.level ? ` L${member.level}` : ""}
              </Text>
            </View>
            {/* Status badge */}
            <View style={[styles.badge, { backgroundColor: statusStyle.bg }]}>
              <Text style={[styles.badgeText, { color: statusStyle.text }]}>{member.status}</Text>
            </View>
            {/* Section badge */}
            <View style={[styles.badge, { backgroundColor: "rgba(255,255,255,0.2)" }]}>
              <Text style={styles.badgeText}>
                {SECTION_ICONS[member.section]} {member.section}
              </Text>
            </View>
          </View>
        </View>
      </View>

      {/* ── Sheet ── */}
      <View style={styles.sheet}>
        {/* Tabs */}
        <View style={styles.tabRow}>
          {TABS.map((t) => (
            <TouchableOpacity
              key={t.key}
              style={[styles.tabPill, activeTab === t.key && styles.tabPillActive]}
              onPress={() => setActiveTab(t.key)}
            >
              <Text style={[styles.tabText, activeTab === t.key && styles.tabTextActive]}>
                {t.label}
              </Text>
            </TouchableOpacity>
          ))}
        </View>

        {/* ── Info Tab ── */}
        <View style={{ flex: 1 }}>
        {activeTab === "info" && (
          <ScrollView style={{ flex: 1 }} contentContainerStyle={styles.tabContent} showsVerticalScrollIndicator={false}>
            <View style={styles.detailCard}>
              <DetailRow icon="mail-outline"     label="Email"    value={member.email || "—"} />
              <DetailRow icon="call-outline"     label="Phone"    value={member.phone || "—"} divider />
              <DetailRow icon="calendar-outline" label="Joined"   value={formatDate(member.joinDate)} divider />
              <DetailRow icon="ribbon-outline"   label="Rank"     value={`${member.rank}${member.level ? ` Level ${member.level}` : ""}`} divider />
              <DetailRow icon="layers-outline"   label="Section"  value={member.section} divider />
              {member.notes ? (
                <DetailRow icon="document-text-outline" label="Notes" value={member.notes} divider />
              ) : null}
            </View>

            <TouchableOpacity style={styles.deleteBtn} onPress={confirmDelete}>
              <Ionicons name="person-remove-outline" size={18} color="#EF4444" />
              <Text style={styles.deleteBtnText}>Remove Member</Text>
            </TouchableOpacity>
          </ScrollView>
        )}

        {/* ── Attendance Tab ── */}
        {activeTab === "attendance" && (
          <ScrollView style={{ flex: 1 }} contentContainerStyle={styles.tabContent} showsVerticalScrollIndicator={false}>
            {loadingAttendance ? (
              <ActivityIndicator color={TEAL} style={{ marginTop: 40 }} />
            ) : attendance ? (
              <>
                {/* Stats row */}
                <View style={styles.statsRow}>
                  <StatCard label="Gigs" attended={attendance.gigsAttended} total={attendance.gigsTotal} color="#7C3AED" />
                  <StatCard label="Events" attended={attendance.eventsAttended} total={attendance.eventsTotal} color="#0284C7" />
                </View>

                {/* History */}
                {attendance.history?.length > 0 ? (
                  <>
                    <Text style={styles.listTitle}>History</Text>
                    {attendance.history.map((h: any) => (
                      <View key={h.id} style={styles.historyRow}>
                        <View style={[styles.historyDot, { backgroundColor: h.sourceType === "gig" ? "#7C3AED" : "#0284C7" }]} />
                        <View style={{ flex: 1 }}>
                          <Text style={styles.historyTitle}>{h.title}</Text>
                          <Text style={styles.historySub}>{formatDate(h.date)} · {h.role}</Text>
                        </View>
                        <Ionicons
                          name={h.attended ? "checkmark-circle" : "close-circle"}
                          size={18}
                          color={h.attended ? "#10B981" : "#CBD5E1"}
                        />
                      </View>
                    ))}
                  </>
                ) : (
                  <EmptyState icon="calendar-outline" text="No attendance records yet" />
                )}
              </>
            ) : (
              <EmptyState icon="calendar-outline" text="No attendance data" />
            )}
          </ScrollView>
        )}

        {/* ── Loans Tab ── */}
        {activeTab === "loans" && (
          <ScrollView style={{ flex: 1 }} contentContainerStyle={styles.tabContent} showsVerticalScrollIndicator={false}>
            {loadingLoans ? (
              <ActivityIndicator color={TEAL} style={{ marginTop: 40 }} />
            ) : loansData?.length > 0 ? (
              loansData.map((loan: any) => (
                <View key={loan._id} style={styles.loanCard}>
                  <View style={styles.loanHeader}>
                    <Text style={styles.loanName}>{loan.equipmentName}</Text>
                    <View style={[styles.loanStatus, { backgroundColor: loan.actualReturnDate ? "#DCFCE7" : "#FEF3C7" }]}>
                      <Text style={[styles.loanStatusText, { color: loan.actualReturnDate ? "#16A34A" : "#D97706" }]}>
                        {loan.actualReturnDate ? "Returned" : "Active"}
                      </Text>
                    </View>
                  </View>
                  <Text style={styles.loanSub}>
                    Qty: {loan.qtyBorrowed} · Borrowed {formatDate(loan.dateBorrowed)}
                  </Text>
                  {loan.actualReturnDate && (
                    <Text style={styles.loanSub}>Returned {formatDate(loan.actualReturnDate)}</Text>
                  )}
                </View>
              ))
            ) : (
              <EmptyState icon="cube-outline" text="No equipment loans" />
            )}
          </ScrollView>
        )}
        </View>
      </View>
    </View>
  );
}

function StatCard({ label, attended, total, color }: { label: string; attended: number; total: number; color: string }) {
  const pct = total > 0 ? Math.round((attended / total) * 100) : 0;
  return (
    <View style={[styles.statCard, { borderColor: color + "33" }]}>
      <Text style={[styles.statPct, { color }]}>{pct}%</Text>
      <Text style={styles.statLabel}>{label}</Text>
      <Text style={styles.statSub}>{attended}/{total}</Text>
    </View>
  );
}

function DetailRow({ icon, label, value, divider }: { icon: any; label: string; value: string; divider?: boolean }) {
  return (
    <View style={[styles.detailRow, divider && styles.divider]}>
      <Ionicons name={icon} size={16} color="#94A3B8" />
      <Text style={styles.detailLabel}>{label}</Text>
      <Text style={styles.detailValue} numberOfLines={3}>{value}</Text>
    </View>
  );
}

function EmptyState({ icon, text }: { icon: any; text: string }) {
  return (
    <View style={styles.empty}>
      <Ionicons name={icon} size={44} color="#CBD5E1" />
      <Text style={styles.emptyText}>{text}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: TEAL },

  hero: {
    backgroundColor: TEAL, paddingHorizontal: 20, paddingBottom: 32, overflow: "hidden",
  },
  decCircle1: {
    position: "absolute", width: 220, height: 220, borderRadius: 110,
    borderWidth: 35, borderColor: "rgba(255,255,255,0.07)", top: -60, right: -60,
  },
  decCircle2: {
    position: "absolute", width: 160, height: 160, borderRadius: 80,
    borderWidth: 25, borderColor: "rgba(255,255,255,0.05)", bottom: -40, left: -30,
  },
  heroNav: { flexDirection: "row", justifyContent: "space-between", marginBottom: 20 },
  navBtn: {
    width: 38, height: 38, borderRadius: 19,
    backgroundColor: "rgba(255,255,255,0.2)", alignItems: "center", justifyContent: "center",
  },
  heroCenter: { alignItems: "center" },
  avatar: { width: 84, height: 84, borderRadius: 42, borderWidth: 3, borderColor: "rgba(255,255,255,0.4)", marginBottom: 12 },
  avatarPlaceholder: {
    width: 84, height: 84, borderRadius: 42, marginBottom: 12,
    alignItems: "center", justifyContent: "center",
    borderWidth: 3, borderColor: "rgba(255,255,255,0.3)",
  },
  avatarInitials: { fontSize: 28, fontFamily: font.bold },
  heroName: { fontSize: 22, fontFamily: font.extraBold, color: "#fff", letterSpacing: -0.3, marginBottom: 10 },
  heroBadgeRow: { flexDirection: "row", flexWrap: "wrap", justifyContent: "center", gap: 6 },
  badge: {
    paddingHorizontal: 12, paddingVertical: 5, borderRadius: 20,
    backgroundColor: "rgba(255,255,255,0.2)",
  },
  badgeText: { fontSize: 12, fontFamily: font.semiBold, color: "#fff" },

  sheet: {
    flex: 1, backgroundColor: "#fff",
    borderTopLeftRadius: 28, borderTopRightRadius: 28, marginTop: -20,
  },
  tabRow: { flexDirection: "row", gap: 8, paddingHorizontal: 20, paddingVertical: 14 },
  tabPill: {
    paddingHorizontal: 18, paddingVertical: 8, borderRadius: 20, backgroundColor: "#F1F5F9",
  },
  tabPillActive: { backgroundColor: TEAL },
  tabText: { fontSize: 13, fontFamily: font.semiBold, color: "#64748B" },
  tabTextActive: { color: "#fff" },

  tabContent: { paddingHorizontal: 20, paddingBottom: 120, gap: 12 },

  detailCard: {
    backgroundColor: "#F8FAFC", borderRadius: 16,
    borderWidth: 1, borderColor: "#E2E8F0", overflow: "hidden",
  },
  detailRow: { flexDirection: "row", alignItems: "flex-start", gap: 12, paddingHorizontal: 16, paddingVertical: 13 },
  divider: { borderTopWidth: 1, borderTopColor: "#E2E8F0" },
  detailLabel: { fontSize: 13, fontFamily: font.medium, color: "#64748B", width: 72 },
  detailValue: { flex: 1, fontSize: 13, fontFamily: font.semiBold, color: "#1E293B", textAlign: "right" },

  statsRow: { flexDirection: "row", gap: 12, marginBottom: 4 },
  statCard: {
    flex: 1, alignItems: "center", paddingVertical: 20, borderRadius: 16,
    backgroundColor: "#F8FAFC", borderWidth: 1,
  },
  statPct: { fontSize: 26, fontFamily: font.extraBold },
  statLabel: { fontSize: 13, fontFamily: font.semiBold, color: "#1E293B", marginTop: 2 },
  statSub: { fontSize: 11, fontFamily: font.regular, color: "#94A3B8" },

  listTitle: { fontSize: 13, fontFamily: font.bold, color: "#94A3B8", textTransform: "uppercase", letterSpacing: 0.6, marginBottom: 4 },
  historyRow: {
    flexDirection: "row", alignItems: "center", gap: 12,
    paddingVertical: 12, borderBottomWidth: 1, borderBottomColor: "#F1F5F9",
  },
  historyDot: { width: 8, height: 8, borderRadius: 4 },
  historyTitle: { fontSize: 14, fontFamily: font.semiBold, color: "#1E293B" },
  historySub: { fontSize: 12, fontFamily: font.regular, color: "#94A3B8", marginTop: 1 },

  loanCard: {
    backgroundColor: "#F8FAFC", borderRadius: 14,
    padding: 14, borderWidth: 1, borderColor: "#E2E8F0",
  },
  loanHeader: { flexDirection: "row", justifyContent: "space-between", alignItems: "center", marginBottom: 4 },
  loanName: { fontSize: 14, fontFamily: font.bold, color: "#1E293B", flex: 1 },
  loanStatus: { paddingHorizontal: 10, paddingVertical: 3, borderRadius: 12 },
  loanStatusText: { fontSize: 11, fontFamily: font.semiBold },
  loanSub: { fontSize: 12, fontFamily: font.regular, color: "#64748B", marginTop: 2 },

  deleteBtn: {
    flexDirection: "row", alignItems: "center", justifyContent: "center",
    gap: 8, marginTop: 8, backgroundColor: "#FEF2F2",
    borderRadius: 12, paddingVertical: 14, borderWidth: 1, borderColor: "#FECACA",
  },
  deleteBtnText: { color: "#EF4444", fontSize: 15, fontFamily: font.bold },

  empty: { alignItems: "center", paddingTop: 60, gap: 10 },
  emptyText: { fontSize: 14, fontFamily: font.regular, color: "#94A3B8" },
});
