// Call details: a dedicated screen for one rehearsal, gig or event.
import React from "react";
import { ActivityIndicator, Pressable, ScrollView, StyleSheet, Text, useWindowDimensions, View } from "react-native";
import { useNavigation, useRoute } from "@react-navigation/native";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { StatusBar } from "expo-status-bar";
import { format } from "date-fns";
import Toast from "react-native-toast-message";
import { PortalActivity, rsvpActivity } from "../../api/memberPortal";
import VenueMap from "../../components/VenueMap";
import { useNow } from "./WeekScreen";
import { C, clockText, F, GUTTER, LineIcon, liveHint, timeRange, TopBar, usePortal } from "./kit";

type CallParams = { sourceType?: string; sourceId?: string };

function attendanceLabel(call: PortalActivity) {
  const recorded = call.attendanceStatus;
  if (recorded && recorded !== "Pending") return recorded;
  if (call.attended) return "Present";
  if (call.clockInAt) return "Clocked in";
  if (new Date(call.date).getTime() > Date.now()) {
    if (call.confirmation === "Confirmed") return "Going — clock in on the day";
    if (call.confirmation === "Declined") return "You can't go";
    return "Waiting for your RSVP";
  }
  return "Not recorded";
}

export default function CallScreen() {
  const navigation = useNavigation<any>();
  const route = useRoute<any>();
  const { sourceType, sourceId } = (route.params ?? {}) as CallParams;
  const insets = useSafeAreaInsets();
  const { height: windowHeight } = useWindowDimensions();
  const queryClient = useQueryClient();
  const query = usePortal();
  const now = useNow();
  const call = query.data?.upcoming.find((c) => c.type === sourceType && c.sourceId === sourceId) ?? null;

  const rsvp = useMutation({
    mutationFn: (value: "Confirmed" | "Declined") => rsvpActivity(call!.type, call!.sourceId, value),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["member-portal"] }),
    onError: (error: { message?: string }) => Toast.show({ type: "error", text1: "Could not save your RSVP", text2: error.message }),
  });

  const back = () => (navigation.canGoBack() ? navigation.goBack() : navigation.navigate("Home"));

  if (!call) {
    return (
      <View style={styles.root}>
        <StatusBar style="dark" />
        <TopBar left={{ kind: "back", label: "Back", onPress: back }} />
        {query.isLoading ? <ActivityIndicator style={{ marginTop: 80 }} color={C.grey} /> : (
          <Text style={styles.missing}>This call is no longer on your schedule.</Text>
        )}
      </View>
    );
  }

  const [firstWord, ...rest] = call.title.split(" ");
  const hint = liveHint(call, now);
  const canClock = Boolean(call.canClockIn || call.canClockOut);
  const hasPin = Number.isFinite(call.venueLatitude) && Number.isFinite(call.venueLongitude);
  const going = (rsvp.isPending ? rsvp.variables : call.confirmation) === "Confirmed";
  const declined = (rsvp.isPending ? rsvp.variables : call.confirmation) === "Declined";
  const who = !call.sectionType || call.sectionType === "All" ? "Everyone" : call.sectionType;

  const mapHeight = Math.round(windowHeight * 0.5);

  return (
    <View style={styles.root}>
      <StatusBar style="dark" />
      {hasPin ? (
        // Map first and large, like the original Clock screen; details sit on a
        // panel below it.
        <View style={{ height: mapHeight }}>
          <VenueMap
            latitude={call.venueLatitude as number}
            longitude={call.venueLongitude as number}
            title={call.venueName}
            geofenceRadiusMeters={call.geofenceRadiusMeters}
            height={mapHeight}
          />
          <Pressable accessibilityRole="button" accessibilityLabel="Back" onPress={back} style={[styles.roundButton, { top: insets.top + 12 }]}>
            <LineIcon kind="back" size={20} />
          </Pressable>
        </View>
      ) : (
        <TopBar left={{ kind: "back", label: "Back", onPress: back }} />
      )}
      <View style={[styles.panel, hasPin && styles.panelOverMap]}>
      <ScrollView contentContainerStyle={{ paddingBottom: canClock ? 140 : insets.bottom + 48 }} showsVerticalScrollIndicator={false}>
        <Text style={[styles.type, hasPin && { marginTop: 30 }]}>{call.type}</Text>
        <Text style={styles.title}>
          {firstWord}
          {rest.length ? <Text style={styles.titleLight}> {rest.join(" ")}</Text> : null}
        </Text>
        {hint ? <Text style={styles.hint}>{hint}</Text> : null}

        <View style={{ marginTop: 26 }}>
          <Row label="Date" value={format(new Date(call.date), "EEEE d MMMM")} />
          <Row label="Time" value={timeRange(call)} />
          <Row label="Who" value={call.role ? `${who} · ${call.role}` : who} />
          <Row label="Attendance" value={attendanceLabel(call)} />
          {call.venueName || call.venueAddress ? (
            <Row label="Venue" value={[call.venueName, call.venueAddress].filter(Boolean).join("\n")} />
          ) : null}
        </View>


        <View style={styles.rsvpRow}>
          <Pressable disabled={rsvp.isPending} onPress={() => rsvp.mutate("Confirmed")} style={styles.rsvp} accessibilityRole="button">
            <Text style={[styles.rsvpText, going && { color: C.blue, fontFamily: F.demi }]}>{going ? "Going ✓" : "Going"}</Text>
          </Pressable>
          <View style={styles.rsvpDivider} />
          <Pressable disabled={rsvp.isPending} onPress={() => rsvp.mutate("Declined")} style={[styles.rsvp, { paddingLeft: 24 }]} accessibilityRole="button">
            <Text style={[styles.rsvpText, declined && { color: C.maroon, fontFamily: F.demi }]}>{declined ? "Can't go ✓" : "Can't go"}</Text>
          </Pressable>
        </View>

        {!canClock ? <Text style={styles.clockNote}>{clockText(call)}</Text> : null}
      </ScrollView>
      </View>

      {canClock ? (
        <Pressable
          accessibilityRole="button"
          onPress={() => navigation.navigate("Clock", { sourceType: call.type, sourceId: call.sourceId, focusNonce: Date.now() })}
          style={({ pressed }) => [styles.clockBar, { paddingBottom: insets.bottom + 22 }, pressed && { opacity: 0.88 }]}
        >
          <Text style={styles.clockBarText}>{call.canClockOut ? "Clock Out" : "Clock In"}</Text>
          <Text style={styles.clockBarArrow}>→</Text>
        </Pressable>
      ) : null}
    </View>
  );
}

function Row({ label, value }: { label: string; value: string }) {
  return (
    <View style={styles.row}>
      <Text style={styles.label}>{label}</Text>
      <Text style={styles.value}>{value}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: C.paper },
  missing: { marginTop: 60, marginHorizontal: GUTTER, fontFamily: F.regular, fontSize: 15, color: C.grey },
  type: { marginTop: 40, paddingHorizontal: GUTTER, fontFamily: F.medium, fontSize: 11.5, letterSpacing: 1.6, textTransform: "uppercase", color: C.grey },
  title: { marginTop: 10, paddingHorizontal: GUTTER, fontFamily: F.demi, fontSize: 34, lineHeight: 41, color: C.ink, letterSpacing: -0.5 },
  titleLight: { fontFamily: F.regular, color: C.grey },
  hint: { marginTop: 12, paddingHorizontal: GUTTER, fontFamily: F.medium, fontSize: 13.5, color: C.maroon },
  row: { paddingHorizontal: GUTTER, paddingVertical: 15 },
  label: { fontFamily: F.medium, fontSize: 15, color: C.ink },
  value: { marginTop: 5, fontFamily: F.regular, fontSize: 14, lineHeight: 20, color: C.grey },
  panel: { flex: 1, backgroundColor: C.paper },
  panelOverMap: {
    marginTop: -22, borderTopLeftRadius: 22, borderTopRightRadius: 22,
    shadowColor: "#000", shadowOpacity: 0.12, shadowRadius: 16, shadowOffset: { width: 0, height: -4 }, elevation: 8,
  },
  roundButton: {
    position: "absolute", left: 20, width: 44, height: 44, borderRadius: 22, backgroundColor: "#FFFFFF",
    alignItems: "center", justifyContent: "center",
    shadowColor: "#000", shadowOpacity: 0.16, shadowRadius: 10, shadowOffset: { width: 0, height: 4 }, elevation: 4,
  },
  rsvpRow: { flexDirection: "row", marginTop: 14, marginHorizontal: GUTTER, borderTopWidth: StyleSheet.hairlineWidth, borderBottomWidth: StyleSheet.hairlineWidth, borderColor: C.faint },
  rsvp: { flex: 1, paddingVertical: 22 },
  rsvpDivider: { width: StyleSheet.hairlineWidth, backgroundColor: C.faint, marginVertical: 14 },
  rsvpText: { fontFamily: F.regular, fontSize: 15, color: C.ink },
  clockNote: { marginTop: 22, marginHorizontal: GUTTER, fontFamily: F.regular, fontSize: 13.5, lineHeight: 19, color: C.grey },
  clockBar: { position: "absolute", left: 0, right: 0, bottom: 0, backgroundColor: C.maroon, flexDirection: "row", justifyContent: "center", alignItems: "center", paddingTop: 22 },
  clockBarText: { fontFamily: F.medium, fontSize: 17, color: "#fff" },
  clockBarArrow: { position: "absolute", right: GUTTER, top: 18, fontFamily: F.regular, fontSize: 22, color: "#fff" },
});
