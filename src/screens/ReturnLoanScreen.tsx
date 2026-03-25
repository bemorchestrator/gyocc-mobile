import React, { useState } from "react";
import {
  View, Text, TextInput, TouchableOpacity,
  StyleSheet, ScrollView, KeyboardAvoidingView, Platform,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { Ionicons } from "@expo/vector-icons";
import { returnLoan } from "../api/loans";
import { EquipmentLoan, EquipmentCondition } from "../types";
import { formatDate } from "../utils/formatDate";
import { font } from "../constants/fonts";
import Toast from "react-native-toast-message";
import type { NativeStackScreenProps } from "@react-navigation/native-stack";

const TEAL = "#0D9488";
const CONDITIONS: EquipmentCondition[] = ["Excellent", "Good", "Fair", "Poor"];
type Props = NativeStackScreenProps<any>;

export default function ReturnLoanScreen({ route, navigation }: Props) {
  const { loan } = route.params as { loan: EquipmentLoan };
  const insets = useSafeAreaInsets();
  const queryClient = useQueryClient();

  const [condition,  setCondition]  = useState<EquipmentCondition>("Good");
  const [returnDate, setReturnDate] = useState(new Date().toISOString().split("T")[0]);
  const [notes,      setNotes]      = useState("");

  const mutation = useMutation({
    mutationFn: () =>
      returnLoan(loan._id, {
        actualReturnDate: returnDate,
        conditionOnReturn: condition,
        notes: notes || undefined,
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["loans"] });
      queryClient.invalidateQueries({ queryKey: ["equipment"] });
      Toast.show({ type: "success", text1: "Equipment returned successfully" });
      navigation.goBack();
    },
    onError: (err: Error) =>
      Toast.show({ type: "error", text1: "Error", text2: err.message }),
  });

  const conditionColor: Record<EquipmentCondition, string> = {
    Excellent: "#16A34A", Good: TEAL, Fair: "#D97706", Poor: "#DC2626",
  };

  return (
    <KeyboardAvoidingView
      style={styles.root}
      behavior={Platform.OS === "ios" ? "padding" : "height"}
    >
      {/* ── Hero ── */}
      <View style={[styles.hero, { paddingTop: insets.top + 12 }]}>
        <View style={styles.decCircle1} />
        <View style={styles.decCircle2} />

        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backBtn}>
          <Ionicons name="chevron-back" size={20} color="#fff" />
        </TouchableOpacity>

        <View style={styles.heroIcon}>
          <Ionicons name="return-down-back-outline" size={28} color={TEAL} />
        </View>
        <Text style={styles.heroTitle}>Process Return</Text>
        <Text style={styles.heroEquip} numberOfLines={1}>{loan.equipmentName}</Text>

        <View style={styles.heroBadgeRow}>
          <View style={styles.heroBadge}>
            <Ionicons name="person-outline" size={12} color="#fff" />
            <Text style={styles.heroBadgeText}>{loan.borrowerName}</Text>
          </View>
          <View style={styles.heroBadge}>
            <Ionicons name="calendar-outline" size={12} color="#fff" />
            <Text style={styles.heroBadgeText}>{formatDate(loan.dateBorrowed)}</Text>
          </View>
          {loan.qtyBorrowed > 1 && (
            <View style={styles.heroBadge}>
              <Ionicons name="layers-outline" size={12} color="#fff" />
              <Text style={styles.heroBadgeText}>×{loan.qtyBorrowed}</Text>
            </View>
          )}
        </View>
      </View>

      {/* ── White Sheet ── */}
      <ScrollView
        style={styles.sheet}
        contentContainerStyle={styles.sheetContent}
        keyboardShouldPersistTaps="handled"
        showsVerticalScrollIndicator={false}
      >
        {/* Loan summary card */}
        <View style={styles.summaryCard}>
          <SummaryRow icon="cube-outline"     label="Equipment" value={loan.equipmentName} />
          <SummaryRow icon="person-outline"   label="Borrower"  value={loan.borrowerName} />
          <SummaryRow icon="calendar-outline" label="Borrowed"  value={formatDate(loan.dateBorrowed)} />
          {loan.expectedReturnDate && (
            <SummaryRow icon="time-outline" label="Expected" value={formatDate(loan.expectedReturnDate)} last />
          )}
        </View>

        {/* Return date */}
        <FormLabel text="Return Date *" />
        <TextInput
          style={styles.input}
          value={returnDate}
          onChangeText={setReturnDate}
          placeholder="YYYY-MM-DD"
          placeholderTextColor="#A0AEC0"
        />

        {/* Condition */}
        <FormLabel text="Condition on Return *" />
        <View style={styles.chipRow}>
          {CONDITIONS.map((c) => (
            <TouchableOpacity
              key={c}
              style={[
                styles.chip,
                condition === c && { backgroundColor: conditionColor[c], borderColor: conditionColor[c] },
              ]}
              onPress={() => setCondition(c)}
            >
              <Text style={[styles.chipText, condition === c && styles.chipTextActive]}>
                {c}
              </Text>
            </TouchableOpacity>
          ))}
        </View>
        {condition === "Poor" && (
          <View style={styles.warningBanner}>
            <Ionicons name="warning-outline" size={15} color="#D97706" />
            <Text style={styles.warningText}>Poor condition will flag this item as damaged.</Text>
          </View>
        )}

        {/* Notes */}
        <FormLabel text="Notes" />
        <TextInput
          style={[styles.input, styles.textArea]}
          value={notes}
          onChangeText={setNotes}
          placeholder="Any damage, missing parts, etc."
          placeholderTextColor="#A0AEC0"
          multiline
          textAlignVertical="top"
        />

        {/* Submit */}
        <TouchableOpacity
          style={[styles.submitBtn, mutation.isPending && styles.submitBtnDisabled]}
          onPress={() => mutation.mutate()}
          disabled={mutation.isPending}
          activeOpacity={0.85}
        >
          <Ionicons name="checkmark-outline" size={20} color="#fff" />
          <Text style={styles.submitText}>
            {mutation.isPending ? "Processing..." : "Confirm Return"}
          </Text>
        </TouchableOpacity>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

function SummaryRow({ icon, label, value, last }: {
  icon: any; label: string; value: string; last?: boolean;
}) {
  return (
    <View style={[styles.summaryRow, last && { borderBottomWidth: 0 }]}>
      <Ionicons name={icon} size={14} color="#94A3B8" />
      <Text style={styles.summaryLabel}>{label}</Text>
      <Text style={styles.summaryValue}>{value}</Text>
    </View>
  );
}

function FormLabel({ text }: { text: string }) {
  return <Text style={styles.formLabel}>{text}</Text>;
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: TEAL },

  hero: {
    backgroundColor: TEAL, paddingHorizontal: 24,
    paddingBottom: 44, overflow: "hidden",
  },
  decCircle1: {
    position: "absolute", width: 200, height: 200, borderRadius: 100,
    borderWidth: 30, borderColor: "rgba(255,255,255,0.07)", top: -50, right: -50,
  },
  decCircle2: {
    position: "absolute", width: 140, height: 140, borderRadius: 70,
    borderWidth: 22, borderColor: "rgba(255,255,255,0.05)", bottom: -30, left: -20,
  },
  backBtn: {
    width: 36, height: 36, borderRadius: 18,
    backgroundColor: "rgba(255,255,255,0.2)",
    alignItems: "center", justifyContent: "center", marginBottom: 14,
  },
  heroIcon: {
    width: 62, height: 62, borderRadius: 31, backgroundColor: "#fff",
    alignItems: "center", justifyContent: "center", marginBottom: 10,
    shadowColor: "#000", shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.12, shadowRadius: 8, elevation: 4,
  },
  heroTitle: { fontSize: 22, fontFamily: font.extraBold, color: "#fff", letterSpacing: -0.3 },
  heroEquip: { fontSize: 14, fontFamily: font.medium, color: "rgba(255,255,255,0.75)", marginTop: 2, marginBottom: 12 },
  heroBadgeRow: { flexDirection: "row", flexWrap: "wrap", gap: 8 },
  heroBadge: {
    flexDirection: "row", alignItems: "center", gap: 5,
    backgroundColor: "rgba(255,255,255,0.2)", borderRadius: 20,
    paddingHorizontal: 10, paddingVertical: 5,
  },
  heroBadgeText: { fontSize: 12, fontFamily: font.semiBold, color: "#fff" },

  sheet: {
    flex: 1, backgroundColor: "#fff",
    borderTopLeftRadius: 28, borderTopRightRadius: 28, marginTop: -24,
  },
  sheetContent: { padding: 24, paddingBottom: 48 },

  // Summary card
  summaryCard: {
    backgroundColor: "#F8FAFC", borderRadius: 16,
    borderWidth: 1, borderColor: "#E2E8F0",
    overflow: "hidden", marginBottom: 4,
  },
  summaryRow: {
    flexDirection: "row", alignItems: "center", gap: 10,
    paddingHorizontal: 16, paddingVertical: 13,
    borderBottomWidth: 1, borderBottomColor: "#E2E8F0",
  },
  summaryLabel: { fontSize: 13, fontFamily: font.medium, color: "#64748B", width: 72 },
  summaryValue: { fontSize: 13, fontFamily: font.semiBold, color: "#1E293B", flex: 1 },

  formLabel: { fontSize: 13, fontFamily: font.bold, color: TEAL, marginBottom: 8, marginTop: 20 },

  input: {
    backgroundColor: "#F3F4F6", borderRadius: 10,
    paddingHorizontal: 16, paddingVertical: 13,
    fontSize: 14, fontFamily: font.regular, color: "#1A202C",
  },
  textArea: { minHeight: 88 },

  chipRow: { flexDirection: "row", gap: 8 },
  chip: {
    flex: 1, paddingVertical: 10, borderRadius: 10,
    backgroundColor: "#F1F5F9", alignItems: "center",
    borderWidth: 1, borderColor: "#E2E8F0",
  },
  chipText: { fontSize: 12, fontFamily: font.semiBold, color: "#64748B" },
  chipTextActive: { color: "#fff" },

  warningBanner: {
    flexDirection: "row", alignItems: "center", gap: 8,
    backgroundColor: "#FEF3C7", borderRadius: 10, padding: 12, marginTop: 10,
    borderWidth: 1, borderColor: "#FDE68A",
  },
  warningText: { fontSize: 12, fontFamily: font.medium, color: "#92400E", flex: 1 },

  submitBtn: {
    flexDirection: "row", alignItems: "center", justifyContent: "center",
    gap: 8, backgroundColor: TEAL, borderRadius: 12, paddingVertical: 16, marginTop: 28,
    shadowColor: TEAL, shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.35, shadowRadius: 8, elevation: 6,
  },
  submitBtnDisabled: { opacity: 0.6 },
  submitText: { color: "#fff", fontSize: 16, fontFamily: font.bold, letterSpacing: 0.3 },
});
