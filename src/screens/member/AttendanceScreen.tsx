// My Attendance: one big rate, then history in the "This Week" day style.
import React from "react";
import { ActivityIndicator, RefreshControl, ScrollView, StyleSheet, Text, View } from "react-native";
import { useNavigation } from "@react-navigation/native";
import { StatusBar } from "expo-status-bar";
import { format } from "date-fns";
import { AttendanceRecord } from "../../api/memberPortal";
import { C, ClockFab, F, GUTTER, Headline, Muted, ordinal, TopBar, usePortal } from "./kit";

function statusOf(record: AttendanceRecord): { text: string; color: string } {
  if (record.excuseStatus === "Approved") return { text: "Excused", color: C.grey };
  if (record.excuseStatus === "Pending") return { text: "Excuse pending", color: C.grey };
  if (record.attendanceStatus === "LeftEarly") {
    return { text: record.earlyLeaveMinutes ? `Left early ${record.earlyLeaveMinutes}m` : "Didn't clock out", color: C.maroon };
  }
  if (record.attended) {
    const late = record.lateMinutes ?? 0;
    return late > 0 ? { text: `Late ${late}m`, color: C.maroon } : { text: "On time", color: C.green };
  }
  if (record.attendanceStatus === "Pending") return { text: "Pending", color: C.grey };
  return { text: record.attendanceStatus || "Absent", color: C.maroon };
}

export default function AttendanceScreen() {
  const navigation = useNavigation<any>();
  const query = usePortal();
  const [refreshing, setRefreshing] = React.useState(false);
  const portal = query.data;
  const history = (portal?.attendance.history ?? [])
    .filter((r) => new Date(r.date) <= new Date())
    .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
  const rate = Math.round(portal?.attendance.attendanceRate ?? 0);
  const attended = portal?.attendance.overallAttended ?? 0;
  const late = portal?.attendance.reliability?.lateCount ?? 0;

  const refresh = async () => {
    setRefreshing(true);
    try { await query.refetch(); } finally { setRefreshing(false); }
  };

  return (
    <View style={styles.root}>
      <StatusBar style="dark" />
      <TopBar left={{ kind: "back", label: "Back", onPress: () => (navigation.canGoBack() ? navigation.goBack() : navigation.navigate("Home")) }} />
      <ScrollView
        contentContainerStyle={{ paddingBottom: 160 }}
        showsVerticalScrollIndicator={false}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={refresh} tintColor={C.grey} />}
      >
        <Headline strong="My" light="Attendance" />
        {query.isLoading ? <ActivityIndicator style={{ marginTop: 80 }} color={C.grey} /> : null}
        {portal ? (
          <>
            <Text style={styles.rate}>{rate}%</Text>
            <Muted style={styles.rateSub}>{attended} attended · {late} late</Muted>
            {history.map((record) => {
              const date = new Date(record.date);
              const status = statusOf(record);
              return (
                <View key={record.id} style={styles.row}>
                  <View style={styles.dayCol}>
                    <Text style={styles.dayLetter}>{format(date, "EEEEE")}</Text>
                    <Text style={styles.dayNum}>{format(date, "d")}<Text style={styles.daySup}>{ordinal(date.getDate())}</Text></Text>
                  </View>
                  <View style={{ flex: 1, paddingTop: 6 }}>
                    <Text style={styles.title} numberOfLines={2}>{record.title}</Text>
                    <Text style={[styles.status, { color: status.color }]}>{status.text}</Text>
                  </View>
                </View>
              );
            })}
            {!history.length ? <Muted style={{ marginHorizontal: GUTTER, marginTop: 40 }}>No attendance recorded yet.</Muted> : null}
          </>
        ) : null}
      </ScrollView>
      <ClockFab onPress={() => navigation.navigate("Clock", { focusNonce: Date.now() })} />
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: C.paper },
  rate: { marginTop: 40, marginHorizontal: GUTTER - 4, fontFamily: F.light, fontSize: 92, color: C.ink, letterSpacing: -2 },
  rateSub: { marginHorizontal: GUTTER, marginTop: 0 },
  row: { flexDirection: "row", paddingLeft: GUTTER, paddingRight: 28, marginTop: 48 },
  dayCol: { width: 92 },
  dayLetter: { fontFamily: F.demi, fontSize: 44, color: C.ink, lineHeight: 50 },
  dayNum: { fontFamily: F.medium, fontSize: 16, color: C.ink, marginTop: 2 },
  daySup: { fontFamily: F.regular, fontSize: 11, color: C.grey },
  title: { fontFamily: F.medium, fontSize: 15.5, color: C.ink },
  status: { fontFamily: F.medium, fontSize: 13, marginTop: 6 },
});
