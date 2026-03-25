import React from "react";
import { View, Text, StyleSheet, TouchableOpacity } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { EquipmentLoan } from "../types";
import { formatDate } from "../utils/formatDate";
import { font } from "../constants/fonts";

const TEAL = "#0D9488";

interface Props {
  item: EquipmentLoan;
  onPress: () => void;
  onDelete?: () => void;
}

export default function LoanCard({ item, onPress, onDelete }: Props) {
  const isActive = !item.actualReturnDate;

  return (
    <TouchableOpacity style={styles.card} onPress={onPress} activeOpacity={0.75}>
      <View style={[styles.iconBox, { backgroundColor: isActive ? "#E6F7F5" : "#F1F5F9" }]}>
        <Ionicons
          name="clipboard-outline"
          size={20}
          color={isActive ? TEAL : "#94A3B8"}
        />
      </View>
      <View style={styles.middle}>
        <Text style={styles.borrower} numberOfLines={1}>{item.borrowerName}</Text>
        <Text style={styles.equipment} numberOfLines={1}>{item.equipmentName}</Text>
        <View style={styles.metaRow}>
          <Ionicons name="calendar-outline" size={11} color="#94A3B8" />
          <Text style={styles.date}>{formatDate(item.dateBorrowed)}</Text>
          {item.qtyBorrowed > 1 && (
            <>
              <Text style={styles.metaDot}>·</Text>
              <Text style={styles.date}>×{item.qtyBorrowed}</Text>
            </>
          )}
        </View>
      </View>
      <View style={styles.rightCol}>
        <View style={[styles.badge, { backgroundColor: isActive ? "#E6F7F5" : "#F1F5F9" }]}>
          <Text style={[styles.badgeText, { color: isActive ? TEAL : "#64748B" }]}>
            {isActive ? "Active" : "Returned"}
          </Text>
        </View>
        {onDelete && (
          <TouchableOpacity
            onPress={(e) => { e.stopPropagation(); onDelete(); }}
            hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
          >
            <Ionicons name="trash-outline" size={16} color="#EF4444" />
          </TouchableOpacity>
        )}
      </View>
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  card: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    backgroundColor: "#F8FAFC",
    borderRadius: 16,
    borderWidth: 1,
    borderColor: "#E2E8F0",
    padding: 14,
    marginHorizontal: 20,
    marginBottom: 10,
  },
  iconBox: {
    width: 46,
    height: 46,
    borderRadius: 13,
    alignItems: "center",
    justifyContent: "center",
    flexShrink: 0,
  },
  middle: { flex: 1, gap: 3 },
  borrower: { fontSize: 14, fontFamily: font.bold, color: "#1E293B" },
  equipment: { fontSize: 12, color: "#64748B", fontFamily: font.medium },
  metaRow: { flexDirection: "row", alignItems: "center", gap: 4 },
  date: { fontSize: 11, color: "#94A3B8", fontFamily: font.regular },
  metaDot: { fontSize: 11, color: "#CBD5E1" },
  rightCol: { alignItems: "flex-end", gap: 8, flexShrink: 0 },
  badge: {
    borderRadius: 20,
    paddingHorizontal: 10,
    paddingVertical: 4,
  },
  badgeText: { fontSize: 11, fontFamily: font.semiBold },
});
