import React from "react";
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  StyleSheet,
  Image,
  Dimensions,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useQuery } from "@tanstack/react-query";
import { Ionicons } from "@expo/vector-icons";
import { listEquipment } from "../api/equipment";
import { listLoans } from "../api/loans";
import { getAnnualReport } from "../api/reports";
import LoadingSpinner from "../components/LoadingSpinner";
import { useAuth } from "../context/AuthContext";
import { font } from '../constants/fonts';

const TEAL = "#0D9488";
const TEAL_DARK = "#0A7C72";
const { width: SCREEN_W } = Dimensions.get("window");

export default function HomeScreen({ navigation }: { navigation: { navigate: (screen: string, params?: Record<string, unknown>) => void } }) {
  const insets = useSafeAreaInsets();
  const { user } = useAuth();
  const currentYear = new Date().getFullYear();

  const { data: report, isLoading: loadingReport } = useQuery({
    queryKey: ["report", currentYear],
    queryFn: () => getAnnualReport(currentYear),
  });

  const { data: equipment = [], isLoading: loadingEquip } = useQuery({
    queryKey: ["equipment"],
    queryFn: () => listEquipment(),
  });

  const { data: allLoans = [], isLoading: loadingLoans } = useQuery({
    queryKey: ["loans"],
    queryFn: () => listLoans(),
  });

  const totalEquipment = equipment.length;
  const availableCount = equipment.filter((e: { availableQty: number }) => e.availableQty > 0).length;
  const activeLoans = allLoans.filter((l: { actualReturnDate?: string | null }) => !l.actualReturnDate);

  const grossIncome = report?.gigIncome ?? 0;
  const netIncome = report?.netIncome ?? 0;

  if (loadingReport && loadingEquip && loadingLoans) return <LoadingSpinner />;

  return (
    <View style={styles.root}>
      <ScrollView
        contentContainerStyle={styles.scroll}
        showsVerticalScrollIndicator={false}
      >
        {/* ── Hero Header ── */}
        <View style={[styles.hero, { paddingTop: insets.top + 16 }]}>
          {/* Decorative circles */}
          <View style={styles.decCircle1} />
          <View style={styles.decCircle2} />

          {/* Top row */}
          <View style={styles.topRow}>
            <Text style={styles.helloText}>
              Hello, {user?.name?.split(" ")[0] ?? "Friend"} 👋
            </Text>
            <View style={styles.topRight}>
              <View style={styles.gigPill}>
                <Ionicons name="musical-notes-outline" size={13} color={TEAL} />
                <Text style={styles.gigPillText}>
                  {report?.gigCount ?? 0} gigs
                </Text>
              </View>
              <TouchableOpacity style={styles.bellBtn}>
                <Ionicons name="notifications-outline" size={22} color="#fff" />
              </TouchableOpacity>
            </View>
          </View>

          {/* Gross income big number */}
          <View style={styles.heroCenter}>
            <Text style={styles.heroLabel}>GROSS INCOME {currentYear}</Text>
            <Text style={styles.heroAmount}>
              ₱{grossIncome.toLocaleString("en-PH", { minimumFractionDigits: 2 })}
            </Text>
            <Text style={styles.heroSub}>
              Net: ₱{netIncome.toLocaleString("en-PH", { minimumFractionDigits: 2 })}
            </Text>
          </View>

          {/* CTA button */}
          <TouchableOpacity
            style={styles.ctaBtn}
            onPress={() => navigation.navigate("Reports")}
            activeOpacity={0.85}
          >
            <Text style={styles.ctaBtnText}>View Full Report</Text>
          </TouchableOpacity>
        </View>

        {/* ── White overlapping section ── */}
        <View style={styles.whiteSheet}>
          <Text style={styles.sectionTitle}>Quick Actions</Text>

          {/* Counter cards — square, same row */}
          <View style={styles.counterRow}>
            <CounterCard
              count={totalEquipment}
              countColor={TEAL}
              title="Equipment"
              subtitle={`${availableCount} avail · ${totalEquipment - availableCount} out`}
              onPress={() => navigation.navigate("Equipment")}
            />
            <CounterCard
              count={activeLoans.length}
              countColor="#D97706"
              title="Active Loans"
              subtitle="currently out"
              onPress={() => navigation.navigate("Loans")}
            />
          </View>

          {/* Action cards */}
          <View style={styles.grid}>
            <ActionCard
              icon="add-circle-outline"
              iconBg="#E0F2FE"
              iconColor="#0284C7"
              title="Add Equipment"
              subtitle="Register new item"
              onPress={() =>
                navigation.navigate("Equipment", { screen: "AddEditEquipment" })
              }
            />
            <ActionCard
              icon="clipboard-outline"
              iconBg="#F0FDF4"
              iconColor="#16A34A"
              title="New Loan"
              subtitle="Create a loan record"
              onPress={() =>
                navigation.navigate("Loans", { screen: "CreateLoan" })
              }
            />
          </View>

          {/* Stats row */}
          <Text style={[styles.sectionTitle, { marginTop: 24 }]}>Overview</Text>
          <View style={styles.statsRow}>
            <StatPill icon="cash-outline" color={TEAL} label="Income" value={`₱${(grossIncome / 1000).toFixed(1)}k`} />
            <StatPill icon="trending-down-outline" color="#EF4444" label="Expenses" value={`₱${((report?.totalExpenses ?? 0) / 1000).toFixed(1)}k`} />
            <StatPill icon="wallet-outline" color="#8B5CF6" label="Net" value={`₱${(netIncome / 1000).toFixed(1)}k`} />
          </View>
        </View>
      </ScrollView>
    </View>
  );
}

type IoniconsName = React.ComponentProps<typeof Ionicons>["name"];

function ActionCard({
  icon, iconBg, iconColor, title, subtitle, onPress, count,
}: {
  icon: IoniconsName; iconBg: string; iconColor: string;
  title: string; subtitle: string; onPress: () => void;
  count?: number;
}) {
  return (
    <TouchableOpacity style={styles.card} onPress={onPress} activeOpacity={0.75}>
      <View style={[styles.cardIconWrap, { backgroundColor: iconBg }]}>
        {count !== undefined ? (
          <Text style={[styles.cardCount, { color: iconColor }]}>{count}</Text>
        ) : (
          <Ionicons name={icon} size={26} color={iconColor} />
        )}
      </View>
      <View style={styles.cardText}>
        <Text style={styles.cardTitle}>{title}</Text>
        <Text style={styles.cardSubtitle}>{subtitle}</Text>
      </View>
      <Ionicons name="chevron-forward" size={16} color="#CBD5E1" />
    </TouchableOpacity>
  );
}

function CounterCard({
  count, countColor, title, subtitle, onPress,
}: {
  count: number; countColor: string;
  title: string; subtitle: string; onPress: () => void;
}) {
  return (
    <TouchableOpacity style={styles.counterCard} onPress={onPress} activeOpacity={0.75}>
      <Text style={[styles.counterNumber, { color: countColor }]}>{count}</Text>
      <Text style={styles.counterTitle}>{title}</Text>
      <Text style={styles.counterSubtitle}>{subtitle}</Text>
    </TouchableOpacity>
  );
}

function StatPill({ icon, color, label, value }: { icon: IoniconsName; color: string; label: string; value: string }) {
  return (
    <View style={styles.statPill}>
      <Ionicons name={icon} size={18} color={color} />
      <Text style={styles.statPillValue}>{value}</Text>
      <Text style={styles.statPillLabel}>{label}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: "#F1F5F9" },
  scroll: { flexGrow: 1, paddingBottom: 32 },

  // ── Hero ──
  hero: {
    backgroundColor: TEAL,
    paddingBottom: 60,
    paddingHorizontal: 20,
    overflow: "hidden",
  },
  decCircle1: {
    position: "absolute",
    width: 280,
    height: 280,
    borderRadius: 140,
    borderWidth: 40,
    borderColor: "rgba(255,255,255,0.07)",
    top: -80,
    right: -80,
  },
  decCircle2: {
    position: "absolute",
    width: 200,
    height: 200,
    borderRadius: 100,
    borderWidth: 30,
    borderColor: "rgba(255,255,255,0.05)",
    bottom: -60,
    left: -40,
  },
  topRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: 32,
  },
  helloText: {
    fontSize: 17,
    fontFamily: font.bold,
    color: "#FFFFFF",
  },
  topRight: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
  },
  gigPill: {
    flexDirection: "row",
    alignItems: "center",
    gap: 5,
    backgroundColor: "#FFFFFF",
    borderRadius: 20,
    paddingHorizontal: 10,
    paddingVertical: 5,
  },
  gigPillText: {
    fontSize: 12,
    fontFamily: font.bold,
    color: TEAL,
  },
  bellBtn: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: "rgba(255,255,255,0.2)",
    alignItems: "center",
    justifyContent: "center",
  },

  // hero center
  heroCenter: {
    alignItems: "center",
    marginBottom: 28,
  },
  heroLabel: {
    fontSize: 11,
    fontFamily: font.semiBold,
    color: "rgba(255,255,255,0.7)",
    letterSpacing: 1.5,
    textTransform: "uppercase",
    marginBottom: 8,
  },
  heroAmount: {
    fontSize: 38,
    fontFamily: font.extraBold,
    color: "#FFFFFF",
    letterSpacing: -0.5,
  },
  heroSub: {
    fontSize: 13,
    color: "rgba(255,255,255,0.65)",
    marginTop: 6,
  },

  // CTA
  ctaBtn: {
    alignSelf: "center",
    backgroundColor: "#FFFFFF",
    borderRadius: 30,
    paddingHorizontal: 36,
    paddingVertical: 14,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.12,
    shadowRadius: 8,
    elevation: 4,
  },
  ctaBtnText: {
    fontSize: 15,
    fontFamily: font.bold,
    color: TEAL,
  },

  // ── White sheet ──
  whiteSheet: {
    backgroundColor: "#FFFFFF",
    borderTopLeftRadius: 28,
    borderTopRightRadius: 28,
    marginTop: -28,
    padding: 24,
    flex: 1,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: -4 },
    shadowOpacity: 0.06,
    shadowRadius: 12,
    elevation: 8,
  },
  sectionTitle: {
    fontSize: 17,
    fontFamily: font.bold,
    color: "#1E293B",
    marginBottom: 16,
  },

  // ── Counter cards (square row) ──
  counterRow: {
    flexDirection: "row",
    gap: 12,
    marginBottom: 12,
  },
  counterCard: {
    flex: 1,
    aspectRatio: 1,
    backgroundColor: "#F8FAFC",
    borderRadius: 20,
    borderWidth: 1,
    borderColor: "#E2E8F0",
    padding: 16,
    alignItems: "center",
    justifyContent: "center",
    gap: 4,
  },
  counterNumber: {
    fontSize: 40,
    fontFamily: font.extraBold,
    letterSpacing: -1,
  },
  counterTitle: {
    fontSize: 14,
    fontFamily: font.bold,
    color: "#1E293B",
    textAlign: "center",
  },
  counterSubtitle: {
    fontSize: 11,
    color: "#94A3B8",
    fontFamily: font.medium,
    textAlign: "center",
  },

  // ── Horizontal cards ──
  grid: {
    flexDirection: "column",
    gap: 10,
  },
  card: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#F8FAFC",
    borderRadius: 16,
    padding: 14,
    borderWidth: 1,
    borderColor: "#E2E8F0",
    gap: 14,
  },
  cardIconWrap: {
    width: 50,
    height: 50,
    borderRadius: 14,
    alignItems: "center",
    justifyContent: "center",
    flexShrink: 0,
  },
  cardText: {
    flex: 1,
  },
  cardTitle: {
    fontSize: 15,
    fontFamily: font.bold,
    color: "#1E293B",
  },
  cardSubtitle: {
    fontSize: 12,
    color: "#94A3B8",
    marginTop: 3,
  },
  cardCount: {
    fontSize: 22,
    fontFamily: font.extraBold,
    letterSpacing: -0.5,
  },

  // ── Stats row ──
  statsRow: {
    flexDirection: "row",
    gap: 10,
  },
  statPill: {
    flex: 1,
    backgroundColor: "#F8FAFC",
    borderRadius: 14,
    padding: 14,
    alignItems: "center",
    borderWidth: 1,
    borderColor: "#E2E8F0",
    gap: 4,
  },
  statPillValue: {
    fontSize: 15,
    fontFamily: font.bold,
    color: "#1E293B",
  },
  statPillLabel: {
    fontSize: 11,
    color: "#94A3B8",
    fontFamily: font.medium,
  },
});
