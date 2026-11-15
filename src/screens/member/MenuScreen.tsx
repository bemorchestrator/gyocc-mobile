// Menu: dark, full screen, a few large airy links and Log out.
import React from "react";
import { Pressable, StyleSheet, Text, View } from "react-native";
import { StackActions, useNavigation } from "@react-navigation/native";
import { useQuery } from "@tanstack/react-query";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { StatusBar } from "expo-status-bar";
import { startOfDay } from "date-fns";
import { getNotifications } from "../../api/notifications";
import { useAuth } from "../../context/AuthContext";
import { C, F, GUTTER, Headline, TopBar, usePortal } from "./kit";

export default function MenuScreen() {
  const navigation = useNavigation<any>();
  const insets = useSafeAreaInsets();
  const { logout } = useAuth();
  const portal = usePortal().data;
  const notifications = useQuery({ queryKey: ["notifications"], queryFn: () => getNotifications(50), retry: false });
  const unread = notifications.data?.unreadCount ?? 0;

  const name = (portal?.member.name || portal?.user.name || "Member").split(" ")[0];
  const part = portal?.member.voicePart || "";

  // Replace the menu with the destination so Back returns to where you were.
  const go = (route: string, params?: object) => {
    if (route === "Home") navigation.dispatch(StackActions.popToTop());
    else navigation.dispatch(StackActions.replace(route, params));
  };

  const links: { label: string; onPress: () => void; count?: number }[] = [
    { label: "Home", onPress: () => go("Home") },
    { label: "This Week", onPress: () => go("Week") },
    { label: "Schedule", onPress: () => go("Schedule", { day: startOfDay(new Date()).toISOString() }) },
    { label: "Attendance", onPress: () => go("Attendance") },
    { label: "Account", onPress: () => go("Profile") },
    { label: "Inbox", onPress: () => go("Inbox"), count: unread },
  ];

  return (
    <View style={styles.root}>
      <StatusBar style="light" />
      <TopBar dark right={{ kind: "close", label: "Close menu", onPress: () => navigation.goBack() }} />
      <Headline dark strong={name} light={part} />
      <View style={styles.links}>
        {links.map((link) => (
          <Pressable key={link.label} onPress={link.onPress} style={({ pressed }) => [styles.link, pressed && { opacity: 0.6 }]} accessibilityRole="button">
            <Text style={styles.linkText}>{link.label}</Text>
            {link.count ? <Text style={styles.count}>{link.count > 99 ? "99+" : link.count}</Text> : null}
          </Pressable>
        ))}
      </View>
      <View style={{ flex: 1 }} />
      <Pressable onPress={logout} style={({ pressed }) => [styles.bar, { paddingBottom: insets.bottom + 24 }, pressed && { opacity: 0.8 }]} accessibilityRole="button">
        <Text style={styles.barText}>Log out</Text>
        <Text style={styles.barArrow}>→</Text>
      </Pressable>
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: C.navy },
  links: { marginTop: 50, paddingHorizontal: GUTTER },
  link: { flexDirection: "row", alignItems: "center", paddingVertical: 16 },
  linkText: { fontFamily: F.regular, fontSize: 24, color: C.navyText },
  count: { marginLeft: 12, fontFamily: F.medium, fontSize: 13, color: C.gold },
  bar: { borderTopWidth: StyleSheet.hairlineWidth, borderTopColor: C.navyLine, paddingTop: 26, alignItems: "center" },
  barText: { fontFamily: F.medium, fontSize: 17, color: "#FFFFFF" },
  barArrow: { position: "absolute", right: GUTTER, top: 20, fontFamily: F.regular, fontSize: 24, color: "#FFFFFF" },
});
