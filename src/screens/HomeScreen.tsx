import React, { useMemo, useState } from "react";
import {
  ActivityIndicator,
  Image,
  RefreshControl,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from "react-native";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useNavigation } from "@react-navigation/native";
import { Ionicons } from "@expo/vector-icons";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import Svg, { Line } from "react-native-svg";
import { format } from "date-fns";
import { getMemberPortal, MemberPortalData, PortalActivity } from "../api/memberPortal";
import { getNotifications } from "../api/notifications";
import { useAuth } from "../context/AuthContext";
import { font } from "../constants/fonts";

// Health-dashboard visual language: warm off-white ground, white cards, mono
// labels/figures (Space Mono), colored tick-bars for data. Teal stays the accent.
const BG = "#F5F6F5";
const CARD = "#FFFFFF";
const BORDER = "#ECEFED";
const INK = "#191D1B";
const MUTED = "#8A938F";
const FAINT = "#E4E9E7";
const TEAL = "#0D9488";
const GREEN = "#3FA55C";
const ORANGE = "#E08A2E";
const BLUE = "#4A90D9";
const ROSE = "#D4636E";

function money(value: number) {
  return new Intl.NumberFormat("en-PH", {
    style: "currency",
    currency: "PHP",
    maximumFractionDigits: 0,
  }).format(value || 0);
}

export default function HomeScreen() {
  const navigation = useNavigation<any>();
  const queryClient = useQueryClient();
  const insets = useSafeAreaInsets();
  const { user } = useAuth();
  const [refreshing, setRefreshing] = useState(false);

  const portalQuery = useQuery({
    queryKey: ["member-portal", user?.email ?? "anonymous"],
    queryFn: getMemberPortal,
    retry: (failureCount, error) =>
      (error as { status?: number })?.status !== 404 && failureCount < 2,
  });

  const notificationsQuery = useQuery({
    queryKey: ["notifications"],
    enabled: Boolean(user),
    queryFn: () => getNotifications(50),
    retry: false,
  });

  const portal = portalQuery.data;
  const unreadCount = notificationsQuery.data?.unreadCount ?? 0;

  const refreshAll = async () => {
    setRefreshing(true);
    try {
      await Promise.all([
        queryClient.refetchQueries({ queryKey: ["member-portal"], type: "active" }),
        queryClient.refetchQueries({ queryKey: ["notifications"], type: "active" }),
      ]);
    } finally {
      setRefreshing(false);
    }
  };

  const openActivity = (activity: PortalActivity) =>
    navigation.navigate("Attendance", {
      activity,
      focusActivityKey: `${activity.type}-${activity.sourceId}`,
      focusNonce: Date.now(),
    });

  const nextCall = useMemo(() => {
    const upcoming = portal?.upcoming ?? [];
    return [...upcoming].sort(
      (a, b) => new Date(a.date).getTime() - new Date(b.date).getTime()
    )[0];
  }, [portal]);

  const displayName = portal?.member.name || user?.name || user?.email || "Member";
  const firstName = displayName.split(" ")[0];
  const avatar = portal?.member.avatarUrl || portal?.user.image;

  return (
    <View style={styles.screen}>
      <ScrollView
        contentContainerStyle={[styles.scroll, { paddingTop: insets.top + 10 }]}
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={refreshAll}
            tintColor={TEAL}
            colors={[TEAL]}
            progressViewOffset={insets.top + 8}
          />
        }
      >
        {/* ---------- header ---------- */}
        <View style={styles.header}>
          <View style={{ flex: 1 }}>
            <View style={styles.todayRow}>
              <Ionicons name="calendar-clear-outline" size={11} color={MUTED} />
              <Text style={styles.todayText}>
                TODAY, {format(new Date(), "d MMMM").toUpperCase()}
              </Text>
            </View>
            <Text style={styles.welcome}>Welcome Back, {firstName}</Text>
          </View>
          <TouchableOpacity
            style={styles.avatarWrap}
            activeOpacity={0.8}
            onPress={() => navigation.navigate("Notifications")}
          >
            {avatar ? (
              <Image source={{ uri: avatar }} style={styles.avatarImage} />
            ) : (
              <Text style={styles.avatarInitials}>{initials(displayName)}</Text>
            )}
            {unreadCount > 0 ? <View style={styles.avatarDot} /> : null}
          </TouchableOpacity>
        </View>

        {portalQuery.isLoading ? (
          <View style={styles.stateBlock}>
            <ActivityIndicator color={TEAL} />
            <Text style={styles.stateText}>Loading your portal…</Text>
          </View>
        ) : !portal ? (
          <PortalUnavailable error={portalQuery.error} onRetry={refreshAll} />
        ) : (
          <>
            {/* ---------- attendance gauge ---------- */}
            <TouchableOpacity
              style={styles.card}
              activeOpacity={0.85}
              onPress={() => navigation.navigate("Attendance")}
            >
              <View style={styles.cardHead}>
                <Text style={styles.cardLabel}>
                  Attendance <Text style={styles.cardUnit}>RATE</Text>
                </Text>
                <Ionicons name="arrow-forward" size={15} color={INK} />
              </View>

              <GaugeArc
                rate={portal.attendance.overallTotal ? portal.attendance.attendanceRate : null}
              />

              <View style={styles.gaugeFooter}>
                <View>
                  <Text style={styles.footLabel}>Attended</Text>
                  <Text style={styles.footValue}>{portal.attendance.overallAttended}</Text>
                </View>
                <View style={{ alignItems: "flex-end" }}>
                  <Text style={styles.footLabel}>Total calls</Text>
                  <Text style={styles.footValue}>{portal.attendance.overallTotal}</Text>
                </View>
              </View>
            </TouchableOpacity>

            {/* ---------- season breakdown ---------- */}
            <TouchableOpacity
              style={styles.card}
              activeOpacity={0.85}
              onPress={() => navigation.navigate("Attendance")}
            >
              <View style={styles.cardHead}>
                <View style={styles.dotLabelRow}>
                  <View style={[styles.dot, { backgroundColor: TEAL }]} />
                  <Text style={styles.cardLabelSm}>Season Breakdown</Text>
                </View>
                <Ionicons name="arrow-forward" size={15} color={INK} />
              </View>

              <TickRow
                label="REHEARSALS"
                color={ROSE}
                attended={portal.attendance.rehearsalsAttended}
                total={portal.attendance.rehearsalsTotal}
              />
              <TickRow
                label="GIGS"
                color={ORANGE}
                attended={portal.attendance.gigsAttended}
                total={portal.attendance.gigsTotal}
              />
              <TickRow
                label="EVENTS"
                color={BLUE}
                attended={portal.attendance.eventsAttended}
                total={portal.attendance.eventsTotal}
              />
            </TouchableOpacity>

            {/* ---------- stat tiles ---------- */}
            <View style={styles.tileGrid}>
              <StatTile
                label="Pending Pay"
                value={money(portal.earnings.pending)}
                sub={`${portal.earnings.year} gigs`}
                subColor={portal.earnings.pending > 0 ? ORANGE : MUTED}
                onPress={() => navigation.navigate("Earnings")}
              />
              <StatTile
                label="Earned"
                value={money(portal.earnings.total)}
                sub={`${portal.earnings.year} total`}
                subColor={GREEN}
                onPress={() => navigation.navigate("Earnings")}
              />
              <StatTile
                label="Times Late"
                value={String(portal.attendance.reliability?.lateCount ?? 0)}
                sub={`${portal.attendance.reliability?.totalLateMinutes ?? 0} min total`}
                subColor={(portal.attendance.reliability?.lateCount ?? 0) > 0 ? ROSE : GREEN}
                onPress={() => navigation.navigate("Attendance")}
              />
              <StatTile
                label="Excused"
                value={String(portal.attendance.reliability?.excusedCount ?? 0)}
                sub={`${portal.attendance.reliability?.noShowCount ?? 0} no-shows`}
                subColor={(portal.attendance.reliability?.noShowCount ?? 0) > 0 ? ROSE : MUTED}
                onPress={() => navigation.navigate("Attendance")}
              />
            </View>

            {/* ---------- next call digest ---------- */}
            <View style={styles.card}>
              <Text style={styles.digestLabel}>NEXT CALL</Text>
              {nextCall ? (
                <>
                  <Text style={styles.digestTitle}>{nextCall.title}</Text>
                  <Text style={styles.digestBody}>
                    {formatCallMeta(nextCall)}
                    {nextCall.venueName ? ` · ${nextCall.venueName}` : ""}
                  </Text>
                  <TouchableOpacity
                    style={[
                      styles.clockBtn,
                      !nextCall.clockInWindow?.isOpen && styles.clockBtnIdle,
                    ]}
                    activeOpacity={0.85}
                    onPress={() => openActivity(nextCall)}
                  >
                    <Ionicons
                      name="time-outline"
                      size={14}
                      color={nextCall.clockInWindow?.isOpen ? "#FFFFFF" : INK}
                    />
                    <Text
                      style={[
                        styles.clockBtnText,
                        !nextCall.clockInWindow?.isOpen && styles.clockBtnTextIdle,
                      ]}
                    >
                      {clockLabel(nextCall)}
                    </Text>
                  </TouchableOpacity>
                </>
              ) : (
                <Text style={styles.digestBody}>
                  Nothing scheduled yet. New rehearsals, gigs and events will appear here as
                  soon as they are posted.
                </Text>
              )}
            </View>

            {/* ---------- upcoming ---------- */}
            {(portal.upcoming?.length ?? 0) > 1 ? (
              <>
                <View style={styles.sectionRow}>
                  <Text style={styles.sectionTitle}>Coming up</Text>
                  <TouchableOpacity onPress={() => navigation.navigate("Attendance")} hitSlop={8}>
                    <Ionicons name="arrow-forward" size={15} color={INK} />
                  </TouchableOpacity>
                </View>
                <View style={[styles.card, { paddingVertical: 4 }]}>
                  {portal.upcoming.slice(1, 5).map((item, index, arr) => (
                    <UpcomingRow
                      key={`${item.type}-${item.id}`}
                      item={item}
                      last={index === arr.length - 1}
                      onPress={() => openActivity(item)}
                    />
                  ))}
                </View>
              </>
            ) : null}
          </>
        )}
      </ScrollView>
    </View>
  );
}

/* ---------- gauge ---------- */

const TICKS = 46;
const SWEEP = 220; // degrees
const GAUGE_R_OUTER = 82;
const GAUGE_R_INNER = 66;

function GaugeArc({ rate }: { rate: number | null }) {
  const size = GAUGE_R_OUTER * 2 + 12;
  const cx = size / 2;
  const cy = size / 2 + 6;
  const filled = rate == null ? 0 : Math.round((Math.min(Math.max(rate, 0), 100) / 100) * TICKS);

  const ticks = Array.from({ length: TICKS }, (_, i) => {
    const angle = -SWEEP / 2 + (SWEEP * i) / (TICKS - 1); // 0 = straight up
    const rad = (angle * Math.PI) / 180;
    const sin = Math.sin(rad);
    const cos = Math.cos(rad);
    const on = i < filled;
    // teal -> green ramp across the filled range, echoing the reference gauge
    const t = i / (TICKS - 1);
    const color = on ? blend("#0D9488", "#4CBB6C", t) : FAINT;
    return {
      key: i,
      x1: cx + GAUGE_R_INNER * sin,
      y1: cy - GAUGE_R_INNER * cos,
      x2: cx + GAUGE_R_OUTER * sin,
      y2: cy - GAUGE_R_OUTER * cos,
      color,
    };
  });

  return (
    <View style={styles.gaugeWrap}>
      <Svg width={size} height={size * 0.72}>
        {ticks.map((tick) => (
          <Line
            key={tick.key}
            x1={tick.x1}
            y1={tick.y1}
            x2={tick.x2}
            y2={tick.y2}
            stroke={tick.color}
            strokeWidth={3.2}
            strokeLinecap="round"
          />
        ))}
      </Svg>
      <View style={styles.gaugeCenter}>
        <Text style={styles.gaugeValue}>
          {rate == null ? "—" : `${Math.round(rate)}%`}
        </Text>
        <Text style={styles.gaugeCaption}>
          {rate == null ? "first call coming up" : "calls attended"}
        </Text>
      </View>
    </View>
  );
}

function blend(from: string, to: string, t: number) {
  const a = hex(from);
  const b = hex(to);
  const mix = (i: number) => Math.round(a[i] + (b[i] - a[i]) * t);
  return `rgb(${mix(0)},${mix(1)},${mix(2)})`;
}

function hex(color: string): [number, number, number] {
  const value = parseInt(color.slice(1), 16);
  return [(value >> 16) & 255, (value >> 8) & 255, value & 255];
}

/* ---------- tick rows ---------- */

const ROW_TICKS = 26;

function TickRow({
  label,
  color,
  attended,
  total,
}: {
  label: string;
  color: string;
  attended: number;
  total: number;
}) {
  const pct = total ? attended / total : 0;
  const filled = Math.round(pct * ROW_TICKS);

  return (
    <View style={styles.tickRow}>
      <Text style={styles.tickLabel}>{label}</Text>
      <View style={styles.tickBar}>
        {Array.from({ length: ROW_TICKS }, (_, i) => (
          <View
            key={i}
            style={[styles.tick, { backgroundColor: i < filled ? color : FAINT }]}
          />
        ))}
      </View>
      <Text style={styles.tickValue}>
        {total ? `${attended}/${total}` : "—"}
      </Text>
    </View>
  );
}

/* ---------- stat tiles ---------- */

function StatTile({
  label,
  value,
  sub,
  subColor,
  onPress,
}: {
  label: string;
  value: string;
  sub: string;
  subColor: string;
  onPress: () => void;
}) {
  return (
    <TouchableOpacity style={styles.tile} activeOpacity={0.85} onPress={onPress}>
      <Text style={styles.tileLabel}>{label}</Text>
      <Text style={styles.tileValue} numberOfLines={1} adjustsFontSizeToFit>
        {value}
      </Text>
      <Text style={[styles.tileSub, { color: subColor }]} numberOfLines={1}>
        {sub}
      </Text>
    </TouchableOpacity>
  );
}

/* ---------- next call helpers ---------- */

function formatCallMeta(item: PortalActivity) {
  const date = new Date(item.date);
  if (Number.isNaN(date.getTime())) return "Schedule to be announced";
  const day = format(date, "EEE, MMM d");
  const time = format(date, "h:mm a");
  const end =
    item.endDate && !Number.isNaN(new Date(item.endDate).getTime())
      ? ` – ${format(new Date(item.endDate), "h:mm a")}`
      : "";
  return `${day} · ${time}${end}`;
}

function clockLabel(item: PortalActivity) {
  if (item.clockInWindow?.isOpen) return "Clock in now";
  if (item.clockInWindow?.isUpcoming) {
    const opens = new Date(item.clockInWindow.opensAt);
    if (!Number.isNaN(opens.getTime())) {
      return `Clock-in opens ${format(opens, "h:mm a")}`;
    }
  }
  if ((item.confirmation ?? "").toLowerCase() === "pending") return "Confirm attendance";
  return "View details";
}

/* ---------- upcoming rows ---------- */

const TYPE_COLOR: Record<string, string> = { rehearsal: ROSE, gig: ORANGE, event: BLUE };

function UpcomingRow({
  item,
  last,
  onPress,
}: {
  item: PortalActivity;
  last: boolean;
  onPress: () => void;
}) {
  const date = new Date(item.date);
  const valid = !Number.isNaN(date.getTime());
  const color = TYPE_COLOR[item.type] ?? TEAL;
  const needsRsvp = (item.confirmation ?? "").toLowerCase() === "pending";

  return (
    <TouchableOpacity
      style={[styles.upRow, last && { borderBottomWidth: 0 }]}
      activeOpacity={0.75}
      onPress={onPress}
    >
      <View style={styles.upDate}>
        <Text style={[styles.upMonth, { color }]}>
          {valid ? format(date, "MMM").toUpperCase() : "---"}
        </Text>
        <Text style={styles.upDay}>{valid ? format(date, "dd") : "--"}</Text>
      </View>
      <View style={{ flex: 1 }}>
        <Text style={styles.upTitle} numberOfLines={1}>
          {item.title}
        </Text>
        <Text style={styles.upMeta} numberOfLines={1}>
          {valid ? format(date, "h:mm a") : "TBA"}
          {item.venueName ? ` · ${item.venueName}` : ""}
        </Text>
      </View>
      <Text style={[styles.upState, { color: needsRsvp ? ORANGE : MUTED }]}>
        {needsRsvp ? "RSVP" : item.status}
      </Text>
    </TouchableOpacity>
  );
}

/* ---------- error state ---------- */

function PortalUnavailable({ error, onRetry }: { error?: unknown; onRetry: () => void }) {
  const portalError = error as { message?: string; status?: number } | undefined;
  const notLinked = portalError?.status === 404;

  return (
    <View style={styles.stateBlock}>
      <View style={styles.stateIcon}>
        <Ionicons
          name={notLinked ? "link-outline" : "cloud-offline-outline"}
          size={22}
          color={TEAL}
        />
      </View>
      <Text style={styles.stateTitle}>
        {notLinked ? "Member profile not linked" : "Portal unavailable"}
      </Text>
      <Text style={styles.stateText}>
        {notLinked
          ? "This account is signed in but is not linked to a member record yet. Ask an admin to connect it."
          : portalError?.message || "We could not load your member portal. Pull down to refresh."}
      </Text>
      <TouchableOpacity style={styles.stateButton} onPress={onRetry} activeOpacity={0.85}>
        <Text style={styles.stateButtonText}>Try again</Text>
      </TouchableOpacity>
    </View>
  );
}

function initials(name: string) {
  return (
    name
      .split(" ")
      .filter(Boolean)
      .slice(0, 2)
      .map((part) => part[0])
      .join("")
      .toUpperCase() || "M"
  );
}

/* ---------- styles ---------- */

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: BG },
  scroll: { paddingHorizontal: 18, paddingBottom: 30 },

  header: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    marginBottom: 16,
    marginTop: 4,
  },
  todayRow: { flexDirection: "row", alignItems: "center", gap: 5 },
  todayText: { fontFamily: font.mono, fontSize: 10, color: MUTED, letterSpacing: 0.6 },
  welcome: { fontFamily: font.bold, fontSize: 18, color: INK, letterSpacing: -0.3, marginTop: 2 },
  avatarWrap: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: "#E5EEEC",
    alignItems: "center",
    justifyContent: "center",
    overflow: "visible",
  },
  avatarImage: { width: 40, height: 40, borderRadius: 20 },
  avatarInitials: { fontFamily: font.monoBold, fontSize: 13, color: TEAL },
  avatarDot: {
    position: "absolute",
    top: 0,
    right: 0,
    width: 10,
    height: 10,
    borderRadius: 5,
    backgroundColor: ROSE,
    borderWidth: 2,
    borderColor: BG,
  },

  card: {
    backgroundColor: CARD,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: BORDER,
    padding: 16,
    marginBottom: 12,
    shadowColor: "#1A2420",
    shadowOpacity: 0.05,
    shadowRadius: 14,
    shadowOffset: { width: 0, height: 6 },
    elevation: 2,
  },
  cardHead: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: 4,
  },
  cardLabel: { fontFamily: font.mono, fontSize: 12.5, color: INK },
  cardUnit: { fontFamily: font.mono, fontSize: 9, color: MUTED, letterSpacing: 0.8 },
  cardLabelSm: { fontFamily: font.mono, fontSize: 11.5, color: INK },
  dotLabelRow: { flexDirection: "row", alignItems: "center", gap: 7 },
  dot: { width: 6, height: 6, borderRadius: 3 },

  gaugeWrap: { alignItems: "center", marginTop: 4 },
  gaugeCenter: { position: "absolute", top: "38%", alignItems: "center" },
  gaugeValue: { fontFamily: font.monoBold, fontSize: 34, color: INK, letterSpacing: -1 },
  gaugeCaption: { fontFamily: font.mono, fontSize: 9.5, color: MUTED, marginTop: 2 },
  gaugeFooter: {
    flexDirection: "row",
    justifyContent: "space-between",
    marginTop: 2,
    paddingHorizontal: 6,
  },
  footLabel: { fontFamily: font.mono, fontSize: 9, color: MUTED, letterSpacing: 0.4 },
  footValue: { fontFamily: font.monoBold, fontSize: 15, color: INK, marginTop: 1 },

  tickRow: { flexDirection: "row", alignItems: "center", gap: 10, marginTop: 13 },
  tickLabel: { fontFamily: font.mono, fontSize: 9, color: MUTED, width: 74, letterSpacing: 0.4 },
  tickBar: { flex: 1, flexDirection: "row", gap: 2.5, alignItems: "center" },
  tick: { flex: 1, height: 13, borderRadius: 1.5 },
  tickValue: {
    fontFamily: font.monoBold,
    fontSize: 10.5,
    color: INK,
    width: 46,
    textAlign: "right",
  },

  tileGrid: { flexDirection: "row", flexWrap: "wrap", gap: 10, marginBottom: 12 },
  tile: {
    width: "48.3%",
    backgroundColor: CARD,
    borderRadius: 18,
    borderWidth: 1,
    borderColor: BORDER,
    paddingVertical: 13,
    paddingHorizontal: 14,
  },
  tileLabel: { fontFamily: font.mono, fontSize: 10, color: MUTED },
  tileValue: { fontFamily: font.monoBold, fontSize: 20, color: INK, marginTop: 5, letterSpacing: -0.5 },
  tileSub: { fontFamily: font.mono, fontSize: 9, marginTop: 3, letterSpacing: 0.2 },

  digestLabel: { fontFamily: font.mono, fontSize: 9.5, color: MUTED, letterSpacing: 0.8 },
  digestTitle: { fontFamily: font.bold, fontSize: 15, color: INK, marginTop: 6, letterSpacing: -0.2 },
  digestBody: { fontFamily: font.medium, fontSize: 12, color: MUTED, marginTop: 4, lineHeight: 18 },
  clockBtn: {
    marginTop: 12,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 6,
    backgroundColor: TEAL,
    borderRadius: 12,
    paddingVertical: 11,
  },
  clockBtnIdle: { backgroundColor: "#F0F3F1" },
  clockBtnText: { fontFamily: font.bold, fontSize: 12.5, color: "#FFFFFF" },
  clockBtnTextIdle: { color: INK },

  sectionRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: 10,
    marginTop: 2,
    paddingHorizontal: 2,
  },
  sectionTitle: { fontFamily: font.bold, fontSize: 15, color: INK, letterSpacing: -0.2 },

  upRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    paddingVertical: 11,
    borderBottomWidth: 1,
    borderBottomColor: "#F0F3F1",
  },
  upDate: { width: 36, alignItems: "center" },
  upMonth: { fontFamily: font.monoBold, fontSize: 8.5, letterSpacing: 0.6 },
  upDay: { fontFamily: font.monoBold, fontSize: 16, color: INK, marginTop: 1 },
  upTitle: { fontFamily: font.semiBold, fontSize: 12.5, color: INK, letterSpacing: -0.1 },
  upMeta: { fontFamily: font.mono, fontSize: 9.5, color: MUTED, marginTop: 2 },
  upState: { fontFamily: font.monoBold, fontSize: 9, letterSpacing: 0.4 },

  stateBlock: { alignItems: "center", gap: 10, paddingHorizontal: 28, paddingVertical: 48 },
  stateIcon: {
    width: 50,
    height: 50,
    borderRadius: 25,
    backgroundColor: "#E5EEEC",
    alignItems: "center",
    justifyContent: "center",
  },
  stateTitle: { fontFamily: font.bold, fontSize: 15, color: INK, textAlign: "center" },
  stateText: {
    fontFamily: font.medium,
    fontSize: 12.5,
    color: MUTED,
    textAlign: "center",
    lineHeight: 18,
  },
  stateButton: {
    marginTop: 6,
    backgroundColor: TEAL,
    borderRadius: 22,
    paddingHorizontal: 22,
    paddingVertical: 11,
  },
  stateButtonText: { fontFamily: font.bold, fontSize: 13, color: "#FFFFFF" },
});
