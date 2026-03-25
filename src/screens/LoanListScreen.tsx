import React, { useState, useCallback } from "react";
import {
  View, FlatList, TextInput, TouchableOpacity,
  Text, StyleSheet, Alert,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Ionicons } from "@expo/vector-icons";
import { listLoans, deleteLoan } from "../api/loans";
import LoanCard from "../components/LoanCard";
import LoadingSpinner from "../components/LoadingSpinner";
import { EquipmentLoan } from "../types";
import { font } from "../constants/fonts";
import Toast from "react-native-toast-message";
import type { NativeStackScreenProps } from "@react-navigation/native-stack";

const TEAL = "#0D9488";
type Filter = "all" | "active" | "returned";
type Props = NativeStackScreenProps<any>;

export default function LoanListScreen({ navigation }: Props) {
  const insets = useSafeAreaInsets();
  const queryClient = useQueryClient();
  const [search, setSearch] = useState("");
  const [tab, setTab] = useState<Filter>("all");

  const { data, isLoading, refetch, isRefetching } = useQuery({
    queryKey: ["loans"],
    queryFn: () => listLoans(),
  });

  const deleteM = useMutation({
    mutationFn: (id: string) => deleteLoan(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["loans"] });
      Toast.show({ type: "success", text1: "Loan deleted" });
    },
    onError: () => Toast.show({ type: "error", text1: "Delete failed" }),
  });

  function confirmDelete(id: string) {
    Alert.alert("Delete Loan", "Are you sure you want to delete this loan?", [
      { text: "Cancel", style: "cancel" },
      { text: "Delete", style: "destructive", onPress: () => deleteM.mutate(id) },
    ]);
  }

  const allItems: EquipmentLoan[] = data || [];
  const activeCount   = allItems.filter((i) => !i.actualReturnDate).length;
  const returnedCount = allItems.filter((i) => !!i.actualReturnDate).length;

  const filtered = allItems.filter((item) => {
    const matchSearch = !search || item.borrowerName.toLowerCase().includes(search.toLowerCase()) ||
      item.equipmentName.toLowerCase().includes(search.toLowerCase());
    const matchTab =
      tab === "all" ||
      (tab === "active"   && !item.actualReturnDate) ||
      (tab === "returned" && !!item.actualReturnDate);
    return matchSearch && matchTab;
  });

  const renderItem = useCallback(
    ({ item }: { item: EquipmentLoan }) => (
      <LoanCard
        item={item}
        onPress={() => {
          if (!item.actualReturnDate) navigation.navigate("ReturnLoan", { loan: item });
        }}
        onDelete={() => confirmDelete(item._id)}
      />
    ),
    [navigation]
  );

  const TABS: { key: Filter; label: string; count: number }[] = [
    { key: "all",      label: "All",      count: allItems.length },
    { key: "active",   label: "Active",   count: activeCount },
    { key: "returned", label: "Returned", count: returnedCount },
  ];

  if (isLoading) return <LoadingSpinner />;

  return (
    <View style={styles.root}>
      {/* ── Hero ── */}
      <View style={[styles.hero, { paddingTop: insets.top + 16 }]}>
        <View style={styles.decCircle1} />
        <View style={styles.decCircle2} />
        <Text style={styles.heroTitle}>Loans</Text>
        <Text style={styles.heroSub}>Equipment borrowing records</Text>
        <View style={styles.statsRow}>
          <View style={styles.statChip}>
            <Text style={styles.statNum}>{allItems.length}</Text>
            <Text style={styles.statLabel}>Total</Text>
          </View>
          <View style={styles.statDivider} />
          <View style={styles.statChip}>
            <Text style={styles.statNum}>{activeCount}</Text>
            <Text style={styles.statLabel}>Active</Text>
          </View>
          <View style={styles.statDivider} />
          <View style={styles.statChip}>
            <Text style={styles.statNum}>{returnedCount}</Text>
            <Text style={styles.statLabel}>Returned</Text>
          </View>
        </View>
      </View>

      {/* ── White Sheet ── */}
      <View style={styles.sheet}>
        {/* Tabs */}
        <View style={styles.tabRow}>
          {TABS.map((t) => (
            <TouchableOpacity
              key={t.key}
              style={[styles.tab, tab === t.key && styles.tabActive]}
              onPress={() => setTab(t.key)}
            >
              <Text style={[styles.tabText, tab === t.key && styles.tabTextActive]}>
                {t.label}
                {t.count > 0 && (
                  <Text style={styles.tabCount}> {t.count}</Text>
                )}
              </Text>
            </TouchableOpacity>
          ))}
        </View>

        {/* Search */}
        <View style={styles.searchWrap}>
          <Ionicons name="search-outline" size={18} color="#94A3B8" />
          <TextInput
            style={styles.searchInput}
            placeholder="Search borrower or equipment..."
            placeholderTextColor="#94A3B8"
            value={search}
            onChangeText={setSearch}
          />
          {search.length > 0 && (
            <TouchableOpacity onPress={() => setSearch("")}>
              <Ionicons name="close-circle" size={18} color="#94A3B8" />
            </TouchableOpacity>
          )}
        </View>

        {/* List */}
        <FlatList
          data={filtered}
          keyExtractor={(item) => item._id}
          renderItem={renderItem}
          contentContainerStyle={styles.list}
          onRefresh={refetch}
          refreshing={isRefetching}
          showsVerticalScrollIndicator={false}
          ListEmptyComponent={
            <View style={styles.empty}>
              <Ionicons name="clipboard-outline" size={48} color="#CBD5E1" />
              <Text style={styles.emptyText}>No loans found</Text>
            </View>
          }
        />
      </View>

      {/* FAB */}
      <TouchableOpacity
        style={styles.fab}
        onPress={() => navigation.navigate("CreateLoan")}
        activeOpacity={0.85}
      >
        <Ionicons name="add" size={28} color="#fff" />
      </TouchableOpacity>
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: TEAL },

  hero: {
    backgroundColor: TEAL,
    paddingHorizontal: 24,
    paddingBottom: 48,
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
  heroTitle: { fontSize: 26, fontFamily: font.extraBold, color: "#fff", letterSpacing: -0.5 },
  heroSub: { fontSize: 13, fontFamily: font.regular, color: "rgba(255,255,255,0.65)", marginTop: 4, marginBottom: 20 },
  statsRow: {
    flexDirection: "row", backgroundColor: "rgba(255,255,255,0.15)",
    borderRadius: 16, paddingVertical: 14, paddingHorizontal: 8,
  },
  statChip: { flex: 1, alignItems: "center", gap: 2 },
  statDivider: { width: 1, backgroundColor: "rgba(255,255,255,0.2)" },
  statNum: { fontSize: 22, fontFamily: font.extraBold, color: "#fff", letterSpacing: -0.5 },
  statLabel: { fontSize: 10, fontFamily: font.medium, color: "rgba(255,255,255,0.7)", textTransform: "uppercase", letterSpacing: 0.5 },

  sheet: {
    flex: 1, backgroundColor: "#fff",
    borderTopLeftRadius: 28, borderTopRightRadius: 28,
    marginTop: -24, paddingTop: 24,
  },

  tabRow: { flexDirection: "row", marginHorizontal: 20, gap: 8, marginBottom: 14 },
  tab: { flex: 1, paddingVertical: 10, borderRadius: 10, backgroundColor: "#F1F5F9", alignItems: "center" },
  tabActive: { backgroundColor: TEAL },
  tabText: { fontSize: 13, fontFamily: font.semiBold, color: "#64748B" },
  tabTextActive: { color: "#fff" },
  tabCount: { fontSize: 11, opacity: 0.75 },

  searchWrap: {
    flexDirection: "row", alignItems: "center",
    backgroundColor: "#F1F5F9", borderRadius: 12,
    marginHorizontal: 20, marginBottom: 16,
    paddingHorizontal: 14, paddingVertical: 12, gap: 10,
  },
  searchInput: { flex: 1, fontSize: 14, fontFamily: font.regular, color: "#1E293B" },

  list: { paddingTop: 4, paddingBottom: 120 },

  empty: { alignItems: "center", paddingTop: 64, gap: 12 },
  emptyText: { fontSize: 14, fontFamily: font.medium, color: "#94A3B8" },

  fab: {
    position: "absolute", right: 20, bottom: 28,
    width: 56, height: 56, borderRadius: 28,
    backgroundColor: TEAL, alignItems: "center", justifyContent: "center",
    shadowColor: TEAL, shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.4, shadowRadius: 8, elevation: 6,
  },
});
