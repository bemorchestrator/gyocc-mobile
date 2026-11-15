// Home: "This Week", the list of calls shown directly (reference screen 1).
import React from "react";
import { ActivityIndicator, Pressable, RefreshControl, ScrollView, StyleSheet, Text, View } from "react-native";
import { useNavigation } from "@react-navigation/native";
import { StatusBar } from "expo-status-bar";
import { addDays, format, isToday, startOfDay } from "date-fns";
import { PortalActivity } from "../../api/memberPortal";
import { C, callsOn, ClockFab, F, GUTTER, Headline, liveHint, Muted, ordinal, sortedCalls, timeRange, TopBar, usePortal } from "./kit";

export function useNow(intervalMs = 30_000) {
  const [now, setNow] = React.useState(() => new Date());
  React.useEffect(() => {
    const id = setInterval(() => setNow(new Date()), intervalMs);
    return () => clearInterval(id);
  }, [intervalMs]);
  return now;
}

export default function WeekScreen() {
  const navigation = useNavigation<any>();
  const query = usePortal();
  const now = useNow();
  const [refreshing, setRefreshing] = React.useState(false);
  const openCall = (call: PortalActivity) => navigation.navigate("Call", { sourceType: call.type, sourceId: call.sourceId });

  const calls = sortedCalls(query.data).filter((call) => new Date(call.endDate || call.date) >= startOfDay(now));
  const days = Array.from({ length: 7 }, (_, i) => addDays(startOfDay(now), i))
    .map((day) => ({ day, calls: callsOn(calls, day) }))
    .filter((group) => group.calls.length > 0);
  // Only one call carries the live hint: the one in progress or next up.
  const liveCall = calls.find((call) => liveHint(call, now));
  const later = days.length ? null : calls[0];

  const refresh = async () => {
    setRefreshing(true);
    try { await query.refetch(); } finally { setRefreshing(false); }
  };

  return (
    <View style={styles.root}>
      <StatusBar style="dark" />
      <TopBar
        left={navigation.canGoBack()
          ? { kind: "back", label: "Back", onPress: () => navigation.goBack() }
          : { kind: "menu", label: "Menu", onPress: () => navigation.navigate("Menu") }}
        right={{ kind: "calendar", label: "Day view", onPress: () => navigation.navigate("Schedule", { day: startOfDay(now).toISOString() }) }}
      />
      <ScrollView
        contentContainerStyle={styles.content}
        showsVerticalScrollIndicator={false}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={refresh} tintColor={C.grey} />}
      >
        <Headline strong="This" light="Week" />

        {query.isLoading ? <ActivityIndicator style={{ marginTop: 80 }} color={C.grey} /> : null}
        {!query.isLoading && !query.data ? (
          <View style={styles.empty}><Text style={styles.itemTitle}>Can't load your schedule</Text><Muted>Pull down to try again.</Muted></View>
        ) : null}
        {query.data && !days.length ? (
          <View style={styles.empty}>
            <Text style={styles.itemTitle}>Nothing this week</Text>
            {later ? <Muted>Next: {later.title}, {format(new Date(later.date), "EEE d MMM")}</Muted> : <Muted>New calls appear here when they're published.</Muted>}
          </View>
        ) : null}

        {days.map(({ day, calls: dayCalls }) => (
          <View key={day.toISOString()} style={styles.dayGroup}>
            <Pressable style={styles.dayCol} onPress={() => navigation.navigate("Schedule", { day: day.toISOString() })} accessibilityRole="button" accessibilityLabel={`Open ${format(day, "EEEE d MMMM")}`}>
              <Text style={styles.dayLetter}>{format(day, "EEEEE")}</Text>
              <Text style={styles.dayNum}>{format(day, "d")}<Text style={styles.daySup}>{ordinal(day.getDate())}</Text></Text>
              {isToday(day) ? <View style={styles.todayPill}><Text style={styles.todayText}>Today</Text></View> : null}
            </Pressable>
            <View style={styles.items}>
              {dayCalls.map((call) => {
                const live = liveCall && liveCall.sourceId === call.sourceId && liveCall.type === call.type;
                const hint = live ? liveHint(call, now) : null;
                return (
                  <Pressable key={`${call.type}-${call.sourceId}`} onPress={() => openCall(call)} style={[styles.item, live && styles.itemLive]} accessibilityRole="button">
                    {live ? <View style={styles.liveDash} /> : null}
                    <Text style={styles.itemTitle} numberOfLines={2}>{call.title}</Text>
                    {hint ? <Text style={styles.hint}>{hint}</Text> : <Muted>{timeRange(call)}</Muted>}
                  </Pressable>
                );
              })}
            </View>
          </View>
        ))}
      </ScrollView>
      <ClockFab onPress={() => navigation.navigate("Clock", { focusNonce: Date.now() })} />
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: C.paper },
  content: { paddingBottom: 160 },
  empty: { paddingHorizontal: GUTTER, marginTop: 64 },
  dayGroup: { flexDirection: "row", paddingLeft: GUTTER, paddingRight: 28, marginTop: 58 },
  dayCol: { width: 92 },
  dayLetter: { fontFamily: F.demi, fontSize: 44, color: C.ink, lineHeight: 50 },
  dayNum: { fontFamily: F.medium, fontSize: 16, color: C.ink, marginTop: 2 },
  daySup: { fontFamily: F.regular, fontSize: 11, color: C.grey },
  todayPill: { alignSelf: "flex-start", marginTop: 14, backgroundColor: C.blue, borderRadius: 4, paddingHorizontal: 9, paddingVertical: 4, shadowColor: C.blue, shadowOpacity: 0.35, shadowRadius: 8, shadowOffset: { width: 0, height: 4 } },
  todayText: { fontFamily: F.medium, fontSize: 12, color: "#fff" },
  items: { flex: 1, paddingTop: 6, gap: 34 },
  item: {},
  itemLive: { paddingLeft: 34 },
  liveDash: { position: "absolute", left: 0, top: 10, width: 18, height: 1.5, backgroundColor: C.blue },
  itemTitle: { fontFamily: F.medium, fontSize: 15.5, color: C.ink },
  hint: { fontFamily: F.medium, fontSize: 13, color: C.maroon, marginTop: 6 },
});
