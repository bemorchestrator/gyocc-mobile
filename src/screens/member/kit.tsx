// Shared visual kit for the member app redesign (design/mockups/board-*.png).
// Calm, editorial layout: big two-weight headlines, thin icons, lots of white
// space, one square maroon clock button anchored bottom-right.
import React from "react";
import { Platform, Pressable, StyleSheet, Text, TextStyle, View, ViewStyle } from "react-native";
import { useQuery } from "@tanstack/react-query";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import Svg, { Circle, Line, Path, Rect } from "react-native-svg";
import { format, isSameDay, isToday, isTomorrow } from "date-fns";
import { getMemberPortal, MemberPortalData, PortalActivity } from "../../api/memberPortal";
import { useAuth } from "../../context/AuthContext";

export const C = {
  ink: "#111111",
  grey: "#9A9A9A",
  faint: "#C4C4C4",
  hairline: "rgba(17,17,17,0.08)",
  paper: "#FFFFFF",
  blue: "#4A9FE8",
  maroon: "#840016",
  green: "#3E8E63",
  gold: "#E9B949",
  navy: "#0F1F2C",
  navyLine: "rgba(255,255,255,0.10)",
  navyText: "#FFFFFF",
  navyMuted: "rgba(255,255,255,0.45)",
  tint: {
    rehearsal: "#EBF4FC",
    gig: "#FFF7E8",
    event: "#F2EFF8",
  } as Record<string, string>,
};

// Avenir Next ships with iOS and matches the reference; Android falls back to
// the Inter family the app already loads.
const ios = Platform.OS === "ios";
export const F = {
  light: ios ? "AvenirNext-UltraLight" : "Inter_400Regular",
  regular: ios ? "AvenirNext-Regular" : "Inter_400Regular",
  medium: ios ? "AvenirNext-Medium" : "Inter_500Medium",
  demi: ios ? "AvenirNext-DemiBold" : "Inter_600SemiBold",
  bold: ios ? "AvenirNext-Bold" : "Inter_700Bold",
};

export const GUTTER = 40;

export function usePortal() {
  const { user } = useAuth();
  return useQuery({
    queryKey: ["member-portal", user?.email ?? "anonymous"],
    queryFn: getMemberPortal,
    retry: (count, error) => (error as { status?: number })?.status !== 404 && count < 2,
  });
}

export function sortedCalls(portal?: MemberPortalData) {
  return [...(portal?.upcoming ?? [])].sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());
}

export function callEnd(call: PortalActivity) {
  const end = call.endDate ? new Date(call.endDate) : null;
  return end && !Number.isNaN(end.getTime()) ? end : new Date(new Date(call.date).getTime() + 2 * 60 * 60 * 1000);
}

/** "10:00 - 12:00", the reference's 24-hour range format. */
export function timeRange(call: PortalActivity) {
  return `${format(new Date(call.date), "H:mm")} - ${format(callEnd(call), "H:mm")}`;
}

export function ordinal(day: number) {
  const mod100 = day % 100;
  if (mod100 >= 11 && mod100 <= 13) return "th";
  return ["th", "st", "nd", "rd"][day % 10] ?? "th";
}

/** "45m", "1h 45m", "2h". */
export function shortDuration(ms: number) {
  const minutes = Math.max(0, Math.round(ms / 60000));
  const h = Math.floor(minutes / 60);
  const m = minutes % 60;
  if (!h) return `${m}m`;
  return m ? `${h}h ${m}m` : `${h}h`;
}

/** The single call worth a live hint: in progress, or the next one today/tomorrow. */
export function liveHint(call: PortalActivity, now = new Date()): string | null {
  const start = new Date(call.date);
  const end = callEnd(call);
  if (now >= start && now < end) return `Ends in ${shortDuration(end.getTime() - now.getTime())}`;
  const until = start.getTime() - now.getTime();
  if (until > 0 && until < 24 * 60 * 60 * 1000) return `Begins in ${shortDuration(until)}`;
  return null;
}

/** "today at 1:19 PM" / "tomorrow at 1:19 PM" / "Wed, Sep 2 at 1:19 PM". */
export function whenText(date: Date) {
  if (isToday(date)) return `today at ${format(date, "h:mm a")}`;
  if (isTomorrow(date)) return `tomorrow at ${format(date, "h:mm a")}`;
  return format(date, "EEE, MMM d 'at' h:mm a");
}

/** Clock-in state in words (same wording as the original Clock screen). */
export function clockText(call: PortalActivity) {
  if (call.clockOutAt) return `Clocked out at ${format(new Date(call.clockOutAt), "h:mm a")} · ${call.attendanceStatus || "Completed"}`;
  if (call.clockInAt) {
    const nextStep = call.requiresClockOut ? " · Clock out after the call" : " · Attendance recorded";
    return `Clocked in at ${format(new Date(call.clockInAt), "h:mm a")} · ${call.attendanceStatus || "Present"}${call.locationVerified ? " · Location verified" : ""}${nextStep}`;
  }
  if (call.clockInBlockedReason) return call.clockInBlockedReason.message;
  if (call.clockInWindow?.isOpen && call.locationConfigured === false) return "Clock-in is disabled until an administrator sets the venue pin";
  if (call.clockInWindow?.isOpen || call.canClockIn) return "Clock-in window is open";
  if (call.clockInWindow?.isUpcoming) return `Clock-in opens ${whenText(new Date(call.clockInWindow.opensAt))} — 30 minutes before call time.`;
  if (call.clockInWindow?.isPast) return "The clock-in window for this call has closed.";
  return "Attendance is recorded on site";
}

export function callsOn(calls: PortalActivity[], day: Date) {
  return calls.filter((call) => isSameDay(new Date(call.date), day));
}

export function firstName(portal?: MemberPortalData) {
  return (portal?.user.name || portal?.member.name || "Member").split(" ")[0];
}

/** Two-weight headline: heavy first word, light grey second word. */
export function Headline({ strong, light, sup, dark, style }: { strong: string; light?: string; sup?: string; dark?: boolean; style?: ViewStyle }) {
  return (
    <View style={[styles.headline, style]}>
      <Text style={[styles.headStrong, dark && { color: C.navyText }]} numberOfLines={1}>
        {strong}
        {light ? <Text style={[styles.headLight, dark && { color: C.navyMuted }]}> {light}</Text> : null}
      </Text>
      {sup ? <Text style={[styles.headSup, dark && { color: C.navyMuted }]}>{sup}</Text> : null}
    </View>
  );
}

type IconKind = "menu" | "back" | "calendar" | "close" | "bell";

export function LineIcon({ kind, color = C.ink, size = 22 }: { kind: IconKind; color?: string; size?: number }) {
  const s = size;
  return (
    <Svg width={s} height={s} viewBox="0 0 24 24" fill="none">
      {kind === "menu" ? (
        <>
          <Line x1="2" y1="9" x2="22" y2="9" stroke={color} strokeWidth={1.6} strokeLinecap="round" />
          <Line x1="2" y1="15.5" x2="13" y2="15.5" stroke={color} strokeWidth={1.6} strokeLinecap="round" />
        </>
      ) : kind === "back" ? (
        <Path d="M15 4 L7 12 L15 20" stroke={color} strokeWidth={1.6} strokeLinecap="round" strokeLinejoin="round" />
      ) : kind === "close" ? (
        <>
          <Line x1="5" y1="5" x2="19" y2="19" stroke={color} strokeWidth={1.6} strokeLinecap="round" />
          <Line x1="19" y1="5" x2="5" y2="19" stroke={color} strokeWidth={1.6} strokeLinecap="round" />
        </>
      ) : kind === "bell" ? (
        <>
          <Path d="M6 16 V11 a6 6 0 0 1 12 0 V16 L19.5 18 H4.5 Z" stroke={color} strokeWidth={1.5} strokeLinejoin="round" />
          <Path d="M10 20.5 a2 2 0 0 0 4 0" stroke={color} strokeWidth={1.5} strokeLinecap="round" />
        </>
      ) : (
        <>
          <Rect x="3" y="6" width="18" height="14" stroke={color} strokeWidth={1.6} />
          <Line x1="8" y1="3.5" x2="8" y2="8" stroke={color} strokeWidth={1.6} strokeLinecap="round" />
          <Line x1="16" y1="3.5" x2="16" y2="8" stroke={color} strokeWidth={1.6} strokeLinecap="round" />
          <Line x1="3" y1="10.5" x2="21" y2="10.5" stroke={color} strokeWidth={1.6} />
        </>
      )}
    </Svg>
  );
}

export function ClockGlyph({ color = "#FFFFFF", size = 26 }: { color?: string; size?: number }) {
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
      <Circle cx="12" cy="12" r="9.2" stroke={color} strokeWidth={1.6} />
      <Path d="M12 7 V12 L15.5 14" stroke={color} strokeWidth={1.6} strokeLinecap="round" strokeLinejoin="round" />
    </Svg>
  );
}

/** Top bar: one thin icon each side, nothing else. */
export function TopBar({ left, right, dark, badge }: {
  left?: { kind: IconKind; onPress: () => void; label: string };
  right?: { kind: IconKind; onPress: () => void; label: string };
  dark?: boolean;
  badge?: number;
}) {
  const insets = useSafeAreaInsets();
  const color = dark ? C.navyText : C.ink;
  return (
    <View style={[styles.topBar, { paddingTop: insets.top + 18 }]}>
      {left ? (
        <Pressable accessibilityRole="button" accessibilityLabel={left.label} hitSlop={14} onPress={left.onPress}>
          <LineIcon kind={left.kind} color={color} />
        </Pressable>
      ) : <View style={styles.iconSpacer} />}
      {right ? (
        <Pressable accessibilityRole="button" accessibilityLabel={right.label} hitSlop={14} onPress={right.onPress}>
          <LineIcon kind={right.kind} color={color} />
          {badge ? <View style={styles.badge} /> : null}
        </Pressable>
      ) : <View style={styles.iconSpacer} />}
    </View>
  );
}

/** The square maroon button anchored to the bottom-right edge. Opens Clock. */
export function ClockFab({ onPress }: { onPress: () => void }) {
  const insets = useSafeAreaInsets();
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel="Clock in or out"
      onPress={onPress}
      style={({ pressed }) => [styles.fab, { height: 78 + insets.bottom, paddingBottom: insets.bottom }, pressed && { opacity: 0.85 }]}
    >
      <ClockGlyph />
    </Pressable>
  );
}

export function Muted({ children, style }: { children: React.ReactNode; style?: TextStyle }) {
  return <Text style={[styles.muted, style]}>{children}</Text>;
}

const styles = StyleSheet.create({
  topBar: { flexDirection: "row", justifyContent: "space-between", alignItems: "center", paddingHorizontal: GUTTER, paddingBottom: 8 },
  iconSpacer: { width: 22, height: 22 },
  badge: { position: "absolute", top: -1, right: -2, width: 7, height: 7, borderRadius: 4, backgroundColor: C.maroon },
  headline: { flexDirection: "row", alignItems: "flex-start", paddingHorizontal: GUTTER, marginTop: 44 },
  headStrong: { fontFamily: F.demi, fontSize: 38, color: C.ink, letterSpacing: -0.6 },
  headLight: { fontFamily: F.regular, color: C.grey, letterSpacing: -0.6 },
  headSup: { fontFamily: F.regular, fontSize: 19, color: C.grey, marginTop: 4, marginLeft: 1 },
  fab: { position: "absolute", right: 0, bottom: 0, width: 78, alignItems: "center", justifyContent: "center", backgroundColor: C.maroon, borderTopLeftRadius: 14 },
  muted: { fontFamily: F.regular, fontSize: 12.5, color: C.grey, marginTop: 6 },
});
