import React, { useState } from "react";
import {
  View, Text, StyleSheet, FlatList, TouchableOpacity,
  TextInput, Image,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useQuery } from "@tanstack/react-query";
import { Ionicons } from "@expo/vector-icons";
import { listMembers } from "../api/members";
import { Member } from "../types";
import { font } from "../constants/fonts";
import LoadingSpinner from "../components/LoadingSpinner";

const TEAL = "#0D9488";

const RANK_ORDER: Record<string, number> = {
  Conductor: 0, Senior: 1, Junior: 2, Apprentice: 3,
};
const RANK_COLORS: Record<string, string> = {
  Conductor: "#7C3AED", Senior: "#0D9488", Junior: "#0284C7", Apprentice: "#64748B",
};
const STATUS_COLORS: Record<string, string> = {
  Active: "#10B981", Inactive: "#EF4444", "On Leave": "#F59E0B",
};

export default function MembersScreen({ navigation }: any) {
  const insets = useSafeAreaInsets();
  const [search, setSearch] = useState("");
  const [filter, setFilter] = useState<"All" | "Choir" | "Orchestra">("All");

  const { data: members = [], isLoading, isError, refetch, isRefetching } = useQuery({
    queryKey: ["members"],
    queryFn: listMembers,
  });

  const filtered = members
    .filter((m) => {
      const matchSearch =
        m.name.toLowerCase().includes(search.toLowerCase()) ||
        m.rank.toLowerCase().includes(search.toLowerCase());
      const matchFilter = filter === "All" || m.section === filter || m.section === "Both";
      return matchSearch && matchFilter;
    })
    .sort((a, b) => (RANK_ORDER[a.rank] ?? 9) - (RANK_ORDER[b.rank] ?? 9) || a.name.localeCompare(b.name));

  const activeCount = members.filter((m) => m.status === "Active").length;

  if (isLoading) return <LoadingSpinner />;
  if (isError) return (
    <View style={{ flex: 1, alignItems: "center", justifyContent: "center", gap: 12 }}>
      <Ionicons name="cloud-offline-outline" size={44} color="#CBD5E1" />
      <Text style={{ fontFamily: font.medium, color: "#94A3B8", fontSize: 14 }}>Failed to load members</Text>
      <TouchableOpacity onPress={() => refetch()} style={{ backgroundColor: TEAL, borderRadius: 20, paddingHorizontal: 20, paddingVertical: 10 }}>
        <Text style={{ color: "#fff", fontFamily: font.bold, fontSize: 14 }}>Retry</Text>
      </TouchableOpacity>
    </View>
  );

  return (
    <View style={styles.root}>
      {/* ── Hero ── */}
      <View style={[styles.hero, { paddingTop: insets.top + 16 }]}>
        <View style={styles.decCircle1} />
        <View style={styles.decCircle2} />
        <View style={styles.heroTop}>
          <View>
            <Text style={styles.heroTitle}>Members</Text>
            <Text style={styles.heroSub}>{activeCount} active · {members.length} total</Text>
          </View>
          <TouchableOpacity style={styles.addBtn} onPress={() => navigation.navigate("AddEditMember")}>
            <Ionicons name="add" size={22} color={TEAL} />
          </TouchableOpacity>
        </View>

        {/* Search */}
        <View style={styles.searchRow}>
          <Ionicons name="search-outline" size={16} color="#94A3B8" />
          <TextInput
            style={styles.searchInput}
            placeholder="Search members..."
            placeholderTextColor="#94A3B8"
            value={search}
            onChangeText={setSearch}
          />
          {search.length > 0 && (
            <TouchableOpacity onPress={() => setSearch("")}>
              <Ionicons name="close-circle" size={16} color="#94A3B8" />
            </TouchableOpacity>
          )}
        </View>
      </View>

      {/* ── Sheet ── */}
      <View style={styles.sheet}>
        {/* Section filter */}
        <View style={styles.filterRow}>
          {(["All", "Choir", "Orchestra"] as const).map((f) => (
            <TouchableOpacity
              key={f}
              style={[styles.filterPill, filter === f && styles.filterPillActive]}
              onPress={() => setFilter(f)}
            >
              <Text style={[styles.filterText, filter === f && styles.filterTextActive]}>{f}</Text>
            </TouchableOpacity>
          ))}
        </View>

        <FlatList
          data={filtered}
          keyExtractor={(m) => m._id}
          contentContainerStyle={styles.list}
          showsVerticalScrollIndicator={false}
          onRefresh={refetch}
          refreshing={isRefetching}
          ListEmptyComponent={
            <View style={styles.empty}>
              <Ionicons name="people-outline" size={48} color="#CBD5E1" />
              <Text style={styles.emptyText}>No members found</Text>
            </View>
          }
          renderItem={({ item }) => <MemberCard member={item} onPress={() => navigation.navigate("MemberDetail", { id: item._id })} />}
        />
      </View>
    </View>
  );
}

function MemberCard({ member, onPress }: { member: Member; onPress: () => void }) {
  const initials = member.name.split(" ").map((n) => n[0]).join("").toUpperCase().slice(0, 2);
  const rankColor = RANK_COLORS[member.rank] ?? TEAL;
  const statusColor = STATUS_COLORS[member.status] ?? "#64748B";

  return (
    <TouchableOpacity style={styles.card} onPress={onPress} activeOpacity={0.75}>
      {member.avatarUrl ? (
        <Image source={{ uri: member.avatarUrl }} style={styles.avatar} />
      ) : (
        <View style={[styles.avatar, { backgroundColor: rankColor + "22" }]}>
          <Text style={[styles.avatarText, { color: rankColor }]}>{initials}</Text>
        </View>
      )}
      <View style={styles.cardBody}>
        <Text style={styles.cardName}>{member.name}</Text>
        <Text style={styles.cardSub}>{member.section} · {member.rank}{member.level ? ` L${member.level}` : ""}</Text>
      </View>
      <View style={styles.cardRight}>
        <View style={[styles.statusDot, { backgroundColor: statusColor }]} />
        <Text style={[styles.statusText, { color: statusColor }]}>{member.status}</Text>
      </View>
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: TEAL },

  hero: {
    backgroundColor: TEAL,
    paddingHorizontal: 20,
    paddingBottom: 28,
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
  heroTop: { flexDirection: "row", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 16 },
  heroTitle: { fontSize: 26, fontFamily: font.extraBold, color: "#fff", letterSpacing: -0.5 },
  heroSub: { fontSize: 13, fontFamily: font.regular, color: "rgba(255,255,255,0.65)", marginTop: 2 },
  addBtn: {
    width: 40, height: 40, borderRadius: 20,
    backgroundColor: "#fff", alignItems: "center", justifyContent: "center",
    shadowColor: "#000", shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.1, shadowRadius: 4, elevation: 3,
  },
  searchRow: {
    flexDirection: "row", alignItems: "center", gap: 10,
    backgroundColor: "rgba(255,255,255,0.15)", borderRadius: 14,
    paddingHorizontal: 14, paddingVertical: 10,
  },
  searchInput: { flex: 1, fontSize: 14, fontFamily: font.regular, color: "#fff" },

  sheet: {
    flex: 1, backgroundColor: "#fff",
    borderTopLeftRadius: 28, borderTopRightRadius: 28, marginTop: -20,
  },
  filterRow: { flexDirection: "row", gap: 8, paddingHorizontal: 20, paddingVertical: 16 },
  filterPill: {
    paddingHorizontal: 16, paddingVertical: 7, borderRadius: 20,
    backgroundColor: "#F1F5F9",
  },
  filterPillActive: { backgroundColor: TEAL },
  filterText: { fontSize: 13, fontFamily: font.semiBold, color: "#64748B" },
  filterTextActive: { color: "#fff" },

  list: { paddingHorizontal: 20, paddingBottom: 120, gap: 10 },
  card: {
    flexDirection: "row", alignItems: "center", gap: 14,
    backgroundColor: "#F8FAFC", borderRadius: 16,
    padding: 14, borderWidth: 1, borderColor: "#E2E8F0",
  },
  avatar: {
    width: 48, height: 48, borderRadius: 24,
    alignItems: "center", justifyContent: "center",
  },
  avatarText: { fontSize: 16, fontFamily: font.bold },
  cardBody: { flex: 1 },
  cardName: { fontSize: 15, fontFamily: font.bold, color: "#1E293B" },
  cardSub: { fontSize: 12, fontFamily: font.regular, color: "#64748B", marginTop: 2 },
  cardRight: { alignItems: "flex-end", gap: 4 },
  statusDot: { width: 7, height: 7, borderRadius: 4 },
  statusText: { fontSize: 11, fontFamily: font.semiBold },

  empty: { alignItems: "center", paddingTop: 60, gap: 12 },
  emptyText: { fontSize: 14, fontFamily: font.regular, color: "#94A3B8" },
});
