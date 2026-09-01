import React, { useMemo, useState } from "react";
import {
  ActivityIndicator,
  Alert,
  Animated,
  Image,
  KeyboardAvoidingView,
  Modal,
  PanResponder,
  Platform,
  RefreshControl,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from "react-native";
import * as ImagePicker from "expo-image-picker";
import DateTimePicker, { type DateTimePickerEvent } from "@react-native-community/datetimepicker";
import { LinearGradient } from "expo-linear-gradient";
import { Ionicons } from "@expo/vector-icons";
import { useNavigation } from "@react-navigation/native";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import {
  addMonths,
  eachDayOfInterval,
  endOfMonth,
  endOfWeek,
  format,
  isSameDay,
  isSameMonth,
  isToday,
  isTomorrow,
  startOfMonth,
  startOfWeek,
  subYears,
} from "date-fns";
import {
  clockInActivity,
  clockOutActivity,
  getMemberPortal,
  MemberPortalData,
  PortalActivity,
  ClockLocationEvidence,
  rsvpActivity,
} from "../api/memberPortal";
import {
  AppNotification,
  deleteNotification,
  getNotifications,
  markAllNotificationsRead,
  markNotificationRead,
  PagedNotifications,
} from "../api/notifications";
import { acknowledgeStipend, getMyStipends, StipendDisbursementDTO } from "../api/stipends";
import { deleteProfileAvatar, updateProfile, uploadProfileAvatar } from "../api/profile";
import {
  DEFAULT_MEMBER_SETTINGS,
  getPreferences,
  MemberSettingsPreferences,
  updatePreferencesRemote,
} from "../api/preferences";
import { forgotPassword } from "../api/auth";
import { useAuth } from "../context/AuthContext";
import { font } from "../constants/fonts";
import Toast from "react-native-toast-message";
import Svg, { Circle } from "react-native-svg";
import AttendanceMapModal from "../components/AttendanceMapModal";

const INK = "#111527";
const BLUE = "#840016";
const GREEN = "#1B8C37";
const GOLD = "#9A7182";
const RED = "#840016";
const MUTED = "#587284";
const DIM = "#8A7E78";
const BORDER = "rgba(54,68,90,0.12)";
const PAPER = "#F1F0EC";
const WHITE = "#FFFFFF";
// Deep maroon used for the solid quick-action tiles.
const DEEP = "#5E000F";
const CARD = "#F4F5F0";

function usePortal() {
  const { user } = useAuth();
  return useQuery({
    queryKey: ["member-portal", user?.email ?? "anonymous"],
    queryFn: getMemberPortal,
    retry: (count, error) => (error as { status?: number })?.status !== 404 && count < 2,
  });
}

function money(value: number) {
  return new Intl.NumberFormat("en-PH", {
    style: "currency",
    currency: "PHP",
    maximumFractionDigits: 0,
  }).format(value || 0);
}

function sortedCalls(portal?: MemberPortalData) {
  return [...(portal?.upcoming ?? [])].sort(
    (a, b) => new Date(a.date).getTime() - new Date(b.date).getTime(),
  );
}

function callTime(call: PortalActivity, key: "date" | "endDate" = "date") {
  const value = key === "date" ? call.date : call.endDate;
  if (!value) return "—";
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? "—" : format(date, "h:mm a");
}

function actualCallTime(call: PortalActivity) {
  const opensAt = call.clockInWindow?.opensAt;
  if (!opensAt) return callTime(call);
  const value = new Date(opensAt);
  value.setMinutes(value.getMinutes() + 30);
  return Number.isNaN(value.getTime()) ? callTime(call) : format(value, "h:mm a");
}

/** "today at 1:19 PM" / "tomorrow at 1:19 PM" / "Wed, Sep 2 at 1:19 PM". */
function whenText(date: Date) {
  if (isToday(date)) return `today at ${format(date, "h:mm a")}`;
  if (isTomorrow(date)) return `tomorrow at ${format(date, "h:mm a")}`;
  return format(date, "EEE, MMM d 'at' h:mm a");
}

function clockText(call?: PortalActivity) {
  if (!call) return "No upcoming call";
  if (call.canClockOut) return "You are clocked in";
  if (call.clockInWindow?.isOpen && call.locationConfigured === false) return "Clock-in is disabled until an administrator sets the venue pin";
  if (call.clockInWindow?.isOpen || call.canClockIn) return "Clock-in window is open";
  if (call.clockInWindow?.isUpcoming) {
    // A bare time reads as "today" for a call that is days away, so name the day.
    return `Clock-in opens ${whenText(new Date(call.clockInWindow.opensAt))} — 30 minutes before call time.`;
  }
  if (call.clockInWindow?.isPast) return "The clock-in window for this call has closed.";
  return "Attendance is recorded on site";
}

// The API speaks YYYY-MM-DD. Parse and print it by its calendar parts so a
// timezone behind UTC can never slide the date onto the day before.
function parseBirthdate(value: string): Date | null {
  const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(value.trim());
  if (!match) return null;
  const date = new Date(Number(match[1]), Number(match[2]) - 1, Number(match[3]));
  return Number.isNaN(date.getTime()) ? null : date;
}

function toBirthdateValue(date: Date) {
  return format(date, "yyyy-MM-dd");
}

// Shown only as a hint while editing. The stored age is the backend's to derive.
function yearsSince(birthdate: Date) {
  const now = new Date();
  let years = now.getFullYear() - birthdate.getFullYear();
  const months = now.getMonth() - birthdate.getMonth();
  if (months < 0 || (months === 0 && now.getDate() < birthdate.getDate())) years -= 1;
  return years;
}

function attendanceLabel(activity: PortalActivity) {
  const recorded = activity.attendanceStatus;
  if (recorded && recorded !== "Pending") return recorded;
  if (activity.attended) return "Present";
  if (activity.clockInAt) return "Clocked in";
  if (new Date(activity.date).getTime() > Date.now()) {
    if (activity.confirmation === "Confirmed") return "Confirmed — clock in on the day";
    if (activity.confirmation === "Declined") return "You declined this call";
    return "Awaiting your RSVP";
  }
  return "Not recorded";
}

function initials(name: string) {
  return name.split(" ").filter(Boolean).slice(0, 2).map((part) => part[0]).join("").toUpperCase() || "M";
}

// One page shell for everything behind the login wall: a plain white page, an
// optional title block, then the body.
function Screen({ children, refresh, header }: { children: React.ReactNode; refresh?: () => Promise<unknown>; header?: React.ReactNode }) {
  const insets = useSafeAreaInsets();
  const [refreshing, setRefreshing] = useState(false);
  const onRefresh = async () => {
    if (!refresh) return;
    setRefreshing(true);
    try { await refresh(); } finally { setRefreshing(false); }
  };
  return (
    <View style={styles.screenRoot}>
      <ScrollView
        style={styles.screen}
        contentContainerStyle={[styles.screenContent, { paddingTop: insets.top + 12 }]}
        showsVerticalScrollIndicator={false}
        refreshControl={refresh ? <RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={BLUE} /> : undefined}
      >
        {header}
        {children}
      </ScrollView>
    </View>
  );
}

/** Page title block, matching the home greeting row. */
function PageHeader({ title, subtitle, onBack, right }: { title: string; subtitle?: string; onBack?: () => void; right?: React.ReactNode }) {
  return <View style={styles.pageHeader}>
    {onBack ? <TouchableOpacity accessibilityLabel="Back" style={styles.homeHeaderIcon} onPress={onBack}><Ionicons name="arrow-back" size={20} color={INK} /></TouchableOpacity> : null}
    <View style={styles.pageHeaderCopy}>
      <Text style={styles.pageHeaderTitle} numberOfLines={1}>{title}</Text>
      {subtitle ? <Text style={styles.pageHeaderSubtitle}>{subtitle}</Text> : null}
    </View>
    {right}
  </View>;
}

function PortalState({ query, children }: { query: ReturnType<typeof usePortal>; children: (portal: MemberPortalData) => React.ReactNode }) {
  if (query.isLoading) return <View style={styles.center}><ActivityIndicator color={BLUE} /><Text style={styles.stateText}>Loading your portal…</Text></View>;
  if (!query.data) return <View style={styles.center}><Ionicons name="cloud-offline-outline" size={28} color={BLUE} /><Text style={styles.stateTitle}>Portal unavailable</Text><Text style={styles.stateText}>{(query.error as { message?: string })?.message || "Pull down to try again."}</Text></View>;
  return <>{children(query.data)}</>;
}

export function PortalHomeScreen() {
  const navigation = useNavigation<any>();
  const queryClient = useQueryClient();
  const portalQuery = usePortal();
  const notifications = useQuery({ queryKey: ["notifications"], queryFn: () => getNotifications(50), retry: false });
  const refresh = () => Promise.all([
    queryClient.refetchQueries({ queryKey: ["member-portal"] }),
    queryClient.refetchQueries({ queryKey: ["notifications"] }),
  ]);

  return (
    <Screen refresh={refresh}>
      <PortalState query={portalQuery}>{(portal) => {
        const calls = sortedCalls(portal);
        const next = calls[0];
        const firstName = (portal.user.name || portal.member.name || "Member").split(" ")[0];
        const avatar = portal.user.image || portal.member.avatarUrl;
        return <>
          <View style={styles.homeControlRow}>
            <View style={styles.homeIntro}><Text style={styles.homeGreeting} numberOfLines={1}>{new Date().getHours() < 12 ? "Morning" : new Date().getHours() < 18 ? "Afternoon" : "Evening"}, {firstName}</Text><Text style={styles.homeDate}>{format(new Date(), "EEEE, MMMM d").toUpperCase()}</Text></View>
            <View style={styles.homeControlActions}>
              <TouchableOpacity style={styles.homeHeaderIcon} onPress={() => navigation.navigate("Inbox")}>
                <Ionicons name="notifications-outline" size={20} color={BLUE} />
                {(notifications.data?.unreadCount ?? 0) > 0 ? <View style={styles.unreadBadge}><Text style={styles.unreadBadgeText}>{(notifications.data?.unreadCount ?? 0) > 99 ? "99+" : notifications.data?.unreadCount}</Text></View> : null}
              </TouchableOpacity>
              <TouchableOpacity style={styles.homeAvatar} onPress={() => navigation.navigate("Profile")}>
                {avatar ? <Image source={{ uri: avatar }} style={styles.homeAvatarImage} /> : <Text style={styles.homeAvatarInitials}>{initials(portal.member.name)}</Text>}
              </TouchableOpacity>
            </View>
          </View>

          {next ? <View style={styles.homeHero}>
            <View style={styles.homeHeroTop}>
              <View style={styles.homeHeroTag}><View style={styles.liveDot} /><Text style={styles.homeHeroTagText}>NEXT CALL · {next.type.toUpperCase()}</Text></View>
              {next.payoutAmount > 0 ? <View style={styles.homeHeroPayoutWrap}><Text style={styles.homeHeroPayoutLabel}>YOUR PAYOUT</Text><Text style={styles.homeHeroPayout}>{money(next.payoutAmount)}</Text></View> : null}
            </View>
            <TouchableOpacity style={styles.homeHeroMain} activeOpacity={0.78} onPress={() => navigation.navigate("Schedule", { sourceType: next.type, sourceId: next.sourceId, focusNonce: Date.now() })}>
              <View style={styles.homeDateTile}><Text style={styles.homeDateMonth}>{format(new Date(next.date), "MMM").toUpperCase()}</Text><Text style={styles.homeDateNumber}>{format(new Date(next.date), "dd")}</Text></View>
              <View style={{ flex: 1 }}><Text style={styles.homeHeroTitle}>{next.title}</Text><Text style={styles.homeHeroMeta}><Ionicons name="location-outline" size={11} /> {next.venueName || "Venue to be announced"}</Text><Text style={styles.homeHeroRole}>{(next.role || "Member").toUpperCase()}</Text></View>
            </TouchableOpacity>
            <View style={styles.homeHeroSchedule}>
              <HomeHeroInfo label="CALL" value={actualCallTime(next)} />
              <HomeHeroInfo label="START" value={callTime(next)} bordered />
              <HomeHeroInfo label="END" value={callTime(next, "endDate")} bordered />
            </View>
          </View> : <View style={styles.homeEmptyHero}><Ionicons name="checkmark-circle-outline" size={30} color={GREEN} /><View style={{ flex: 1 }}><Text style={styles.homeEmptyTitle}>Your schedule is clear.</Text><Text style={styles.homeEmptyBody}>New calls will appear here when they’re published.</Text></View></View>}

          <View style={styles.homeQuickRow}>
            <HomeQuickAction icon="calendar-outline" label="Schedule" tint={DEEP} iconColor={PAPER} onPress={() => navigation.navigate("Schedule")} />
            <HomeQuickAction icon="time-outline" label="Clock In" tint={DEEP} iconColor={PAPER} onPress={() => navigation.navigate("Clock")} />
            <HomeQuickAction icon="wallet-outline" label="Earnings" tint={DEEP} iconColor={PAPER} onPress={() => navigation.navigate("Earnings")} />
            <HomeQuickAction icon="ribbon-outline" label="Scholarship" tint={DEEP} iconColor={PAPER} onPress={() => navigation.navigate("Member")} />
          </View>

          <View style={styles.homeSectionHeader}><Text style={styles.homeOverviewTitle}>Member Overview</Text></View>
          <HomeMemberOverview portal={portal} calls={calls} navigation={navigation} />

          <View style={styles.homeSectionHeader}><Text style={styles.homeOverviewTitle}>Recent Calls</Text><TouchableOpacity onPress={() => navigation.navigate("Schedule")}><Text style={styles.homeSeeAll}>See All</Text></TouchableOpacity></View>
          <View style={styles.homeRadar}>
            {calls.slice(1, 4).map((call) => <HomeRadarRow key={`${call.type}-${call.sourceId}`} call={call} onPress={() => navigation.navigate("Schedule", { sourceType: call.type, sourceId: call.sourceId, focusNonce: Date.now() })} />)}
            {calls.length <= 1 ? <Text style={styles.homeRadarEmpty}>Nothing else scheduled after your next call.</Text> : null}
          </View>
        </>;
      }}</PortalState>
    </Screen>
  );
}

function HomeHeroInfo({ label, value, bordered }: { label: string; value: string; bordered?: boolean }) {
  return <View style={[styles.homeHeroInfo, bordered && styles.homeHeroInfoBorder]}><Text style={styles.homeHeroMicro}>{label}</Text><Text style={styles.homeHeroInfoValue}>{value}</Text></View>;
}

function HomeMemberOverview({ portal, calls, navigation }: { portal: MemberPortalData; calls: PortalActivity[]; navigation: any }) {
  const attendance = Math.max(0, Math.min(100, portal.attendance.attendanceRate || 0));
  const radius = 22;
  const circumference = 2 * Math.PI * radius;
  const earned = Math.max(0, portal.earnings.total || 0);
  const pending = Math.max(0, portal.earnings.pending || 0);
  return <TouchableOpacity style={styles.homeOverviewCard} activeOpacity={0.76} onPress={() => navigation.navigate("Profile")}>
    <View style={styles.homeOverviewDonut}>
      <Svg width={112} height={112} viewBox="0 0 56 56">
        <Circle cx="28" cy="28" r={radius} fill="none" stroke="rgba(132,0,22,.12)" strokeWidth="7" />
        <Circle cx="28" cy="28" r={radius} fill="none" stroke={BLUE} strokeWidth="7" strokeLinecap="round" strokeDasharray={`${circumference} ${circumference}`} strokeDashoffset={circumference * (1 - attendance / 100)} transform="rotate(-90 28 28)" />
      </Svg>
      <View style={styles.homeOverviewDonutText}><Text style={styles.homeOverviewPercent}>{attendance}%</Text><Text style={styles.homeOverviewCaption}>ATTENDANCE</Text></View>
    </View>
    <View style={styles.homeOverviewLegend}>
      <OverviewLegend color={BLUE} label="Earned" value={money(earned)} />
      <OverviewLegend color={GOLD} label="Pending" value={money(pending)} />
      <OverviewLegend color="#D3AAB6" label="Upcoming" value={String(calls.length)} />
    </View>
  </TouchableOpacity>;
}

function OverviewLegend({ color, label, value }: { color: string; label: string; value: string }) {
  return <View style={styles.homeLegendRow}><View style={[styles.homeLegendDot, { backgroundColor: color }]} /><Text style={styles.homeLegendLabel}>{label}</Text><Text style={styles.homeLegendValue} numberOfLines={1} adjustsFontSizeToFit>{value}</Text></View>;
}

function HomeRadarRow({ call, onPress }: { call: PortalActivity; onPress: () => void }) {
  const color = call.type === "gig" ? BLUE : call.type === "rehearsal" ? GREEN : GOLD;
  return <TouchableOpacity style={styles.homeRadarRow} onPress={onPress} activeOpacity={0.72}>
    <View style={styles.homeRadarDate}><Text style={styles.homeRadarDay}>{format(new Date(call.date), "dd")}</Text><Text style={styles.homeRadarMonth}>{format(new Date(call.date), "MMM").toUpperCase()}</Text></View>
    <View style={[styles.homeRadarLine, { backgroundColor: color }]} />
    <View style={{ flex: 1 }}><Text style={styles.homeRadarTitle} numberOfLines={1}>{call.title}</Text><Text style={styles.homeRadarMeta}>{callTime(call)} · {(call.venueName || "TBA").toUpperCase()}</Text></View>
    <Ionicons name="chevron-forward" size={15} color={DIM} />
  </TouchableOpacity>;
}

function HomeQuickAction({ icon, label, onPress, tint, iconColor }: { icon: React.ComponentProps<typeof Ionicons>["name"]; label: string; onPress: () => void; tint: string; iconColor: string }) {
  return <TouchableOpacity style={styles.homeQuickAction} onPress={onPress} activeOpacity={0.72}>
    <View style={[styles.homeQuickIcon, { backgroundColor: tint }]}><Ionicons name={icon} size={21} color={iconColor} /></View>
    <Text style={styles.homeQuickLabel}>{label}</Text>
  </TouchableOpacity>;
}

type ScheduleView = "upcoming" | "calendar" | "history";
export function ScheduleScreen({ route }: { route?: { params?: { sourceType?: string; sourceId?: string; focusNonce?: number } } }) {
  const query = usePortal();
  const queryClient = useQueryClient();
  const [view, setView] = useState<ScheduleView>("upcoming");
  const preferences = useQuery({ queryKey: ["member-preferences"], queryFn: getPreferences, retry: false });
  const appliedDefault = React.useRef(false);
  const [selected, setSelected] = useState<PortalActivity | null>(null);
  const freshSelected = selected
    ? query.data?.upcoming.find((item) => item.type === selected.type && item.sourceId === selected.sourceId) ?? selected
    : null;
  React.useEffect(() => {
    const sourceType = route?.params?.sourceType;
    const sourceId = route?.params?.sourceId;
    if (!sourceType || !sourceId || !query.data) return;
    const match = query.data.upcoming.find((item) => item.type === sourceType && item.sourceId === sourceId);
    if (match) { setView("upcoming"); setSelected(match); }
  }, [route?.params?.sourceType, route?.params?.sourceId, route?.params?.focusNonce, query.data]);
  React.useEffect(() => {
    if (appliedDefault.current || !preferences.data) return;
    appliedDefault.current = true;
    setView(preferences.data.defaultAttendanceView === "past" ? "history" : preferences.data.defaultAttendanceView);
  }, [preferences.data]);

  const rsvp = useMutation({
    mutationFn: ({ activity, confirmation }: { activity: PortalActivity; confirmation: "Confirmed" | "Declined" }) =>
      rsvpActivity(activity.type, activity.sourceId, confirmation),
    onSuccess: async (_data, variables) => {
      await queryClient.invalidateQueries({ queryKey: ["member-portal"] });
      setSelected((current) => current ? { ...current, confirmation: variables.confirmation, isAssigned: true } : current);
      Toast.show({ type: "success", text1: variables.confirmation === "Confirmed" ? "RSVP confirmed" : "RSVP declined" });
    },
    onError: (error: { message?: string }) => Toast.show({ type: "error", text1: "RSVP failed", text2: error.message }),
  });
  const clockIn = useMutation({
    mutationFn: ({ activity, location }: { activity: PortalActivity; location: ClockLocationEvidence }) => clockInActivity(activity.type, activity.sourceId, location),
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: ["member-portal"] });
      Toast.show({ type: "success", text1: "You're clocked in" });
    },
    onError: (error: { message?: string }) => Toast.show({ type: "error", text1: "Clock-in unavailable", text2: error.message }),
  });
  const clockOut = useMutation({
    mutationFn: (activity: PortalActivity) => clockOutActivity(activity.type, activity.sourceId),
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: ["member-portal"] });
      Toast.show({ type: "success", text1: "Clock-out recorded" });
    },
    onError: (error: { message?: string }) => Toast.show({ type: "error", text1: "Clock-out unavailable", text2: error.message }),
  });

  return <Screen refresh={() => query.refetch()} header={<PageHeader title="Schedule" />}>
    <Segment items={[["upcoming", "UPCOMING"], ["calendar", "CALENDAR"], ["history", "HISTORY"]]} active={view} setActive={(value) => setView(value as ScheduleView)} />
    <PortalState query={query}>{(portal) => view === "history"
      ? <HistoryList portal={portal} />
      : view === "calendar"
        ? <CalendarView portal={portal} onSelect={setSelected} />
        : <UpcomingList portal={portal} onSelect={setSelected} />}</PortalState>
    <ActivityDetailModal
      activity={freshSelected}
      visible={Boolean(freshSelected)}
      busy={rsvp.isPending || clockIn.isPending || clockOut.isPending}
      onClose={() => setSelected(null)}
      onRsvp={(confirmation) => freshSelected && rsvp.mutate({ activity: freshSelected, confirmation })}
      onClockIn={(location) => freshSelected ? clockIn.mutateAsync({ activity: freshSelected, location }).then(() => undefined) : Promise.resolve()}
      onClockOut={() => freshSelected && clockOut.mutate(freshSelected)}
    />
  </Screen>;
}

function Segment({ items, active, setActive }: { items: [string, string][]; active: string; setActive: (value: string) => void }) {
  return <View style={styles.segment}>{items.map(([key, label]) => <TouchableOpacity key={key} style={[styles.segmentItem, active === key && styles.segmentActive]} onPress={() => setActive(key)}><Text style={[styles.segmentText, active === key && styles.segmentTextActive]}>{label}</Text></TouchableOpacity>)}</View>;
}

function UpcomingList({ portal, onSelect }: { portal: MemberPortalData; onSelect: (activity: PortalActivity) => void }) {
  const calls = sortedCalls(portal);
  if (!calls.length) return <Text style={styles.emptyText}>No upcoming calls.</Text>;
  return <View style={{ marginTop: 18 }}>
    <Text style={styles.sectionLabel}>UPCOMING CALLS</Text>
    {calls.map((call) => <ActivityRow key={`${call.type}-${call.sourceId}`} activity={call} onPress={() => onSelect(call)} />)}
  </View>;
}

const CALENDAR_WEEKDAYS = ["SUN", "MON", "TUE", "WED", "THU", "FRI", "SAT"];

function CalendarView({ portal, onSelect }: { portal: MemberPortalData; onSelect: (activity: PortalActivity) => void }) {
  const calls = sortedCalls(portal);
  const today = new Date();
  const [month, setMonth] = useState(() => startOfMonth(today));
  const [selectedDate, setSelectedDate] = useState(today);
  const days = eachDayOfInterval({
    start: startOfWeek(startOfMonth(month)),
    end: endOfWeek(endOfMonth(month)),
  });
  const selectedCalls = calls.filter((call) => isSameDay(new Date(call.date), selectedDate));

  const changeMonth = (offset: number) => {
    const nextMonth = addMonths(month, offset);
    setMonth(nextMonth);
    setSelectedDate(startOfMonth(nextMonth));
  };

  const selectDay = (day: Date) => {
    setSelectedDate(day);
    if (!isSameMonth(day, month)) setMonth(startOfMonth(day));
  };

  return <View style={styles.calendarWrap}>
    <View style={styles.calendarMonthHeader}>
      <TouchableOpacity accessibilityRole="button" accessibilityLabel="Previous month" style={styles.calendarNavButton} onPress={() => changeMonth(-1)}>
        <Ionicons name="chevron-back" size={18} color={INK} />
      </TouchableOpacity>
      <Text style={styles.calendarMonthTitle}>{format(month, "MMMM yyyy")}</Text>
      <TouchableOpacity accessibilityRole="button" accessibilityLabel="Next month" style={styles.calendarNavButton} onPress={() => changeMonth(1)}>
        <Ionicons name="chevron-forward" size={18} color={INK} />
      </TouchableOpacity>
    </View>
    <View style={styles.calendarWeekRow}>
      {CALENDAR_WEEKDAYS.map((day) => <Text key={day} style={styles.calendarWeekday}>{day}</Text>)}
    </View>
    <View style={styles.calendarGrid}>
      {days.map((day) => {
        const dayCalls = calls.filter((call) => isSameDay(new Date(call.date), day));
        const selected = isSameDay(day, selectedDate);
        const currentMonth = isSameMonth(day, month);
        return <TouchableOpacity
          key={day.toISOString()}
          accessibilityRole="button"
          accessibilityLabel={`${format(day, "MMMM d, yyyy")}${dayCalls.length ? `, ${dayCalls.length} scheduled` : ""}`}
          style={styles.calendarDay}
          onPress={() => selectDay(day)}
        >
          <View style={[styles.calendarDayNumberWrap, selected && styles.calendarDaySelected]}>
            <Text style={[styles.calendarDayNumber, !currentMonth && styles.calendarDayOutside, selected && styles.calendarDayNumberSelected]}>{format(day, "d")}</Text>
          </View>
          <View style={styles.calendarDots}>
            {dayCalls.slice(0, 3).map((call) => <View key={`${call.type}-${call.sourceId}`} style={[styles.calendarDot, { backgroundColor: call.type === "gig" ? BLUE : call.type === "rehearsal" ? GREEN : GOLD }]} />)}
          </View>
        </TouchableOpacity>;
      })}
    </View>
    <View style={styles.calendarAgenda}>
      <Text style={styles.sectionLabel}>{format(selectedDate, "EEEE, MMMM d").toUpperCase()}</Text>
      {selectedCalls.length
        ? selectedCalls.map((call) => <ActivityRow key={`${call.type}-${call.sourceId}`} activity={call} onPress={() => onSelect(call)} />)
        : <Text style={styles.calendarEmpty}>Nothing scheduled for this day.</Text>}
    </View>
  </View>;
}

function HistoryList({ portal }: { portal: MemberPortalData }) {
  return <View style={{ marginTop: 18 }}><Text style={styles.sectionLabel}>ATTENDANCE HISTORY</Text>{portal.attendance.history.map((item) => <View key={item.id} style={styles.historyRow}>
    <Text style={styles.historyDate}>{format(new Date(item.date), "MM.dd")}</Text>
    <View style={{ flex: 1 }}><Text style={styles.rowTitle}>{item.title}</Text><Text style={styles.rowMeta}>{item.sourceType.toUpperCase()} · {item.role.toUpperCase()}</Text></View>
    <Status label={item.attended ? "✓ PRESENT" : item.confirmation === "Declined" ? "✕ DECLINED" : "— ABSENT"} color={item.attended ? GREEN : RED} />
  </View>)}</View>;
}

function ActivityRow({ activity, onPress }: { activity: PortalActivity; onPress: () => void }) {
  const color = activity.type === "gig" ? BLUE : activity.type === "rehearsal" ? GREEN : "#D9A407";
  const confirmation = (activity.confirmation || "Pending").toUpperCase();
  const stateColor = confirmation === "CONFIRMED" ? GREEN : confirmation === "DECLINED" ? RED : GOLD;
  return <TouchableOpacity style={styles.activityRow} onPress={onPress} activeOpacity={0.72}>
    <View style={styles.dateTile}><Text style={styles.dateNumber}>{format(new Date(activity.date), "dd")}</Text><Text style={styles.dateMonth}>{format(new Date(activity.date), "MMM").toUpperCase()}</Text></View>
    <View style={[styles.activityMain, { borderLeftColor: color }]}><Text style={styles.rowTitle}>{activity.title}</Text><Text style={styles.rowMeta}>{activity.type.toUpperCase()} · {callTime(activity)} · {(activity.venueName || "TBA").toUpperCase()}</Text><Status label={confirmation === "PENDING" ? "RSVP NEEDED" : `✓ ${confirmation}`} color={stateColor} /></View>
    <Ionicons name="chevron-forward" size={15} color={DIM} />
  </TouchableOpacity>;
}

function ActivityDetailModal({
  activity,
  visible,
  busy,
  onClose,
  onRsvp,
  onClockIn,
  onClockOut,
}: {
  activity: PortalActivity | null;
  visible: boolean;
  busy: boolean;
  onClose: () => void;
  onRsvp: (confirmation: "Confirmed" | "Declined") => void;
  onClockIn: (location: ClockLocationEvidence) => Promise<void>;
  onClockOut: () => void;
}) {
  const [mapAction, setMapAction] = useState<"in" | "out" | null>(null);
  const insets = useSafeAreaInsets();
  if (!activity) return null;
  const confirmed = activity.confirmation === "Confirmed";
  const declined = activity.confirmation === "Declined";
  const canClockIn = activity.canClockIn ?? Boolean(activity.clockInWindow?.isOpen && !activity.clockInAt);
  const canClockOut = activity.canClockOut ?? Boolean(activity.requiresClockOut && activity.clockInAt && !activity.clockOutAt);
  return <Modal visible={visible} transparent animationType="slide" onRequestClose={onClose}>
    <View style={styles.modalBackdrop}>
      <View style={[styles.sheet, { paddingBottom: insets.bottom + 24 }]}>
        <View style={styles.sheetHandle} />
        <View style={styles.sheetHeader}><View style={{ flex: 1 }}><Text style={styles.eyebrow}>{activity.type.toUpperCase()}</Text><Text style={styles.sheetTitle}>{activity.title}</Text></View><TouchableOpacity style={styles.closeButton} onPress={onClose}><Ionicons name="close" size={20} color={INK} /></TouchableOpacity></View>
        <Text style={styles.sheetMeta}>{format(new Date(activity.date), "EEEE, MMMM d, yyyy")} · {callTime(activity)}</Text>
        <View style={styles.detailList}>
          <DetailItem icon="location-outline" label="VENUE" value={activity.venueName || "Venue to be announced"} />
          <DetailItem icon="musical-notes-outline" label="YOUR PART" value={activity.role || "Member"} />
          <DetailItem icon="cash-outline" label="PAYOUT" value={activity.payoutAmount ? money(activity.payoutAmount) : "None"} />
          <DetailItem icon="checkmark-circle-outline" label="ATTENDANCE" value={attendanceLabel(activity)} />
        </View>
        <Text style={styles.sectionLabel}>RSVP — SEPARATE FROM ATTENDANCE</Text>
        <View style={styles.actionRow}>
          <TouchableOpacity disabled={busy} style={[styles.actionButton, confirmed && styles.actionButtonSuccess]} onPress={() => onRsvp("Confirmed")}><Text style={[styles.actionButtonText, confirmed && styles.actionButtonTextLight]}>{confirmed ? "✓ CONFIRMED" : "CONFIRM"}</Text></TouchableOpacity>
          <TouchableOpacity disabled={busy} style={[styles.actionButton, declined && styles.actionButtonDanger]} onPress={() => onRsvp("Declined")}><Text style={[styles.actionButtonText, declined && styles.actionButtonTextLight]}>{declined ? "✕ DECLINED" : "DECLINE"}</Text></TouchableOpacity>
        </View>
        <Text style={styles.sectionLabel}>ATTENDANCE</Text>
        {canClockOut
          ? <TouchableOpacity disabled={busy} style={styles.primaryAction} onPress={() => setMapAction("out")}><Text style={styles.primaryActionText}>{busy ? "PLEASE WAIT…" : "CLOCK OUT"}</Text></TouchableOpacity>
          : <TouchableOpacity
              disabled={busy || !canClockIn}
              accessibilityState={{ disabled: !canClockIn }}
              style={[styles.primaryAction, !canClockIn && styles.primaryActionDisabled]}
              onPress={() => setMapAction("in")}
            >
              <Text style={[styles.primaryActionText, !canClockIn && styles.primaryActionTextDisabled]}>{busy ? "PLEASE WAIT…" : "CLOCK IN"}</Text>
            </TouchableOpacity>}
        {canClockOut || canClockIn ? null : <Text style={styles.sheetInfo}>{clockText(activity)}</Text>}
        <AttendanceMapModal visible={mapAction !== null} action={mapAction || "in"} venueName={activity.venueName}
          venueAddress={activity.venueAddress} venueLatitude={activity.venueLatitude} venueLongitude={activity.venueLongitude}
          geofenceRadiusMeters={activity.geofenceRadiusMeters} busy={busy} onClose={() => setMapAction(null)}
          onConfirm={(location) => mapAction === "out" ? Promise.resolve(onClockOut()) : location ? onClockIn(location) : Promise.reject(new Error("GPS location required"))} />
      </View>
    </View>
  </Modal>;
}

function DetailItem({ icon, label, value }: { icon: React.ComponentProps<typeof Ionicons>["name"]; label: string; value: string }) {
  return <View style={styles.detailItem}><Ionicons name={icon} size={18} color={BLUE} /><View style={{ flex: 1 }}><Text style={styles.eyebrow}>{label}</Text><Text style={styles.detailValue}>{value}</Text></View></View>;
}

function Status({ label, color }: { label: string; color: string }) {
  return <Text style={[styles.status, { color, borderColor: color }]}>{label}</Text>;
}

export function ClockScreen() {
  const query = usePortal();
  const queryClient = useQueryClient();
  const call = sortedCalls(query.data).find((item) => item.canClockOut || item.clockInWindow?.isOpen || item.canClockIn) ?? sortedCalls(query.data)[0];
  const [busy, setBusy] = useState(false);
  const [mapOpen, setMapOpen] = useState(false);
  const act = async (location?: ClockLocationEvidence) => {
    if (!call) return;
    setBusy(true);
    try {
      const wasClockOut = Boolean(call.canClockOut);
      if (wasClockOut) await clockOutActivity(call.type, call.sourceId);
      else {
        if (!location) throw new Error("A current GPS location is required");
        await clockInActivity(call.type, call.sourceId, location);
      }
      await queryClient.invalidateQueries({ queryKey: ["member-portal"] });
      Toast.show({ type: "success", text1: wasClockOut ? "Clock-out recorded" : "You're clocked in" });
    } catch (error) {
      Toast.show({ type: "error", text1: call.canClockOut ? "Clock-out unavailable" : "Clock-in unavailable", text2: (error as { message?: string })?.message });
    } finally { setBusy(false); }
  };
  return <Screen refresh={() => query.refetch()} header={<PageHeader title="Clock In" subtitle={call?.canClockOut ? "ON SITE" : "ATTENDANCE"} />}>
    <PortalState query={query}>{() => call ? <View style={styles.clockPage}>
      <Text style={styles.clockCall}>{call.title}</Text><Text style={styles.heroMeta}>{call.venueName || "Venue to be announced"}</Text>
      <View style={styles.clockFace}><Ionicons name="time-outline" size={60} color={BLUE} /><Text style={styles.clockFaceLabel}>{call.canClockOut ? "CLOCKED IN" : call.clockInWindow?.isOpen && call.locationConfigured === false ? "VENUE PIN NEEDED" : call.clockInWindow?.isOpen || call.canClockIn ? "WINDOW OPEN" : "NEXT WINDOW"}</Text><Text style={styles.clockFaceTime}>{call.canClockOut ? callTime(call) : call.clockInWindow?.opensAt ? format(new Date(call.clockInWindow.opensAt), "h:mm a") : callTime(call)}</Text></View>
      <View style={styles.locationCard}><Ionicons name="location-outline" size={20} color={GREEN} /><View><Text style={styles.rowTitle}>{call.venueName || "Venue to be announced"}</Text><Text style={styles.rowMeta}>{call.venueAddress || "Location is verified when you clock in"}</Text></View></View>
      <TouchableOpacity disabled={busy || (!call.canClockOut && !call.canClockIn)} onPress={() => call.canClockOut ? void act() : setMapOpen(true)} style={[styles.clockButton, (!call.canClockOut && !call.canClockIn) && styles.disabled]}><Ionicons name={call.canClockOut ? "stop-circle-outline" : "time-outline"} size={22} color="#fff" /><Text style={styles.clockButtonText}>{busy ? "PLEASE WAIT" : call.canClockOut ? "CLOCK OUT" : "CLOCK IN"}</Text></TouchableOpacity>
      <Text style={styles.clockNote}>ONE TAP · ATTENDANCE IS VERIFIED ON SITE</Text>
      {!call.canClockIn && call.clockInWindow?.isOpen ? <Text style={styles.sheetInfo}>{clockText(call)}</Text> : null}
      <AttendanceMapModal visible={mapOpen} action="in" venueName={call.venueName} venueAddress={call.venueAddress}
        venueLatitude={call.venueLatitude} venueLongitude={call.venueLongitude} geofenceRadiusMeters={call.geofenceRadiusMeters}
        busy={busy} onClose={() => setMapOpen(false)} onConfirm={(location) => act(location)} />
    </View> : <Text style={styles.emptyText}>No call is available for clock-in.</Text>}</PortalState>
  </Screen>;
}

type EarningsView = "gigs" | "stipends";

/** Both halves of a member's money live here, one tab each — no drill-down. */
export function EarningsScreen({ route }: { route?: { params?: { view?: EarningsView; focusNonce?: number } } }) {
  const portal = usePortal();
  const queryClient = useQueryClient();
  const [view, setView] = useState<EarningsView>("gigs");
  const [selectedStipend, setSelectedStipend] = useState<StipendDisbursementDTO | null>(null);
  const stipends = useQuery({ queryKey: ["my-stipends"], queryFn: getMyStipends, retry: false });
  React.useEffect(() => {
    if (route?.params?.view) setView(route.params.view);
  }, [route?.params?.view, route?.params?.focusNonce]);
  const acknowledge = useMutation({
    mutationFn: ({ id, signature, note }: { id: string; signature: string; note?: string }) => acknowledgeStipend(id, signature, note),
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: ["my-stipends"] });
      setSelectedStipend(null);
      Toast.show({ type: "success", text1: "Receipt acknowledged", text2: "Your signed acknowledgement was saved." });
    },
    onError: (error: { message?: string }) => Toast.show({ type: "error", text1: "Acknowledgement failed", text2: error.message }),
  });
  const disbursements = stipends.data?.disbursements ?? [];
  return <Screen refresh={() => Promise.all([portal.refetch(), stipends.refetch()])} header={<PageHeader title="Earnings" />}>
    <Segment items={[["gigs", "GIG PAYOUTS"], ["stipends", "STIPENDS"]]} active={view} setActive={(value) => setView(value as EarningsView)} />
    {view === "gigs"
      ? <PortalState query={portal}>{(data) => <>
          <View style={styles.earningsSummary}>
            <View><Text style={styles.eyebrow}>EARNED {data.earnings.year}</Text><Text style={styles.earningsTotal}>{money(data.earnings.total)}</Text></View>
            <View style={{ alignItems: "flex-end" }}><Text style={styles.eyebrow}>PENDING</Text><Text style={styles.pendingTotal}>{money(data.earnings.pending)}</Text></View>
          </View>
          {data.earnings.gigs.length
            ? data.earnings.gigs.map((gig) => <PayoutRow key={gig.id} gig={gig} />)
            : <Text style={styles.emptyText}>No gig payouts yet.</Text>}
        </>}</PortalState>
      : <>
          <View style={styles.earningsSummary}>
            <View><Text style={styles.eyebrow}>TOTAL RECEIVED</Text><Text style={styles.earningsTotal}>{money(stipends.data?.totalReceived ?? 0)}</Text></View>
          </View>
          {stipends.isLoading
            ? <ActivityIndicator color={BLUE} />
            : disbursements.length
              ? disbursements.map((item) => <StipendRow key={item._id} item={item} onPress={() => setSelectedStipend(item)} />)
              : <Text style={styles.emptyText}>No stipend records.</Text>}
        </>}
    <StipendModal item={selectedStipend} acknowledgementRequired={stipends.data?.acknowledgementRequired ?? true} visible={Boolean(selectedStipend)} busy={acknowledge.isPending} onClose={() => setSelectedStipend(null)} onAcknowledge={(signature, note) => selectedStipend && acknowledge.mutate({ id: selectedStipend._id, signature, note })} />
  </Screen>;
}

function StipendRow({ item, onPress }: { item: StipendDisbursementDTO; onPress: () => void }) {
  const settled = item.status === "acknowledged" || item.status === "disbursed";
  return <TouchableOpacity style={styles.activityRow} activeOpacity={0.72} onPress={onPress}>
    <View style={styles.dateTile}><Text style={styles.dateNumber}>{format(new Date(item.scheduledDate), "dd")}</Text><Text style={styles.dateMonth}>{format(new Date(item.scheduledDate), "MMM").toUpperCase()}</Text></View>
    <View style={{ flex: 1 }}>
      <Text style={styles.rowTitle}>{format(new Date(item.scheduledDate), "MMMM")} stipend — {money(item.amount)}</Text>
      <Text style={styles.rowMeta}>{item.status.replace("_", " ").toUpperCase()} · {(item.method || "TBA").replace("_", " ").toUpperCase()}</Text>
    </View>
    <Status label={item.status === "acknowledged" ? "✓ SIGNED" : item.status.replace("_", " ").toUpperCase()} color={settled ? GREEN : item.status === "on_hold" ? RED : GOLD} />
    <Ionicons name="chevron-forward" size={15} color={DIM} />
  </TouchableOpacity>;
}

function StipendModal({ item, acknowledgementRequired, visible, busy, onClose, onAcknowledge }: { item: StipendDisbursementDTO | null; acknowledgementRequired: boolean; visible: boolean; busy: boolean; onClose: () => void; onAcknowledge: (signature: string, note?: string) => void }) {
  const insets = useSafeAreaInsets();
  const [signature, setSignature] = useState("");
  const [note, setNote] = useState("");
  React.useEffect(() => { if (visible) { setSignature(""); setNote(""); } }, [visible, item?._id]);
  if (!item) return null;
  const canAcknowledge = item.status === "disbursed" && acknowledgementRequired;
  return <Modal visible={visible} transparent animationType="slide" onRequestClose={onClose}>
    <KeyboardAvoidingView style={styles.modalBackdrop} behavior={Platform.OS === "ios" ? "padding" : undefined}>
      <View style={[styles.sheet, { paddingBottom: Math.max(insets.bottom, 12) + 18 }]}>
        <View style={styles.sheetHandle} />
        <View style={styles.sheetHeader}><View><Text style={styles.eyebrow}>{["disbursed", "acknowledged"].includes(item.status) ? "OFFICIAL RECEIPT" : "STIPEND RELEASE"}</Text><Text style={styles.sheetTitle}>{format(new Date(item.scheduledDate), "MMMM yyyy")} stipend</Text></View><TouchableOpacity style={styles.closeButton} onPress={onClose}><Ionicons name="close" size={20} color={INK} /></TouchableOpacity></View>
        <Text style={styles.receiptAmount}>{money(item.amount)}</Text>
        <View style={styles.detailList}><DetailItem icon="card-outline" label="STATUS" value={item.status.replace("_", " ").toUpperCase()} /><DetailItem icon="wallet-outline" label="METHOD" value={(item.method || "Not specified").replace("_", " ")} /><DetailItem icon="document-text-outline" label="REFERENCE" value={item.referenceNumber || "—"} /></View>
        {item.releaseReasons?.length ? <View style={styles.detailList}><Text style={styles.fieldLabel}>WHY THIS RELEASE IS ON HOLD</Text>{item.releaseReasons.map((reason) => <Text key={reason} style={styles.sheetInfo}>• {reason}</Text>)}</View> : null}
        {canAcknowledge ? <>
          <Text style={styles.fieldLabel}>TYPE YOUR FULL NAME AS YOUR SIGNATURE</Text>
          <TextInput value={signature} onChangeText={setSignature} style={styles.textField} placeholder="Your full name" placeholderTextColor={DIM} autoCapitalize="words" />
          <Text style={styles.fieldLabel}>NOTE (OPTIONAL)</Text>
          <TextInput value={note} onChangeText={setNote} style={[styles.textField, styles.noteField]} placeholder="Add a note" placeholderTextColor={DIM} multiline />
          <TouchableOpacity disabled={busy || !signature.trim()} style={[styles.primaryAction, (!signature.trim() || busy) && styles.disabled]} onPress={() => onAcknowledge(signature.trim(), note.trim() || undefined)}><Text style={styles.primaryActionText}>{busy ? "SUBMITTING…" : "SIGN & ACKNOWLEDGE"}</Text></TouchableOpacity>
        </> : <Text style={styles.sheetInfo}>{item.status === "acknowledged" ? `Signed by ${item.acknowledgementSignature || "member"}` : item.status === "disbursed" && !acknowledgementRequired ? "No member acknowledgement is required by the active policy." : "This stipend is not ready for acknowledgement."}</Text>}
      </View>
    </KeyboardAvoidingView>
  </Modal>;
}

function PayoutRow({ gig }: { gig: PortalActivity }) {
  const pending = !gig.attended || gig.status.toLowerCase().includes("pending");
  return <View style={styles.activityRow}><View style={styles.dateTile}><Text style={styles.dateNumber}>{format(new Date(gig.date), "dd")}</Text><Text style={styles.dateMonth}>{format(new Date(gig.date), "MMM").toUpperCase()}</Text></View><View style={{ flex: 1 }}><Text style={styles.rowTitle}>{gig.title}</Text><Text style={[styles.rowMeta, { color: pending ? GOLD : GREEN }]}>{pending ? "Pending attendance verification" : "Paid"}</Text></View><Text style={[styles.payoutAmount, { color: pending ? GOLD : GREEN }]}>{pending ? "" : "+ "}{money(gig.payoutAmount)}</Text></View>;
}

export function ProfileScreen() {
  const query = usePortal();
  const queryClient = useQueryClient();
  const { logout } = useAuth();
  const [editing, setEditing] = useState(false);
  const portal = query.data;
  const [form, setForm] = useState<ProfileForm>({ name: "", phone: "", voicePart: "", birthdate: "" });
  React.useEffect(() => {
    if (!portal) return;
    setForm({
      name: portal.user.name || portal.member.name,
      phone: portal.member.phone || "",
      voicePart: portal.member.voicePart || "",
      birthdate: portal.user.birthdate || "",
    });
  }, [portal?.user.name, portal?.member.name, portal?.member.phone, portal?.member.voicePart, portal?.user.birthdate]);

  const saveProfile = useMutation({
    mutationFn: () => updateProfile({
      name: form.name.trim(),
      phone: form.phone.trim(),
      voicePart: form.voicePart.trim(),
      // Age is omitted on purpose: the backend derives it from the birthdate.
      birthdate: form.birthdate.trim(),
    }),
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: ["member-portal"] });
      await queryClient.invalidateQueries({ queryKey: ["profile"] });
      setEditing(false);
      Toast.show({ type: "success", text1: "Profile updated" });
    },
    onError: (error: { message?: string }) => Toast.show({ type: "error", text1: "Update failed", text2: error.message }),
  });
  const uploadAvatar = useMutation({
    mutationFn: uploadProfileAvatar,
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: ["member-portal"] });
      Toast.show({ type: "success", text1: "Profile photo updated" });
    },
    onError: (error: { message?: string }) => Toast.show({ type: "error", text1: "Upload failed", text2: error.message }),
  });
  const removeAvatar = useMutation({
    mutationFn: deleteProfileAvatar,
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: ["member-portal"] });
      Toast.show({ type: "success", text1: "Profile photo removed" });
    },
    onError: (error: { message?: string }) => Toast.show({ type: "error", text1: "Remove failed", text2: error.message }),
  });
  const preferences = useQuery({ queryKey: ["member-preferences"], queryFn: getPreferences, initialData: DEFAULT_MEMBER_SETTINGS });
  const updatePreference = useMutation({
    mutationFn: updatePreferencesRemote,
    onMutate: async (patch) => {
      await queryClient.cancelQueries({ queryKey: ["member-preferences"] });
      const previous = queryClient.getQueryData<MemberSettingsPreferences>(["member-preferences"]) ?? DEFAULT_MEMBER_SETTINGS;
      queryClient.setQueryData<MemberSettingsPreferences>(["member-preferences"], { ...previous, ...patch });
      return { previous };
    },
    onSuccess: (data) => {
      queryClient.setQueryData(["member-preferences"], data);
      Toast.show({ type: "success", text1: "Preference saved" });
    },
    onError: (error: { message?: string }, _patch, context) => {
      if (context?.previous) queryClient.setQueryData(["member-preferences"], context.previous);
      Toast.show({ type: "error", text1: "Could not save preference", text2: error.message });
    },
  });
  const resetPassword = useMutation({
    mutationFn: () => forgotPassword(query.data?.user.email || ""),
    onSuccess: () => Toast.show({ type: "success", text1: "Password reset link sent", text2: query.data?.user.email }),
    onError: (error: { message?: string }) => Toast.show({ type: "error", text1: "Could not send reset link", text2: error.message }),
  });
  const preferenceValues = preferences.data ?? DEFAULT_MEMBER_SETTINGS;
  const setBooleanPreference = (key: keyof Pick<MemberSettingsPreferences, "rsvpReminders" | "scheduleReminders" | "payoutUpdates" | "membershipReminders" | "profilePhotoVisible">) => updatePreference.mutate({ [key]: !preferenceValues[key] });
  const nextScheduleView = preferenceValues.defaultAttendanceView === "upcoming" ? "calendar" : preferenceValues.defaultAttendanceView === "calendar" ? "past" : "upcoming";

  const chooseAvatar = async () => {
    const permission = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (!permission.granted) {
      Toast.show({ type: "error", text1: "Photo access needed" });
      return;
    }
    const result = await ImagePicker.launchImageLibraryAsync({ mediaTypes: ["images"], allowsEditing: true, aspect: [1, 1], quality: 0.85 });
    if (result.canceled || !result.assets[0]?.uri) return;
    const asset = result.assets[0];
    const mimeType = asset.mimeType || (asset.uri.toLowerCase().endsWith(".png") ? "image/png" : "image/jpeg");
    if (asset.fileSize && asset.fileSize > 5 * 1024 * 1024) {
      Toast.show({ type: "error", text1: "Photo too large", text2: "Choose an image under 5 MB." });
      return;
    }
    uploadAvatar.mutate({ uri: asset.uri, fileName: asset.fileName || `profile.${mimeType === "image/png" ? "png" : "jpg"}`, mimeType });
  };
  const avatarPress = () => {
    if (!portal) return;
    const avatar = portal.member.avatarUrl || portal.user.image;
    if (!avatar) { void chooseAvatar(); return; }
    Alert.alert("Profile photo", undefined, [
      { text: "Change photo", onPress: () => void chooseAvatar() },
      { text: "Remove photo", style: "destructive", onPress: () => removeAvatar.mutate() },
      { text: "Cancel", style: "cancel" },
    ]);
  };

  return <Screen refresh={() => Promise.all([query.refetch(), preferences.refetch()])} header={<PageHeader title="Account" subtitle="PROFILE & PREFERENCES" right={<View style={styles.homeHeaderIcon}><Ionicons name="person-outline" size={20} color={BLUE} /></View>} />}><PortalState query={query}>{(portal) => <>
    <LinearGradient colors={["#840016", "#3F3230", "#301728"]} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} style={styles.accountIdentityCard}>
      <TouchableOpacity style={styles.profileAvatar} onPress={avatarPress} disabled={uploadAvatar.isPending || removeAvatar.isPending}>{portal.member.avatarUrl || portal.user.image ? <Image source={{ uri: portal.member.avatarUrl || portal.user.image }} style={styles.profileAvatarImage} /> : <Text style={styles.profileInitials}>{initials(portal.member.name)}</Text>}<View style={styles.cameraBadge}><Ionicons name="camera" size={12} color={INK} /></View></TouchableOpacity>
      <View style={styles.accountIdentityCopy}><Text style={styles.profileName}>{portal.member.name}</Text><Text style={styles.profileMeta}>{portal.member.section} · {portal.member.voicePart || portal.member.rank}</Text><Text style={styles.profileMeta}>Member since {format(new Date(portal.member.joinDate), "yyyy")}</Text></View>
      <TouchableOpacity accessibilityLabel="Edit profile" style={styles.accountEditButton} onPress={() => setEditing(true)}><Ionicons name="create-outline" size={17} color="#fff" /></TouchableOpacity>
    </LinearGradient>
    <View style={styles.profileStats}><ProfileStat value={String(portal.attendance.overallAttended)} label="CALLS\nATTENDED" /><ProfileStat value={`${Math.round(portal.attendance.attendanceRate)}%`} label="ATTENDANCE\nRATE" color={GREEN} /><ProfileStat value={String(portal.attendance.reliability?.lateCount ?? 0)} label="TIMES\nLATE" color={GOLD} /></View>

    <Text style={styles.accountSectionTitle}>Personal details</Text>
    <View style={styles.accountGroup}>
      <ProfileRow icon="mail-outline" label="Email" value={portal.member.email || portal.user.email} />
      <ProfileRow icon="call-outline" label="Phone" value={portal.member.phone || "Not provided"} onPress={() => setEditing(true)} />
      <ProfileRow icon="musical-notes-outline" label="Part" value={portal.member.voicePart || "Not provided"} onPress={() => setEditing(true)} />
      <ProfileRow icon="people-outline" label="Section & rank" value={`${portal.member.section} · ${portal.member.rank}`} />
    </View>

    <Text style={styles.accountSectionTitle}>Notifications</Text>
    <View style={styles.accountGroup}>
      <PreferenceToggle icon="checkmark-circle-outline" label="RSVP reminders" value={preferenceValues.rsvpReminders} onPress={() => setBooleanPreference("rsvpReminders")} />
      <PreferenceToggle icon="calendar-outline" label="Schedule reminders" value={preferenceValues.scheduleReminders} onPress={() => setBooleanPreference("scheduleReminders")} />
      <PreferenceToggle icon="wallet-outline" label="Payouts & stipends" value={preferenceValues.payoutUpdates} onPress={() => setBooleanPreference("payoutUpdates")} />
      <PreferenceToggle icon="ribbon-outline" label="Membership reminders" value={preferenceValues.membershipReminders} onPress={() => setBooleanPreference("membershipReminders")} />
    </View>

    <Text style={styles.accountSectionTitle}>App preferences</Text>
    <View style={styles.accountGroup}>
      <PreferenceToggle icon="image-outline" label="Show my profile photo" value={preferenceValues.profilePhotoVisible} onPress={() => setBooleanPreference("profilePhotoVisible")} />
      <TouchableOpacity style={styles.settingRow} onPress={() => updatePreference.mutate({ defaultAttendanceView: nextScheduleView })}><View style={styles.settingMain}><View style={styles.accountRowIcon}><Ionicons name="albums-outline" size={17} color="#840016" /></View><Text style={styles.settingLabel}>Default schedule view</Text></View><View style={styles.accountValuePill}><Text style={styles.settingValue}>{preferenceValues.defaultAttendanceView.toUpperCase()}</Text><Ionicons name="chevron-forward" size={13} color="#840016" /></View></TouchableOpacity>
    </View>

    <Text style={styles.accountSectionTitle}>Security</Text>
    <View style={styles.accountGroup}>
      <TouchableOpacity style={styles.settingRow} disabled={resetPassword.isPending || !portal.user.email} onPress={() => resetPassword.mutate()}><View style={styles.settingMain}><View style={styles.accountRowIcon}><Ionicons name="key-outline" size={17} color="#840016" /></View><Text style={styles.settingLabel}>{resetPassword.isPending ? "Sending reset link…" : "Send password reset link"}</Text></View><Ionicons name="mail-outline" size={17} color="#840016" /></TouchableOpacity>
      <TouchableOpacity style={[styles.settingRow, styles.accountLastRow]} onPress={logout}><View style={styles.settingMain}><View style={[styles.accountRowIcon, styles.accountDangerIcon]}><Ionicons name="log-out-outline" size={17} color={RED} /></View><Text style={[styles.settingLabel, { color: RED }]}>Log out</Text></View><Ionicons name="chevron-forward" size={15} color={RED} /></TouchableOpacity>
    </View>
    <ProfileEditModal visible={editing} form={form} busy={saveProfile.isPending} setForm={setForm} onClose={() => setEditing(false)} onSave={() => saveProfile.mutate()} />
  </>}</PortalState></Screen>;
}

function ProfileStat({ value, label, color = INK }: { value: string; label: string; color?: string }) { return <View style={styles.profileStat}><Text style={[styles.profileStatValue, { color }]}>{value}</Text><Text style={styles.profileStatLabel}>{label}</Text></View>; }
function ProfileRow({ icon, label, value, onPress }: { icon: React.ComponentProps<typeof Ionicons>["name"]; label: string; value: string; onPress?: () => void }) { const Wrapper = onPress ? TouchableOpacity : View; return <Wrapper style={styles.profileRow} {...(onPress ? { onPress, activeOpacity: 0.72 } : {})}><View style={styles.accountRowIcon}><Ionicons name={icon} size={17} color="#840016" /></View><View style={styles.profileRowCopy}><Text style={styles.profileRowLabel}>{label}</Text><Text style={styles.profileRowValue} numberOfLines={1}>{value}</Text></View>{onPress ? <Ionicons name="chevron-forward" size={15} color={DIM} /> : null}</Wrapper>; }

type ProfileForm = { name: string; phone: string; voicePart: string; birthdate: string };
function ProfileEditModal({ visible, form, busy, setForm, onClose, onSave }: { visible: boolean; form: ProfileForm; busy: boolean; setForm: React.Dispatch<React.SetStateAction<ProfileForm>>; onClose: () => void; onSave: () => void }) {
  const insets = useSafeAreaInsets();
  const update = (key: keyof ProfileForm, value: string) => setForm((current) => ({ ...current, [key]: value }));
  return <Modal visible={visible} transparent animationType="slide" onRequestClose={onClose}>
    <KeyboardAvoidingView style={styles.modalBackdrop} behavior={Platform.OS === "ios" ? "padding" : undefined}>
      <View style={styles.profileEditSheet}>
        <View style={styles.sheetHandle} />
        <View style={styles.profileEditHeader}><View style={styles.profileEditHeaderIcon}><Ionicons name="person-outline" size={21} color="#840016" /></View><View style={styles.profileEditHeaderCopy}><Text style={styles.profileEditTitle}>Edit profile</Text><Text style={styles.profileEditSubtitle}>Keep your member details up to date.</Text></View><TouchableOpacity accessibilityLabel="Close profile editor" style={styles.closeButton} onPress={onClose}><Ionicons name="close" size={20} color={INK} /></TouchableOpacity></View>
        <ScrollView style={styles.profileEditScroll} contentContainerStyle={styles.profileEditContent} showsVerticalScrollIndicator={false} keyboardShouldPersistTaps="handled">
          <FormField icon="person-outline" label="Full name" value={form.name} onChangeText={(value) => update("name", value)} placeholder="Full name" />
          <FormField icon="call-outline" label="Phone" value={form.phone} onChangeText={(value) => update("phone", value)} placeholder="Phone number" keyboardType="phone-pad" />
          <FormField icon="musical-notes-outline" label="Voice part / instrument" value={form.voicePart} onChangeText={(value) => update("voicePart", value)} placeholder="e.g. Alto 1 or Violin" />
          <BirthdateField value={form.birthdate} onChange={(value) => update("birthdate", value)} />
        </ScrollView>
        <View style={[styles.profileEditFooter, { paddingBottom: Math.max(insets.bottom, 12) + 16 }]}><TouchableOpacity disabled={busy || !form.name.trim()} style={[styles.profileSaveButton, (busy || !form.name.trim()) && styles.disabled]} onPress={onSave}><LinearGradient colors={["#840016", "#301728"]} start={{ x: 0, y: 0 }} end={{ x: 1, y: 0 }} style={styles.profileSaveGradient}><Ionicons name="checkmark" size={18} color="#fff" /><Text style={styles.profileSaveText}>{busy ? "Saving…" : "Save changes"}</Text></LinearGradient></TouchableOpacity></View>
      </View>
    </KeyboardAvoidingView>
  </Modal>;
}

const OLDEST_BIRTHDATE = subYears(new Date(), 120);

/** Birthdate is picked from a calendar; the age beneath it is the backend's derivation, shown back. */
function BirthdateField({ value, onChange }: { value: string; onChange: (value: string) => void }) {
  const [open, setOpen] = useState(false);
  const selected = parseBirthdate(value);
  const picked = (event: DateTimePickerEvent, date?: Date) => {
    if (Platform.OS !== "ios") setOpen(false);
    if (event.type === "set" && date) onChange(toBirthdateValue(date));
  };
  const picker = <DateTimePicker
    value={selected ?? subYears(new Date(), 20)}
    mode="date"
    display={Platform.OS === "ios" ? "spinner" : "default"}
    maximumDate={new Date()}
    minimumDate={OLDEST_BIRTHDATE}
    onChange={picked}
  />;
  return <View style={styles.profileFormField}>
    <Text style={styles.profileFieldLabel}>Birthdate</Text>
    <TouchableOpacity style={styles.profileInputWrap} activeOpacity={0.72} onPress={() => setOpen(true)}>
      <View style={styles.profileInputIcon}><Ionicons name="calendar-outline" size={17} color="#840016" /></View>
      <Text style={[styles.profileTextInput, !selected && styles.profileInputEmpty]}>{selected ? format(selected, "MMMM d, yyyy") : "Select your birthdate"}</Text>
      {selected
        ? <TouchableOpacity accessibilityLabel="Clear birthdate" hitSlop={10} onPress={() => onChange("")}><Ionicons name="close-circle" size={19} color={DIM} /></TouchableOpacity>
        : <Ionicons name="chevron-forward" size={16} color={DIM} />}
    </TouchableOpacity>
    <Text style={styles.profileFieldHint}>{selected ? `Age ${yearsSince(selected)} — worked out from this date.` : "Your age is worked out from this date."}</Text>
    {open ? (Platform.OS === "ios"
      ? <Modal transparent animationType="fade" visible onRequestClose={() => setOpen(false)}>
          <View style={styles.datePickerBackdrop}>
            <View style={styles.datePickerCard}>
              {picker}
              <TouchableOpacity style={styles.datePickerDone} onPress={() => setOpen(false)}><Text style={styles.datePickerDoneText}>DONE</Text></TouchableOpacity>
            </View>
          </View>
        </Modal>
      : picker) : null}
  </View>;
}

function FormField({ icon, label, value, onChangeText, placeholder, keyboardType }: { icon: React.ComponentProps<typeof Ionicons>["name"]; label: string; value: string; onChangeText: (value: string) => void; placeholder: string; keyboardType?: import("react-native").KeyboardTypeOptions }) {
  return <View style={styles.profileFormField}><Text style={styles.profileFieldLabel}>{label}</Text><View style={styles.profileInputWrap}><View style={styles.profileInputIcon}><Ionicons name={icon} size={17} color="#840016" /></View><TextInput style={styles.profileTextInput} value={value} onChangeText={onChangeText} placeholder={placeholder} placeholderTextColor={DIM} keyboardType={keyboardType} /></View></View>;
}

export function InboxScreen() {
  const navigation = useNavigation<any>();
  const queryClient = useQueryClient();
  const query = useQuery({ queryKey: ["notifications"], queryFn: () => getNotifications(50), retry: false });
  const allRead = useMutation({ mutationFn: markAllNotificationsRead, onSuccess: async () => { await queryClient.invalidateQueries({ queryKey: ["notifications"] }); Toast.show({ type: "success", text1: "Inbox marked as read" }); }, onError: (error: { message?: string }) => Toast.show({ type: "error", text1: "Could not update inbox", text2: error.message }) });
  const read = useMutation({ mutationFn: markNotificationRead, onSuccess: () => queryClient.invalidateQueries({ queryKey: ["notifications"] }) });
  const remove = useMutation({
    mutationFn: deleteNotification,
    onMutate: async (id: string) => {
      await queryClient.cancelQueries({ queryKey: ["notifications"] });
      const previous = queryClient.getQueryData<PagedNotifications>(["notifications"]);
      if (previous) {
        const removed = previous.items.find((item) => item.id === id);
        queryClient.setQueryData<PagedNotifications>(["notifications"], {
          ...previous,
          items: previous.items.filter((item) => item.id !== id),
          unreadCount: removed && !removed.readAt ? Math.max(0, previous.unreadCount - 1) : previous.unreadCount,
        });
      }
      return { previous };
    },
    onError: (error: { message?: string }, _id, context) => {
      if (context?.previous) queryClient.setQueryData(["notifications"], context.previous);
      Toast.show({ type: "error", text1: "Delete failed", text2: error.message });
    },
    onSettled: () => queryClient.invalidateQueries({ queryKey: ["notifications"] }),
  });
  const open = (item: AppNotification) => {
    if (!item.readAt) read.mutate(item.id);
    if (item.type === "member_stipend_disbursed") {
      navigation.navigate("Earnings", { view: "stipends", focusNonce: Date.now() });
      return;
    }
    if (item.type === "member_payout_updated") {
      navigation.navigate("Earnings", { view: "gigs", focusNonce: Date.now() });
      return;
    }
    if (item.actionUrl === "Earnings") {
      navigation.navigate("Earnings");
      return;
    }
    if ((item.sourceType === "event" || item.sourceType === "rehearsal" || item.sourceType === "gig") && item.sourceId) {
      navigation.navigate("Schedule", { sourceType: item.sourceType, sourceId: item.sourceId, focusNonce: Date.now() });
      return;
    }
    if (item.actionUrl === "Attendance") navigation.navigate("Schedule");
    else if (item.sourceType === "member") navigation.navigate("Profile");
    else navigation.navigate("Home");
  };
  return <Screen refresh={() => query.refetch()} header={<PageHeader title="Inbox" onBack={() => navigation.navigate("Home")} right={<TouchableOpacity onPress={() => allRead.mutate()}><Text style={styles.markRead}>MARK ALL READ</Text></TouchableOpacity>} />}>
    <Text style={styles.sectionLabel}>RECENT</Text>
    {query.isLoading ? <ActivityIndicator color={BLUE} /> : query.data?.items.map((item) => <SwipeToDeleteNotificationRow key={item.id} item={item} onPress={open} onDelete={(target) => remove.mutate(target.id)} />) ?? <Text style={styles.emptyText}>Your inbox is clear.</Text>}
  </Screen>;
}

const SWIPE_DELETE_THRESHOLD = 90;

function SwipeToDeleteNotificationRow({ item, onPress, onDelete }: { item: AppNotification; onPress: (item: AppNotification) => void; onDelete: (item: AppNotification) => void }) {
  const translateX = React.useRef(new Animated.Value(0)).current;
  const panResponder = React.useRef(
    PanResponder.create({
      onMoveShouldSetPanResponder: (_event, gesture) => Math.abs(gesture.dx) > 6 && Math.abs(gesture.dx) > Math.abs(gesture.dy),
      onMoveShouldSetPanResponderCapture: (_event, gesture) => Math.abs(gesture.dx) > 6 && Math.abs(gesture.dx) > Math.abs(gesture.dy),
      onPanResponderTerminationRequest: () => false,
      onShouldBlockNativeResponder: () => true,
      onPanResponderMove: (_event, gesture) => translateX.setValue(Math.min(0, gesture.dx)),
      onPanResponderRelease: (_event, gesture) => {
        if (gesture.dx < -SWIPE_DELETE_THRESHOLD) {
          Animated.timing(translateX, { toValue: -600, duration: 180, useNativeDriver: true }).start(() => onDelete(item));
        } else {
          Animated.spring(translateX, { toValue: 0, useNativeDriver: true, bounciness: 4 }).start();
        }
      },
      onPanResponderTerminate: () => Animated.spring(translateX, { toValue: 0, useNativeDriver: true }).start(),
    })
  ).current;

  return <View style={styles.swipeRowContainer}>
    <View style={styles.swipeDeleteBackground} pointerEvents="none"><Text style={styles.swipeDeleteLabel}>Delete</Text></View>
    <Animated.View style={[styles.swipeRowForeground, { transform: [{ translateX }] }]} {...panResponder.panHandlers}>
      <View style={styles.notificationRow}>
        {!item.readAt ? <View style={styles.notificationDot} /> : <View style={{ width: 8 }} />}
        <TouchableOpacity style={styles.notificationMain} activeOpacity={0.78} onPress={() => onPress(item)}>
          <View style={{ flex: 1 }}><Text style={styles.notificationTitle}>{item.title}</Text><Text style={styles.notificationBody}>{item.body}</Text><Text style={styles.rowMeta}>{item.sourceType.toUpperCase()} · {format(new Date(item.createdAt), "MMM d, h:mm a")}</Text></View>
          <Ionicons name="arrow-forward" size={15} color={DIM} />
        </TouchableOpacity>
      </View>
    </Animated.View>
  </View>;
}

function PreferenceToggle({ icon, label, value, onPress }: { icon: React.ComponentProps<typeof Ionicons>["name"]; label: string; value: boolean; onPress: () => void }) {
  return <View style={styles.settingRow}><View style={styles.settingMain}><View style={styles.accountRowIcon}><Ionicons name={icon} size={17} color="#840016" /></View><Text style={styles.settingLabel}>{label}</Text></View><TouchableOpacity accessibilityRole="switch" accessibilityState={{ checked: value }} style={[styles.toggle, value && styles.toggleOn]} onPress={onPress}><View style={[styles.toggleKnob, value && styles.toggleKnobOn]} /></TouchableOpacity></View>;
}

const styles = StyleSheet.create({
  screenRoot: { flex: 1, backgroundColor: WHITE },
  screen: { flex: 1, backgroundColor: WHITE },
  screenContent: { flexGrow: 1, paddingHorizontal: 20, paddingBottom: 112 },
  // Same height and rhythm as the home greeting row, so every page opens alike.
  pageHeader: { minHeight: 70, flexDirection: "row", alignItems: "center", gap: 12, marginBottom: 18 },
  pageHeaderCopy: { flex: 1, minWidth: 0 },
  pageHeaderTitle: { fontFamily: font.extraBold, fontSize: 24, lineHeight: 27, letterSpacing: -0.8, color: INK },
  pageHeaderSubtitle: { fontFamily: font.bold, fontSize: 8.5, letterSpacing: 2.1, color: MUTED, marginTop: 6 },
  center: { flex: 1, minHeight: 440, alignItems: "center", justifyContent: "center", padding: 30, gap: 10 },
  stateTitle: { fontFamily: font.extraBold, fontSize: 18, color: INK },
  stateText: { fontFamily: font.regular, fontSize: 12, lineHeight: 18, color: MUTED, textAlign: "center" },
  brandHeader: { height: 58, flexDirection: "row", alignItems: "center", justifyContent: "space-between" },
  wordmark: { width: 185, height: 54 },
  unreadBadge: { position: "absolute", top: -5, right: -5, minWidth: 19, height: 19, borderRadius: 10, paddingHorizontal: 4, backgroundColor: "#E33B3B", borderWidth: 2, borderColor: "#fff", alignItems: "center", justifyContent: "center" },
  unreadBadgeText: { fontFamily: font.extraBold, fontSize: 8, lineHeight: 10, color: "#fff", textAlign: "center" },
  homeControlRow: { minHeight: 70, flexDirection: "row", alignItems: "center", justifyContent: "space-between", marginBottom: 18 },
  homeControlActions: { flexDirection: "row", alignItems: "center", gap: 11 },
  homeHeaderIcon: { width: 38, height: 38, borderRadius: 19, backgroundColor: PAPER, borderWidth: 1, borderColor: BORDER, alignItems: "center", justifyContent: "center" },
  homeAvatar: { width: 42, height: 42, borderRadius: 15, backgroundColor: "#E4E8EA", borderWidth: 2, borderColor: "#F4F5F0", alignItems: "center", justifyContent: "center", overflow: "hidden", shadowColor: INK, shadowOpacity: 0.12, shadowRadius: 7, elevation: 2 },
  homeAvatarImage: { width: 42, height: 42, borderRadius: 21 },
  homeAvatarInitials: { fontFamily: font.extraBold, fontSize: 12, color: "#840016" },
  homeIntro: { flex: 1, minWidth: 0, paddingRight: 10 },
  homeGreeting: { fontFamily: font.extraBold, fontSize: 22, lineHeight: 24, letterSpacing: -0.7, color: INK },
  homeDate: { fontFamily: font.bold, fontSize: 8.5, letterSpacing: 2.1, color: MUTED, marginTop: 6 },
  homeHero: { minHeight: 236, borderRadius: 28, backgroundColor: WHITE, borderWidth: 1, borderColor: "rgba(132,0,22,.10)", paddingHorizontal: 19, paddingTop: 18, paddingBottom: 16, overflow: "hidden", shadowColor: "#301728", shadowOpacity: 0.22, shadowRadius: 24, shadowOffset: { width: 0, height: 14 }, elevation: 8 },
  homeHeroTop: { flexDirection: "row", alignItems: "center", justifyContent: "space-between" },
  homeHeroTag: { minHeight: 25, borderRadius: 13, paddingHorizontal: 10, flexDirection: "row", alignItems: "center", gap: 6, backgroundColor: "rgba(132,0,22,.07)" },
  liveDot: { width: 6, height: 6, borderRadius: 3, backgroundColor: BLUE },
  homeHeroTagText: { fontFamily: font.bold, fontSize: 7.5, letterSpacing: 1.25, color: "rgba(132,0,22,.82)" },
  homeHeroPayoutWrap: { alignItems: "flex-end" },
  homeHeroPayoutLabel: { fontFamily: font.bold, fontSize: 5.5, letterSpacing: 1.1, color: DIM },
  homeHeroPayout: { fontFamily: font.extraBold, fontSize: 13, color: INK, marginTop: 2 },
  homeHeroMain: { flexDirection: "row", alignItems: "center", gap: 14, marginTop: 18 },
  homeDateTile: { width: 55, height: 62, borderRadius: 15, backgroundColor: WHITE, borderWidth: 1, borderColor: "rgba(132,0,22,.10)", alignItems: "center", justifyContent: "center", shadowColor: "#301728", shadowOpacity: 0.10, shadowRadius: 10, shadowOffset: { width: 0, height: 5 }, elevation: 3 },
  homeDateMonth: { fontFamily: font.bold, fontSize: 8, letterSpacing: 1.5, color: BLUE },
  homeDateNumber: { fontFamily: font.extraBold, fontSize: 25, lineHeight: 27, color: INK },
  homeHeroTitle: { fontFamily: font.extraBold, fontSize: 20, lineHeight: 23, letterSpacing: -0.45, color: INK },
  homeHeroMeta: { fontFamily: font.regular, fontSize: 9.5, color: MUTED, marginTop: 5 },
  homeHeroRole: { alignSelf: "flex-start", fontFamily: font.bold, fontSize: 6.5, letterSpacing: 1.2, color: "rgba(132,0,22,.80)", borderWidth: 1, borderColor: "rgba(132,0,22,.20)", borderRadius: 8, paddingHorizontal: 7, paddingVertical: 3, marginTop: 7 },
  homeHeroSchedule: { minHeight: 58, flexDirection: "row", alignItems: "center", backgroundColor: "rgba(132,0,22,.045)", borderWidth: 1, borderColor: "rgba(132,0,22,.10)", borderRadius: 17, marginTop: 16, paddingVertical: 10 },
  homeHeroInfo: { flex: 1, minWidth: 0, alignItems: "center", paddingHorizontal: 7 },
  homeHeroInfoBorder: { borderLeftWidth: 1, borderLeftColor: "rgba(132,0,22,.14)" },
  homeHeroMicro: { fontFamily: font.bold, fontSize: 6.5, letterSpacing: 1.55, color: DIM },
  homeHeroInfoValue: { fontFamily: font.extraBold, fontSize: 14, color: INK, marginTop: 4 },
  homeEmptyHero: { minHeight: 112, borderRadius: 20, backgroundColor: CARD, borderWidth: 1, borderColor: "rgba(132,0,22,.14)", padding: 18, flexDirection: "row", alignItems: "center", gap: 14 },
  homeEmptyTitle: { fontFamily: font.extraBold, fontSize: 16, color: INK },
  homeEmptyBody: { fontFamily: font.regular, fontSize: 10.5, lineHeight: 15, color: MUTED, marginTop: 3 },
  homeSectionHeader: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", marginTop: 22, marginBottom: 10 },
  homeOverviewTitle: { fontFamily: font.bold, fontSize: 15, letterSpacing: -0.25, color: INK },
  homeSeeAll: { fontFamily: font.semiBold, fontSize: 10, color: "#840016" },
  homeRadar: { borderTopWidth: 1, borderTopColor: BORDER },
  homeRadarRow: { minHeight: 68, flexDirection: "row", alignItems: "center", gap: 11, borderBottomWidth: 1, borderBottomColor: BORDER, position: "relative" },
  homeRadarLine: { width: 3, height: 36, borderRadius: 2 },
  homeRadarDate: { width: 46, height: 48, borderRadius: 12, backgroundColor: WHITE, borderWidth: 1, borderColor: "rgba(132,0,22,.10)", alignItems: "center", justifyContent: "center", shadowColor: "#301728", shadowOpacity: 0.10, shadowRadius: 10, shadowOffset: { width: 0, height: 5 }, elevation: 3 },
  homeRadarDay: { fontFamily: font.extraBold, fontSize: 17, lineHeight: 19, color: INK },
  homeRadarMonth: { fontFamily: font.bold, fontSize: 6.5, letterSpacing: 1.2, color: DIM },
  homeRadarTitle: { fontFamily: font.bold, fontSize: 11.5, color: INK },
  homeRadarMeta: { fontFamily: font.regular, fontSize: 8.5, color: MUTED, marginTop: 4 },
  homeRadarEmpty: { fontFamily: font.regular, fontSize: 10.5, color: MUTED, paddingVertical: 18 },
  homeQuickRow: { flexDirection: "row", justifyContent: "space-between", marginTop: 18 },
  homeQuickAction: { width: "23%", alignItems: "center" },
  homeQuickIcon: { width: 55, height: 55, borderRadius: 17, alignItems: "center", justifyContent: "center", shadowColor: "#301728", shadowOpacity: 0.22, shadowRadius: 11, shadowOffset: { width: 0, height: 6 }, elevation: 4 },
  homeQuickLabel: { fontFamily: font.medium, fontSize: 9.5, color: INK, marginTop: 7 },
  homeOverviewCard: { minHeight: 166, borderRadius: 28, overflow: "hidden", backgroundColor: WHITE, borderWidth: 1, borderColor: "rgba(132,0,22,.10)", flexDirection: "row", alignItems: "center", paddingHorizontal: 18, paddingVertical: 16, shadowColor: "#301728", shadowOpacity: 0.12, shadowRadius: 20, shadowOffset: { width: 0, height: 10 }, elevation: 4 },
  homeOverviewDonut: { width: 126, height: 126, alignItems: "center", justifyContent: "center" },
  homeOverviewDonutText: { position: "absolute", alignItems: "center" },
  homeOverviewPercent: { fontFamily: font.extraBold, fontSize: 19, color: INK },
  homeOverviewCaption: { fontFamily: font.bold, fontSize: 5.8, letterSpacing: 0.8, color: DIM, marginTop: 2 },
  homeOverviewLegend: { flex: 1, gap: 15, marginLeft: 10 },
  homeLegendRow: { minWidth: 0, flexDirection: "row", alignItems: "center" },
  homeLegendDot: { width: 9, height: 9, borderRadius: 5, marginRight: 8 },
  homeLegendLabel: { width: 57, fontFamily: font.medium, fontSize: 10, color: MUTED },
  homeLegendValue: { flex: 1, fontFamily: font.bold, fontSize: 11, color: INK, textAlign: "right" },
  heroCard: { backgroundColor: CARD, borderWidth: 1, borderColor: BORDER, borderRadius: 18, marginTop: 10, shadowColor: INK, shadowOpacity: 0.12, shadowRadius: 18, shadowOffset: { width: 0, height: 10 }, elevation: 5, overflow: "hidden" },
  heroTop: { flexDirection: "row", justifyContent: "space-between", alignItems: "center", paddingHorizontal: 18, paddingTop: 16 },
  eyebrow: { fontFamily: font.bold, fontSize: 8.5, letterSpacing: 2, color: MUTED },
  payout: { fontFamily: font.extraBold, fontSize: 12, color: GOLD },
  heroTitle: { fontFamily: font.extraBold, fontSize: 23, lineHeight: 27, letterSpacing: -0.5, color: INK, paddingHorizontal: 18, marginTop: 10 },
  heroMeta: { fontFamily: font.regular, fontSize: 11, color: MUTED, paddingHorizontal: 18, marginTop: 4 },
  timeGrid: { flexDirection: "row", marginHorizontal: 18, marginTop: 16, marginBottom: 14 },
  timeCell: { flex: 1 }, timeCellBorder: { borderLeftWidth: 1, borderLeftColor: BORDER, paddingLeft: 14 },
  timeValue: { fontFamily: font.extraBold, fontSize: 15, color: INK, marginTop: 2 },
  clockStrip: { backgroundColor: CARD, borderTopWidth: 1, borderTopColor: BORDER, padding: 12, flexDirection: "row", alignItems: "center", gap: 10 },
  clockGlyph: { width: 36, height: 36, borderRadius: 10, backgroundColor: "#D7E0E4", alignItems: "center", justifyContent: "center" },
  stripText: { fontFamily: font.semiBold, fontSize: 11, color: INK, marginTop: 2 },
  darkPill: { borderRadius: 99, backgroundColor: INK, paddingVertical: 10, paddingHorizontal: 16 },
  darkPillText: { fontFamily: font.bold, fontSize: 10, letterSpacing: 1, color: "#fff" },
  emptyCard: { marginTop: 10, padding: 24, backgroundColor: CARD, borderWidth: 1, borderColor: BORDER, borderRadius: 18 },
  quickGrid: { flexDirection: "row", flexWrap: "wrap", gap: 12, marginTop: 16 },
  quickCard: { width: "48%", minHeight: 188, borderRadius: 20, backgroundColor: CARD, borderWidth: 1, borderColor: BORDER, padding: 14, alignItems: "center", shadowColor: INK, shadowOpacity: 0.08, shadowRadius: 14, shadowOffset: { width: 0, height: 7 }, elevation: 3 },
  quickImage: { width: "100%", height: 86 },
  quickTitle: { fontFamily: font.bold, fontSize: 13, color: INK, marginTop: 5 },
  quickBody: { fontFamily: font.regular, fontSize: 9.5, lineHeight: 14, color: MUTED, textAlign: "center", marginTop: 3 },
  segment: { flexDirection: "row", gap: 22, borderBottomWidth: 1, borderBottomColor: BORDER, marginTop: 12 },
  segmentItem: { paddingHorizontal: 2, paddingBottom: 10 }, segmentActive: { borderBottomWidth: 2.5, borderBottomColor: INK },
  segmentText: { fontFamily: font.bold, fontSize: 10, letterSpacing: 1.3, color: DIM }, segmentTextActive: { color: INK },
  sectionLabel: { fontFamily: font.bold, fontSize: 9, letterSpacing: 2.5, color: MUTED, marginVertical: 16 },
  emptyText: { fontFamily: font.regular, fontSize: 12, color: MUTED, textAlign: "center", marginTop: 60 },
  calendarWrap: { marginTop: 18 },
  calendarMonthHeader: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", marginBottom: 16 },
  calendarMonthTitle: { fontFamily: font.extraBold, fontSize: 17, color: INK },
  calendarNavButton: { width: 38, height: 38, borderRadius: 19, borderWidth: 1, borderColor: BORDER, alignItems: "center", justifyContent: "center" },
  calendarWeekRow: { flexDirection: "row", borderBottomWidth: 1, borderBottomColor: BORDER, paddingBottom: 8 },
  calendarWeekday: { width: "14.2857%", textAlign: "center", fontFamily: font.bold, fontSize: 8, letterSpacing: 0.7, color: DIM },
  calendarGrid: { flexDirection: "row", flexWrap: "wrap", paddingTop: 7 },
  calendarDay: { width: "14.2857%", height: 50, alignItems: "center", paddingTop: 3 },
  calendarDayNumberWrap: { width: 30, height: 30, borderRadius: 15, alignItems: "center", justifyContent: "center" },
  calendarDaySelected: { backgroundColor: INK },
  calendarDayNumber: { fontFamily: font.semiBold, fontSize: 11, color: INK },
  calendarDayOutside: { color: "#C4C7D1" },
  calendarDayNumberSelected: { color: "#fff" },
  calendarDots: { height: 5, flexDirection: "row", justifyContent: "center", gap: 2, marginTop: 2 },
  calendarDot: { width: 4, height: 4, borderRadius: 2 },
  calendarAgenda: { borderTopWidth: 1, borderTopColor: BORDER, marginTop: 10 },
  calendarEmpty: { fontFamily: font.regular, fontSize: 11.5, color: MUTED, paddingVertical: 18, textAlign: "center" },
  activityRow: { flexDirection: "row", alignItems: "center", gap: 14, paddingVertical: 12, borderBottomWidth: 1, borderBottomColor: BORDER },
  dateTile: { width: 48, borderRadius: 12, backgroundColor: WHITE, borderWidth: 1, borderColor: "rgba(132,0,22,.10)", paddingVertical: 8, alignItems: "center", shadowColor: "#301728", shadowOpacity: 0.10, shadowRadius: 10, shadowOffset: { width: 0, height: 5 }, elevation: 3 },
  dateNumber: { fontFamily: font.extraBold, fontSize: 20, lineHeight: 20, color: INK }, dateMonth: { fontFamily: font.bold, fontSize: 8, letterSpacing: 1.5, color: MUTED, marginTop: 3 },
  activityMain: { flex: 1, borderLeftWidth: 2, paddingLeft: 12 },
  rowTitle: { fontFamily: font.bold, fontSize: 12.5, color: INK }, rowMeta: { fontFamily: font.regular, fontSize: 9.5, color: MUTED, marginTop: 3 },
  status: { alignSelf: "flex-start", fontFamily: font.bold, fontSize: 8, letterSpacing: 0.8, borderWidth: 1, borderRadius: 2, paddingHorizontal: 7, paddingVertical: 3, marginTop: 6 },
  historyRow: { flexDirection: "row", gap: 12, alignItems: "center", paddingVertical: 13, borderBottomWidth: 1, borderBottomColor: BORDER },
  historyDate: { width: 44, fontFamily: font.extraBold, fontSize: 11, color: MUTED },
  modalBackdrop: { flex: 1, justifyContent: "flex-end", backgroundColor: "rgba(17,21,39,.58)" },
  sheet: { width: "100%", maxHeight: "92%", backgroundColor: CARD, borderTopLeftRadius: 24, borderTopRightRadius: 24, paddingHorizontal: 20, paddingTop: 10 },
  sheetHandle: { width: 42, height: 4, borderRadius: 2, backgroundColor: "#D7D9E0", alignSelf: "center", marginBottom: 16 },
  profileEditSheet: { width: "100%", maxHeight: "84%", backgroundColor: "#F1F0EC", borderTopLeftRadius: 30, borderTopRightRadius: 30, paddingTop: 10, overflow: "hidden", shadowColor: INK, shadowOpacity: 0.2, shadowRadius: 24, shadowOffset: { width: 0, height: -8 }, elevation: 12 },
  profileEditHeader: { flexDirection: "row", alignItems: "center", gap: 12, paddingHorizontal: 20, paddingBottom: 17 },
  profileEditHeaderIcon: { width: 43, height: 43, borderRadius: 14, backgroundColor: "#E4E8EA", alignItems: "center", justifyContent: "center" },
  profileEditHeaderCopy: { flex: 1, minWidth: 0 },
  profileEditTitle: { fontFamily: font.extraBold, fontSize: 20, letterSpacing: -0.4, color: INK },
  profileEditSubtitle: { fontFamily: font.regular, fontSize: 10.5, color: MUTED, marginTop: 3 },
  profileEditScroll: { flexShrink: 1, borderTopWidth: 1, borderTopColor: BORDER },
  profileEditContent: { paddingHorizontal: 20, paddingTop: 6, paddingBottom: 14 },
  profileFormField: { marginTop: 13 },
  profileFieldLabel: { fontFamily: font.semiBold, fontSize: 9.5, color: MUTED, marginBottom: 7, marginLeft: 2 },
  profileInputWrap: { minHeight: 54, flexDirection: "row", alignItems: "center", gap: 11, borderWidth: 1, borderColor: "rgba(54,68,90,.14)", borderRadius: 15, backgroundColor: "#F4F5F0", paddingHorizontal: 11 },
  profileInputIcon: { width: 32, height: 32, borderRadius: 10, backgroundColor: "#E4E8EA", alignItems: "center", justifyContent: "center" },
  profileTextInput: { flex: 1, minWidth: 0, paddingVertical: 12, fontFamily: font.medium, fontSize: 12.5, color: INK },
  profileInputEmpty: { color: DIM },
  profileFieldHint: { fontFamily: font.regular, fontSize: 9.5, color: MUTED, marginTop: 6, marginLeft: 2 },
  datePickerBackdrop: { flex: 1, justifyContent: "flex-end", backgroundColor: "rgba(17,21,39,.58)" },
  datePickerCard: { backgroundColor: CARD, borderTopLeftRadius: 24, borderTopRightRadius: 24, paddingTop: 8, paddingBottom: 26, paddingHorizontal: 20 },
  datePickerDone: { minHeight: 50, borderRadius: 15, backgroundColor: BLUE, alignItems: "center", justifyContent: "center", marginTop: 8 },
  datePickerDoneText: { fontFamily: font.bold, fontSize: 11, letterSpacing: 1.4, color: "#fff" },
  profileEditFooter: { paddingHorizontal: 20, paddingTop: 12, borderTopWidth: 1, borderTopColor: BORDER, backgroundColor: CARD },
  profileSaveButton: { borderRadius: 16, overflow: "hidden", shadowColor: "#111527", shadowOpacity: 0.24, shadowRadius: 12, shadowOffset: { width: 0, height: 6 }, elevation: 4 },
  profileSaveGradient: { minHeight: 54, flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 9 },
  profileSaveText: { fontFamily: font.bold, fontSize: 12, color: "#fff" },
  sheetHeader: { flexDirection: "row", alignItems: "flex-start", justifyContent: "space-between", gap: 12 },
  sheetTitle: { fontFamily: font.extraBold, fontSize: 21, lineHeight: 25, color: INK, marginTop: 5 },
  sheetMeta: { fontFamily: font.regular, fontSize: 11, color: MUTED, marginTop: 6 },
  closeButton: { width: 36, height: 36, borderRadius: 18, backgroundColor: "#F2F3F7", alignItems: "center", justifyContent: "center" },
  detailList: { borderTopWidth: 1, borderTopColor: BORDER, marginTop: 18 },
  detailItem: { flexDirection: "row", alignItems: "center", gap: 12, minHeight: 52, borderBottomWidth: 1, borderBottomColor: BORDER },
  detailValue: { fontFamily: font.semiBold, fontSize: 11.5, color: INK, marginTop: 2 },
  actionRow: { flexDirection: "row", gap: 10 },
  actionButton: { flex: 1, height: 46, borderRadius: 4, borderWidth: 1.5, borderColor: BORDER, alignItems: "center", justifyContent: "center" },
  actionButtonSuccess: { backgroundColor: GREEN, borderColor: GREEN },
  actionButtonDanger: { backgroundColor: RED, borderColor: RED },
  actionButtonText: { fontFamily: font.bold, fontSize: 10, letterSpacing: 1.1, color: MUTED },
  actionButtonTextLight: { color: "#fff" },
  primaryAction: { minHeight: 54, borderRadius: 4, backgroundColor: INK, alignItems: "center", justifyContent: "center", marginTop: 18, paddingHorizontal: 18 },
  primaryActionDisabled: { backgroundColor: "#E7E4E2", marginTop: 0 },
  primaryActionTextDisabled: { color: DIM },
  primaryActionText: { fontFamily: font.bold, fontSize: 12, letterSpacing: 1.8, color: "#fff" },
  sheetInfo: { fontFamily: font.medium, fontSize: 11.5, lineHeight: 17, color: MUTED, textAlign: "center", backgroundColor: CARD, borderRadius: 12, padding: 14, marginTop: 18 },
  clockPage: { alignItems: "center", paddingTop: 24 }, clockCall: { fontFamily: font.extraBold, fontSize: 19, color: INK, textAlign: "center" },
  clockFace: { width: 238, height: 238, borderRadius: 119, borderWidth: 1, borderColor: BORDER, alignItems: "center", justifyContent: "center", marginVertical: 34, shadowColor: BLUE, shadowOpacity: 0.12, shadowRadius: 24, elevation: 4 },
  clockFaceLabel: { fontFamily: font.bold, fontSize: 9, letterSpacing: 2.5, color: MUTED, marginTop: 12 }, clockFaceTime: { fontFamily: font.extraBold, fontSize: 34, letterSpacing: -1.5, color: INK, marginTop: 2 },
  locationCard: { alignSelf: "stretch", flexDirection: "row", alignItems: "center", gap: 12, backgroundColor: CARD, borderRadius: 16, padding: 14 },
  clockButton: { alignSelf: "stretch", height: 62, borderRadius: 16, backgroundColor: BLUE, flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 12, marginTop: 20, shadowColor: BLUE, shadowOpacity: 0.3, shadowRadius: 18, shadowOffset: { width: 0, height: 8 }, elevation: 5 },
  clockButtonText: { fontFamily: font.extraBold, fontSize: 17, letterSpacing: 1.5, color: "#fff" }, disabled: { opacity: 0.42 },
  clockNote: { fontFamily: font.bold, fontSize: 8.5, letterSpacing: 1.6, color: DIM, marginTop: 14 },
  earningsSummary: { flexDirection: "row", justifyContent: "space-between", alignItems: "flex-end", paddingVertical: 20 },
  earningsTotal: { fontFamily: font.extraBold, fontSize: 36, letterSpacing: -2, color: INK, marginTop: 4 }, pendingTotal: { fontFamily: font.extraBold, fontSize: 18, color: GOLD, marginTop: 3 },
  payoutAmount: { fontFamily: font.extraBold, fontSize: 12, textAlign: "right" },
  receiptAmount: { fontFamily: font.extraBold, fontSize: 36, letterSpacing: -1.5, color: INK, marginTop: 16 },
  fieldLabel: { fontFamily: font.bold, fontSize: 8.5, letterSpacing: 1.4, color: MUTED, marginTop: 16, marginBottom: 6 },
  textField: { minHeight: 50, borderWidth: 1, borderColor: BORDER, borderBottomWidth: 2, borderBottomColor: BLUE, borderRadius: 4, paddingHorizontal: 14, paddingVertical: 10, fontFamily: font.medium, fontSize: 13, color: INK, backgroundColor: CARD },
  noteField: { minHeight: 72, textAlignVertical: "top" },
  formField: { marginTop: 2 },
  accountIdentityCard: { minHeight: 112, borderRadius: 26, flexDirection: "row", alignItems: "center", gap: 14, padding: 18, shadowColor: "#111527", shadowOpacity: 0.25, shadowRadius: 20, shadowOffset: { width: 0, height: 10 }, elevation: 6 },
  accountIdentityCopy: { flex: 1, minWidth: 0 },
  accountEditButton: { width: 35, height: 35, borderRadius: 13, backgroundColor: "rgba(255,255,255,.14)", borderWidth: 1, borderColor: "rgba(255,255,255,.16)", alignItems: "center", justifyContent: "center" },
  profileAvatar: { width: 66, height: 66, borderRadius: 22, borderWidth: 2, borderColor: "rgba(255,255,255,.34)", backgroundColor: "#9A7182", alignItems: "center", justifyContent: "center" }, profileAvatarImage: { width: 62, height: 62, borderRadius: 20 }, profileInitials: { fontFamily: font.extraBold, fontSize: 19, color: "#fff" },
  cameraBadge: { position: "absolute", right: -2, bottom: -2, width: 22, height: 22, borderRadius: 8, backgroundColor: "#F4F5F0", borderWidth: 2, borderColor: "#36445A", alignItems: "center", justifyContent: "center" },
  profileName: { fontFamily: font.extraBold, fontSize: 18, color: "#fff" }, profileMeta: { fontFamily: font.regular, fontSize: 9.5, color: "rgba(255,255,255,.68)", marginTop: 3 },
  profileStats: { flexDirection: "row", paddingVertical: 17, marginTop: 13, backgroundColor: WHITE, borderWidth: 1, borderColor: "rgba(132,0,22,.10)", borderRadius: 20, shadowColor: "#301728", shadowOpacity: 0.12, shadowRadius: 20, shadowOffset: { width: 0, height: 10 }, elevation: 4 }, profileStat: { flex: 1, alignItems: "center", borderRightWidth: 1, borderRightColor: BORDER }, profileStatValue: { fontFamily: font.extraBold, fontSize: 18 }, profileStatLabel: { fontFamily: font.semiBold, fontSize: 7.5, lineHeight: 10.5, letterSpacing: 0.85, textAlign: "center", color: DIM, marginTop: 3 },
  accountSectionTitle: { fontFamily: font.bold, fontSize: 13.5, color: INK, marginTop: 23, marginBottom: 9 },
  accountGroup: { backgroundColor: WHITE, borderRadius: 18, borderWidth: 1, borderColor: "rgba(132,0,22,.10)", paddingHorizontal: 14, overflow: "hidden", shadowColor: "#301728", shadowOpacity: 0.12, shadowRadius: 20, shadowOffset: { width: 0, height: 10 }, elevation: 4 },
  accountRowIcon: { width: 32, height: 32, borderRadius: 10, backgroundColor: "#F8ECEE", alignItems: "center", justifyContent: "center" },
  accountDangerIcon: { backgroundColor: "#FBEEE9" },
  profileRow: { minHeight: 61, flexDirection: "row", alignItems: "center", gap: 11, borderBottomWidth: 1, borderBottomColor: BORDER },
  profileRowCopy: { flex: 1, minWidth: 0 },
  profileRowLabel: { fontFamily: font.regular, fontSize: 9.5, color: MUTED }, profileRowValue: { fontFamily: font.semiBold, fontSize: 11.5, color: INK, marginTop: 2 },
  markRead: { fontFamily: font.bold, fontSize: 8.5, letterSpacing: 1, color: BLUE, marginLeft: "auto" },
  swipeRowContainer: { position: "relative", overflow: "hidden" }, swipeRowForeground: { backgroundColor: CARD }, swipeDeleteBackground: { position: "absolute", top: 0, right: 0, bottom: 0, left: 0, backgroundColor: "#840016", alignItems: "flex-end", justifyContent: "center", paddingRight: 22 }, swipeDeleteLabel: { color: "#fff", fontSize: 11, fontFamily: font.bold },
  notificationRow: { flexDirection: "row", alignItems: "flex-start", gap: 10, paddingVertical: 14, borderBottomWidth: 1, borderBottomColor: BORDER }, notificationDot: { width: 8, height: 8, borderRadius: 4, backgroundColor: BLUE, marginTop: 5 },
  notificationMain: { flex: 1, flexDirection: "row", alignItems: "center", gap: 8 }, notificationTitle: { fontFamily: font.bold, fontSize: 12.5, color: INK }, notificationBody: { fontFamily: font.regular, fontSize: 11.5, lineHeight: 16, color: "#36445A", marginTop: 2 },
  settingRow: { minHeight: 61, flexDirection: "row", alignItems: "center", justifyContent: "space-between", borderBottomWidth: 1, borderBottomColor: BORDER },
  settingMain: { flex: 1, minWidth: 0, flexDirection: "row", alignItems: "center", gap: 11 },
  settingLabel: { flexShrink: 1, fontFamily: font.medium, fontSize: 11.5, color: INK }, settingValue: { fontFamily: font.bold, fontSize: 8.5, letterSpacing: 0.7, color: "#840016" },
  accountValuePill: { flexDirection: "row", alignItems: "center", gap: 3, backgroundColor: "#F8ECEE", borderRadius: 10, paddingHorizontal: 8, paddingVertical: 6 },
  accountLastRow: { borderBottomWidth: 0 },
  toggle: { width: 44, height: 26, borderRadius: 13, backgroundColor: "#9E978E", padding: 3 }, toggleOn: { backgroundColor: "#840016" }, toggleKnob: { width: 20, height: 20, borderRadius: 10, backgroundColor: "#F4F5F0", shadowColor: INK, shadowOpacity: 0.12, shadowRadius: 3, elevation: 1 }, toggleKnobOn: { marginLeft: 18 },
});
