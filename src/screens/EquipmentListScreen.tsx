import React, { useState, useCallback } from "react";
import {
  View,
  FlatList,
  TextInput,
  TouchableOpacity,
  Text,
  StyleSheet,
  Alert,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Ionicons } from "@expo/vector-icons";
import { listEquipment, deleteEquipment } from "../api/equipment";
import EquipmentCard from "../components/EquipmentCard";
import LoadingSpinner from "../components/LoadingSpinner";
import EmptyState from "../components/EmptyState";
import { Equipment } from "../types";
import Toast from "react-native-toast-message";
import type { NativeStackScreenProps } from "@react-navigation/native-stack";
import { font } from '../constants/fonts';

const TEAL = "#0D9488";
const TEAL_DARK = "#0A7C72";

type Props = NativeStackScreenProps<any>;

export default function EquipmentListScreen({ navigation }: Props) {
  const insets = useSafeAreaInsets();
  const [search, setSearch] = useState("");
  const [tab, setTab] = useState<"all" | "available">("all");
  const queryClient = useQueryClient();

  const { data, isLoading, isError, refetch, isRefetching } = useQuery({
    queryKey: ["equipment"],
    queryFn: () => listEquipment(),
  });

  const deleteMutation = useMutation({
    mutationFn: (id: string) => deleteEquipment(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["equipment"] });
      Toast.show({ type: "success", text1: "Equipment deleted" });
    },
    onError: (err: Error) => {
      Toast.show({ type: "error", text1: "Delete failed", text2: err.message });
    },
  });

  function confirmDelete(id: string) {
    Alert.alert("Delete Equipment", "Are you sure you want to delete?", [
      { text: "Cancel", style: "cancel" },
      { text: "Delete", style: "destructive", onPress: () => deleteMutation.mutate(id) },
    ]);
  }

  const allItems: Equipment[] = data || [];
  const totalAvailable = allItems.filter((i) => i.availableQty > 0).length;
  const totalOut = allItems.length - totalAvailable;

  const filtered = allItems.filter((item) => {
    const matchSearch =
      !search ||
      item.name.toLowerCase().includes(search.toLowerCase()) ||
      item.serialNumber?.toLowerCase().includes(search.toLowerCase());
    const matchTab = tab === "all" || item.availableQty > 0;
    return matchSearch && matchTab;
  });

  const renderItem = useCallback(
    ({ item }: { item: Equipment }) => (
      <EquipmentCard
        item={item}
        onPress={() => navigation.navigate("EquipmentDetail", { id: item._id })}
        onDelete={() => confirmDelete(item._id)}
      />
    ),
    [navigation]
  );

  if (isLoading) return <LoadingSpinner />;
  if (isError) return (
    <View style={{ flex: 1, backgroundColor: TEAL, alignItems: "center", justifyContent: "center", gap: 12 }}>
      <Ionicons name="cloud-offline-outline" size={44} color="rgba(255,255,255,0.5)" />
      <Text style={{ color: "rgba(255,255,255,0.8)", fontSize: 14, fontFamily: "System" }}>Failed to load equipment</Text>
      <TouchableOpacity onPress={() => refetch()} style={{ backgroundColor: "#fff", borderRadius: 20, paddingHorizontal: 20, paddingVertical: 10 }}>
        <Text style={{ color: TEAL, fontSize: 14, fontWeight: "700" }}>Retry</Text>
      </TouchableOpacity>
    </View>
  );

  return (
    <View style={styles.root}>
      {/* ── Teal Hero ── */}
      <View style={[styles.hero, { paddingTop: insets.top + 20 }]}>
        <View style={styles.decCircle1} />
        <View style={styles.decCircle2} />

        <Text style={styles.heroTitle}>Equipment</Text>
        <Text style={styles.heroSub}>Manage your inventory</Text>

        <View style={styles.statsRow}>
          <View style={styles.statChip}>
            <Text style={styles.statChipNumber}>{allItems.length}</Text>
            <Text style={styles.statChipLabel}>Total</Text>
          </View>
          <View style={styles.statDivider} />
          <View style={styles.statChip}>
            <Text style={styles.statChipNumber}>{totalAvailable}</Text>
            <Text style={styles.statChipLabel}>Available</Text>
          </View>
          <View style={styles.statDivider} />
          <View style={styles.statChip}>
            <Text style={styles.statChipNumber}>{totalOut}</Text>
            <Text style={styles.statChipLabel}>Out</Text>
          </View>
        </View>
      </View>

      {/* ── White Sheet ── */}
      <View style={styles.sheet}>
        {/* Tabs */}
        <View style={styles.tabRow}>
          <TouchableOpacity
            style={[styles.tab, tab === "all" && styles.tabActive]}
            onPress={() => setTab("all")}
          >
            <Text style={[styles.tabText, tab === "all" && styles.tabTextActive]}>
              All Items
            </Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[styles.tab, tab === "available" && styles.tabActive]}
            onPress={() => setTab("available")}
          >
            <Text style={[styles.tabText, tab === "available" && styles.tabTextActive]}>
              Available
            </Text>
          </TouchableOpacity>
        </View>

        {/* Search */}
        <View style={styles.searchWrap}>
          <Ionicons name="search-outline" size={18} color="#94A3B8" />
          <TextInput
            style={styles.searchInput}
            placeholder="Search equipment..."
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
            <EmptyState message="No equipment found" icon="box" />
          }
        />
      </View>

      {/* FAB */}
      <TouchableOpacity
        style={styles.fab}
        onPress={() => navigation.navigate("AddEditEquipment", {})}
        activeOpacity={0.85}
      >
        <Ionicons name="add" size={28} color="#fff" />
      </TouchableOpacity>
    </View>
  );
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
    backgroundColor: TEAL,
  },

  // ── Hero ──
  hero: {
    backgroundColor: TEAL,
    paddingTop: 20,
    paddingBottom: 48,
    paddingHorizontal: 24,
    overflow: "hidden",
  },
  decCircle1: {
    position: "absolute",
    width: 220,
    height: 220,
    borderRadius: 110,
    borderWidth: 35,
    borderColor: "rgba(255,255,255,0.07)",
    top: -60,
    right: -60,
  },
  decCircle2: {
    position: "absolute",
    width: 160,
    height: 160,
    borderRadius: 80,
    borderWidth: 25,
    borderColor: "rgba(255,255,255,0.05)",
    bottom: -40,
    left: -30,
  },
  heroTitle: {
    fontSize: 26,
    fontFamily: font.extraBold,
    color: "#FFFFFF",
    letterSpacing: -0.5,
  },
  heroSub: {
    fontSize: 13,
    color: "rgba(255,255,255,0.65)",
    marginTop: 4,
    marginBottom: 20,
  },
  statsRow: {
    flexDirection: "row",
    backgroundColor: "rgba(255,255,255,0.15)",
    borderRadius: 16,
    paddingVertical: 14,
    paddingHorizontal: 8,
  },
  statChip: {
    flex: 1,
    alignItems: "center",
    gap: 2,
  },
  statDivider: {
    width: 1,
    backgroundColor: "rgba(255,255,255,0.2)",
  },
  statChipNumber: {
    fontSize: 22,
    fontFamily: font.extraBold,
    color: "#FFFFFF",
    letterSpacing: -0.5,
  },
  statChipLabel: {
    fontSize: 11,
    color: "rgba(255,255,255,0.7)",
    fontFamily: font.medium,
    textTransform: "uppercase",
    letterSpacing: 0.5,
  },

  // ── White Sheet ──
  sheet: {
    flex: 1,
    backgroundColor: "#FFFFFF",
    borderTopLeftRadius: 28,
    borderTopRightRadius: 28,
    marginTop: -24,
    paddingTop: 24,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: -4 },
    shadowOpacity: 0.06,
    shadowRadius: 12,
    elevation: 8,
  },

  // Tabs
  tabRow: {
    flexDirection: "row",
    marginHorizontal: 20,
    gap: 8,
    marginBottom: 14,
  },
  tab: {
    flex: 1,
    paddingVertical: 10,
    borderRadius: 10,
    backgroundColor: "#F1F5F9",
    alignItems: "center",
  },
  tabActive: {
    backgroundColor: TEAL,
  },
  tabText: {
    fontSize: 14,
    color: "#64748B",
    fontFamily: font.semiBold,
  },
  tabTextActive: {
    color: "#FFFFFF",
  },

  // Search
  searchWrap: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#F1F5F9",
    borderRadius: 12,
    marginHorizontal: 20,
    marginBottom: 16,
    paddingHorizontal: 14,
    paddingVertical: 12,
    gap: 10,
  },
  searchInput: {
    flex: 1,
    fontSize: 14,
    color: "#1E293B",
  },

  list: {
    paddingTop: 4,
    paddingBottom: 120,
  },

  // FAB
  fab: {
    position: "absolute",
    right: 20,
    bottom: 28,
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: TEAL,
    justifyContent: "center",
    alignItems: "center",
    shadowColor: TEAL,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.4,
    shadowRadius: 8,
    elevation: 6,
  },
});
