import React from "react";
import { View, Text, StyleSheet, TouchableOpacity } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { Equipment } from "../types";
import { font } from '../constants/fonts';

const TEAL = "#0D9488";

interface Props {
  item: Equipment;
  onPress: () => void;
  onDelete?: () => void;
}

export default function EquipmentCard({ item, onPress, onDelete }: Props) {
  const available = item.availableQty > 0;

  return (
    <TouchableOpacity style={styles.card} onPress={onPress} activeOpacity={0.75}>
      <View style={[styles.iconBox, { backgroundColor: available ? "#E6F7F5" : "#FEE2E2" }]}>
        <Ionicons name="cube-outline" size={22} color={available ? TEAL : "#EF4444"} />
      </View>
      <View style={styles.middle}>
        <Text style={styles.name} numberOfLines={1}>{item.name}</Text>
        <Text style={styles.category} numberOfLines={1}>
          {item.category || "Uncategorized"}
        </Text>
        <View style={styles.stockRow}>
          <View style={[styles.badge, { backgroundColor: available ? "#E6F7F5" : "#FEE2E2" }]}>
            <Text style={[styles.badgeText, { color: available ? TEAL : "#EF4444" }]}>
              {available ? "Available" : "Out of stock"}
            </Text>
          </View>
          <Text style={styles.stockCount}>
            {item.availableQty}/{item.totalQty}
          </Text>
        </View>
      </View>
      <View style={styles.rightCol}>
        {onDelete && (
          <TouchableOpacity
            onPress={(e) => { e.stopPropagation(); onDelete(); }}
            style={styles.deleteBtn}
            hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
          >
            <Ionicons name="trash-outline" size={18} color="#EF4444" />
          </TouchableOpacity>
        )}
        <Ionicons name="chevron-forward" size={16} color="#CBD5E1" />
      </View>
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: "#F8FAFC",
    borderRadius: 16,
    borderWidth: 1,
    borderColor: "#E2E8F0",
    padding: 14,
    marginHorizontal: 20,
    marginBottom: 10,
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
  },
  iconBox: {
    width: 48,
    height: 48,
    borderRadius: 14,
    justifyContent: "center",
    alignItems: "center",
    flexShrink: 0,
  },
  middle: {
    flex: 1,
    gap: 4,
  },
  name: {
    fontSize: 15,
    fontFamily: font.bold,
    color: "#1E293B",
  },
  category: {
    fontSize: 12,
    color: "#94A3B8",
  },
  stockRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    marginTop: 2,
  },
  badge: {
    borderRadius: 20,
    paddingHorizontal: 8,
    paddingVertical: 2,
  },
  badgeText: {
    fontSize: 11,
    fontFamily: font.semiBold,
  },
  stockCount: {
    fontSize: 12,
    color: "#64748B",
    fontFamily: font.medium,
  },
  rightCol: {
    alignItems: "center",
    gap: 10,
    flexShrink: 0,
  },
  deleteBtn: {
    padding: 2,
  },
});
