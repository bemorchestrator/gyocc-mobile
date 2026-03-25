import React from "react";
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Alert,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Ionicons } from "@expo/vector-icons";
import { getEquipment, deleteEquipment, getEquipmentLoans } from "../api/equipment";
import LoanCard from "../components/LoanCard";
import LoadingSpinner from "../components/LoadingSpinner";
import { formatDate } from "../utils/formatDate";
import Toast from "react-native-toast-message";
import type { NativeStackScreenProps } from "@react-navigation/native-stack";
import { font } from '../constants/fonts';

const TEAL = "#0D9488";

type Props = NativeStackScreenProps<any>;

export default function EquipmentDetailScreen({ route, navigation }: Props) {
  const { id } = route.params as { id: string };
  const insets = useSafeAreaInsets();
  const queryClient = useQueryClient();

  const { data: equipment, isLoading } = useQuery({
    queryKey: ["equipment", id],
    queryFn: () => getEquipment(id),
  });

  const { data: loans = [] } = useQuery({
    queryKey: ["equipment-loans", id],
    queryFn: () => getEquipmentLoans(id),
  });

  const deleteMutation = useMutation({
    mutationFn: () => deleteEquipment(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["equipment"] });
      Toast.show({ type: "success", text1: "Equipment deleted" });
      navigation.goBack();
    },
    onError: (err: Error) => {
      Toast.show({ type: "error", text1: "Delete failed", text2: err.message });
    },
  });

  function confirmDelete() {
    Alert.alert("Delete Equipment", "Are you sure? This cannot be undone.", [
      { text: "Cancel", style: "cancel" },
      { text: "Delete", style: "destructive", onPress: () => deleteMutation.mutate() },
    ]);
  }

  if (isLoading || !equipment) return <LoadingSpinner />;

  const activeLoans = loans.filter((l) => !l.actualReturnDate);
  const available = equipment.availableQty > 0;

  return (
    <View style={styles.root}>
      {/* ── Teal Hero ── */}
      <View style={[styles.hero, { paddingTop: insets.top + 20 }]}>
        <View style={styles.decCircle1} />
        <View style={styles.decCircle2} />

        <View style={styles.iconCircle}>
          <Ionicons name="cube-outline" size={36} color={TEAL} />
        </View>
        <Text style={styles.heroName}>{equipment.name}</Text>
        <View style={styles.heroBadgeRow}>
          <View style={[styles.heroBadge, { backgroundColor: available ? "rgba(255,255,255,0.25)" : "rgba(239,68,68,0.35)" }]}>
            <Ionicons
              name={available ? "checkmark-circle-outline" : "close-circle-outline"}
              size={13}
              color="#fff"
            />
            <Text style={styles.heroBadgeText}>
              {available ? "Available" : "Out of Stock"}
            </Text>
          </View>
          <View style={styles.heroBadge}>
            <Ionicons name="layers-outline" size={13} color="#fff" />
            <Text style={styles.heroBadgeText}>
              {equipment.availableQty}/{equipment.totalQty} units
            </Text>
          </View>
        </View>
      </View>

      {/* ── White Sheet ── */}
      <ScrollView
        style={styles.sheet}
        contentContainerStyle={styles.sheetContent}
        showsVerticalScrollIndicator={false}
      >
        {/* Details card */}
        <Text style={styles.sectionTitle}>Item Details</Text>
        <View style={styles.detailCard}>
          <DetailRow label="Item Code" value={equipment.serialNumber || "N/A"} />
          <DetailRow label="Category" value={equipment.category || "N/A"} />
          <DetailRow label="Condition" value={equipment.condition} />
          <DetailRow label="Total Qty" value={String(equipment.totalQty)} />
          <DetailRow label="Available" value={String(equipment.availableQty)} />
          <DetailRow
            label="DTI Grant"
            value={equipment.isFromDtiGrant ? `Yes (${equipment.grantYear || "N/A"})` : "No"}
            last
          />
          {equipment.description ? (
            <DetailRow label="Description" value={equipment.description} last />
          ) : null}
        </View>

        {/* Action buttons */}
        <View style={styles.btnRow}>
          <TouchableOpacity
            style={styles.outlineBtn}
            onPress={() => navigation.navigate("AddEditEquipment", { id: equipment._id, equipment })}
          >
            <Ionicons name="create-outline" size={18} color={TEAL} />
            <Text style={styles.outlineBtnText}>Edit</Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={styles.primaryBtn}
            onPress={() => navigation.navigate("CreateLoan", { equipmentId: equipment._id })}
          >
            <Ionicons name="clipboard-outline" size={18} color="#fff" />
            <Text style={styles.primaryBtnText}>New Loan</Text>
          </TouchableOpacity>
        </View>

        {/* Active loans */}
        {activeLoans.length > 0 && (
          <>
            <Text style={[styles.sectionTitle, { marginTop: 24 }]}>
              Active Loans ({activeLoans.length})
            </Text>
            {activeLoans.map((loan) => (
              <LoanCard key={loan._id} item={loan} onPress={() => {}} />
            ))}
          </>
        )}

        {/* Delete */}
        <TouchableOpacity style={styles.deleteBtn} onPress={confirmDelete}>
          <Ionicons name="trash-outline" size={18} color="#EF4444" />
          <Text style={styles.deleteBtnText}>Delete Equipment</Text>
        </TouchableOpacity>
      </ScrollView>
    </View>
  );
}

function DetailRow({ label, value, last }: { label: string; value: string; last?: boolean }) {
  return (
    <View style={[styles.detailRow, last && { borderBottomWidth: 0 }]}>
      <Text style={styles.detailLabel}>{label}</Text>
      <Text style={styles.detailValue}>{value}</Text>
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
    alignItems: "center",
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
  iconCircle: {
    width: 72,
    height: 72,
    borderRadius: 36,
    backgroundColor: "#FFFFFF",
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 12,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.12,
    shadowRadius: 8,
    elevation: 4,
  },
  heroName: {
    fontSize: 22,
    fontFamily: font.extraBold,
    color: "#FFFFFF",
    textAlign: "center",
    letterSpacing: -0.3,
    marginBottom: 10,
  },
  heroBadgeRow: {
    flexDirection: "row",
    gap: 8,
  },
  heroBadge: {
    flexDirection: "row",
    alignItems: "center",
    gap: 5,
    backgroundColor: "rgba(255,255,255,0.2)",
    borderRadius: 20,
    paddingHorizontal: 12,
    paddingVertical: 5,
  },
  heroBadgeText: {
    fontSize: 12,
    fontFamily: font.semiBold,
    color: "#FFFFFF",
  },

  // ── White Sheet ──
  sheet: {
    flex: 1,
    backgroundColor: "#FFFFFF",
    borderTopLeftRadius: 28,
    borderTopRightRadius: 28,
    marginTop: -24,
  },
  sheetContent: {
    padding: 24,
    paddingBottom: 48,
  },
  sectionTitle: {
    fontSize: 17,
    fontFamily: font.bold,
    color: "#1E293B",
    marginBottom: 12,
  },

  // Detail card
  detailCard: {
    backgroundColor: "#F8FAFC",
    borderRadius: 16,
    borderWidth: 1,
    borderColor: "#E2E8F0",
    overflow: "hidden",
    marginBottom: 20,
  },
  detailRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    paddingHorizontal: 16,
    paddingVertical: 13,
    borderBottomWidth: 1,
    borderBottomColor: "#E2E8F0",
  },
  detailLabel: {
    fontSize: 14,
    color: "#64748B",
    fontFamily: font.medium,
  },
  detailValue: {
    fontSize: 14,
    color: "#1E293B",
    fontFamily: font.semiBold,
    textAlign: "right",
    flex: 1,
    marginLeft: 12,
  },

  // Buttons
  btnRow: {
    flexDirection: "row",
    gap: 12,
  },
  outlineBtn: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 6,
    borderWidth: 1.5,
    borderColor: TEAL,
    borderRadius: 12,
    paddingVertical: 14,
  },
  outlineBtnText: {
    color: TEAL,
    fontSize: 15,
    fontFamily: font.bold,
  },
  primaryBtn: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 6,
    backgroundColor: TEAL,
    borderRadius: 12,
    paddingVertical: 14,
    shadowColor: TEAL,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 4,
  },
  primaryBtnText: {
    color: "#FFFFFF",
    fontSize: 15,
    fontFamily: font.bold,
  },

  // Delete
  deleteBtn: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
    marginTop: 28,
    backgroundColor: "#FEF2F2",
    borderRadius: 12,
    paddingVertical: 14,
    borderWidth: 1,
    borderColor: "#FECACA",
  },
  deleteBtnText: {
    color: "#EF4444",
    fontSize: 15,
    fontFamily: font.bold,
  },
});
