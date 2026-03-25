import React from "react";
import {
  View, Text, StyleSheet, ScrollView, TouchableOpacity,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useQuery } from "@tanstack/react-query";
import { Ionicons } from "@expo/vector-icons";
import { listPayoutRates } from "../api/profile";
import LoadingSpinner from "../components/LoadingSpinner";
import { font } from "../constants/fonts";
import type { NativeStackScreenProps } from "@react-navigation/native-stack";

const TEAL = "#0D9488";
type Props = NativeStackScreenProps<any>;

interface PayoutRate {
  _id: string;
  rank: string;
  level: number | null;
  mode: "percentage" | "fixed";
  value: number;
}

function peso(n: number) {
  return "₱" + n.toLocaleString("en-PH", { minimumFractionDigits: 0 });
}

export default function PayoutRatesScreen({ navigation }: Props) {
  const insets = useSafeAreaInsets();

  const { data: rates = [], isLoading } = useQuery({
    queryKey: ["payout-rates"],
    queryFn: listPayoutRates,
  });

  // Group by rank
  const grouped = (rates as PayoutRate[]).reduce<Record<string, PayoutRate[]>>((acc, r) => {
    if (!acc[r.rank]) acc[r.rank] = [];
    acc[r.rank].push(r);
    return acc;
  }, {});

  if (isLoading) return <LoadingSpinner />;

  return (
    <View style={styles.root}>
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
          <Ionicons name="cash-outline" size={28} color="#D97706" />
        </View>
        <Text style={styles.heroTitle}>Payout Rates</Text>
        <Text style={styles.heroSub}>Rate per rank and performance level</Text>
      </View>

      {/* ── White Sheet ── */}
      <ScrollView
        style={styles.sheet}
        contentContainerStyle={styles.sheetContent}
        showsVerticalScrollIndicator={false}
      >
        {Object.keys(grouped).length === 0 ? (
          <View style={styles.empty}>
            <Ionicons name="cash-outline" size={40} color="#CBD5E1" />
            <Text style={styles.emptyText}>No payout rates configured</Text>
            <Text style={styles.emptySub}>Set rates from the web admin panel</Text>
          </View>
        ) : (
          Object.entries(grouped).map(([rank, rankRates]) => (
            <View key={rank} style={styles.rankGroup}>
              <View style={styles.rankHeader}>
                <View style={styles.rankDot} />
                <Text style={styles.rankTitle}>{rank}</Text>
              </View>
              <View style={styles.card}>
                {rankRates
                  .sort((a, b) => (b.level ?? 0) - (a.level ?? 0))
                  .map((r, i) => (
                    <View
                      key={r._id}
                      style={[
                        styles.rateRow,
                        i === rankRates.length - 1 && { borderBottomWidth: 0 },
                      ]}
                    >
                      <View style={styles.rateLevelBox}>
                        <Text style={styles.rateLevelText}>
                          {r.level !== null ? `Level ${r.level}` : "Base"}
                        </Text>
                      </View>
                      <View style={styles.rateRight}>
                        <Text style={styles.rateValue}>
                          {r.mode === "percentage"
                            ? `${r.value}%`
                            : peso(r.value)}
                        </Text>
                        <View style={[
                          styles.modeBadge,
                          { backgroundColor: r.mode === "percentage" ? "#F0F9FF" : "#F0FDF9" },
                        ]}>
                          <Text style={[
                            styles.modeText,
                            { color: r.mode === "percentage" ? "#0284C7" : TEAL },
                          ]}>
                            {r.mode === "percentage" ? "% of fee" : "Fixed"}
                          </Text>
                        </View>
                      </View>
                    </View>
                  ))}
              </View>
            </View>
          ))
        )}

        <View style={styles.note}>
          <Ionicons name="information-circle-outline" size={15} color="#94A3B8" />
          <Text style={styles.noteText}>
            Rates are applied automatically when adding participants to a gig. Edit rates from the web admin panel.
          </Text>
        </View>
      </ScrollView>
    </View>
  );
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
  sheetContent: { padding: 24, paddingBottom: 80, gap: 16 },

  rankGroup: { gap: 10 },
  rankHeader: { flexDirection: "row", alignItems: "center", gap: 8 },
  rankDot: { width: 8, height: 8, borderRadius: 4, backgroundColor: TEAL },
  rankTitle: { fontSize: 14, fontFamily: font.bold, color: "#1E293B" },

  card: {
    backgroundColor: "#F8FAFC", borderRadius: 16,
    borderWidth: 1, borderColor: "#E2E8F0", overflow: "hidden",
  },
  rateRow: {
    flexDirection: "row", alignItems: "center", justifyContent: "space-between",
    paddingHorizontal: 16, paddingVertical: 14,
    borderBottomWidth: 1, borderBottomColor: "#E2E8F0",
  },
  rateLevelBox: {
    backgroundColor: "#E6F7F5", borderRadius: 8,
    paddingHorizontal: 10, paddingVertical: 4,
  },
  rateLevelText: { fontSize: 12, fontFamily: font.semiBold, color: TEAL },
  rateRight: { flexDirection: "row", alignItems: "center", gap: 10 },
  rateValue: { fontSize: 16, fontFamily: font.extraBold, color: "#1E293B" },
  modeBadge: { borderRadius: 20, paddingHorizontal: 8, paddingVertical: 3 },
  modeText: { fontSize: 11, fontFamily: font.semiBold },

  empty: { alignItems: "center", paddingTop: 48, gap: 8 },
  emptyText: { fontSize: 14, fontFamily: font.medium, color: "#94A3B8" },
  emptySub: { fontSize: 12, fontFamily: font.regular, color: "#CBD5E1" },

  note: {
    flexDirection: "row", gap: 8, alignItems: "flex-start",
    backgroundColor: "#F8FAFC", borderRadius: 12, padding: 14,
    borderWidth: 1, borderColor: "#E2E8F0",
  },
  noteText: { flex: 1, fontSize: 12, fontFamily: font.regular, color: "#94A3B8", lineHeight: 18 },
});
