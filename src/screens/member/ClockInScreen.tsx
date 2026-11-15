// Clock In / Out. Same features and logic as the original ClockScreen:
// full-screen Google map (venue pin, geofence, your location), refresh, the
// status/window messages, GPS-verified clock in via AttendanceMapModal, clock
// out, and the completion screen. Restyled as the dark panel from the mockups.
import React from "react";
import { ActivityIndicator, Pressable, StyleSheet, Text, View } from "react-native";
import { useNavigation, useRoute } from "@react-navigation/native";
import { useQueryClient } from "@tanstack/react-query";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { StatusBar } from "expo-status-bar";
import { Ionicons } from "@expo/vector-icons";
import { format } from "date-fns";
import Toast from "react-native-toast-message";
import { clockInActivity, clockOutActivity, ClockLocationEvidence, PortalActivity } from "../../api/memberPortal";
import AttendanceMapModal from "../../components/AttendanceMapModal";
import ClockMapBackground from "../../components/ClockMapBackground";
import { clockInFailureFeedback } from "../../utils/clockInFeedback";
import { refreshAttendanceData } from "../../api/attendanceCache";
import { C, callEnd, clockText, F, GUTTER, Headline, LineIcon, sortedCalls, TopBar, usePortal } from "./kit";

type ClockParams = { sourceType?: string; sourceId?: string; focusNonce?: number };

function callTime(call: PortalActivity) {
  const date = new Date(call.date);
  return Number.isNaN(date.getTime()) ? "—" : format(date, "h:mm a");
}

function statusOf(call: PortalActivity) {
  const label = call.clockOutAt ? "Clocked out"
    : call.clockInAt ? "Clocked in"
    : call.clockInBlockedReason ? "Action needed"
    : call.clockInWindow?.isOpen && call.locationConfigured === false ? "Venue pin needed"
    : call.canClockIn ? "Window open"
    : "Next window";
  const time = call.clockOutAt ? format(new Date(call.clockOutAt), "h:mm a")
    : call.clockInAt ? format(new Date(call.clockInAt), "h:mm a")
    : call.clockInWindow?.opensAt ? format(new Date(call.clockInWindow.opensAt), "h:mm a")
    : callTime(call);
  const color = call.clockInAt || call.canClockIn ? "#5BC48A" : C.gold;
  return { label, time, color };
}

export default function ClockInScreen() {
  const navigation = useNavigation<any>();
  const route = useRoute<any>();
  const params = (route.params ?? {}) as ClockParams;
  const insets = useSafeAreaInsets();
  const queryClient = useQueryClient();
  const query = usePortal();

  const calls = sortedCalls(query.data);
  const requested = params.sourceType && params.sourceId
    ? calls.find((c) => c.type === params.sourceType && c.sourceId === params.sourceId)
    : undefined;
  const serverCall = requested
    ?? calls.find((c) => c.canClockOut || c.canClockIn)
    ?? calls.find((c) => c.clockOutAt && callEnd(c) >= new Date())
    ?? calls.find((c) => c.clockInWindow?.isUpcoming && !c.clockInBlockedReason)
    ?? calls[0];

  const [busy, setBusy] = React.useState(false);
  const [mapOpen, setMapOpen] = React.useState(false);
  const [completed, setCompleted] = React.useState<{ call: PortalActivity; at: string } | null>(null);
  const [local, setLocal] = React.useState<PortalActivity | null>(null);
  const call = serverCall && local && serverCall.type === local.type && serverCall.sourceId === local.sourceId
    ? { ...serverCall, ...local }
    : serverCall;

  const act = async (location?: ClockLocationEvidence, propagateError = false) => {
    if (!call) return;
    setBusy(true);
    try {
      const wasClockOut = Boolean(call.canClockOut);
      let alreadyClockedIn = false;
      let clockOutAt: string | undefined;
      if (!location) throw new Error("A current GPS location is required");
      if (wasClockOut) {
        const result = await clockOutActivity(call.type, call.sourceId, location);
        clockOutAt = result.attendance.clockOutAt ?? new Date().toISOString();
      } else {
        const result = await clockInActivity(call.type, call.sourceId, location);
        alreadyClockedIn = result.alreadyClockedIn === true;
        setLocal({
          ...call,
          attended: true,
          attendanceStatus: result.attendance.status,
          clockInAt: result.attendance.clockInAt ?? call.clockInAt ?? new Date().toISOString(),
          canClockIn: false,
          canClockOut: Boolean(call.requiresClockOut),
        });
      }
      await refreshAttendanceData(queryClient);
      if (wasClockOut) setCompleted({ call, at: clockOutAt! });
      Toast.show({
        type: "success",
        text1: wasClockOut ? "Clock-out recorded" : alreadyClockedIn ? "Already clocked in" : "You're clocked in",
        text2: alreadyClockedIn ? "Your original clock-in time was kept." : undefined,
      });
    } catch (error) {
      const feedback = call.canClockOut ? null : clockInFailureFeedback(error);
      if (feedback?.action === "refresh-activity") await queryClient.invalidateQueries({ queryKey: ["member-portal"] });
      Toast.show({
        type: "error",
        text1: call.canClockOut ? "Clock-out unavailable" : feedback?.title ?? "Clock-in unavailable",
        text2: call.canClockOut ? (error as { message?: string })?.message : feedback?.message,
      });
      if (propagateError) throw error;
    } finally {
      setBusy(false);
    }
  };

  const back = () => (navigation.canGoBack() ? navigation.goBack() : navigation.navigate("Home"));

  // ---- Completion ------------------------------------------------------------
  if (completed) {
    const kind = completed.call.type === "gig" ? "gig" : completed.call.type === "event" ? "event" : "rehearsal";
    return (
      <View style={styles.doneRoot}>
        <StatusBar style="light" />
        <TopBar dark left={{ kind: "back", label: "Back", onPress: back }} />
        <Headline dark strong="All" light="Done" />
        <Text style={styles.doneLead}>You successfully finished this {kind}.</Text>
        <View style={styles.field}>
          <Text style={styles.fieldLabel}>Call</Text>
          <Text style={styles.fieldValue} numberOfLines={1}>{completed.call.title}</Text>
        </View>
        <View style={styles.doneDetails}>
          <View style={styles.doneRow}><Text style={styles.fieldLabel}>Clocked out</Text><Text style={styles.doneValue}>{format(new Date(completed.at), "h:mm a")}</Text></View>
          <View style={styles.doneRow}><Text style={styles.fieldLabel}>Attendance</Text><Text style={[styles.doneValue, { color: "#5BC48A" }]}>Completed</Text></View>
        </View>
        <Text style={styles.doneNote}>Your attendance record and counters are up to date.</Text>
        <View style={{ flex: 1 }} />
        <Pressable style={styles.secondaryBar} onPress={() => { setCompleted(null); navigation.navigate("Schedule"); }}>
          <Text style={styles.barTextMuted}>View schedule</Text>
        </Pressable>
        <Pressable style={[styles.bar, { paddingBottom: insets.bottom + 24 }]} onPress={() => { setCompleted(null); navigation.navigate("Home"); }}>
          <Text style={styles.barText}>Go to Home</Text>
          <Text style={styles.barArrow}>→</Text>
        </Pressable>
      </View>
    );
  }

  // ---- Map + panel -----------------------------------------------------------
  const actionable = Boolean(call && (call.canClockIn || call.canClockOut));
  const label = busy ? "Please wait"
    : !call ? "Clock In"
    : call.canClockOut ? "Clock Out"
    : call.clockOutAt ? "Attendance completed"
    : call.clockInAt ? "Attendance recorded"
    : "Clock In";
  const status = call ? statusOf(call) : null;

  return (
    <View style={styles.root}>
      <StatusBar style="dark" />
      {call ? (
        <ClockMapBackground
          venueName={call.venueName}
          venueAddress={call.venueAddress}
          venueLatitude={call.venueLatitude}
          venueLongitude={call.venueLongitude}
          geofenceRadiusMeters={call.geofenceRadiusMeters}
        />
      ) : null}

      <View style={[styles.mapControls, { top: insets.top + 12 }]}>
        <Pressable accessibilityRole="button" accessibilityLabel="Back" onPress={back} style={styles.roundButton}>
          <LineIcon kind="back" size={20} />
        </Pressable>
        <Pressable
          accessibilityRole="button"
          accessibilityLabel="Refresh clock-in details"
          onPress={() => { setLocal(null); void query.refetch(); }}
          style={styles.roundButton}
        >
          <Ionicons name="refresh" size={19} color={C.ink} />
        </Pressable>
      </View>

      <View style={styles.panel}>
        <Headline dark strong="Clock" light={call?.canClockOut ? "Out" : "In"} style={styles.panelHeadline} />

        {query.isLoading ? <ActivityIndicator style={{ marginVertical: 40 }} color={C.navyMuted} /> : null}
        {!query.isLoading && !call ? <Text style={styles.message}>No call is available for clock-in.</Text> : null}

        {call ? (
          <>
            <View style={styles.field}>
              <Text style={styles.fieldLabel}>Call</Text>
              <Text style={styles.fieldValue} numberOfLines={1}>{call.title}</Text>
            </View>
            <View style={styles.venueRow}>
              <Ionicons name="location-outline" size={15} color={C.navyMuted} />
              <Text style={styles.venueText} numberOfLines={2}>{call.venueAddress || call.venueName || "Venue to be announced"}</Text>
            </View>
            {call.clockInAt ? (
              <View style={styles.confirmRow}>
                <Ionicons name="checkmark-circle" size={17} color="#5BC48A" />
                <Text style={styles.confirmText}>{clockText(call)}</Text>
              </View>
            ) : !actionable ? (
              <Text style={styles.message}>{clockText(call)}</Text>
            ) : null}

            <View style={styles.infoRow}>
              <View style={styles.infoCell}>
                <View style={[styles.statusDot, { backgroundColor: status?.color }]} />
                <Text style={styles.infoValue} numberOfLines={1}>{status?.label}</Text>
              </View>
              <View style={styles.infoDivider} />
              <View style={styles.infoCell}>
                <Text style={styles.infoLabel}>Time</Text>
                <Text style={styles.infoValue} numberOfLines={1}>{status?.time}</Text>
              </View>
            </View>
          </>
        ) : null}

        <Pressable
          accessibilityRole="button"
          disabled={!actionable || busy}
          onPress={() => setMapOpen(true)}
          style={({ pressed }) => [styles.bar, actionable && styles.barActive, { paddingBottom: insets.bottom + 24 }, pressed && { opacity: 0.88 }]}
        >
          {busy ? <ActivityIndicator color="#fff" /> : <Text style={[styles.barText, !actionable && { color: C.navyMuted }]}>{label}</Text>}
          {actionable && !busy ? <Text style={styles.barArrow}>→</Text> : null}
        </Pressable>
      </View>

      {call ? (
        <AttendanceMapModal
          visible={mapOpen}
          action={call.canClockOut ? "out" : "in"}
          venueName={call.venueName}
          venueAddress={call.venueAddress}
          venueLatitude={call.venueLatitude}
          venueLongitude={call.venueLongitude}
          geofenceRadiusMeters={call.geofenceRadiusMeters}
          busy={busy}
          onClose={() => setMapOpen(false)}
          onConfirm={(location) => act(location, true)}
        />
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: "#E8ECE8" },
  mapControls: { position: "absolute", left: 20, right: 20, flexDirection: "row", justifyContent: "space-between" },
  roundButton: {
    width: 44, height: 44, borderRadius: 22, backgroundColor: "#FFFFFF", alignItems: "center", justifyContent: "center",
    shadowColor: "#000", shadowOpacity: 0.16, shadowRadius: 10, shadowOffset: { width: 0, height: 4 }, elevation: 4,
  },
  panel: {
    position: "absolute", left: 0, right: 0, bottom: 0, backgroundColor: C.navy,
    borderTopLeftRadius: 22, borderTopRightRadius: 22, paddingTop: 6,
    shadowColor: "#000", shadowOpacity: 0.25, shadowRadius: 20, shadowOffset: { width: 0, height: -6 }, elevation: 12,
  },
  panelHeadline: { marginTop: 26 },
  field: { marginTop: 26, marginHorizontal: GUTTER, borderBottomWidth: 1.5, borderBottomColor: "#FFFFFF", paddingBottom: 10 },
  fieldLabel: { fontFamily: F.regular, fontSize: 12.5, color: C.navyMuted },
  fieldValue: { marginTop: 10, fontFamily: F.regular, fontSize: 17, color: C.navyText },
  venueRow: { flexDirection: "row", alignItems: "flex-start", gap: 8, marginTop: 14, marginHorizontal: GUTTER },
  venueText: { flex: 1, fontFamily: F.regular, fontSize: 13, lineHeight: 18, color: C.navyMuted },
  message: { marginTop: 14, marginHorizontal: GUTTER, fontFamily: F.regular, fontSize: 13.5, lineHeight: 19, color: C.navyText },
  confirmRow: { flexDirection: "row", alignItems: "flex-start", gap: 8, marginTop: 14, marginHorizontal: GUTTER },
  confirmText: { flex: 1, fontFamily: F.regular, fontSize: 13.5, lineHeight: 19, color: C.navyText },
  infoRow: { flexDirection: "row", borderTopWidth: StyleSheet.hairlineWidth, borderTopColor: C.navyLine, marginTop: 24 },
  infoCell: { flex: 1, flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 10, paddingVertical: 22 },
  infoDivider: { width: StyleSheet.hairlineWidth, backgroundColor: C.navyLine },
  infoLabel: { fontFamily: F.regular, fontSize: 12.5, color: C.navyMuted },
  infoValue: { fontFamily: F.medium, fontSize: 13.5, color: C.navyText },
  statusDot: { width: 7, height: 7, borderRadius: 4 },
  bar: { borderTopWidth: StyleSheet.hairlineWidth, borderTopColor: C.navyLine, paddingTop: 24, alignItems: "center", justifyContent: "center" },
  barActive: { backgroundColor: C.maroon, borderTopColor: C.maroon },
  barText: { fontFamily: F.medium, fontSize: 17, color: "#FFFFFF" },
  barTextMuted: { fontFamily: F.medium, fontSize: 15, color: C.navyMuted },
  barArrow: { position: "absolute", right: GUTTER, top: 18, fontFamily: F.regular, fontSize: 24, color: "#FFFFFF" },
  secondaryBar: { borderTopWidth: StyleSheet.hairlineWidth, borderTopColor: C.navyLine, paddingVertical: 20, alignItems: "center" },
  doneRoot: { flex: 1, backgroundColor: C.navy },
  doneLead: { marginTop: 14, marginHorizontal: GUTTER, fontFamily: F.regular, fontSize: 15, color: C.navyMuted },
  doneDetails: { marginTop: 26, marginHorizontal: GUTTER, gap: 16 },
  doneRow: { flexDirection: "row", justifyContent: "space-between" },
  doneValue: { fontFamily: F.medium, fontSize: 15, color: C.navyText },
  doneNote: { marginTop: 26, marginHorizontal: GUTTER, fontFamily: F.regular, fontSize: 13, color: C.navyMuted },
});
