import React from "react";
import { View, Text, TouchableOpacity, StyleSheet } from "react-native";
import { COLORS } from "../constants/theme";
import { font } from '../constants/fonts';

interface AppHeaderProps {
  title?: string;
  showBack?: boolean;
  onBack?: () => void;
  navigation?: { goBack: () => void };
}

export default function AppHeader({
  title = "GYOCC",
  showBack = false,
  onBack,
  navigation,
}: AppHeaderProps) {
  function handleBack() {
    if (onBack) {
      onBack();
    } else if (navigation?.goBack) {
      navigation.goBack();
    }
  }

  return (
    <View style={styles.container}>
      <View style={styles.left}>
        {showBack ? (
          <TouchableOpacity onPress={handleBack} style={styles.backBtn}>
            <Text style={styles.backIcon}>{"<"}</Text>
          </TouchableOpacity>
        ) : (
          <View style={styles.placeholder} />
        )}
      </View>
      <Text style={styles.title}>{title}</Text>
      <View style={styles.right}>
        <Text style={styles.bell}>{"bell"}</Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    height: 56,
    backgroundColor: COLORS.white,
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 16,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.border,
  },
  left: {
    width: 40,
  },
  backBtn: {
    padding: 4,
  },
  backIcon: {
    fontSize: 22,
    color: COLORS.text,
  },
  placeholder: {
    width: 40,
  },
  title: {
    flex: 1,
    textAlign: "center",
    fontSize: 16,
    fontFamily: font.bold,
    color: COLORS.text,
  },
  right: {
    width: 40,
    alignItems: "flex-end",
  },
  bell: {
    fontSize: 20,
    color: COLORS.textSecondary,
  },
});
