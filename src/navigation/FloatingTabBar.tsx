import React from "react";
import { View, Pressable, StyleSheet } from "react-native";
import { BottomTabBarProps } from "@react-navigation/bottom-tabs";
import { Ionicons } from "@expo/vector-icons";
import { useSafeAreaInsets } from "react-native-safe-area-context";

const INK = "#111527";
const MUTED = "#8A7E78";
const MAROON = "#840016";
const ACCENT = "#301728";

type IoniconsName = React.ComponentProps<typeof Ionicons>["name"];

// [outline, filled] — labels stay available to assistive technology only.
const TAB_ICONS: Record<string, [IoniconsName, IoniconsName]> = {
  Home: ["home-outline", "home"],
  Schedule: ["calendar-outline", "calendar"],
  Earnings: ["card-outline", "card"],
  Member: ["ribbon-outline", "ribbon"],
  Profile: ["person-circle-outline", "person-circle"],
};

export default function FloatingTabBar({ state, descriptors, navigation }: BottomTabBarProps) {
  const insets = useSafeAreaInsets();
  const visibleRoutes = state.routes.filter((route) => ["Home", "Schedule", "Earnings", "Member", "Profile"].includes(route.name));
  const activeRoute = state.routes[state.index]?.name;
  const activeRoot = activeRoute?.startsWith("Scholarship") ? "Member" : activeRoute;

  return (
    <View style={[styles.wrapper, { paddingBottom: Math.max(insets.bottom, 8) }]}>
      <View style={styles.bar}>
        {visibleRoutes.map((route) => {
          const isFocused = route.name === activeRoot;
          const isRouteActive = route.name === activeRoute;
          const { options } = descriptors[route.key];
          const label = (options.tabBarLabel ?? route.name) as string;

          function onPress() {
            const event = navigation.emit({
              type: "tabPress",
              target: route.key,
              canPreventDefault: true,
            });
            if (!isRouteActive && !event.defaultPrevented) navigation.navigate(route.name);
          }

          return (
            <Pressable
              key={route.key}
              onPress={onPress}
              accessibilityRole="button"
              accessibilityLabel={String(label)}
              accessibilityState={{ selected: isFocused }}
              style={({ pressed }) => [styles.tab, pressed && styles.tabPressed]}
            >
              <View style={styles.iconWrap}>
                <Ionicons
                  name={(TAB_ICONS[route.name] ?? ["ellipse-outline", "ellipse"])[isFocused ? 1 : 0]}
                  size={isFocused ? 22 : 21}
                  color={isFocused ? MAROON : MUTED}
                />
              </View>
              <View style={[styles.indicator, isFocused && styles.indicatorActive]} />
            </Pressable>
          );
        })}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  wrapper: {
    position: "absolute",
    left: 18,
    right: 18,
    bottom: 0,
    backgroundColor: "transparent",
  },
  bar: {
    height: 66,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-around",
    paddingVertical: 6,
    paddingHorizontal: 10,
    backgroundColor: "#FFFFFF",
    borderRadius: 25,
    borderWidth: 1,
    borderColor: "rgba(17,21,39,.10)",
    shadowColor: INK,
    shadowOpacity: 0.16,
    shadowRadius: 22,
    shadowOffset: { width: 0, height: 10 },
    elevation: 10,
  },
  tab: {
    flex: 1,
    height: 54,
    alignItems: "center",
    justifyContent: "center",
    gap: 3,
  },
  tabPressed: { opacity: 0.62, transform: [{ scale: 0.94 }] },
  iconWrap: {
    width: 43,
    height: 43,
    borderRadius: 15,
    alignItems: "center",
    justifyContent: "center",
  },
  indicator: { position: "absolute", bottom: 1, width: 4, height: 4, borderRadius: 2, backgroundColor: "transparent" },
  indicatorActive: { backgroundColor: ACCENT },
});
