import React from "react";
import { View, Text, StyleSheet } from "react-native";
import { font } from '../constants/fonts';

interface Props {
  label: string;
  color: string;
  bgColor: string;
}

export default function StatusBadge({ label, color, bgColor }: Props) {
  return (
    <View style={[styles.badge, { backgroundColor: bgColor }]}>
      <Text style={[styles.text, { color }]}>{label}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  badge: {
    paddingHorizontal: 10,
    paddingVertical: 3,
    borderRadius: 12,
    alignSelf: "flex-start",
  },
  text: {
    fontSize: 12,
    fontFamily: font.semiBold,
  },
});
