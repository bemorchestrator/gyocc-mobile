// Schedule: one day as a timeline (reference screen 2).
import React from "react";
import { Modal, Platform, Pressable, ScrollView, StyleSheet, Text, View } from "react-native";
import { useNavigation, useRoute } from "@react-navigation/native";
import { StatusBar } from "expo-status-bar";
import DateTimePicker from "@react-native-community/datetimepicker";
import { format, isToday, startOfDay } from "date-fns";
import { PortalActivity } from "../../api/memberPortal";
import { useNow } from "./WeekScreen";
import { C, callEnd, callsOn, ClockFab, F, GUTTER, Headline, ordinal, shortDuration, sortedCalls, timeRange, TopBar, usePortal } from "./kit";

const HOUR_H = 104;
const RAIL_W = 118;

type DayParams = { day?: string; sourceType?: string; sourceId?: string; focusNonce?: number };

function hoursOf(date: Date) {
  return date.getHours() + date.getMinutes() / 60;
}

export default function DayScreen() {
  const navigation = useNavigation<any>();
  const route = useRoute<any>();
  const params = (route.params ?? {}) as DayParams;
  const query = usePortal();
  const now = useNow();
  const scrollRef = React.useRef<ScrollView>(null);
  const [picking, setPicking] = React.useState(false);
  const openCall = (call: PortalActivity) => navigation.navigate("Call", { sourceType: call.type, sourceId: call.sourceId });
  const [day, setDay] = React.useState(() => startOfDay(params.day ? new Date(params.day) : new Date()));

  const all = sortedCalls(query.data);

  // Arriving from a notification: jump to that call's day and open it.
  React.useEffect(() => {
    if (!params.sourceType || !params.sourceId || !query.data) return;
    const match = query.data.upcoming.find((c) => c.type === params.sourceType && c.sourceId === params.sourceId);
    if (match) { setDay(startOfDay(new Date(match.date))); openCall(match); }
  }, [params.sourceType, params.sourceId, params.focusNonce, query.data]);
  React.useEffect(() => { if (params.day) setDay(startOfDay(new Date(params.day))); }, [params.day]);

  const calls = callsOn(all, day);
  const today = isToday(day);
  const starts = calls.map((c) => Math.floor(hoursOf(new Date(c.date))));
  const ends = calls.map((c) => Math.ceil(hoursOf(callEnd(c))));
  let first = starts.length ? Math.min(...starts) : 9;
  let last = ends.length ? Math.max(...ends) : 17;
  if (today) { first = Math.min(first, Math.floor(hoursOf(now))); last = Math.max(last, Math.ceil(hoursOf(now)) ); }
  if (last - first < 5) last = Math.min(24, first + 5);
  const hours = Array.from({ length: last - first + 1 }, (_, i) => first + i);
  const yOf = (date: Date) => (hoursOf(date) - first) * HOUR_H;

  const nowY = today ? yOf(now) : null;
  const current = calls.find((c) => now >= new Date(c.date) && now < callEnd(c));
  const next = calls.find((c) => new Date(c.date) > now);
  const nowHint = current
    ? `Ends in\n${shortDuration(callEnd(current).getTime() - now.getTime())}`
    : next ? `Next call in\n${shortDuration(new Date(next.date).getTime() - now.getTime())}` : null;

  React.useEffect(() => {
    const target = nowY ?? (calls[0] ? yOf(new Date(calls[0].date)) : 0);
    const id = setTimeout(() => scrollRef.current?.scrollTo({ y: Math.max(0, target - 140), animated: false }), 50);
    return () => clearTimeout(id);
    // Only re-anchor when the day changes.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [day.getTime(), query.data ? 1 : 0]);

  return (
    <View style={styles.root}>
      <StatusBar style="dark" />
      <TopBar
        left={{ kind: "back", label: "Back", onPress: () => (navigation.canGoBack() ? navigation.goBack() : navigation.navigate("Home")) }}
        right={{ kind: "calendar", label: "Pick a day", onPress: () => setPicking(true) }}
      />
      <Headline strong={`${format(day, "EEE")},`} light={format(day, "d")} sup={ordinal(day.getDate())} />

      <ScrollView ref={scrollRef} style={styles.scroll} contentContainerStyle={{ paddingTop: 28, paddingBottom: 170 }} showsVerticalScrollIndicator={false}>
        <View style={{ height: (hours.length - 1) * HOUR_H + 20 }}>
          {hours.map((h, i) => (
            <View key={h} style={[styles.hourRow, { top: i * HOUR_H }]}>
              <Text style={styles.hourLabel}>{`${h}:00`}</Text>
              {i < hours.length - 1 ? [1, 2, 3].map((q) => <View key={q} style={[styles.tick, { top: (q * HOUR_H) / 4 + 6 }]} />) : null}
            </View>
          ))}

          {calls.map((call, i) => {
            const top = yOf(new Date(call.date)) + 6;
            const height = Math.max(76, yOf(callEnd(call)) - yOf(new Date(call.date)));
            const accent = i % 2 === 0 ? C.blue : C.maroon;
            return (
              <Pressable
                key={`${call.type}-${call.sourceId}`}
                onPress={() => openCall(call)}
                accessibilityRole="button"
                style={[styles.block, { top, height, backgroundColor: C.tint[call.type] ?? C.tint.rehearsal }]}
              >
                <Text style={styles.blockTitle} numberOfLines={1}>{call.title}</Text>
                <View style={styles.blockMetaRow}>
                  <Text style={styles.blockMeta}>{timeRange(call)}</Text>
                  <Text style={[styles.blockDur, { color: accent }]}>{shortDuration(callEnd(call).getTime() - new Date(call.date).getTime())}</Text>
                </View>
              </Pressable>
            );
          })}

          {nowY !== null ? (
            <View style={[styles.nowRow, { top: nowY - 18 }]} pointerEvents="none">
              <View style={styles.nowDash} />
              <View style={styles.nowPill}>
                <Text style={styles.nowTime}>{format(now, "H:mm")}</Text>
                {nowHint ? <Text style={styles.nowHint}>{nowHint}</Text> : null}
              </View>
            </View>
          ) : null}

          {!calls.length && query.data ? (
            <Text style={styles.emptyDay}>Nothing scheduled</Text>
          ) : null}
        </View>
      </ScrollView>

      <ClockFab onPress={() => navigation.navigate("Clock", { focusNonce: Date.now() })} />

      {picking && Platform.OS === "android" ? (
        <DateTimePicker value={day} mode="date" onChange={(_e, value) => { setPicking(false); if (value) setDay(startOfDay(value)); }} />
      ) : null}
      {Platform.OS === "ios" ? (
        <Modal visible={picking} transparent animationType="fade" onRequestClose={() => setPicking(false)}>
          <Pressable style={styles.pickerBackdrop} onPress={() => setPicking(false)}>
            <Pressable style={styles.pickerCard} onPress={() => {}}>
              <DateTimePicker value={day} mode="date" display="inline" accentColor={C.maroon} onChange={(_e, value) => { if (value) { setDay(startOfDay(value)); setPicking(false); } }} />
            </Pressable>
          </Pressable>
        </Modal>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: C.paper },
  scroll: { flex: 1, marginTop: 18 },
  hourRow: { position: "absolute", left: GUTTER, height: HOUR_H },
  hourLabel: { fontFamily: F.regular, fontSize: 12, color: C.grey },
  tick: { position: "absolute", left: 1, width: 7, height: 1, backgroundColor: C.faint },
  block: { position: "absolute", left: RAIL_W, right: 0, paddingLeft: 30, paddingRight: 22, paddingTop: 24, borderWidth: 1, borderStyle: "dashed", borderColor: "rgba(74,159,232,0.18)", borderRightWidth: 0 },
  blockTitle: { fontFamily: F.medium, fontSize: 14.5, color: C.ink },
  blockMetaRow: { flexDirection: "row", justifyContent: "space-between", marginTop: 8 },
  blockMeta: { fontFamily: F.regular, fontSize: 12, color: C.grey },
  blockDur: { fontFamily: F.medium, fontSize: 12.5 },
  nowRow: { position: "absolute", left: GUTTER, right: 0, flexDirection: "row", alignItems: "center" },
  nowDash: { width: 26, height: 1.5, backgroundColor: C.blue },
  nowPill: { marginLeft: 18, flexDirection: "row", alignItems: "center", backgroundColor: C.paper, paddingRight: 14, paddingLeft: 8, paddingVertical: 2 },
  nowTime: { fontFamily: F.regular, fontSize: 34, color: C.ink, letterSpacing: -0.5 },
  nowHint: { marginLeft: 16, fontFamily: F.medium, fontSize: 12.5, lineHeight: 17, color: C.maroon },
  emptyDay: { position: "absolute", left: RAIL_W, top: HOUR_H - 10, fontFamily: F.regular, fontSize: 14, color: C.grey },
  pickerBackdrop: { flex: 1, backgroundColor: "rgba(17,17,17,0.28)", justifyContent: "center", padding: 20 },
  pickerCard: { backgroundColor: C.paper, borderRadius: 14, padding: 8 },
});
