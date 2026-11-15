// Home: greeting, season attendance ring, attended / late / missed, next call
// (design/mockups/board-3-home-analytics.png, left screen).
import React from "react";
import { ActivityIndicator, Pressable, RefreshControl, ScrollView, StyleSheet, Text, View } from "react-native";
import { useNavigation } from "@react-navigation/native";
import { StatusBar } from "expo-status-bar";
import Svg, { Circle } from "react-native-svg";
import { C, ClockFab, F, firstName, GUTTER, Headline, Muted, TopBar, usePortal } from "./kit";
import { useNow } from "./WeekScreen";
import { countdown, nextCall } from "./stats";

const RING = 196;
const STROKE = 2.5;

function Ring({ rate }: { rate: number }) {
  const r = (RING - STROKE) / 2;
  const circumference = 2 * Math.PI * r;
  const filled = Math.max(0, Math.min(100, rate)) / 100;
  return (
    <Svg width={RING} height={RING}>
      <Circle cx={RING / 2} cy={RING / 2} r={r} stroke={C.hairline} strokeWidth={STROKE} fill="none" />
      <Circle
        cx={RING / 2}
        cy={RING / 2}
        r={r}
        stroke={C.maroon}
        strokeWidth={STROKE}
        fill="none"
        strokeLinecap="round"
        strokeDasharray={`${circumference * filled} ${circumference}`}
        transform={`rotate(-90 ${RING / 2} ${RING / 2})`}
      />
    </Svg>
  );
}

export default function OverviewScreen() {
  const navigation = useNavigation<any>();
  const query = usePortal();
  const now = useNow();
  const [refreshing, setRefreshing] = React.useState(false);
  const portal = query.data;

  const rate = Math.round(portal?.attendance.attendanceRate ?? 0);
  const stats = [
    { value: portal?.attendance.overallAttended ?? 0, label: "attended" },
    { value: portal?.attendance.reliability?.lateCount ?? 0, label: "late" },
    { value: portal?.attendance.reliability?.noShowCount ?? 0, label: "missed" },
  ];
  const next = nextCall(portal, now);

  const refresh = async () => {
    setRefreshing(true);
    try { await query.refetch(); } finally { setRefreshing(false); }
  };

  return (
    <View style={styles.root}>
      <StatusBar style="dark" />
      <TopBar
        left={{ kind: "menu", label: "Menu", onPress: () => navigation.navigate("Menu") }}
        right={{ kind: "calendar", label: "This week", onPress: () => navigation.navigate("Week") }}
      />
      <ScrollView
        contentContainerStyle={styles.content}
        showsVerticalScrollIndicator={false}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={refresh} tintColor={C.grey} />}
      >
        <Headline strong="Hi," light={portal ? firstName(portal) : undefined} />

        {query.isLoading ? <ActivityIndicator style={{ marginTop: 80 }} color={C.grey} /> : null}
        {!query.isLoading && !portal ? (
          <View style={styles.block}><Text style={styles.title}>Can't load your stats</Text><Muted>Pull down to try again.</Muted></View>
        ) : null}

        {portal ? (
          <>
            <Text style={styles.label}>{portal.year} season</Text>
            <Pressable
              style={styles.ringWrap}
              onPress={() => navigation.navigate("Season")}
              accessibilityRole="button"
              accessibilityLabel={`Attendance ${rate} percent. Open my season`}
            >
              <Ring rate={rate} />
              <View style={styles.ringCenter} pointerEvents="none">
                <Text style={styles.rate}>{rate}%</Text>
                <Text style={styles.rateLabel}>attendance</Text>
              </View>
            </Pressable>

            <Pressable style={styles.stats} onPress={() => navigation.navigate("Attendance")} accessibilityRole="button" accessibilityLabel="Open my attendance">
              {stats.map((s) => (
                <View key={s.label} style={styles.stat}>
                  <Text style={styles.statValue}>{s.value}</Text>
                  <Text style={styles.statLabel}>{s.label}</Text>
                </View>
              ))}
            </Pressable>

            <View style={styles.block}>
              <Text style={styles.label}>{next && new Date(next.date) <= now ? "Now" : "Next"}</Text>
              {next ? (
                <Pressable onPress={() => navigation.navigate("Call", { sourceType: next.type, sourceId: next.sourceId })} accessibilityRole="button">
                  <Text style={styles.title} numberOfLines={2}>{next.title}</Text>
                  <Text style={styles.hint}>{countdown(next, now)}</Text>
                </Pressable>
              ) : (
                <Muted>New calls appear here when they're published.</Muted>
              )}
            </View>
          </>
        ) : null}
      </ScrollView>
      <ClockFab onPress={() => navigation.navigate("Clock", { focusNonce: Date.now() })} />
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: C.paper },
  content: { paddingBottom: 140 },
  label: { fontFamily: F.regular, fontSize: 12.5, color: C.grey, marginHorizontal: GUTTER, marginTop: 52 },
  ringWrap: { alignSelf: "center", marginTop: 28, width: RING, height: RING },
  ringCenter: { position: "absolute", top: 0, left: 0, right: 0, bottom: 0, alignItems: "center", justifyContent: "center" },
  rate: { fontFamily: F.regular, fontSize: 42, color: C.ink, letterSpacing: -1 },
  rateLabel: { fontFamily: F.regular, fontSize: 13, color: C.grey, marginTop: 2 },
  stats: { flexDirection: "row", justifyContent: "space-between", marginHorizontal: GUTTER + 4, marginTop: 40 },
  stat: { alignItems: "center", minWidth: 72 },
  statValue: { fontFamily: F.regular, fontSize: 24, color: C.ink },
  statLabel: { fontFamily: F.regular, fontSize: 12.5, color: C.grey, marginTop: 4 },
  block: { marginTop: 0 },
  title: { fontFamily: F.medium, fontSize: 15.5, color: C.ink, marginHorizontal: GUTTER, marginTop: 14 },
  hint: { fontFamily: F.medium, fontSize: 13.5, color: C.maroon, marginHorizontal: GUTTER, marginTop: 6 },
});
