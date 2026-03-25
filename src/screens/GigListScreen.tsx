import React, { useState, useCallback } from "react";
import {
  View, Text, FlatList, TouchableOpacity,
  StyleSheet, Alert,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Ionicons } from "@expo/vector-icons";
import { listGigs, listGigTypes, deleteGig } from "../api/gigs";
import LoadingSpinner from "../components/LoadingSpinner";
import Toast from "react-native-toast-message";
import type { NativeStackScreenProps } from "@react-navigation/native-stack";
import { Gig, GigType } from "../types";
import { font } from '../constants/fonts';

const TEAL = "#0D9488";

const STATUS_COLOR: Record<string, { bg: string; text: string }> = {
  Inquiry:   { bg: "#FEF3C7", text: "#D97706" },
  Confirmed: { bg: "#DBEAFE", text: "#2563EB" },
  Completed: { bg: "#DCFCE7", text: "#16A34A" },
  Cancelled: { bg: "#FEE2E2", text: "#DC2626" },
};

type Filter = "upcoming" | "all" | "completed" | "cancelled";

type Props = NativeStackScreenProps<any>;

function formatDate(d: string) {
  return new Date(d).toLocaleDateString("en-PH", {
    month: "short", day: "numeric", year: "numeric",
  });
}

function peso(n: number) {
  return "₱" + n.toLocaleString("en-PH", { minimumFractionDigits: 0 });
}

export default function GigListScreen({ navigation }: Props) {
  const insets = useSafeAreaInsets();
  const queryClient = useQueryClient();
  const [filter, setFilter] = useState<Filter>("upcoming");

  const { data: gigs = [], isLoading, refetch, isRefetching } = useQuery({
    queryKey: ["gigs"],
    queryFn: () => listGigs(),
  });

  const { data: gigTypes = [] } = useQuery({
    queryKey: ["gig-types"],
    queryFn: listGigTypes,
  });

  const typeColorMap = useCallback(
    (typeName: string) =>
      (gigTypes as GigType[]).find((t) => t.name === typeName)?.color ?? "#94A3B8",
    [gigTypes]
  );

  const deleteMutation = useMutation({
    mutationFn: (id: string) => deleteGig(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["gigs"] });
      Toast.show({ type: "success", text1: "Gig deleted" });
    },
    onError: () => Toast.show({ type: "error", text1: "Delete failed" }),
  });

  function confirmDelete(gig: Gig) {
    Alert.alert("Delete Gig", `Delete "${gig.title}"? This cannot be undone.`, [
      { text: "Cancel", style: "cancel" },
      { text: "Delete", style: "destructive", onPress: () => deleteMutation.mutate(gig._id) },
    ]);
  }

  const now = new Date();
  const allGigs = gigs as Gig[];

  const upcoming  = allGigs.filter(g => new Date(g.startDate) >= now && g.status !== "Cancelled");
  const completed = allGigs.filter(g => g.status === "Completed");
  const cancelled = allGigs.filter(g => g.status === "Cancelled");

  const filtered =
    filter === "upcoming"  ? upcoming :
    filter === "completed" ? completed :
    filter === "cancelled" ? cancelled :
    allGigs;

  const totalFee = allGigs.reduce((s, g) => s + (g.contractedFee || 0), 0);
  const thisMonth = allGigs.filter(g => {
    const d = new Date(g.startDate);
    return d.getMonth() === now.getMonth() && d.getFullYear() === now.getFullYear();
  });
  const thisMonthFee = thisMonth.reduce((s, g) => s + (g.contractedFee || 0), 0);

  const TABS: { key: Filter; label: string }[] = [
    { key: "upcoming",  label: "Upcoming" },
    { key: "all",       label: "All" },
    { key: "completed", label: "Completed" },
    { key: "cancelled", label: "Cancelled" },
  ];

  const renderGig = useCallback(({ item }: { item: Gig }) => {
    const color = typeColorMap(item.type);
    const badge = STATUS_COLOR[item.status] ?? STATUS_COLOR.Inquiry;
    return (
      <TouchableOpacity
        style={styles.gigCard}
        onPress={() => navigation.navigate("GigDetail", { id: item._id })}
        onLongPress={() => confirmDelete(item)}
        activeOpacity={0.75}
      >
        <View style={[styles.gigAccent, { backgroundColor: color }]} />
        <View style={styles.gigBody}>
          <View style={styles.gigTop}>
            <Text style={styles.gigTitle} numberOfLines={1}>{item.title}</Text>
            <View style={[styles.statusBadge, { backgroundColor: badge.bg }]}>
              <Text style={[styles.statusText, { color: badge.text }]}>{item.status}</Text>
            </View>
          </View>
          <View style={styles.gigMeta}>
            <Ionicons name="person-outline" size={12} color="#94A3B8" />
            <Text style={styles.gigMetaText} numberOfLines={1}>
              {item.client?.name || "No client"}
            </Text>
          </View>
          <View style={styles.gigBottom}>
            <View style={styles.gigMeta}>
              <Ionicons name="calendar-outline" size={12} color="#94A3B8" />
              <Text style={styles.gigMetaText}>{formatDate(item.startDate)}</Text>
            </View>
            <View style={styles.gigRight}>
              <View style={[styles.typePill, { backgroundColor: color + "22" }]}>
                <View style={[styles.typeDot, { backgroundColor: color }]} />
                <Text style={[styles.typeText, { color }]}>{item.type}</Text>
              </View>
              {item.contractedFee > 0 && (
                <Text style={styles.gigFee}>{peso(item.contractedFee)}</Text>
              )}
            </View>
          </View>
        </View>
      </TouchableOpacity>
    );
  }, [navigation, typeColorMap]);

  if (isLoading) return <LoadingSpinner />;

  return (
    <View style={styles.root}>
      {/* ── Hero ── */}
      <View style={[styles.hero, { paddingTop: insets.top + 16 }]}>
        <View style={styles.decCircle1} />
        <View style={styles.decCircle2} />
        <View style={styles.heroTopRow}>
          <View>
            <Text style={styles.heroTitle}>Gig Bookings</Text>
            <Text style={styles.heroSub}>Performance engagements</Text>
          </View>
          <TouchableOpacity
            style={styles.heroAddBtn}
            onPress={() => navigation.navigate("AddEditGig", {})}
          >
            <Ionicons name="add" size={22} color={TEAL} />
          </TouchableOpacity>
        </View>
        <View style={styles.statsRow}>
          <View style={styles.statChip}>
            <Text style={styles.statNum}>{upcoming.length}</Text>
            <Text style={styles.statLabel}>Upcoming</Text>
          </View>
          <View style={styles.statDivider} />
          <View style={styles.statChip}>
            <Text style={styles.statNum}>{thisMonth.length}</Text>
            <Text style={styles.statLabel}>This Month</Text>
          </View>
          <View style={styles.statDivider} />
          <View style={styles.statChip}>
            <Text style={styles.statNum}>
              {thisMonthFee >= 1000
                ? "₱" + (thisMonthFee / 1000).toFixed(1) + "k"
                : peso(thisMonthFee)}
            </Text>
            <Text style={styles.statLabel}>Month Income</Text>
          </View>
        </View>
      </View>

      {/* ── White Sheet ── */}
      <View style={styles.sheet}>
        {/* Filter tabs */}
        <View style={styles.tabScroll}>
          {TABS.map((t) => (
            <TouchableOpacity
              key={t.key}
              style={[styles.tab, filter === t.key && styles.tabActive]}
              onPress={() => setFilter(t.key)}
            >
              <Text style={[styles.tabText, filter === t.key && styles.tabTextActive]}>
                {t.label}
              </Text>
            </TouchableOpacity>
          ))}
        </View>

        <FlatList
          data={filtered}
          keyExtractor={(item) => item._id}
          renderItem={renderGig}
          contentContainerStyle={styles.list}
          onRefresh={refetch}
          refreshing={isRefetching}
          showsVerticalScrollIndicator={false}
          ListEmptyComponent={
            <View style={styles.empty}>
              <Ionicons name="musical-notes-outline" size={48} color="#CBD5E1" />
              <Text style={styles.emptyText}>No gigs here</Text>
            </View>
          }
        />
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: TEAL },

  // Hero
  hero: {
    backgroundColor: TEAL,
    paddingBottom: 48,
    paddingHorizontal: 20,
    overflow: "hidden",
  },
  decCircle1: {
    position: "absolute", width: 220, height: 220, borderRadius: 110,
    borderWidth: 35, borderColor: "rgba(255,255,255,0.07)", top: -60, right: -60,
  },
  decCircle2: {
    position: "absolute", width: 160, height: 160, borderRadius: 80,
    borderWidth: 25, borderColor: "rgba(255,255,255,0.05)", bottom: -40, left: -30,
  },
  heroTopRow: {
    flexDirection: "row", alignItems: "flex-start",
    justifyContent: "space-between", marginBottom: 20,
  },
  heroTitle: { fontSize: 26, fontFamily: font.extraBold, color: "#fff", letterSpacing: -0.5 },
  heroSub: { fontSize: 13, color: "rgba(255,255,255,0.65)", marginTop: 3 },
  heroAddBtn: {
    width: 40, height: 40, borderRadius: 20,
    backgroundColor: "#fff", alignItems: "center", justifyContent: "center",
    shadowColor: "#000", shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.12, shadowRadius: 4, elevation: 3,
  },
  statsRow: {
    flexDirection: "row", backgroundColor: "rgba(255,255,255,0.15)",
    borderRadius: 16, paddingVertical: 14, paddingHorizontal: 8,
  },
  statChip: { flex: 1, alignItems: "center", gap: 2 },
  statDivider: { width: 1, backgroundColor: "rgba(255,255,255,0.2)" },
  statNum: { fontSize: 20, fontFamily: font.extraBold, color: "#fff", letterSpacing: -0.5 },
  statLabel: { fontSize: 10, color: "rgba(255,255,255,0.7)", fontFamily: font.medium, textTransform: "uppercase", letterSpacing: 0.5 },

  // Sheet
  sheet: {
    flex: 1, backgroundColor: "#fff",
    borderTopLeftRadius: 28, borderTopRightRadius: 28, marginTop: -24,
    paddingTop: 20,
  },
  tabScroll: {
    flexDirection: "row", paddingHorizontal: 20,
    gap: 8, marginBottom: 16, flexWrap: "nowrap",
  },
  tab: {
    paddingHorizontal: 14, paddingVertical: 8,
    borderRadius: 20, backgroundColor: "#F1F5F9",
  },
  tabActive: { backgroundColor: TEAL },
  tabText: { fontSize: 13, fontFamily: font.semiBold, color: "#64748B" },
  tabTextActive: { color: "#fff" },


  list: { paddingHorizontal: 20, paddingBottom: 120, gap: 10 },

  // Gig Card
  gigCard: {
    flexDirection: "row", backgroundColor: "#F8FAFC",
    borderRadius: 16, borderWidth: 1, borderColor: "#E2E8F0", overflow: "hidden",
  },
  gigAccent: { width: 4 },
  gigBody: { flex: 1, padding: 14, gap: 6 },
  gigTop: { flexDirection: "row", alignItems: "center", gap: 8 },
  gigTitle: { flex: 1, fontSize: 15, fontFamily: font.bold, color: "#1E293B" },
  statusBadge: { borderRadius: 20, paddingHorizontal: 8, paddingVertical: 3 },
  statusText: { fontSize: 11, fontFamily: font.semiBold },
  gigMeta: { flexDirection: "row", alignItems: "center", gap: 5 },
  gigMetaText: { fontSize: 12, color: "#94A3B8", flex: 1 },
  gigBottom: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", marginTop: 2 },
  gigRight: { flexDirection: "row", alignItems: "center", gap: 8 },
  typePill: { flexDirection: "row", alignItems: "center", gap: 4, paddingHorizontal: 8, paddingVertical: 3, borderRadius: 20 },
  typeDot: { width: 6, height: 6, borderRadius: 3 },
  typeText: { fontSize: 11, fontFamily: font.semiBold },
  gigFee: { fontSize: 13, fontFamily: font.bold, color: "#1E293B" },

  empty: { alignItems: "center", paddingTop: 64, gap: 12 },
  emptyText: { fontSize: 14, color: "#94A3B8" },
});
