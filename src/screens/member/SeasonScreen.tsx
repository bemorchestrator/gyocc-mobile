// My Season: six-month attendance bars plus on time, hours and best streak
// (design/mockups/board-3-home-analytics.png, middle screen).
import React from "react";
import { ActivityIndicator, RefreshControl, ScrollView, StyleSheet, Text, View } from "react-native";
import { useNavigation } from "@react-navigation/native";
import { StatusBar } from "expo-status-bar";
import { C, ClockFab, F, GUTTER, Headline, Muted, TopBar, usePortal } from "./kit";
import { hoursOnStage, isOnTime, longestStreak, monthlyRates, settledRecords } from "./stats";

const BAR_MAX = 150;
const PALE_BLUE = "#CFE3F7";

export default function SeasonScreen() {
  const navigation = useNavigation<any>();
  const query = usePortal();
  const [refreshing, setRefreshing] = React.useState(false);
  const portal = query.data;

  const records = settledRecords(portal);
  const months = monthlyRates(records);
  const attended = records.filter((r) => r.attended);
  const onTime = attended.filter(isOnTime).length;
  const hours = hoursOnStage(records);
  const streak = longestStreak(records);

  const rows = [
    { title: "On time", detail: attended.length ? `${onTime} of ${attended.length} calls` : "No calls yet" },
    { title: "Hours on stage", detail: hours ? `${hours}h this season` : "Clock in and out to track hours" },
    { title: "Longest streak", detail: streak === 1 ? "1 call" : `${streak} calls in a row` },
  ];

  const refresh = async () => {
    setRefreshing(true);
    try { await query.refetch(); } finally { setRefreshing(false); }
  };

  return (
    <View style={styles.root}>
      <StatusBar style="dark" />
      <TopBar
        left={{ kind: "back", label: "Back", onPress: () => (navigation.canGoBack() ? navigation.goBack() : navigation.navigate("Home")) }}
        right={{ kind: "calendar", label: "This month", onPress: () => navigation.navigate("Month") }}
      />
      <ScrollView
        contentContainerStyle={{ paddingBottom: 140 }}
        showsVerticalScrollIndicator={false}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={refresh} tintColor={C.grey} />}
      >
        <Headline strong="My" light="Season" />
        {query.isLoading ? <ActivityIndicator style={{ marginTop: 80 }} color={C.grey} /> : null}
        {!query.isLoading && !portal ? <Muted style={{ marginHorizontal: GUTTER, marginTop: 40 }}>Can't load your season. Pull down to try again.</Muted> : null}

        {portal ? (
          <>
            <View style={styles.chart} accessibilityLabel={`Attendance by month: ${months.map((m) => `${m.label} ${m.rate ?? "no calls"}`).join(", ")}`}>
              {months.map((m, i) => {
                const current = i === months.length - 1;
                const height = m.rate === null ? 4 : Math.max(6, (m.rate / 100) * BAR_MAX);
                return (
                  <View key={m.key} style={styles.barCol}>
                    <View style={styles.barArea}>
                      {current && m.rate !== null ? <Text style={styles.barValue}>{m.rate}%</Text> : null}
                      <View style={[styles.bar, { height, backgroundColor: m.rate === null ? C.hairline : current ? C.maroon : PALE_BLUE }]} />
                    </View>
                    <Text style={styles.barLabel}>{m.label}</Text>
                  </View>
                );
              })}
            </View>

            {rows.map((row) => (
              <View key={row.title} style={styles.row}>
                <Text style={styles.title}>{row.title}</Text>
                <Muted>{row.detail}</Muted>
              </View>
            ))}
          </>
        ) : null}
      </ScrollView>
      <ClockFab onPress={() => navigation.navigate("Clock", { focusNonce: Date.now() })} />
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: C.paper },
  chart: { flexDirection: "row", justifyContent: "space-between", marginHorizontal: GUTTER - 6, marginTop: 56 },
  barCol: { alignItems: "center", flex: 1 },
  barArea: { height: BAR_MAX + 26, justifyContent: "flex-end", alignItems: "center" },
  bar: { width: 10, borderRadius: 5 },
  barValue: { fontFamily: F.medium, fontSize: 12.5, color: C.ink, marginBottom: 8 },
  barLabel: { fontFamily: F.regular, fontSize: 12, color: C.grey, marginTop: 12 },
  row: { marginHorizontal: GUTTER, marginTop: 34 },
  title: { fontFamily: F.medium, fontSize: 15.5, color: C.ink },
});
