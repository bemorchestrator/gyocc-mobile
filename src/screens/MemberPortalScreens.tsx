import React, { useEffect, useRef, useState } from "react";
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
import AsyncStorage from "@react-native-async-storage/async-storage";
import * as ImagePicker from "expo-image-picker";
import DateTimePicker, { type DateTimePickerEvent } from "@react-native-community/datetimepicker";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useNavigation } from "@react-navigation/native";
import { Ionicons } from "@expo/vector-icons";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import Svg, { Circle, Path, Defs, LinearGradient, Stop, Line, Text as SvgText } from "react-native-svg";
import Toast from "react-native-toast-message";
import { format } from "date-fns";
import {
  forgotPassword,
} from "../api/auth";
import {
  clockInActivity,
  clockOutActivity,
  getMemberPortal,
  MemberPortalData,
  AttendanceRecord,
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
import { deleteProfileAvatar, updateProfile, uploadProfileAvatar } from "../api/profile";
import {
  acknowledgeStipend,
  getMyStipends,
  StipendDisbursementDTO,
  StipendDisbursementMethod,
  StipendDisbursementStatus,
} from "../api/stipends";
import {
  DEFAULT_MEMBER_SETTINGS,
  getPreferences,
  MemberSettingsPreferences,
  updatePreferencesRemote,
} from "../api/preferences";
import { useAuth } from "../context/AuthContext";
import { font } from "../constants/fonts";
import AttendanceMapModal from "../components/AttendanceMapModal";
import { getActivity, getFullyAttendedMembers, type FullyAttendedMember } from "../api/memberServices";

const BG = "#F4F7F5";
const PANEL = "#FFFFFF";
const PANEL_2 = "#EEF3F0";
const BORDER = "#E3EAE6";
const INK = "#15231D";
const MUTED = "#5F7069";
const DIM = "#8A9A94";
const PRIMARY = "#0D9488";
const PRIMARY_DARK = "#FFFFFF";
const GOLD = "#B7791F";
const RED = "#D64545";

type MemberSettingsItem = "menu" | "profile" | "notifications" | "privacy" | "security" | "preferences" | "membership";

function usePortal() {
  const { user } = useAuth();

  return useQuery({
    queryKey: ["member-portal", user?.email ?? "anonymous"],
    queryFn: getMemberPortal,
    retry: (failureCount, error) =>
      (error as { status?: number })?.status !== 404 && failureCount < 2,
  });
}

function PortalScaffold({
  children,
  scroll = true,
}: {
  children: React.ReactNode;
  scroll?: boolean;
}) {
  const queryClient = useQueryClient();
  const [refreshing, setRefreshing] = useState(false);
  const insets = useSafeAreaInsets();
  const content = <View style={[styles.content, { paddingTop: Math.max(insets.top + 10, 24) }]}>{children}</View>;
  const refreshPortal = async () => {
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

  if (!scroll) return <View style={styles.screen}>{content}</View>;

  return (
    <KeyboardAvoidingView
      style={styles.screen}
      behavior={Platform.OS === "ios" ? "padding" : undefined}
    >
      <ScrollView
        style={styles.screen}
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
        keyboardShouldPersistTaps="handled"
        keyboardDismissMode="interactive"
        alwaysBounceVertical
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            tintColor={PRIMARY}
            colors={[PRIMARY]}
            progressViewOffset={Math.max(insets.top + 10, 24)}
            onRefresh={refreshPortal}
          />
        }
      >
        {content}
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

function LoadingPortal() {
  return (
    <PortalScaffold>
      <View style={styles.headerRow}>
        <View>
          <View style={styles.skeletonSmall} />
          <View style={styles.skeletonTitle} />
        </View>
        <View style={styles.skeletonAvatar} />
      </View>
      <View style={styles.skeletonHero} />
      <View style={styles.statRow}>
        <View style={styles.skeletonStat} />
        <View style={styles.skeletonStat} />
        <View style={styles.skeletonStat} />
      </View>
      <ActivityIndicator color={PRIMARY} style={{ marginTop: 24 }} />
    </PortalScaffold>
  );
}

function PortalError({ error }: { error?: unknown }) {
  const { user, logout } = useAuth();
  const name = user?.name || user?.email || "Member";
  const portalError = error as { message?: string; status?: number } | undefined;
  const isNotLinked = portalError?.status === 404;
  const errorTitle = isNotLinked ? "Member profile not linked" : "Member profile unavailable";
  const errorMessage = isNotLinked
    ? "This account is signed in, but it is not linked to a member record yet."
    : portalError?.message || "We could not load your member portal. Please refresh or try signing in again.";

  return (
    <PortalScaffold>
      <View style={styles.headerRow}>
        <View>
          <Text style={styles.headerSub}>Signed in as</Text>
          <Text style={styles.headerTitle}>{name}</Text>
        </View>
        <View style={styles.avatar}>
          <Text style={styles.avatarText}>{initials(name)}</Text>
        </View>
      </View>

      <View style={styles.heroCard}>
        <View style={[styles.memberPill, styles.heroSinglePill]}>
          <View style={styles.liveDot} />
          <Text style={styles.memberPillText}>Member account</Text>
        </View>
        <Text style={styles.heroTitle}>{errorTitle}</Text>
        <Text style={styles.heroMeta}>
          {errorMessage}
        </Text>
      </View>

      <View style={styles.statRow}>
        <View style={styles.statCard}>
          <Ionicons name="person-circle-outline" size={24} color={PRIMARY} />
          <Text style={styles.statLabel}>Account type</Text>
          <Text style={styles.adminStatText}>Member</Text>
        </View>
        <View style={styles.statCard}>
          <Ionicons name="people-outline" size={24} color={GOLD} />
          <Text style={styles.statLabel}>Signed in</Text>
          <Text style={styles.adminStatText} numberOfLines={1} adjustsFontSizeToFit>
            {user?.email || "Unknown"}
          </Text>
        </View>
      </View>

      <View style={styles.upcomingCard}>
        <View style={styles.dateBox}>
          <Ionicons name="desktop-outline" size={24} color={PRIMARY} />
        </View>
        <View style={{ flex: 1 }}>
          <Text style={styles.mutedSmall}>{isNotLinked ? "Account needs linking" : "Portal fetch failed"}</Text>
          <Text style={styles.activityTitle}>{isNotLinked ? "Ask an admin to link your member record" : "Pull down to refresh the portal"}</Text>
          <Text style={styles.activityMeta}>
            {isNotLinked
              ? "The member portal opens after your user account is connected to your official GYOCC member profile."
              : "If this keeps happening, log out and sign back in so the app can refresh your session."}
          </Text>
        </View>
      </View>

      <TouchableOpacity style={styles.outlineBtn} onPress={logout}>
        <Text style={styles.outlineBtnText}>Log out</Text>
      </TouchableOpacity>
    </PortalScaffold>
  );
}

function PortalSessionMismatch({
  authEmail,
  portalEmail,
}: {
  authEmail: string;
  portalEmail: string;
}) {
  const { logout } = useAuth();

  return (
    <PortalScaffold>
      <View style={styles.headerRow}>
        <View>
          <Text style={styles.headerSub}>Session needs refresh</Text>
          <Text style={styles.headerTitle}>Sign in again</Text>
        </View>
        <View style={styles.avatar}>
          <Ionicons name="refresh-outline" size={28} color={PRIMARY_DARK} />
        </View>
      </View>

      <View style={styles.heroCard}>
        <View style={[styles.memberPill, styles.heroSinglePill]}>
          <View style={styles.liveDot} />
          <Text style={styles.memberPillText}>Session mismatch</Text>
        </View>
        <Text style={styles.heroTitle}>We found two account sessions</Text>
        <Text style={styles.heroMeta}>
          The app is signed in as {authEmail}, but the portal returned {portalEmail}.
        </Text>
      </View>

      <View style={styles.upcomingCard}>
        <View style={styles.dateBox}>
          <Ionicons name="shield-outline" size={24} color={PRIMARY} />
        </View>
        <View style={{ flex: 1 }}>
          <Text style={styles.mutedSmall}>Clean sign-in required</Text>
          <Text style={styles.activityTitle}>Log out, then sign in with the member email</Text>
          <Text style={styles.activityMeta}>
            This prevents an old admin or Google session from being used for member portal data.
          </Text>
        </View>
      </View>

      <TouchableOpacity style={styles.outlineBtn} onPress={logout}>
        <Text style={styles.outlineBtnText}>Log out</Text>
      </TouchableOpacity>
    </PortalScaffold>
  );
}

function withPortal(
  render: (portal: MemberPortalData) => React.ReactElement
) {
  const { user } = useAuth();
  const { data, isLoading, error } = usePortal();
  if (isLoading) return <LoadingPortal />;
  if (!data) return <PortalError error={error} />;

  const authEmail = user?.email?.trim().toLowerCase();
  const portalEmail = data.user.email?.trim().toLowerCase();
  if (authEmail && portalEmail && authEmail !== portalEmail) {
    return <PortalSessionMismatch authEmail={authEmail} portalEmail={portalEmail} />;
  }

  return render(data);
}

function initials(name: string) {
  return name
    .split(" ")
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0])
    .join("")
    .toUpperCase();
}

function money(value: number) {
  return new Intl.NumberFormat("en-PH", {
    style: "currency",
    currency: "PHP",
    maximumFractionDigits: 0,
  }).format(value);
}

function activityDate(date: string) {
  return format(new Date(date), "MMM d");
}

function mimeTypeFromUri(uri: string) {
  const path = uri.split("?")[0].toLowerCase();
  if (path.endsWith(".jpg") || path.endsWith(".jpeg")) return "image/jpeg";
  if (path.endsWith(".png")) return "image/png";
  if (path.endsWith(".webp")) return "image/webp";
  return null;
}

function normalizePickedImageMimeType(uri: string, mimeType?: string | null) {
  return mimeTypeFromUri(uri) || mimeType || "image/jpeg";
}

function describePreferenceChange(patch: Partial<MemberSettingsPreferences>): string {
  const messages: string[] = [];
  if ("rsvpReminders" in patch) messages.push(`RSVP reminders ${patch.rsvpReminders ? "on" : "off"}`);
  if ("scheduleReminders" in patch) messages.push(`Schedule reminders ${patch.scheduleReminders ? "on" : "off"}`);
  if ("payoutUpdates" in patch) messages.push(`Payout updates ${patch.payoutUpdates ? "on" : "off"}`);
  if ("membershipReminders" in patch) messages.push(`Membership reminders ${patch.membershipReminders ? "on" : "off"}`);
  if ("profilePhotoVisible" in patch) messages.push(patch.profilePhotoVisible ? "Profile photo visible" : "Profile photo hidden");
  if ("showProfilePhotoToMembers" in patch) messages.push(patch.showProfilePhotoToMembers ? "Photo visible to members" : "Photo hidden from members");
  if ("defaultAttendanceView" in patch && patch.defaultAttendanceView) {
    messages.push(`Default view: ${attendanceViewLabel(patch.defaultAttendanceView)}`);
  }
  return messages.length ? messages.join(", ") : "Setting saved";
}

function useMemberSettingsPreferences(userId: string) {
  const storageKey = `member-settings:${userId}`;
  const queryClient = useQueryClient();
  const queryKey = ["member-settings", userId] as const;

  // Seed the shared cache instantly from the offline AsyncStorage copy so the
  // switches render the last-known value with no lag while the backend loads.
  useEffect(() => {
    let mounted = true;
    AsyncStorage.getItem(storageKey)
      .then((value) => {
        if (!mounted || !value) return;
        if (queryClient.getQueryData<MemberSettingsPreferences>(queryKey) !== undefined) return;
        const parsed = JSON.parse(value) as Partial<MemberSettingsPreferences>;
        queryClient.setQueryData(queryKey, { ...DEFAULT_MEMBER_SETTINGS, ...parsed });
      })
      .catch(() => {
        /* offline cache miss is non-fatal; backend fetch will fill in */
      });
    return () => {
      mounted = false;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [queryClient, storageKey, userId]);

  const { data } = useQuery({
    queryKey,
    queryFn: async () => {
      // Backend is authoritative; reconcile by writing it back to the cache.
      const remote = await getPreferences();
      await AsyncStorage.setItem(storageKey, JSON.stringify(remote)).catch(() => undefined);
      return remote;
    },
  });

  const mutation = useMutation({
    mutationFn: updatePreferencesRemote,
    onMutate: async (patch: Partial<MemberSettingsPreferences>) => {
      await queryClient.cancelQueries({ queryKey });
      const previous = queryClient.getQueryData<MemberSettingsPreferences>(queryKey) ?? DEFAULT_MEMBER_SETTINGS;
      const optimistic = { ...previous, ...patch };
      queryClient.setQueryData(queryKey, optimistic);
      AsyncStorage.setItem(storageKey, JSON.stringify(optimistic)).catch(() => undefined);
      return { previous };
    },
    onSuccess: (updated, patch) => {
      queryClient.setQueryData(queryKey, updated);
      if ("showProfilePhotoToMembers" in patch) {
        queryClient.invalidateQueries({ queryKey: ["fully-attended"] });
      }
      AsyncStorage.setItem(storageKey, JSON.stringify(updated)).catch(() => undefined);
      Toast.show({ type: "success", text1: describePreferenceChange(patch) });
    },
    onError: (err: { message?: string }, _patch, context) => {
      if (context?.previous) {
        queryClient.setQueryData(queryKey, context.previous);
        AsyncStorage.setItem(storageKey, JSON.stringify(context.previous)).catch(() => undefined);
      }
      Toast.show({ type: "error", text1: "Couldn't save setting", text2: err?.message });
    },
  });

  const updatePreferences = (patch: Partial<MemberSettingsPreferences>) => {
    mutation.mutate(patch);
  };

  return { preferences: data ?? DEFAULT_MEMBER_SETTINGS, updatePreferences };
}

function activityKind(value: string) {
  if (value === "gig") return "Gig";
  if (value === "event") return "Event";
  return "Rehearsal";
}

function StatusPill({ children, tone = "good" }: { children: React.ReactNode; tone?: "good" | "warn" | "bad" }) {
  const color = tone === "bad" ? RED : tone === "warn" ? GOLD : "#1E9E63";
  return (
    <Text style={[styles.pill, { color, backgroundColor: `${color}24` }]}>
      {children}
    </Text>
  );
}

function activityKey(item: Pick<PortalActivity, "type" | "sourceId">) {
  return `${item.type}:${item.sourceId}`;
}

function SectionHeader({ title, action }: { title: string; action?: string }) {
  return (
    <View style={styles.sectionHeader}>
      <Text style={styles.sectionTitle}>{title}</Text>
      {action ? <Text style={styles.sectionAction}>{action}</Text> : null}
    </View>
  );
}

function NestedBackHeader({ label, onBack }: { label: string; onBack: () => void }) {
  return (
    <TouchableOpacity
      style={styles.nestedBackButton}
      onPress={onBack}
      activeOpacity={0.78}
      accessibilityRole="button"
      accessibilityLabel={label}
    >
      <View style={styles.nestedBackIcon}>
        <Ionicons name="arrow-back" size={21} color={PRIMARY_DARK} />
      </View>
      <Text style={styles.nestedBackText}>{label}</Text>
    </TouchableOpacity>
  );
}

function getActualAssignment(portal: MemberPortalData) {
  // Prefer the voice part / instrument stored on the member record — it's the
  // source of truth and doesn't disappear when activities are deleted.
  const stored = portal.member.voicePart?.trim();
  if (stored) return stored;

  // Fallback: infer from a specific (non-generic) role on the member's
  // upcoming or past activities.
  const genericRoles = new Set(["Participant", "Performer", "Volunteer", "Member"]);
  const role =
    portal.upcoming.find((item) => item.role && !genericRoles.has(item.role))?.role ||
    portal.attendance.history.find((item) => item.role && !genericRoles.has(item.role))?.role;

  if (role) return role;
  if (portal.member.section === "Choir") return "Voice part pending";
  if (portal.member.section === "Rondalla") return "Instrument pending";
  return `${portal.member.section} assignment`;
}

const PART_OPTIONS: Record<string, string[]> = {
  Choir: ["Soprano", "Alto", "Tenor", "Bass"],
  Orchestra: ["Violin", "Viola", "Cello", "Double Bass", "Flute", "Clarinet", "Oboe", "Trumpet", "Trombone", "Percussion"],
  Rondalla: ["Bandurria", "Laud", "Octavina", "Guitar", "Bajo de Uñas"],
};

function partOptionsForSection(section: string): string[] {
  if (PART_OPTIONS[section]) return PART_OPTIONS[section];
  // "Both" or unknown section — offer voice parts plus common instruments.
  return [...PART_OPTIONS.Choir, ...PART_OPTIONS.Orchestra];
}

function partFieldLabel(section: string): string {
  if (section === "Choir") return "My voice part";
  if (section === "Orchestra" || section === "Rondalla") return "My instrument";
  return "My voice part / instrument";
}

function PartPicker({ section, value, editable, onChange }: {
  section: string;
  value: string;
  editable: boolean;
  onChange: (value: string) => void;
}) {
  const label = partFieldLabel(section);
  if (!editable) {
    return (
      <View style={styles.profileFieldRow}>
        <Text style={styles.fieldLabel}>{label}</Text>
        <Text style={[styles.fieldValue, !value && styles.fieldValueEmpty]} numberOfLines={1}>
          {value || "—"}
        </Text>
      </View>
    );
  }
  return (
    <View style={styles.profileField}>
      <Text style={styles.fieldLabel}>{label}</Text>
      <View style={styles.partChipWrap}>
        {partOptionsForSection(section).map((opt) => {
          const selected = value === opt;
          return (
            <TouchableOpacity
              key={opt}
              onPress={() => onChange(selected ? "" : opt)}
              style={[styles.partChip, selected && styles.partChipSelected]}
            >
              <Text style={[styles.partChipText, selected && styles.partChipTextSelected]}>{opt}</Text>
            </TouchableOpacity>
          );
        })}
      </View>
    </View>
  );
}

function InlineCounter({
  value,
  suffix,
  label,
  divider,
}: {
  value: number;
  suffix: number;
  label: string;
  divider?: boolean;
}) {
  return (
    <View style={[styles.inlineCounter, divider && styles.inlineCounterDivider]}>
      <Text style={styles.inlineCounterValue}>
        {value}
        <Text style={styles.inlineCounterSuffix}>/{suffix}</Text>
      </Text>
      <Text style={styles.inlineCounterLabel}>{label}</Text>
    </View>
  );
}

function ProgressDonut({ value }: { value: number }) {
  const size = 112;
  const stroke = 11;
  const radius = (size - stroke) / 2;
  const circumference = 2 * Math.PI * radius;
  const progress = Math.max(0, Math.min(100, value));
  const dashOffset = circumference * (1 - progress / 100);

  return (
    <View style={styles.ring}>
      <Svg width={size} height={size} viewBox={`0 0 ${size} ${size}`} style={styles.ringSvg}>
        <Circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          stroke="#E3EAE6"
          strokeWidth={stroke}
          fill="none"
        />
        <Circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          stroke={PRIMARY}
          strokeWidth={stroke}
          fill="none"
          strokeLinecap="round"
          strokeDasharray={`${circumference} ${circumference}`}
          strokeDashoffset={dashOffset}
          rotation="-90"
          originX={size / 2}
          originY={size / 2}
        />
      </Svg>
      <Text style={styles.ringValue}>{progress}%</Text>
      <Text style={styles.ringLabel}>overall</Text>
    </View>
  );
}

function ActivityRow({ item, flat = false }: { item: AttendanceRecord; flat?: boolean }) {
  const tone = item.attended ? "good" : new Date(item.date) > new Date() ? "warn" : "bad";
  const label = item.attended ? "Attended" : new Date(item.date) > new Date() ? item.confirmation : "Missed";

  return (
    <View style={flat ? styles.attendanceFlatRow : styles.activityRow}>
      <View style={styles.dateBox}>
        <Text style={styles.dateMonth}>{format(new Date(item.date), "MMM").toUpperCase()}</Text>
        <Text style={styles.dateDay}>{format(new Date(item.date), "dd")}</Text>
      </View>
      <View style={{ flex: 1 }}>
        <Text style={styles.activityTitle} numberOfLines={1}>{item.title}</Text>
        <Text style={styles.activityMeta}>
          {format(new Date(item.date), "yyyy")} · {activityKind(item.sourceType)}
        </Text>
      </View>
      <StatusPill tone={tone}>{label}</StatusPill>
    </View>
  );
}

function UpcomingCard({ item, onPress }: { item?: PortalActivity; onPress?: (item: PortalActivity) => void }) {
  if (!item) {
    return (
      <View style={styles.upcomingCard}>
        <View style={styles.dateBox}>
          <Text style={styles.dateMonth}>NEXT</Text>
          <Text style={styles.dateDay}>--</Text>
        </View>
        <View style={{ flex: 1 }}>
          <Text style={styles.mutedSmall}>Up next</Text>
          <Text style={styles.activityTitle}>No upcoming call yet</Text>
          <Text style={styles.activityMeta}>New rehearsals and events will appear here.</Text>
        </View>
      </View>
    );
  }

  const joined = item.type === "event" && item.confirmation === "Confirmed";
  const content = (
    <>
      <View style={styles.dateBox}>
        <Text style={styles.dateMonth}>{format(new Date(item.date), "MMM").toUpperCase()}</Text>
        <Text style={styles.dateDay}>{format(new Date(item.date), "dd")}</Text>
      </View>
      <View style={{ flex: 1 }}>
        <Text style={styles.mutedSmall}>Up next · {activityKind(item.type)}</Text>
        <Text style={styles.activityTitle} numberOfLines={1}>{item.title}</Text>
        <Text style={styles.activityMeta} numberOfLines={1}>
          {format(new Date(item.date), "h:mm a")} {item.venueName ? `· ${item.venueName}` : ""}
        </Text>
      </View>
      {joined ? (
        <View style={styles.joinedBadge}>
          <Ionicons name="checkmark" size={13} color={PRIMARY_DARK} />
          <Text style={styles.joinedBadgeText}>Joined</Text>
        </View>
      ) : (
        <Ionicons name="chevron-forward" size={18} color={MUTED} />
      )}
    </>
  );

  return (
    <TouchableOpacity style={styles.upcomingCard} onPress={() => onPress?.(item)} activeOpacity={0.78}>
      {content}
    </TouchableOpacity>
  );
}

function buildEarningsSeries(portal: MemberPortalData): { month: number; paid: number; pending: number }[] {
  const year = portal.earnings.year;
  const monthlyPaid = new Array(12).fill(0);
  const monthlyPending = new Array(12).fill(0);
  for (const gig of portal.earnings.gigs) {
    const date = new Date(gig.date);
    const amount = gig.payoutAmount || 0;
    if (date.getFullYear() !== year || amount <= 0) continue;
    if (gig.attended) monthlyPaid[date.getMonth()] += amount;
    else monthlyPending[date.getMonth()] += amount;
  }
  let lastMonthWithData = 0;
  for (let month = 0; month < 12; month++) {
    if (monthlyPaid[month] > 0 || monthlyPending[month] > 0) lastMonthWithData = month;
  }
  const now = new Date();
  const currentMonth = now.getFullYear() === year ? now.getMonth() : 11;
  const endMonth = Math.min(11, Math.max(currentMonth, lastMonthWithData, 2));
  const points: { month: number; paid: number; pending: number }[] = [];
  let runningPaid = 0;
  let runningPending = 0;
  for (let month = 0; month <= endMonth; month++) {
    runningPaid += monthlyPaid[month];
    runningPending += monthlyPending[month];
    points.push({ month, paid: runningPaid, pending: runningPending });
  }
  return points;
}

function EarningsLineChart({ points }: { points: { month: number; paid: number; pending: number }[] }) {
  const width = 300;
  const height = 132;
  const padL = 6;
  const padR = 6;
  const padT = 14;
  const padB = 20;
  const plotW = width - padL - padR;
  const plotH = height - padT - padB;
  const maxValue = Math.max(...points.map((point) => Math.max(point.paid, point.pending)), 1);
  const count = points.length;

  const x = (index: number) => (count <= 1 ? padL + plotW / 2 : padL + (plotW * index) / (count - 1));
  const y = (value: number) => padT + plotH * (1 - value / maxValue);

  const paidCoords = points.map((point, index) => ({ px: x(index), py: y(point.paid), month: point.month }));
  const pendingCoords = points.map((point, index) => ({ px: x(index), py: y(point.pending), month: point.month }));
  const toPath = (coords: { px: number; py: number }[]) =>
    coords.map((c, i) => `${i === 0 ? "M" : "L"} ${c.px.toFixed(2)} ${c.py.toFixed(2)}`).join(" ");
  const paidPath = toPath(paidCoords);
  const pendingPath = toPath(pendingCoords);
  const areaPath = `${paidPath} L ${paidCoords[paidCoords.length - 1].px.toFixed(2)} ${(padT + plotH).toFixed(2)} L ${paidCoords[0].px.toFixed(2)} ${(padT + plotH).toFixed(2)} Z`;
  const labelStep = count > 7 ? 2 : 1;

  return (
    <Svg width="100%" height={height} viewBox={`0 0 ${width} ${height}`} style={styles.earningsChartSvg}>
      <Defs>
        <LinearGradient id="earningsFill" x1="0" y1="0" x2="0" y2="1">
          <Stop offset="0" stopColor={PRIMARY} stopOpacity={0.28} />
          <Stop offset="1" stopColor={PRIMARY} stopOpacity={0} />
        </LinearGradient>
      </Defs>
      <Line x1={padL} y1={padT + plotH} x2={width - padR} y2={padT + plotH} stroke="#E3EAE6" strokeWidth={1} />
      <Path d={areaPath} fill="url(#earningsFill)" />
      <Path d={pendingPath} fill="none" stroke={GOLD} strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" strokeDasharray="4 4" />
      <Path d={paidPath} fill="none" stroke={PRIMARY} strokeWidth={2.5} strokeLinecap="round" strokeLinejoin="round" />
      {pendingCoords.map((c, index) => (
        <Circle
          key={`pending-${c.month}`}
          cx={c.px}
          cy={c.py}
          r={index === pendingCoords.length - 1 ? 3.5 : 2}
          fill={index === pendingCoords.length - 1 ? GOLD : BG}
          stroke={GOLD}
          strokeWidth={1.5}
        />
      ))}
      {paidCoords.map((c, index) => (
        <Circle
          key={`paid-${c.month}`}
          cx={c.px}
          cy={c.py}
          r={index === paidCoords.length - 1 ? 4 : 2.5}
          fill={index === paidCoords.length - 1 ? PRIMARY : BG}
          stroke={PRIMARY}
          strokeWidth={1.5}
        />
      ))}
      {paidCoords.map((c, index) =>
        index % labelStep === 0 || index === paidCoords.length - 1 ? (
          <SvgText
            key={`label-${c.month}`}
            x={c.px}
            y={height - 6}
            fill={MUTED}
            fontSize={9}
            textAnchor="middle"
          >
            {MONTH_LABELS[c.month]}
          </SvgText>
        ) : null
      )}
    </Svg>
  );
}

const MONTH_LABELS = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];

function EarningsChartCard({ portal }: { portal: MemberPortalData }) {
  const series = buildEarningsSeries(portal);
  const hasEarnings = portal.earnings.total > 0;

  return (
    <View style={styles.earningsChartCard}>
      <View style={styles.earningsChartHeader}>
        <View>
          <Text style={styles.infoLabel}>Earnings this year</Text>
          <Text style={styles.earningsChartValue}>{money(portal.earnings.total)}</Text>
        </View>
        <View style={styles.earningsPendingTextBlock}>
          <Text style={styles.earningsPendingLabel}>Pending</Text>
          <Text style={styles.earningsPendingValue}>{money(portal.earnings.pending)}</Text>
        </View>
      </View>

      {hasEarnings ? (
        <>
          <EarningsLineChart points={series} />
          <View style={styles.earningsLegendRow}>
            <View style={styles.earningsLegendItem}>
              <View style={[styles.earningsLegendDash, { backgroundColor: PRIMARY }]} />
              <Text style={styles.earningsLegendText}>Paid</Text>
            </View>
            <View style={styles.earningsLegendItem}>
              <View style={[styles.earningsLegendDash, styles.earningsLegendDashPending]} />
              <Text style={styles.earningsLegendText}>Pending</Text>
            </View>
          </View>
        </>
      ) : (
        <View style={styles.earningsChartEmpty}>
          <Text style={styles.earningsChartEmptyText}>Gig payouts will appear here as you perform this year.</Text>
        </View>
      )}

      <View style={styles.earningsCounterRow}>
        <InlineCounter value={portal.attendance.rehearsalsAttended} suffix={portal.attendance.rehearsalsTotal} label="Rehearsals" />
        <InlineCounter value={portal.attendance.gigsAttended} suffix={portal.attendance.gigsTotal} label="Gigs" divider />
        <InlineCounter value={portal.attendance.eventsAttended} suffix={portal.attendance.eventsTotal} label="Events" divider />
      </View>
    </View>
  );
}

export function MemberHomeScreen() {
  const navigation = useNavigation<any>();
  return withPortal((portal) => {
    const upcomingEventsAndRehearsals = portal.upcoming.filter(
      (item) => item.type === "event" || item.type === "rehearsal"
    );
    const assignment = getActualAssignment(portal);
    const displayAvatar = portal.member.avatarUrl || portal.user.image;

    return (
      <PortalScaffold>
        <View style={styles.heroCard}>
          <View style={styles.heroIdentityRow}>
            <View style={styles.heroIdentityText}>
              <Text style={styles.heroTitle}>{portal.member.name}</Text>
              <Text style={styles.heroMeta}>
                {portal.member.rank}{portal.member.level ? ` · Level ${portal.member.level}` : ""} · Since {format(new Date(portal.member.joinDate), "yyyy")}
              </Text>
              <View style={styles.heroStatusTextRow}>
                <Text style={styles.heroStatusText}>{portal.member.status} member</Text>
                <Text style={styles.heroStatusDivider}>·</Text>
                <Text style={styles.heroStatusText}>{portal.member.section} division</Text>
              </View>
            </View>
            <View style={styles.heroProfileImageWrap}>
              {displayAvatar ? (
                <Image source={{ uri: displayAvatar }} style={styles.heroProfileImage} />
              ) : (
                <Text style={styles.heroProfileInitials}>{initials(portal.member.name)}</Text>
              )}
              <View style={styles.heroProfileBadge}>
                <Text style={styles.heroProfileBadgeText}>{assignment}</Text>
              </View>
            </View>
          </View>
        </View>

        <EarningsChartCard portal={portal} />

        <SectionHeader title="Upcoming events & rehearsals" />
        <View style={styles.stack}>
          {upcomingEventsAndRehearsals.length ? (
            upcomingEventsAndRehearsals.map((item) => (
              <UpcomingCard
                key={`${item.type}-${item.id}`}
                item={item}
                onPress={(activity) => navigation.navigate("Attendance", { activity, focusActivityKey: `${activity.type}-${activity.sourceId}`, focusNonce: Date.now() })}
              />
            ))
          ) : (
            <UpcomingCard />
          )}
        </View>
      </PortalScaffold>
    );
  });
}

function DivisionHomeBlock({ portal }: { portal: MemberPortalData }) {
  const section = portal.member.section;
  const isChoir = section === "Choir";
  const isRondalla = section === "Rondalla";
  const accent = isRondalla ? "#7C5CBF" : isChoir ? GOLD : PRIMARY;
  const darkAccent = isRondalla ? "#3F2E66" : isChoir ? "#7A5210" : "#0A4F41";
  const label = isRondalla ? "RONDALLA DIVISION" : isChoir ? "CHOIR DIVISION" : "ORCHESTRA DIVISION";
  const headline = isRondalla
    ? "Bandurria · 1st"
    : isChoir
      ? `${portal.member.rank} · Voice part`
      : `${portal.member.section} · ${portal.member.rank}`;
  const subline = isRondalla
    ? "Plucked-string ensemble · plectrum"
    : isChoir
      ? "SATB · rehearsal ready"
      : "Strings, winds and full orchestra calls";
  const assignment = getActualAssignment(portal);
  const repertoire = isRondalla
    ? [["Pandanggo sa Ilaw", "Folk · tremolo feature"], ["Dahil Sa Iyo", "Kundiman · full rondalla"]]
    : isChoir
      ? [["The Prayer", "SATB · with soloists"], ["Pamasko sa Bayan", "A cappella"]]
      : [["Symphony No. 9", "Beethoven · gala prep"], ["Lupang Hinirang", "Full orchestra arrangement"]];

  return (
    <View style={styles.divisionBlock}>
      <View style={[styles.divisionHero, { backgroundColor: darkAccent }]}>
        <Text style={styles.liveBadge}>{label}</Text>
        <Text style={styles.liveTitle}>{headline}</Text>
        <Text style={styles.liveMeta}>{subline}</Text>
      </View>
      <View style={styles.divisionPanel}>
        <Text style={styles.sectionTitle}>{isChoir ? "My voice part" : isRondalla ? "Ensemble instruments" : "My section"}</Text>
        <View style={styles.chipWrap}>
          <View style={[styles.divisionChip, { backgroundColor: accent, borderColor: accent }]}>
            <Text style={[styles.divisionChipText, { color: isChoir ? "#FFFFFF" : isRondalla ? "#FFFFFF" : PRIMARY_DARK, fontFamily: font.extraBold }]}>{assignment}</Text>
          </View>
        </View>
      </View>
      <View style={styles.divisionPanel}>
        <View style={styles.sectionHeader}>
          <Text style={styles.sectionTitle}>{isChoir ? "Repertoire" : "Now rehearsing"}</Text>
          <Text style={[styles.sectionAction, { color: accent }]}>{repertoire.length} pieces</Text>
        </View>
        {repertoire.map(([title, subtitle]) => (
          <View key={title} style={styles.repRow}>
            <View style={[styles.repIcon, { backgroundColor: `${accent}24` }]}>
              <Ionicons name="musical-notes-outline" size={16} color={accent} />
            </View>
            <View style={{ flex: 1 }}>
              <Text style={styles.activityTitle}>{title}</Text>
              <Text style={styles.activityMeta}>{subtitle}</Text>
            </View>
          </View>
        ))}
      </View>
    </View>
  );
}

export function AttendanceScreen({ route }: { route?: { params?: { activity?: PortalActivity; focusActivityKey?: string; focusNonce?: number } } }) {
  return withPortal((portal) => (
    <AttendanceContent
      portal={portal}
      initialActivity={route?.params?.activity}
      focusActivityKey={route?.params?.focusActivityKey}
      focusNonce={route?.params?.focusNonce}
    />
  ));
}

const ATTENDANCE_MODE_HEADERS: Record<"upcoming" | "calendar" | "past", { title: string; subtitle: string }> = {
  upcoming: { title: "Upcoming", subtitle: "Clock in & track upcoming events" },
  calendar: { title: "Calendar", subtitle: "Browse your schedule by date" },
  past: { title: "Past", subtitle: "Your attendance history" },
};

function AttendanceContent({ portal, initialActivity, focusActivityKey, focusNonce }: { portal: MemberPortalData; initialActivity?: PortalActivity; focusActivityKey?: string; focusNonce?: number }) {
  const { preferences } = useMemberSettingsPreferences(portal.user.id);
  const [mode, setMode] = useState<"upcoming" | "calendar" | "past">(preferences.defaultAttendanceView);
  const [selected, setSelected] = useState<PortalActivity | null>(null);
  const [selectedPast, setSelectedPast] = useState<AttendanceRecord | null>(null);
  const [optimisticJoined, setOptimisticJoined] = useState<Set<string>>(() => new Set());
  const consumedFocusKey = useRef<string | undefined>(undefined);
  const queryClient = useQueryClient();
  const selectedActivity = selected
    ? portal.upcoming.find((item) => activityKey(item) === activityKey(selected)) ?? selected
    : null;

  useEffect(() => {
    setMode(preferences.defaultAttendanceView);
  }, [preferences.defaultAttendanceView]);

  useEffect(() => {
    if (!optimisticJoined.size) return;
    const confirmedKeys = new Set(
      portal.upcoming
        .filter((item) => item.confirmation === "Confirmed")
        .map(activityKey)
    );
    setOptimisticJoined((current) => {
      const next = new Set([...current].filter((key) => !confirmedKeys.has(key)));
      return next.size === current.size ? current : next;
    });
  }, [optimisticJoined.size, portal.upcoming]);

  useEffect(() => {
    const key = focusActivityKey ?? (initialActivity ? `${initialActivity.type}-${initialActivity.sourceId}` : undefined);
    if (!key) return;
    const guard = `${key}:${focusNonce ?? ""}`;
    if (consumedFocusKey.current === guard) return;
    const matchesKey = (item: Pick<PortalActivity, "type" | "sourceId">) => `${item.type}-${item.sourceId}` === key;
    const freshActivity =
      portal.upcoming.find(matchesKey) ??
      (initialActivity && matchesKey(initialActivity) ? initialActivity : undefined);
    consumedFocusKey.current = guard;
    setMode("upcoming");
    if (freshActivity) setSelected(freshActivity);
  }, [focusActivityKey, focusNonce, initialActivity, portal.upcoming]);

  const clockInMutation = useMutation({
    mutationFn: ({ activity, location, excuseReason }: { activity: PortalActivity; location: ClockLocationEvidence; excuseReason?: string }) => clockInActivity(activity.type, activity.sourceId, location, excuseReason),
    onSuccess: (_result, { activity }) => {
      queryClient.invalidateQueries({ queryKey: ["member-portal"] });
      const movedToPast = new Date(activity.endDate || activity.date) < new Date();
      Toast.show({
        type: "success",
        text1: "You're clocked in",
        text2: movedToPast ? "This event is now listed under Past." : undefined,
      });
      // Keep the detail open so the member sees the persistent confirmation;
      // only collapse when the activity has rolled over to Past.
      if (movedToPast) setSelected(null);
    },
    onError: (err: { message?: string }) => {
      Toast.show({ type: "error", text1: "Clock-in unavailable", text2: err.message });
    },
  });
  const clockOutMutation = useMutation({
    mutationFn: (activity: PortalActivity) => clockOutActivity(activity.type, activity.sourceId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["member-portal"] });
      Toast.show({ type: "success", text1: "Clock-out recorded" });
      setSelected(null);
    },
    onError: (err: { message?: string }) => {
      Toast.show({ type: "error", text1: "Clock-out unavailable", text2: err.message });
    },
  });
  const rsvpMutation = useMutation({
    mutationFn: (activity: PortalActivity) => rsvpActivity(activity.type, activity.sourceId, "Confirmed"),
    onMutate: (activity) => {
      setOptimisticJoined((current) => new Set(current).add(activityKey(activity)));
      setSelected((current) =>
        current && activityKey(current) === activityKey(activity)
          ? { ...current, confirmation: "Confirmed", isAssigned: true, role: current.role || "Member" }
          : current
      );
    },
    onSuccess: (_result, activity) => {
      queryClient.invalidateQueries({ queryKey: ["member-portal"] });
      Toast.show({ type: "success", text1: "You're in", text2: "Clock-in will open near call time." });
      setSelected((current) =>
        current && activityKey(current) === activityKey(activity)
          ? { ...current, confirmation: "Confirmed", isAssigned: true, role: current.role || "Member" }
          : current
      );
    },
    onError: (err: { message?: string }, activity) => {
      setOptimisticJoined((current) => {
        const next = new Set(current);
        next.delete(activityKey(activity));
        return next;
      });
      Toast.show({ type: "error", text1: "RSVP failed", text2: err.message });
    },
  });

  const upcoming = portal.upcoming;
  const past = portal.attendance.history.filter((item) => new Date(item.date) < new Date());
  const activeNow = upcoming.find((item) => item.clockInWindow?.isOpen);
  const header = ATTENDANCE_MODE_HEADERS[mode];

  return (
    <PortalScaffold>
      <View style={styles.screenHeaderRow}>
        <ScreenTitle title={header.title} subtitle={header.subtitle} />
        <AttendanceModeIcons value={mode} onChange={setMode} />
      </View>
      <View style={styles.attendanceSummary}>
        <ProgressDonut value={portal.attendance.attendanceRate} />
        <View style={styles.summaryLines}>
          <SummaryLine label="Rehearsals" value={`${portal.attendance.rehearsalsAttended} / ${portal.attendance.rehearsalsTotal}`} />
          <SummaryLine label="Gigs" value={`${portal.attendance.gigsAttended} / ${portal.attendance.gigsTotal}`} />
          <SummaryLine label="Events" value={`${portal.attendance.eventsAttended} / ${portal.attendance.eventsTotal}`} />
        </View>
      </View>
      {selectedPast ? (
          <PastActivityDetail item={selectedPast} onBack={() => setSelectedPast(null)} />
      ) : selectedActivity ? (
          <ActivityDetail
            item={selectedActivity}
            optimisticJoined={optimisticJoined.has(activityKey(selectedActivity))}
            onBack={() => setSelected(null)}
            onClockIn={(location, excuseReason) => clockInMutation.mutateAsync({ activity: selectedActivity, location, excuseReason }).then(() => undefined)}
            onClockOut={() => clockOutMutation.mutateAsync(selectedActivity).then(() => undefined)}
            onRsvp={() => rsvpMutation.mutate(selectedActivity)}
            clockingIn={clockInMutation.isPending}
            clockingOut={clockOutMutation.isPending}
            rsvping={rsvpMutation.isPending}
          />
      ) : mode === "calendar" ? (
        <CalendarPanel items={upcoming} onSelect={setSelected} />
      ) : mode === "past" ? (
        <PastPanel items={past} onSelect={setSelectedPast} />
      ) : (
        <UpcomingPanel
          activeNow={activeNow}
          upcoming={upcoming}
          onSelect={setSelected}
          onRsvp={(activity) => rsvpMutation.mutate(activity)}
          optimisticJoined={optimisticJoined}
        />
      )}
    </PortalScaffold>
  );
}

function UpcomingPanel({
  activeNow,
  upcoming,
  onSelect,
  onRsvp,
  optimisticJoined,
}: {
  activeNow?: PortalActivity;
  upcoming: PortalActivity[];
  onSelect: (activity: PortalActivity) => void;
  onRsvp: (activity: PortalActivity) => void;
  optimisticJoined: Set<string>;
}) {
  return (
    <View style={styles.stack}>
      {activeNow ? (
        <View style={styles.attendanceLive}>
          <Text style={styles.liveBadge}>Happening now</Text>
          <Text style={styles.liveTitle}>{activeNow.title}</Text>
          <Text style={styles.liveMeta}>
            {format(new Date(activeNow.date), "h:mm a")} · {activeNow.venueName || "Venue TBA"}
          </Text>
          {activeNow.canClockOut ? (
            <TouchableOpacity style={styles.whiteBtn} onPress={() => onSelect(activeNow)}>
              <Ionicons name="log-out-outline" size={20} color="#0A4F41" />
              <Text style={styles.whiteBtnText}>Clock out</Text>
            </TouchableOpacity>
          ) : activeNow.clockInAt || activeNow.attended ? (
            <View style={styles.liveJoined}>
              <Ionicons name="checkmark-circle" size={18} color="#fff" />
              <Text style={styles.liveJoinedText}>You're in{activeNow.attendanceStatus === "Late" ? " · Late" : ""}</Text>
            </View>
          ) : (
            <TouchableOpacity style={styles.whiteBtn} onPress={() => onSelect(activeNow)}>
              <Ionicons name="log-in-outline" size={20} color="#0A4F41" />
              <Text style={styles.whiteBtnText}>Clock in now</Text>
            </TouchableOpacity>
          )}
        </View>
      ) : null}
      {upcoming.length ? upcoming.map((item) => {
        const joined = item.confirmation === "Confirmed" || optimisticJoined.has(activityKey(item));
        return (
        <TouchableOpacity key={`${item.type}-${item.id}`} style={styles.attendanceFlatRow} onPress={() => onSelect(item)}>
          <View style={styles.dateBox}>
            <Text style={styles.dateMonth}>{format(new Date(item.date), "MMM").toUpperCase()}</Text>
            <Text style={styles.dateDay}>{format(new Date(item.date), "dd")}</Text>
          </View>
          <View style={{ flex: 1 }}>
            <Text style={styles.mutedSmall}>{activityKind(item.type)} · {item.clockInAt || item.attended ? "Clocked in" : joined ? "Joined" : item.confirmation}</Text>
            <Text style={styles.activityTitle} numberOfLines={1}>{item.title}</Text>
            <Text style={styles.activityMeta} numberOfLines={1}>{format(new Date(item.date), "h:mm a")} · {item.venueName || "Venue TBA"}</Text>
          </View>
          {item.clockInAt || item.attended ? (
            <View style={styles.joinedBadge}>
              <Ionicons name="checkmark" size={13} color={PRIMARY_DARK} />
              <Text style={styles.joinedBadgeText}>You're in</Text>
            </View>
          ) : item.type === "event" && !joined ? (
            <TouchableOpacity style={styles.smallAction} onPress={() => onRsvp(item)}>
              <Text style={styles.smallActionText}>I'm in</Text>
            </TouchableOpacity>
          ) : item.type === "event" && joined ? (
            <View style={styles.joinedBadge}>
              <Ionicons name="checkmark" size={13} color={PRIMARY_DARK} />
              <Text style={styles.joinedBadgeText}>Joined</Text>
            </View>
          ) : null}
        </TouchableOpacity>
        );
      }) : (
        <EmptyState title="No upcoming activities" text="Rehearsals, gigs, and events assigned to you will appear here." flat />
      )}
    </View>
  );
}

function CalendarPanel({ items, onSelect }: { items: PortalActivity[]; onSelect: (activity: PortalActivity) => void }) {
  const today = new Date();
  const activityDays = new Set(items.map((item) => new Date(item.date).getDate()));
  const selected = items[0];

  return (
    <View style={styles.stack}>
      <View style={styles.calendarFlat}>
        <View style={styles.calendarHeader}>
          <Ionicons name="chevron-back" size={18} color={MUTED} />
          <Text style={styles.sectionTitle}>{format(today, "MMMM yyyy")}</Text>
          <Ionicons name="chevron-forward" size={18} color={MUTED} />
        </View>
        <View style={styles.weekRow}>
          {["S", "M", "T", "W", "T", "F", "S"].map((day, index) => <Text key={`${day}-${index}`} style={styles.weekDay}>{day}</Text>)}
        </View>
        <View style={styles.monthGrid}>
          {Array.from({ length: 35 }, (_, index) => {
            const day = index + 1;
            const active = day === today.getDate();
            return (
              <View key={day} style={[styles.dayCell, active && styles.dayCellActive]}>
                <Text style={[styles.dayText, active && styles.dayTextActive]}>{day <= 30 ? day : day - 30}</Text>
                <View style={[styles.dayDot, activityDays.has(day) && { backgroundColor: active ? PRIMARY_DARK : PRIMARY }]} />
              </View>
            );
          })}
        </View>
      </View>
      {selected ? (
        <TouchableOpacity style={styles.liveMiniFlat} onPress={() => onSelect(selected)}>
          <Ionicons name="time-outline" size={20} color={PRIMARY} />
          <View style={{ flex: 1 }}>
            <Text style={styles.liveMiniTitle}>{selected.title}</Text>
            <Text style={styles.liveMiniMeta}>{format(new Date(selected.date), "h:mm a")} · {selected.venueName || "Venue TBA"}</Text>
          </View>
          <StatusPill>{selected.clockInWindow?.isOpen ? "Open" : "Soon"}</StatusPill>
        </TouchableOpacity>
      ) : null}
    </View>
  );
}

function PastPanel({ items, onSelect }: { items: AttendanceRecord[]; onSelect: (item: AttendanceRecord) => void }) {
  return (
    <View style={styles.stack}>
      {items.length ? items.map((item) => (
        <TouchableOpacity key={item.id} onPress={() => onSelect(item)} accessibilityRole="button" accessibilityLabel={`View ${item.title} attendance`}>
          <ActivityRow item={item} flat />
        </TouchableOpacity>
      )) : <EmptyState title="No past activities" text="Completed assignments will show here." flat />}
    </View>
  );
}

function PastActivityDetail({ item, onBack }: { item: AttendanceRecord; onBack: () => void }) {
  const detailQuery = useQuery({
    queryKey: ["member-activity", item.sourceType, item.sourceId],
    queryFn: () => getActivity(item.sourceType, item.sourceId),
  });
  const activity = detailQuery.data?.activity;

  return (
    <View style={styles.stack}>
      <NestedBackHeader label="Back to Past" onBack={onBack} />
      <View>
        <StatusPill tone={item.attended ? "good" : "bad"}>{item.attendanceStatus || (item.attended ? "Attended" : "Missed")}</StatusPill>
        <Text style={styles.detailTitle}>{item.title}</Text>
        <Text style={styles.activityMeta}>{format(new Date(item.date), "EEEE, MMMM d, yyyy")}</Text>
      </View>
      <View style={styles.detailFlat}>
        <DetailLine
          icon="time-outline"
          label="Time"
          value={activity?.endDate ? `${format(new Date(activity.date), "h:mm a")} - ${format(new Date(activity.endDate), "h:mm a")}` : format(new Date(item.date), "h:mm a")}
        />
        {activity?.venueName ? <DetailLine icon="location-outline" label="Location" value={activity.venueName} /> : null}
        <DetailLine icon="musical-notes-outline" label="Role" value={item.role || activityKind(item.sourceType)} />
        <DetailLine icon="clipboard-outline" label="Your attendance" value={`${item.attendanceStatus || (item.attended ? "Attended" : "Missed")}${item.lateMinutes ? ` · ${item.lateMinutes} min late` : ""}`} />
      </View>
      {detailQuery.isError ? <Text style={styles.inlineError}>Some activity details could not be loaded.</Text> : null}
      <FullyAttendedSection type={item.sourceType} sourceId={item.sourceId} />
    </View>
  );
}

function FullyAttendedSection({ type, sourceId }: { type: PortalActivity["type"]; sourceId: string }) {
  const [expanded, setExpanded] = useState(false);
  const query = useQuery({
    queryKey: ["fully-attended", type, sourceId],
    queryFn: () => getFullyAttendedMembers(type, sourceId),
  });

  return (
    <View style={styles.attendeeSection}>
      <View style={styles.attendeeHeader}>
        <View>
          <Text style={styles.sectionTitle}>Fully attended</Text>
          <Text style={styles.activityMeta}>{query.data ? `${query.data.total} member${query.data.total === 1 ? "" : "s"}` : "Members present for the full activity"}</Text>
        </View>
        {query.isFetching ? <ActivityIndicator size="small" color={PRIMARY} /> : null}
      </View>
      {query.isError ? (
        <Text style={styles.inlineError}>Could not load attendees. Pull to refresh and try again.</Text>
      ) : query.data?.attendees.length ? (
        <>
          <TouchableOpacity onPress={() => setExpanded((value) => !value)} accessibilityRole="button" accessibilityLabel="Show fully attended members">
            <View style={styles.attendeeAvatarStack}>
              {query.data.attendees.slice(0, 6).map((attendee, index) => (
                <MemberAttendeeAvatar key={attendee.memberId} attendee={attendee} stacked={index > 0} />
              ))}
              {query.data.total > 6 ? (
                <View style={[styles.attendeeAvatar, styles.attendeeOverflow, styles.attendeeStacked]}>
                  <Text style={styles.attendeeOverflowText}>+{query.data.total - 6}</Text>
                </View>
              ) : null}
              <Ionicons name={expanded ? "chevron-up" : "chevron-down"} size={18} color={MUTED} style={styles.attendeeChevron} />
            </View>
          </TouchableOpacity>
          {expanded ? (
            <View style={styles.attendeeList}>
              {query.data.attendees.map((attendee) => (
                <View key={attendee.memberId} style={styles.attendeeRow}>
                  <MemberAttendeeAvatar attendee={attendee} />
                  <Text style={styles.attendeeName}>{attendee.name}</Text>
                </View>
              ))}
            </View>
          ) : null}
        </>
      ) : query.data ? (
        <Text style={styles.emptyCopy}>No members were recorded as fully attended.</Text>
      ) : null}
    </View>
  );
}

function MemberAttendeeAvatar({ attendee, stacked = false }: { attendee: FullyAttendedMember; stacked?: boolean }) {
  const [imageFailed, setImageFailed] = useState(false);
  const showImage = Boolean(attendee.avatarUrl) && !imageFailed;
  return (
    <View style={[styles.attendeeAvatar, stacked && styles.attendeeStacked]}>
      {showImage ? (
        <Image source={{ uri: attendee.avatarUrl || "" }} style={styles.attendeeAvatarImage} onError={() => setImageFailed(true)} />
      ) : (
        <Text style={styles.attendeeInitials}>{initials(attendee.name)}</Text>
      )}
    </View>
  );
}

function ActivityDetail({
  item,
  onBack,
  onClockIn,
  onClockOut,
  onRsvp,
  clockingIn,
  clockingOut,
  rsvping,
  optimisticJoined,
}: {
  item: PortalActivity;
  onBack: () => void;
  onClockIn: (location: ClockLocationEvidence, excuseReason?: string) => Promise<void>;
  onClockOut: () => Promise<void>;
  onRsvp: () => void;
  clockingIn: boolean;
  clockingOut: boolean;
  rsvping: boolean;
  optimisticJoined: boolean;
}) {
  const [excuseReason, setExcuseReason] = useState("");
  const [mapAction, setMapAction] = useState<"in" | "out" | null>(null);
  const status = item.attendanceStatus || (item.attended ? "Present" : "Pending");
  const canClockIn = item.canClockIn ?? Boolean(item.clockInWindow?.isOpen && !item.clockInAt);
  const canClockOut = item.canClockOut ?? Boolean(item.requiresClockOut && item.clockInAt && !item.clockOutAt);
  const joined = item.confirmation === "Confirmed" || optimisticJoined;
  const needsRsvp = item.type === "event" && !joined;
  const likelyLate = canClockIn && !item.clockInAt && new Date() > new Date(item.date);
  const clockInMessage = item.clockInWindow?.isOpen && item.locationConfigured === false
    ? "Clock-in is disabled until an administrator sets the venue pin"
    : item.clockInWindow?.isOpen
    ? `Window closes at ${format(new Date(item.clockInWindow.closesAt), "h:mm a")}`
    : item.clockInWindow?.isUpcoming
      ? `Clock-in opens at ${format(new Date(item.clockInWindow.opensAt), "h:mm a")}`
      : "Clock-in has closed";
  const clockedIn = Boolean(item.clockInAt || item.attended);
  const clockedInDetail = `${status === "Late" ? `Marked late${item.lateMinutes ? ` · ${item.lateMinutes} min` : ""}` : "Marked present"}${item.clockInAt ? ` · ${format(new Date(item.clockInAt), "h:mm a")}` : ""}`;
  const activityEnded = Boolean(item.endDate && new Date(item.endDate) <= new Date());

  return (
    <View style={styles.stack}>
      <NestedBackHeader label="Back to Attendance" onBack={onBack} />
      <View>
        <StatusPill tone={item.clockInWindow?.isOpen ? "good" : "warn"}>
          {item.clockInWindow?.isOpen ? "Clock-in open" : item.clockInWindow?.isUpcoming ? "Not open yet" : "Closed"}
        </StatusPill>
        <Text style={styles.detailTitle}>{item.title}</Text>
        <Text style={styles.activityMeta}>{format(new Date(item.date), "EEEE, MMMM d, yyyy")}</Text>
      </View>
      <View style={styles.detailFlat}>
        <DetailLine icon="time-outline" label="Time" value={`${format(new Date(item.date), "h:mm a")} - ${item.endDate ? format(new Date(item.endDate), "h:mm a") : "TBA"}`} />
        <DetailLine icon="location-outline" label="Location" value={item.venueName || "Venue TBA"} />
        <DetailLine icon="musical-notes-outline" label="Role" value={item.role || activityKind(item.type)} />
        <DetailLine icon="checkmark-circle-outline" label="Response" value={needsRsvp ? "Tap I'm in to join this event" : joined ? "Joined" : item.confirmation} />
        <DetailLine icon="clipboard-outline" label="Attendance" value={`${status}${item.lateMinutes ? ` · ${item.lateMinutes} min late` : ""}`} />
      </View>
      {activityEnded ? <FullyAttendedSection type={item.type} sourceId={item.sourceId} /> : null}
      {item.type === "event" && joined ? (
        <View style={styles.joinedNotice}>
          <View style={styles.joinedNoticeIcon}>
            <Ionicons name="checkmark-circle" size={22} color={PRIMARY_DARK} />
          </View>
          <View style={{ flex: 1 }}>
            <Text style={styles.joinedNoticeTitle}>You're in this event</Text>
            <Text style={styles.joinedNoticeText}>Your spot is confirmed. Attendance check-in is a separate step on event day.</Text>
          </View>
        </View>
      ) : null}
      {likelyLate ? (
        <TextInput
          value={excuseReason}
          onChangeText={setExcuseReason}
          placeholder="Reason for late arrival (optional)"
          placeholderTextColor={DIM}
          style={styles.input}
        />
      ) : null}
      {needsRsvp ? (
        <TouchableOpacity style={styles.primaryBtn} disabled={rsvping} onPress={onRsvp}>
          <Text style={styles.primaryBtnText}>{rsvping ? "Joining..." : "I'm in"}</Text>
        </TouchableOpacity>
      ) : canClockOut ? (
        <TouchableOpacity style={styles.primaryBtn} disabled={clockingOut} onPress={() => setMapAction("out")}>
          <Text style={styles.primaryBtnText}>{clockingOut ? "Clocking out..." : "Clock out"}</Text>
        </TouchableOpacity>
      ) : clockedIn ? (
        <View style={styles.joinedNotice}>
          <View style={styles.joinedNoticeIcon}>
            <Ionicons name="checkmark-circle" size={22} color={PRIMARY_DARK} />
          </View>
          <View style={{ flex: 1 }}>
            <Text style={styles.joinedNoticeTitle}>You're clocked in</Text>
            <Text style={styles.joinedNoticeText}>{clockedInDetail}</Text>
          </View>
        </View>
      ) : canClockIn ? (
        <TouchableOpacity style={styles.primaryBtn} disabled={clockingIn} onPress={() => setMapAction("in")}>
          <Text style={styles.primaryBtnText}>{clockingIn ? "Clocking in..." : "Clock in"}</Text>
        </TouchableOpacity>
      ) : (
        <View style={styles.clockInInfo}>
          <Ionicons name="time-outline" size={18} color={GOLD} />
          <Text style={styles.clockInInfoText}>{clockInMessage}</Text>
        </View>
      )}
      {item.clockOutAt ? <Text style={styles.centerText}>Clocked out at {format(new Date(item.clockOutAt), "h:mm a")}</Text> : null}
      {canClockIn || item.clockInAt || item.attended || canClockOut ? (
        <Text style={styles.centerText}>{clockInMessage}</Text>
      ) : null}
      <AttendanceMapModal
        visible={mapAction !== null}
        action={mapAction || "in"}
        venueName={item.venueName}
        venueAddress={item.venueAddress}
        venueLatitude={item.venueLatitude}
        venueLongitude={item.venueLongitude}
        geofenceRadiusMeters={item.geofenceRadiusMeters}
        busy={mapAction === "in" ? clockingIn : clockingOut}
        onClose={() => setMapAction(null)}
        onConfirm={(location) => mapAction === "out"
          ? onClockOut()
          : location
            ? onClockIn(location, excuseReason)
            : Promise.reject(new Error("A current GPS location is required"))}
      />
    </View>
  );
}

function DetailLine({ icon, label, value }: { icon: React.ComponentProps<typeof Ionicons>["name"]; label: string; value: string }) {
  return (
    <View style={styles.detailLine}>
      <Ionicons name={icon} size={18} color={PRIMARY} />
      <View style={{ flex: 1 }}>
        <Text style={styles.detailLabel}>{label.toUpperCase()}</Text>
        <Text style={styles.detailValue}>{value}</Text>
      </View>
    </View>
  );
}

export function StatusScreen() {
  return withPortal((portal) => {
    const attendanceOk = portal.attendance.attendanceRate >= 80;
    const activeMember = portal.member.status === "Active";
    const scholarshipOk = attendanceOk && activeMember;

    return (
      <PortalScaffold>
        <ScreenTitle title="Scholarship" subtitle="Eligibility and renewal status" />
        <View style={styles.statusHero}>
          <View style={[styles.statusIcon, { backgroundColor: scholarshipOk ? "rgba(52,200,171,.14)" : "rgba(224,178,92,.16)" }]}>
            <Ionicons name="school" size={34} color={scholarshipOk ? PRIMARY : GOLD} />
          </View>
          <Text style={styles.statusTitle}>{scholarshipOk ? "Scholarship active" : "Scholarship review"}</Text>
          <Text style={styles.statusText}>
            {scholarshipOk
              ? "Your attendance and active member status currently meet scholarship requirements."
              : "Your scholarship standing needs review. Improve attendance or check in with your coordinator."}
          </Text>
        </View>
        <View style={styles.stack}>
          <StatusLine icon="school-outline" label="Scholarship" value={scholarshipOk ? "Active" : "For review"} ok={scholarshipOk} />
          <StatusLine icon="calendar-outline" label="Attendance requirement" value={`${portal.attendance.attendanceRate}%`} ok={attendanceOk} />
          <StatusLine icon="person-outline" label="Member requirement" value={portal.member.status} ok={activeMember} />
          <StatusLine icon="reader-outline" label="Renewal file" value={portal.user.emailVerified ? "Ready" : "Incomplete"} ok={portal.user.emailVerified} />
        </View>
      </PortalScaffold>
    );
  });
}

export function NotificationsScreen() {
  return withPortal(() => <NotificationsContent />);
}

function NotificationsContent() {
  const queryClient = useQueryClient();
  const navigation = useNavigation<any>();
  const notificationsQuery = useQuery({
    queryKey: ["notifications"],
    queryFn: () => getNotifications(50),
    refetchInterval: 30_000,
  });
  const markReadMutation = useMutation({
    mutationFn: markNotificationRead,
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["notifications"] }),
  });
  const markAllMutation = useMutation({
    mutationFn: markAllNotificationsRead,
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["notifications"] }),
  });
  const deleteMutation = useMutation({
    mutationFn: deleteNotification,
    // Optimistically drop the row so the list closes the gap immediately on swipe.
    onMutate: async (id: string) => {
      await queryClient.cancelQueries({ queryKey: ["notifications"] });
      const previous = queryClient.getQueryData<PagedNotifications>(["notifications"]);
      if (previous) {
        const removed = previous.items.find((n) => n.id === id);
        queryClient.setQueryData<PagedNotifications>(["notifications"], {
          ...previous,
          items: previous.items.filter((n) => n.id !== id),
          unreadCount: removed && !removed.readAt ? Math.max(0, previous.unreadCount - 1) : previous.unreadCount,
        });
      }
      return { previous };
    },
    onError: (_err, _id, context) => {
      if (context?.previous) queryClient.setQueryData(["notifications"], context.previous);
      Toast.show({ type: "error", text1: "Couldn't delete notification" });
    },
    onSettled: () => queryClient.invalidateQueries({ queryKey: ["notifications"] }),
  });
  const serverNotifications = notificationsQuery.data?.items ?? [];
  const unreadCount = notificationsQuery.data?.unreadCount ?? 0;
  const notifications = [
    ...serverNotifications.filter((item) => !item.readAt),
    ...serverNotifications.filter((item) => item.readAt),
  ];

  function openServerNotification(item: AppNotification) {
    if (!item.readAt) markReadMutation.mutate(item.id);

    // Payout changes belong on the Earnings tab.
    if (item.type === "member_payout_updated") {
      navigation.navigate("Earnings" as never);
      return;
    }

    // Event / rehearsal / gig notifications open that activity's detail in Attendance.
    if ((item.sourceType === "event" || item.sourceType === "rehearsal" || item.sourceType === "gig") && item.sourceId) {
      navigation.navigate("Attendance", { focusActivityKey: `${item.sourceType}-${item.sourceId}`, focusNonce: Date.now() });
      return;
    }

    // Fallback to the tab the backend suggested.
    if (item.actionUrl === "Earnings") navigation.navigate("Earnings" as never);
    else if (item.actionUrl === "Attendance") navigation.navigate("Attendance" as never);
    else navigation.navigate("Home" as never);
  }

  return (
    <PortalScaffold>
      <View style={styles.screenHeaderRow}>
        <ScreenTitle title="Notifications" subtitle={`${unreadCount} item${unreadCount === 1 ? "" : "s"} need attention`} />
        <TouchableOpacity
          style={styles.notificationBellHeader}
          activeOpacity={0.78}
          disabled={!unreadCount || markAllMutation.isPending}
          onPress={() => markAllMutation.mutate()}
        >
          <Ionicons name="notifications-outline" size={22} color={PRIMARY} />
          {unreadCount ? <View style={styles.notificationBellDot}><Text style={styles.notificationBellDotText}>{unreadCount}</Text></View> : null}
        </TouchableOpacity>
      </View>

      <View style={styles.notificationList}>
        {notifications.length ? notifications.map((item) => (
          <ServerNotificationRow
            key={item.id}
            item={item}
            onPress={openServerNotification}
            onDelete={(target) => deleteMutation.mutate(target.id)}
          />
        )) : (
          <EmptyState
            title={notificationsQuery.isLoading ? "Syncing updates" : "You're all caught up"}
            text="New notifications will appear here."
            flat
            hideBottomBorder
          />
        )}
      </View>
    </PortalScaffold>
  );
}

const SWIPE_DELETE_THRESHOLD = 90;

function ServerNotificationRow({
  item,
  onPress,
  onDelete,
}: {
  item: AppNotification;
  onPress: (item: AppNotification) => void;
  onDelete: (item: AppNotification) => void;
}) {
  const unread = !item.readAt;
  const color = notificationTypeColor(item.type);
  const translateX = useRef(new Animated.Value(0)).current;

  const panResponder = useRef(
    PanResponder.create({
      // A horizontal-dominant drag is a swipe; let plain taps and vertical
      // scrolls fall through to the row / parent ScrollView.
      onMoveShouldSetPanResponder: (_evt, gesture) =>
        Math.abs(gesture.dx) > 6 && Math.abs(gesture.dx) > Math.abs(gesture.dy),
      // Claim horizontal drags in the capture phase too, so the row wins the
      // gesture before the surrounding vertical ScrollView can take it.
      onMoveShouldSetPanResponderCapture: (_evt, gesture) =>
        Math.abs(gesture.dx) > 6 && Math.abs(gesture.dx) > Math.abs(gesture.dy),
      // Once we own the swipe, don't let the ScrollView reclaim it mid-drag.
      onPanResponderTerminationRequest: () => false,
      onShouldBlockNativeResponder: () => true,
      onPanResponderMove: (_evt, gesture) => {
        // Left-swipe only — clamp rightward drags to 0.
        translateX.setValue(Math.min(0, gesture.dx));
      },
      onPanResponderRelease: (_evt, gesture) => {
        if (gesture.dx < -SWIPE_DELETE_THRESHOLD) {
          Animated.timing(translateX, {
            toValue: -600,
            duration: 180,
            useNativeDriver: true,
          }).start(() => onDelete(item));
        } else {
          Animated.spring(translateX, { toValue: 0, useNativeDriver: true, bounciness: 4 }).start();
        }
      },
      onPanResponderTerminate: () => {
        Animated.spring(translateX, { toValue: 0, useNativeDriver: true }).start();
      },
    })
  ).current;

  return (
    <View style={styles.swipeRowContainer}>
      <View style={styles.swipeDeleteBackground} pointerEvents="none">
        <Text style={styles.swipeDeleteLabel}>Delete</Text>
      </View>
      <Animated.View style={[styles.swipeRowForeground, { transform: [{ translateX }] }]} {...panResponder.panHandlers}>
        <TouchableOpacity style={[styles.notificationRow, unread && styles.notificationRowUnread]} activeOpacity={0.78} onPress={() => onPress(item)}>
          <View style={[styles.notificationIcon, { backgroundColor: `${color}22` }]}>
            <Ionicons name={notificationTypeIcon(item.type)} size={20} color={color} />
          </View>
          <View style={styles.notificationBody}>
            <View style={styles.notificationTitleRow}>
              <Text style={styles.activityTitle} numberOfLines={1}>{item.title}</Text>
              {unread ? <View style={styles.unreadDot} /> : null}
            </View>
            <Text style={styles.activityMeta} numberOfLines={2}>{item.body}</Text>
            <View style={styles.notificationMetaRow}>
              <Text style={styles.notificationCategory}>{notificationSourceLabel(item.sourceType)}</Text>
              <Text style={styles.notificationTime}>{format(new Date(item.createdAt), "MMM d, h:mm a")}</Text>
            </View>
          </View>
        </TouchableOpacity>
      </Animated.View>
    </View>
  );
}

function notificationTypeIcon(type: AppNotification["type"]): React.ComponentProps<typeof Ionicons>["name"] {
  if (type.includes("gig") || type === "member_payout_updated") return "cash-outline";
  if (type.includes("rehearsal")) return "musical-notes-outline";
  if (type.includes("rsvp")) return "checkmark-circle-outline";
  if (type.includes("attendance")) return "time-outline";
  return "calendar-outline";
}

function notificationTypeColor(type: AppNotification["type"]) {
  if (type === "member_attendance_updated") return GOLD;
  if (type === "member_payout_updated") return "#1E9E63";
  if (type.includes("assigned")) return PRIMARY;
  return "#4A7DDC";
}

function notificationSourceLabel(sourceType: AppNotification["sourceType"]) {
  if (sourceType === "gig") return "Gig";
  if (sourceType === "rehearsal") return "Rehearsal";
  if (sourceType === "event") return "Event";
  if (sourceType === "member") return "Member";
  return "System";
}

const STIPEND_METHOD_LABELS: Record<StipendDisbursementMethod, string> = {
  cash: "Cash",
  gcash: "GCash",
  maya: "Maya",
  bank_transfer: "Bank transfer",
  other: "Other",
};

function stipendMethodLabel(method: StipendDisbursementMethod | null) {
  return method ? STIPEND_METHOD_LABELS[method] : null;
}

function stipendPeriodLabel(year: number, month: number) {
  const label = MONTH_LABELS[month - 1] ?? `M${month}`;
  return `${label} ${year}`;
}

function stipendStatusMeta(status: StipendDisbursementStatus): { label: string; tone: "good" | "warn" | "bad" } {
  if (status === "acknowledged") return { label: "Acknowledged", tone: "good" };
  if (status === "disbursed") return { label: "Disbursed", tone: "good" };
  if (status === "cancelled") return { label: "Cancelled", tone: "bad" };
  return { label: "Scheduled", tone: "warn" };
}

type PayoutItem =
  | { kind: "gig"; key: string; ts: number; gig: MemberPortalData["earnings"]["gigs"][number] }
  | { kind: "stipend"; key: string; ts: number; disbursement: StipendDisbursementDTO };

const PAYOUT_FIELD_LABELS: Record<string, string> = {
  _id: "Record ID",
  id: "Record ID",
  sourceId: "Source ID",
  member: "Member",
  contract: "Contract ID",
  type: "Type",
  title: "Title",
  amount: "Amount",
  payoutAmount: "Amount",
  status: "Status",
  method: "Method",
  referenceNumber: "Reference number",
  proofUrl: "Receipt",
  periodYear: "Period year",
  periodMonth: "Period month",
  scheduledDate: "Release date",
  disbursedDate: "Released on",
  disbursedBy: "Released by",
  acknowledgedDate: "Acknowledged on",
  acknowledgementSignature: "Signed by",
  acknowledgementNote: "Note",
  date: "Date",
  endDate: "End date",
  venueName: "Venue",
  venueAddress: "Venue address",
  role: "Role",
  confirmation: "Confirmation",
  isAssigned: "Assigned",
  attended: "Attended",
  attendanceStatus: "Attendance status",
  clockInAt: "Clocked in",
  clockOutAt: "Clocked out",
  lateMinutes: "Late (minutes)",
  earlyLeaveMinutes: "Left early (minutes)",
  excuseStatus: "Excuse status",
  requiresClockOut: "Requires clock-out",
  canClockIn: "Can clock in",
  canClockOut: "Can clock out",
  createdBy: "Created by",
  createdAt: "Created",
  updatedAt: "Updated",
};

const PAYOUT_DATE_KEYS = new Set([
  "date", "endDate", "scheduledDate", "disbursedDate", "acknowledgedDate",
  "clockInAt", "clockOutAt", "createdAt", "updatedAt",
]);

function payoutFieldLabel(key: string): string {
  return PAYOUT_FIELD_LABELS[key] ?? key.replace(/([A-Z])/g, " $1").replace(/^./, (c) => c.toUpperCase());
}

function formatPayoutValue(key: string, value: unknown): string | null {
  if (value === null || value === undefined || value === "") return null;
  if (typeof value === "object") {
    const name = (value as { name?: unknown }).name;
    return typeof name === "string" ? name : null; // e.g. populated member ref → name; skip other objects
  }
  if (typeof value === "boolean") return value ? "Yes" : "No";
  if (key === "amount" || key === "payoutAmount") return money(Number(value));
  if (key === "proofUrl") return "Attached";
  if (key === "method") return stipendMethodLabel(value as StipendDisbursementMethod) ?? String(value);
  if (key === "periodMonth") return MONTH_LABELS[Number(value) - 1] ?? String(value);
  if (PAYOUT_DATE_KEYS.has(key) && typeof value === "string") {
    const d = new Date(value);
    if (!Number.isNaN(d.getTime())) return format(d, "MMM d, yyyy • h:mm a");
  }
  return String(value);
}

// Every populated field of a payout record, except the ones already shown in the modal header.
function payoutFields(record: Record<string, unknown>, exclude: string[] = []): { label: string; value: string }[] {
  const skip = new Set(exclude);
  const rows: { label: string; value: string }[] = [];
  for (const [key, raw] of Object.entries(record)) {
    if (skip.has(key)) continue;
    const value = formatPayoutValue(key, raw);
    if (value !== null) rows.push({ label: payoutFieldLabel(key), value });
  }
  return rows;
}

function DetailRow({ label, value }: { label: string; value: string }) {
  return (
    <View style={styles.payoutDetailRow}>
      <Text style={styles.payoutDetailLabel}>{label}</Text>
      <Text style={styles.payoutDetailValue}>{value}</Text>
    </View>
  );
}

function EarningsContent({ portal }: { portal: MemberPortalData }) {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const [detail, setDetail] = useState<PayoutItem | null>(null);
  const [signature, setSignature] = useState("");
  const [note, setNote] = useState("");

  const stipendsQuery = useQuery({
    queryKey: ["my-stipends", user?.email ?? "anonymous"],
    queryFn: getMyStipends,
  });

  const ackMutation = useMutation({
    mutationFn: ({ id, signature: sig, note: memo }: { id: string; signature: string; note?: string }) =>
      acknowledgeStipend(id, sig, memo),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["my-stipends"] });
      Toast.show({ type: "success", text1: "Receipt acknowledged", text2: "Thanks for confirming your stipend." });
      closeDetail();
    },
    onError: (err: { message?: string }) => {
      Toast.show({ type: "error", text1: "Couldn't acknowledge", text2: err.message });
    },
  });

  function openDetail(item: PayoutItem) {
    setDetail(item);
    setSignature("");
    setNote("");
  }

  function closeDetail() {
    setDetail(null);
    setSignature("");
    setNote("");
  }

  function submitAck() {
    if (detail?.kind !== "stipend" || !signature.trim()) return;
    ackMutation.mutate({ id: detail.disbursement._id, signature: signature.trim(), note: note.trim() || undefined });
  }

  const stipendTotal = stipendsQuery.data?.totalReceived ?? 0;

  // Merge gig payouts and stipend disbursements into one chronological payout list.
  const payoutItems: PayoutItem[] = [
    ...portal.earnings.gigs.map((gig) => ({
      kind: "gig" as const,
      key: `gig-${gig.id}`,
      ts: new Date(gig.date).getTime(),
      gig,
    })),
    ...(stipendsQuery.data?.disbursements ?? [])
      .filter((d) => d.status !== "cancelled")
      .map((disbursement) => ({
        kind: "stipend" as const,
        key: `stipend-${disbursement._id}`,
        ts: new Date(disbursement.scheduledDate).getTime(),
        disbursement,
      })),
  ].sort((a, b) => b.ts - a.ts);

  const detailDisbursement = detail?.kind === "stipend" ? detail.disbursement : null;

  return (
    <PortalScaffold>
      <ScreenTitle title="Earnings" subtitle={`Gig payouts & stipends for ${portal.earnings.year}`} />
      <View style={styles.earningsHero}>
        <View style={styles.earningsSplitRow}>
          <View style={styles.earningsSplitCol}>
            <Text style={styles.infoLabel}>Monthly stipend</Text>
            <Text style={styles.earningsSplitValue}>{money(stipendTotal)}</Text>
          </View>
          <View style={[styles.earningsSplitCol, styles.earningsSplitColDivider]}>
            <Text style={styles.infoLabel}>Gig payouts</Text>
            <Text style={styles.earningsSplitValue}>{money(portal.earnings.total)}</Text>
          </View>
        </View>
        <Text style={styles.infoWarn}>{money(portal.earnings.pending)} pending attendance confirmation</Text>
      </View>

      <SectionHeader title="Payout history" />
      <View style={styles.payoutList}>
        {payoutItems.length ? (
          payoutItems.map((item) => {
            const isStipend = item.kind === "stipend";
            const title = isStipend ? "Monthly stipend" : item.gig.title;
            const subtitle = isStipend
              ? stipendPeriodLabel(item.disbursement.periodYear, item.disbursement.periodMonth)
              : activityDate(item.gig.date);
            const amount = isStipend ? item.disbursement.amount : item.gig.payoutAmount;
            const needsAck = isStipend && item.disbursement.status === "disbursed";
            return (
              <TouchableOpacity key={item.key} style={styles.payoutRow} activeOpacity={0.7} onPress={() => openDetail(item)}>
                <View style={styles.payoutRowMain}>
                  <Text style={styles.activityTitle} numberOfLines={1}>{title}</Text>
                  <Text style={styles.activityMeta}>{subtitle}</Text>
                </View>
                <View style={styles.payoutRowRight}>
                  {needsAck ? <View style={styles.payoutDot} /> : null}
                  <Text style={styles.earningAmount}>{money(amount)}</Text>
                  <Ionicons name="chevron-forward" size={16} color={DIM} />
                </View>
              </TouchableOpacity>
            );
          })
        ) : (
          <EmptyState title="No payouts yet" text="Gig payouts and monthly stipend releases will appear here." flat />
        )}
      </View>

      <Modal visible={!!detail} transparent animationType="fade" onRequestClose={closeDetail}>
        <KeyboardAvoidingView
          style={styles.stipendModalBackdrop}
          behavior={Platform.OS === "ios" ? "padding" : undefined}
        >
          <View style={styles.stipendModalCard}>
            {detail?.kind === "gig" ? (
              <>
                <Text style={styles.payoutDetailKicker}>Gig payout</Text>
                <Text style={styles.stipendModalTitle}>{detail.gig.title}</Text>
                <Text style={styles.payoutDetailAmount}>{money(detail.gig.payoutAmount)}</Text>
                <ScrollView style={styles.payoutDetailScroll} keyboardShouldPersistTaps="handled">
                  <View style={styles.payoutDetailList}>
                    {payoutFields(detail.gig as unknown as Record<string, unknown>, ["title", "payoutAmount"]).map((f) => (
                      <DetailRow key={f.label} label={f.label} value={f.value} />
                    ))}
                  </View>
                </ScrollView>
              </>
            ) : detailDisbursement ? (
              <>
                <Text style={styles.payoutDetailKicker}>Monthly stipend</Text>
                <Text style={styles.stipendModalTitle}>
                  {stipendPeriodLabel(detailDisbursement.periodYear, detailDisbursement.periodMonth)}
                </Text>
                <Text style={styles.payoutDetailAmount}>{money(detailDisbursement.amount)}</Text>
                <ScrollView style={styles.payoutDetailScroll} keyboardShouldPersistTaps="handled">
                  <View style={styles.payoutDetailList}>
                    {payoutFields(detailDisbursement as unknown as Record<string, unknown>, ["amount"]).map((f) => (
                      <DetailRow key={f.label} label={f.label} value={f.value} />
                    ))}
                  </View>

                  {detailDisbursement.status === "disbursed" ? (
                    <View style={styles.payoutDetailAck}>
                      <Text style={styles.stipendModalSub}>Confirm you received this stipend.</Text>
                      <Text style={styles.stipendFieldLabel}>Signature (type your full name)</Text>
                      <TextInput
                        value={signature}
                        onChangeText={setSignature}
                        placeholder="Your full name"
                        placeholderTextColor={DIM}
                        style={styles.input}
                        autoCapitalize="words"
                      />
                      <Text style={styles.stipendFieldLabel}>Note (optional)</Text>
                      <TextInput
                        value={note}
                        onChangeText={setNote}
                        placeholder="Add a note (optional)"
                        placeholderTextColor={DIM}
                        style={[styles.input, styles.stipendNoteInput]}
                        multiline
                      />
                      <TouchableOpacity
                        style={[styles.primaryBtn, (!signature.trim() || ackMutation.isPending) && styles.stipendBtnDisabled]}
                        disabled={!signature.trim() || ackMutation.isPending}
                        onPress={submitAck}
                      >
                        <Text style={styles.primaryBtnText}>{ackMutation.isPending ? "Submitting..." : "Confirm receipt"}</Text>
                      </TouchableOpacity>
                    </View>
                  ) : null}
                </ScrollView>
              </>
            ) : null}

            <TouchableOpacity style={styles.outlineBtn} onPress={closeDetail} disabled={ackMutation.isPending}>
              <Text style={styles.outlineBtnText}>Close</Text>
            </TouchableOpacity>
          </View>
        </KeyboardAvoidingView>
      </Modal>
    </PortalScaffold>
  );
}

export function EarningsScreen() {
  return withPortal((portal) => <EarningsContent portal={portal} />);
}

export function MemberSettingsScreen({
  route,
}: {
  route?: { params?: { item?: MemberSettingsItem; nonce?: number } };
}) {
  const [activeItem, setActiveItem] = useState<MemberSettingsItem>("menu");
  const requestedItem = route?.params?.item;
  const requestNonce = route?.params?.nonce;

  // Home's quick-access tiles deep-link straight to a settings sub-screen. The nonce
  // makes a repeat tap on the same tile re-open it after the user has navigated back.
  useEffect(() => {
    if (requestedItem) setActiveItem(requestedItem);
  }, [requestedItem, requestNonce]);

  return withPortal((portal) =>
    <MemberSettingsRouter
      portal={portal}
      activeItem={activeItem}
      onSelect={setActiveItem}
    />
  );
}

function MemberSettingsRouter({
  portal,
  activeItem,
  onSelect,
}: {
  portal: MemberPortalData;
  activeItem: MemberSettingsItem;
  onSelect: (item: MemberSettingsItem) => void;
}) {
  const { preferences, updatePreferences } = useMemberSettingsPreferences(portal.user.id);
  const goBack = () => onSelect("menu");

  if (activeItem === "profile") return <ProfileContent portal={portal} preferences={preferences} onBack={goBack} />;
  if (activeItem === "notifications") return <NotificationSettings preferences={preferences} onChange={updatePreferences} onBack={goBack} />;
  if (activeItem === "privacy") return <PrivacySettings preferences={preferences} onChange={updatePreferences} onBack={goBack} />;
  if (activeItem === "security") return <SecuritySettings portal={portal} onBack={goBack} />;
  if (activeItem === "preferences") return <AppPreferenceSettings preferences={preferences} onChange={updatePreferences} onBack={goBack} />;
  if (activeItem === "membership") return <MembershipSettings portal={portal} onBack={goBack} />;

  return <SettingsMenu portal={portal} preferences={preferences} onSelect={onSelect} />;
}

function SettingsMenu({
  portal,
  preferences,
  onSelect,
}: {
  portal: MemberPortalData;
  preferences: MemberSettingsPreferences;
  onSelect: (item: MemberSettingsItem) => void;
}) {
  const { logout } = useAuth();
  const displayAvatar = preferences.profilePhotoVisible ? portal.member.avatarUrl || portal.user.image : "";
  const enabledNotifications = [
    preferences.rsvpReminders,
    preferences.scheduleReminders,
    preferences.payoutUpdates,
    preferences.membershipReminders,
  ].filter(Boolean).length;

  return (
    <PortalScaffold>
      <ScreenTitle title="Settings" subtitle="Manage your app and account" />

      <TouchableOpacity style={styles.settingsProfileCard} onPress={() => onSelect("profile")} activeOpacity={0.78}>
        <View style={styles.settingsAvatar}>
          {displayAvatar ? (
            <Image source={{ uri: displayAvatar }} style={styles.settingsAvatarImage} />
          ) : (
            <Text style={styles.avatarText}>{initials(portal.member.name)}</Text>
          )}
        </View>
        <View style={styles.settingsProfileText}>
          <Text style={styles.settingsProfileName}>{portal.member.name}</Text>
          <Text style={styles.settingsProfileMeta}>{portal.member.section} · {portal.member.rank}</Text>
        </View>
        <Ionicons name="chevron-forward" size={20} color={MUTED} />
      </TouchableOpacity>

      <View style={styles.settingsMenuGroup}>
        <SettingsRow
          icon="person-outline"
          title="Profile"
          detail="Photo, name, phone, and member details"
          onPress={() => onSelect("profile")}
        />
        <SettingsRow
          icon="notifications-outline"
          title="Notifications"
          detail={`${enabledNotifications} reminder type${enabledNotifications === 1 ? "" : "s"} enabled on this device`}
          onPress={() => onSelect("notifications")}
        />
        <SettingsRow
          icon="eye-outline"
          title="Privacy"
          detail={preferences.profilePhotoVisible ? "Profile photo visible in member views" : "Profile photo hidden in member views"}
          onPress={() => onSelect("privacy")}
        />
        <SettingsRow
          icon="shield-checkmark-outline"
          title="Security"
          detail={portal.user.emailVerified ? "Email verified" : "Email verification needed"}
          onPress={() => onSelect("security")}
        />
        <SettingsRow
          icon="options-outline"
          title="App preferences"
          detail={`Attendance opens to ${attendanceViewLabel(preferences.defaultAttendanceView).toLowerCase()}`}
          onPress={() => onSelect("preferences")}
        />
        <SettingsRow
          icon="id-card-outline"
          title="Membership"
          detail={`${portal.member.status} · ${portal.member.section} · ${portal.member.rank}`}
          onPress={() => onSelect("membership")}
        />
        <SettingsRow
          icon="log-out-outline"
          title="Log out"
          detail="Sign out of this member account"
          onPress={logout}
          destructive
        />
      </View>
    </PortalScaffold>
  );
}

function SettingsBackHeader({ title, subtitle, onBack }: { title: string; subtitle: string; onBack: () => void }) {
  return (
    <>
      <NestedBackHeader label="Back to Settings" onBack={onBack} />
      <ScreenTitle title={title} subtitle={subtitle} />
    </>
  );
}

function ToggleRow({
  title,
  detail,
  value,
  onChange,
}: {
  title: string;
  detail: string;
  value: boolean;
  onChange: (value: boolean) => void;
}) {
  return (
    <TouchableOpacity style={styles.toggleRow} onPress={() => onChange(!value)} activeOpacity={0.78}>
      <View style={styles.toggleText}>
        <Text style={styles.settingsRowTitle}>{title}</Text>
        <Text style={styles.settingsRowDetail}>{detail}</Text>
      </View>
      <View style={[styles.toggleTrack, value && styles.toggleTrackOn]}>
        <View style={[styles.toggleThumb, value && styles.toggleThumbOn]} />
      </View>
    </TouchableOpacity>
  );
}

function NotificationSettings({
  preferences,
  onChange,
  onBack,
}: {
  preferences: MemberSettingsPreferences;
  onChange: (next: Partial<MemberSettingsPreferences>) => void;
  onBack: () => void;
}) {
  return (
    <PortalScaffold>
      <SettingsBackHeader title="Notifications" subtitle="Choose reminders shown by this app" onBack={onBack} />
      <View style={styles.settingsMenuGroup}>
        <ToggleRow title="RSVP reminders" detail="Remind me when an upcoming activity needs my response." value={preferences.rsvpReminders} onChange={(value) => onChange({ rsvpReminders: value })} />
        <ToggleRow title="Schedule reminders" detail="Show call-time, rehearsal, gig, and event reminders." value={preferences.scheduleReminders} onChange={(value) => onChange({ scheduleReminders: value })} />
        <ToggleRow title="Payout updates" detail="Show updates when gig earnings appear in the portal." value={preferences.payoutUpdates} onChange={(value) => onChange({ payoutUpdates: value })} />
        <ToggleRow title="Membership reminders" detail="Show profile, status, renewal, and account reminders." value={preferences.membershipReminders} onChange={(value) => onChange({ membershipReminders: value })} />
      </View>
      <EmptyCopy text="These preferences filter the Alerts tab on this device." />
    </PortalScaffold>
  );
}

function PrivacySettings({
  preferences,
  onChange,
  onBack,
}: {
  preferences: MemberSettingsPreferences;
  onChange: (next: Partial<MemberSettingsPreferences>) => void;
  onBack: () => void;
}) {
  return (
    <PortalScaffold>
      <SettingsBackHeader title="Privacy" subtitle="Control what this member app may show" onBack={onBack} />
      <View style={styles.settingsMenuGroup}>
        <ToggleRow title="Show profile photo" detail="Show your photo in the Settings and Profile screens on this device." value={preferences.profilePhotoVisible} onChange={(value) => onChange({ profilePhotoVisible: value })} />
        <ToggleRow title="Photo visible to members" detail="Allow members to see your photo in fully attended lists." value={preferences.showProfilePhotoToMembers} onChange={(value) => onChange({ showProfilePhotoToMembers: value })} />
      </View>
      <EmptyCopy text="Admins can still view official contact and membership records needed to run GYOCC." />
    </PortalScaffold>
  );
}

function SecuritySettings({ portal, onBack }: { portal: MemberPortalData; onBack: () => void }) {
  const { logout } = useAuth();
  const resetMutation = useMutation({
    mutationFn: () => forgotPassword(portal.user.email),
    onSuccess: () => Toast.show({ type: "success", text1: "Reset link sent", text2: portal.user.email }),
    onError: (err: { message?: string }) => Toast.show({ type: "error", text1: "Could not send reset link", text2: err.message }),
  });

  return (
    <PortalScaffold>
      <SettingsBackHeader title="Security" subtitle="Manage access to your account" onBack={onBack} />
      <View style={styles.formCard}>
        <SummaryLine label="Email" value={portal.user.email} />
        <SummaryLine label="Verification" value={portal.user.emailVerified ? "Verified" : "Not verified"} />
      </View>
      <TouchableOpacity style={styles.primaryBtn} onPress={() => resetMutation.mutate()} disabled={resetMutation.isPending}>
        <Text style={styles.primaryBtnText}>{resetMutation.isPending ? "Sending..." : "Send password reset link"}</Text>
      </TouchableOpacity>
      <TouchableOpacity style={styles.outlineBtn} onPress={logout}>
        <Text style={styles.outlineBtnText}>Log out</Text>
      </TouchableOpacity>
    </PortalScaffold>
  );
}

function AppPreferenceSettings({
  preferences,
  onChange,
  onBack,
}: {
  preferences: MemberSettingsPreferences;
  onChange: (next: Partial<MemberSettingsPreferences>) => void;
  onBack: () => void;
}) {
  return (
    <PortalScaffold>
      <SettingsBackHeader title="App preferences" subtitle="Tune how this app opens and displays lists" onBack={onBack} />
      <View style={styles.formCard}>
        <Text style={styles.fieldLabel}>Default attendance view</Text>
        <View style={styles.segmentRow}>
          {(["upcoming", "calendar", "past"] as MemberSettingsPreferences["defaultAttendanceView"][]).map((value) => {
            const active = preferences.defaultAttendanceView === value;
            return (
              <TouchableOpacity key={value} style={[styles.segmentBtn, active && styles.segmentBtnActive]} onPress={() => { if (!active) onChange({ defaultAttendanceView: value }); }}>
                <Text style={[styles.segmentText, active && styles.segmentTextActive]}>{attendanceViewLabel(value)}</Text>
              </TouchableOpacity>
            );
          })}
        </View>
      </View>
      <EmptyCopy text="This preference controls the first view shown when you open Attendance." />
    </PortalScaffold>
  );
}

function MembershipSettings({ portal, onBack }: { portal: MemberPortalData; onBack: () => void }) {
  return (
    <PortalScaffold>
      <SettingsBackHeader title="Membership" subtitle="Official member details managed by admins" onBack={onBack} />
      <View style={styles.formCard}>
        <SummaryLine label="Status" value={portal.member.status} />
        <SummaryLine label="Section" value={portal.member.section} />
        <SummaryLine label="Rank" value={portal.member.rank} />
        <SummaryLine label="Level" value={portal.member.level ? `Level ${portal.member.level}` : "Not assigned"} />
        <SummaryLine label="Joined" value={format(new Date(portal.member.joinDate), "MMMM d, yyyy")} />
      </View>
      <EmptyCopy text="Ask an admin to change section, rank, level, status, attendance, or payout records." />
    </PortalScaffold>
  );
}

function attendanceViewLabel(value: MemberSettingsPreferences["defaultAttendanceView"]) {
  if (value === "calendar") return "Calendar";
  if (value === "past") return "Past";
  return "Upcoming";
}

function SettingsRow({
  icon,
  title,
  detail,
  onPress,
  destructive = false,
}: {
  icon: React.ComponentProps<typeof Ionicons>["name"];
  title: string;
  detail: string;
  onPress: () => void;
  destructive?: boolean;
}) {
  return (
    <TouchableOpacity style={styles.settingsRow} onPress={onPress} activeOpacity={0.78}>
      <View style={[styles.settingsRowIcon, destructive && styles.settingsRowIconDanger]}>
        <Ionicons name={icon} size={20} color={destructive ? RED : PRIMARY} />
      </View>
      <View style={styles.settingsRowText}>
        <Text style={[styles.settingsRowTitle, destructive && styles.settingsRowTitleDanger]}>{title}</Text>
        <Text style={styles.settingsRowDetail}>{detail}</Text>
      </View>
      <Ionicons name="chevron-forward" size={18} color={MUTED} />
    </TouchableOpacity>
  );
}

// Whole-year age from a YYYY-MM-DD birthdate string, or null if unset/invalid.
function ageFromBirthdate(birthdate: string): number | null {
  if (!birthdate) return null;
  const date = new Date(birthdate);
  if (Number.isNaN(date.getTime())) return null;
  const now = new Date();
  let age = now.getFullYear() - date.getFullYear();
  const monthDiff = now.getMonth() - date.getMonth();
  if (monthDiff < 0 || (monthDiff === 0 && now.getDate() < date.getDate())) age -= 1;
  return age < 0 ? null : age;
}

function ProfileContent({
  portal,
  preferences = DEFAULT_MEMBER_SETTINGS,
  onBack,
}: {
  portal: MemberPortalData;
  preferences?: MemberSettingsPreferences;
  onBack?: () => void;
}) {
  const queryClient = useQueryClient();
  const [editing, setEditing] = useState(false);
  const [name, setName] = useState(portal.user.name || portal.member.name);
  const [phone, setPhone] = useState(portal.member.phone || "");
  const [voicePart, setVoicePart] = useState(portal.member.voicePart || "");
  const [birthdate, setBirthdate] = useState(portal.user.birthdate || "");
  const [age, setAge] = useState(portal.user.age != null ? String(portal.user.age) : "");
  const displayAvatar = preferences.profilePhotoVisible ? portal.member.avatarUrl || portal.user.image : "";

  // Age is derived from birthdate when one is set; manual entry is the fallback.
  const displayAge = birthdate ? ageFromBirthdate(birthdate) : age ? Number(age) : null;

  const mutation = useMutation({
    mutationFn: () => updateProfile({
      name,
      phone,
      voicePart,
      section: portal.member.section,
      position: "Member",
      birthdate,
      age: birthdate ? null : age === "" ? null : Number(age),
    }),
    onSuccess: (data) => {
      // Re-seed from the server's persisted value so the picker reflects what
      // was actually stored (not just the local selection that was submitted).
      if (typeof data?.voicePart === "string") setVoicePart(data.voicePart);
      queryClient.invalidateQueries({ queryKey: ["member-portal"] });
      setEditing(false);
      Toast.show({ type: "success", text1: "Profile updated" });
    },
    onError: (err: { message?: string }) => {
      Toast.show({ type: "error", text1: "Update failed", text2: err.message });
    },
  });

  const avatarMutation = useMutation({
    mutationFn: uploadProfileAvatar,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["member-portal"] });
      Toast.show({ type: "success", text1: "Profile photo updated" });
    },
    onError: (err: { message?: string }) => {
      Toast.show({ type: "error", text1: "Upload failed", text2: err.message });
    },
  });

  const deleteAvatarMutation = useMutation({
    mutationFn: deleteProfileAvatar,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["member-portal"] });
      Toast.show({ type: "success", text1: "Profile photo removed" });
    },
    onError: (err: { message?: string }) => {
      Toast.show({ type: "error", text1: "Remove failed", text2: err.message });
    },
  });

  const pickAvatar = async () => {
    const permission = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (!permission.granted) {
      Toast.show({ type: "error", text1: "Photo access needed", text2: "Allow photo access to upload a profile picture." });
      return;
    }

    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      allowsEditing: true,
      aspect: [1, 1],
      quality: 0.85,
    });

    if (result.canceled) return;

    const asset = result.assets[0];
    if (!asset?.uri) {
      Toast.show({ type: "error", text1: "No photo selected" });
      return;
    }

    const mimeType = normalizePickedImageMimeType(asset.uri, asset.mimeType);
    if (!["image/jpeg", "image/png", "image/webp"].includes(mimeType)) {
      Toast.show({ type: "error", text1: "Unsupported image", text2: "Use a JPEG, PNG, or WebP photo." });
      return;
    }

    if (asset.fileSize && asset.fileSize > 5 * 1024 * 1024) {
      Toast.show({ type: "error", text1: "Photo too large", text2: "Choose a photo that is 5MB or smaller." });
      return;
    }

    avatarMutation.mutate({
      uri: asset.uri,
      fileName: asset.fileName || `profile-photo.${mimeType.split("/")[1].replace("jpeg", "jpg")}`,
      mimeType,
    });
  };

  const handleAvatarPress = () => {
    if (avatarMutation.isPending || deleteAvatarMutation.isPending) return;
    if (!displayAvatar) {
      pickAvatar();
      return;
    }
    Alert.alert("Profile photo", undefined, [
      { text: "Change photo", onPress: pickAvatar },
      { text: "Remove photo", style: "destructive", onPress: () => deleteAvatarMutation.mutate() },
      { text: "Cancel", style: "cancel" },
    ]);
  };

  return (
    <PortalScaffold>
      {onBack ? <NestedBackHeader label="Back to Settings" onBack={onBack} /> : null}
      <ScreenTitle title="Profile" subtitle="Your member account details" />
      <View style={styles.profileHeader}>
        <TouchableOpacity
          style={styles.profileAvatar}
          onPress={handleAvatarPress}
          disabled={avatarMutation.isPending || deleteAvatarMutation.isPending}
          activeOpacity={0.85}
        >
          {displayAvatar ? (
            <Image source={{ uri: displayAvatar }} style={styles.profileAvatarImage} />
          ) : (
            <Text style={styles.avatarText}>{initials(portal.member.name)}</Text>
          )}
          <View style={styles.avatarCameraBadge}>
            <Ionicons name={avatarMutation.isPending ? "hourglass-outline" : "camera"} size={14} color="#0A4F41" />
          </View>
        </TouchableOpacity>
        <Text style={styles.profileName}>{portal.member.name}</Text>
        <Text style={styles.profileMeta}>{portal.member.section} · {portal.member.rank}</Text>
      </View>

      <View style={styles.formCard}>
        <ProfileField label="Email" value={portal.user.email || portal.member.email || ""} editable={false} />
        <View style={styles.fieldDivider} />
        <ProfileField label="Name" value={name} editable={editing} onChangeText={setName} />
        <View style={styles.fieldDivider} />
        <ProfileField label="Phone" value={phone} editable={editing} onChangeText={setPhone} />
        <View style={styles.fieldDivider} />
        <PartPicker section={portal.member.section} value={voicePart} editable={editing} onChange={setVoicePart} />
        <View style={styles.fieldDivider} />
        <DateField
          label="Birthdate"
          value={birthdate}
          editable={editing}
          onChange={(value) => {
            setBirthdate(value);
            if (value) setAge("");
          }}
          placeholder="Select birthdate"
        />
        <View style={styles.fieldDivider} />
        <ProfileField
          label="Age"
          value={displayAge != null ? String(displayAge) : ""}
          editable={editing && !birthdate}
          onChangeText={setAge}
          placeholder={birthdate ? "Auto-calculated" : "Enter age"}
          keyboardType="number-pad"
        />
        <View style={styles.fieldDivider} />
        <ProfileField label="Joined" value={format(new Date(portal.member.joinDate), "MMMM d, yyyy")} editable={false} />
      </View>

      {editing ? (
        <TouchableOpacity style={styles.primaryBtn} onPress={() => mutation.mutate()} disabled={mutation.isPending}>
          <Text style={styles.primaryBtnText}>{mutation.isPending ? "Saving..." : "Save changes"}</Text>
        </TouchableOpacity>
      ) : (
        <TouchableOpacity style={styles.primaryBtn} onPress={() => setEditing(true)}>
          <Text style={styles.primaryBtnText}>Edit profile</Text>
        </TouchableOpacity>
      )}

    </PortalScaffold>
  );
}

function ScreenTitle({ title, subtitle }: { title: string; subtitle: string }) {
  return (
    <View style={styles.screenTitleBlock}>
      <Text style={styles.screenTitle}>{title}</Text>
      <Text style={styles.screenSubtitle}>{subtitle}</Text>
    </View>
  );
}

function SummaryLine({ label, value }: { label: string; value: string }) {
  return (
    <View style={styles.summaryLine}>
      <Text style={styles.summaryLabel}>{label}</Text>
      <Text style={styles.summaryValue}>{value}</Text>
    </View>
  );
}

function AttendanceModeIcons({
  value,
  onChange,
}: {
  value: "upcoming" | "calendar" | "past";
  onChange: (value: "upcoming" | "calendar" | "past") => void;
}) {
  const options: Array<{
    key: "upcoming" | "calendar" | "past";
    icon: React.ComponentProps<typeof Ionicons>["name"];
  }> = [
    { key: "upcoming", icon: "list-outline" },
    { key: "calendar", icon: "calendar-outline" },
    { key: "past", icon: "time-outline" },
  ];

  return (
    <View style={styles.modeIconGroup}>
      {options.map(({ key, icon }) => {
        const active = value === key;
        return (
          <TouchableOpacity
            key={key}
            style={[styles.modeIconButton, active && styles.modeIconButtonActive]}
            onPress={() => onChange(key)}
          >
            <Ionicons name={icon} size={19} color={active ? PRIMARY_DARK : MUTED} />
          </TouchableOpacity>
        );
      })}
    </View>
  );
}

function StatusLine({ icon, label, value, ok }: { icon: React.ComponentProps<typeof Ionicons>["name"]; label: string; value: string; ok: boolean }) {
  return (
    <View style={styles.statusLine}>
      <View style={styles.statusLineIcon}>
        <Ionicons name={icon} size={20} color={ok ? PRIMARY : GOLD} />
      </View>
      <Text style={styles.activityTitle}>{label}</Text>
      <StatusPill tone={ok ? "good" : "warn"}>{value}</StatusPill>
    </View>
  );
}

function ProfileField({
  label,
  value,
  editable,
  onChangeText,
  placeholder,
  keyboardType,
}: {
  label: string;
  value: string;
  editable: boolean;
  onChangeText?: (value: string) => void;
  placeholder?: string;
  keyboardType?: import("react-native").KeyboardTypeOptions;
}) {
  if (!editable) {
    return (
      <View style={styles.profileFieldRow}>
        <Text style={styles.fieldLabel}>{label}</Text>
        <Text style={[styles.fieldValue, !value && styles.fieldValueEmpty]} numberOfLines={1}>
          {value || "—"}
        </Text>
      </View>
    );
  }

  return (
    <View style={styles.profileField}>
      <Text style={styles.fieldLabel}>{label}</Text>
      <TextInput
        style={styles.fieldInput}
        value={value}
        onChangeText={onChangeText}
        placeholder={placeholder}
        keyboardType={keyboardType}
        placeholderTextColor={DIM}
      />
    </View>
  );
}

// Parse a YYYY-MM-DD string into a *local* Date (avoids the UTC off-by-one shift
// that `new Date("YYYY-MM-DD")` causes in negative-offset timezones).
function parseLocalDate(value: string): Date | null {
  if (!value) return null;
  const [y, m, d] = value.split("-").map(Number);
  if (!y || !m || !d) return null;
  const date = new Date(y, m - 1, d);
  return Number.isNaN(date.getTime()) ? null : date;
}

function formatLocalDate(date: Date): string {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, "0");
  const d = String(date.getDate()).padStart(2, "0");
  return `${y}-${m}-${d}`;
}

// A profile field that opens a native calendar picker instead of a text input.
function DateField({
  label,
  value,
  editable,
  onChange,
  placeholder = "Select date",
}: {
  label: string;
  value: string; // YYYY-MM-DD or ""
  editable: boolean;
  onChange: (value: string) => void;
  placeholder?: string;
}) {
  const [show, setShow] = useState(false);
  const parsed = parseLocalDate(value);

  const handleChange = (event: DateTimePickerEvent, date?: Date) => {
    // Android dismisses on its own after a pick/cancel; iOS keeps the inline picker open.
    if (Platform.OS !== "ios") setShow(false);
    if (event.type === "dismissed" || !date) return;
    onChange(formatLocalDate(date));
  };

  if (!editable) {
    return (
      <View style={styles.profileFieldRow}>
        <Text style={styles.fieldLabel}>{label}</Text>
        <Text style={[styles.fieldValue, !parsed && styles.fieldValueEmpty]} numberOfLines={1}>
          {parsed ? format(parsed, "MMMM d, yyyy") : "—"}
        </Text>
      </View>
    );
  }

  return (
    <View style={styles.profileField}>
      <Text style={styles.fieldLabel}>{label}</Text>
      <TouchableOpacity
        style={[styles.fieldInput, styles.dateFieldRow]}
        onPress={() => setShow(true)}
        activeOpacity={0.7}
      >
        <Text style={[styles.dateFieldText, !parsed && styles.dateFieldPlaceholder]}>
          {parsed ? format(parsed, "MMMM d, yyyy") : placeholder}
        </Text>
        {parsed ? (
          <TouchableOpacity onPress={() => onChange("")} hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}>
            <Ionicons name="close-circle" size={18} color={MUTED} />
          </TouchableOpacity>
        ) : (
          <Ionicons name="calendar-outline" size={18} color={MUTED} />
        )}
      </TouchableOpacity>
      {show ? (
        <DateTimePicker
          value={parsed ?? new Date(2000, 0, 1)}
          mode="date"
          display={Platform.OS === "ios" ? "inline" : "calendar"}
          maximumDate={new Date()}
          onChange={handleChange}
          themeVariant="dark"
          accentColor={PRIMARY}
        />
      ) : null}
    </View>
  );
}

function EmptyCopy({ text }: { text: string }) {
  return <Text style={styles.emptyCopy}>{text}</Text>;
}

function EmptyState({ title, text, flat = false, hideBottomBorder = false }: { title: string; text: string; flat?: boolean; hideBottomBorder?: boolean }) {
  return (
    <View style={[flat ? styles.emptyStateFlat : styles.emptyState, hideBottomBorder && styles.noBottomBorder]}>
      <View style={styles.iconBadge}>
        <Ionicons name="calendar-clear-outline" size={34} color={PRIMARY} />
      </View>
      <Text style={styles.centerTitle}>{title}</Text>
      <Text style={styles.centerText}>{text}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: BG },
  scrollContent: { paddingBottom: 24, flexGrow: 1 },
  content: { paddingHorizontal: 22 },
  headerRow: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", marginBottom: 14 },
  headerSub: { color: MUTED, fontSize: 13, fontFamily: font.regular },
  headerTitle: { color: INK, fontSize: 21, fontFamily: font.extraBold, letterSpacing: -0.4 },
  avatar: { width: 46, height: 46, borderRadius: 23, backgroundColor: PRIMARY, alignItems: "center", justifyContent: "center" },
  avatarImage: { width: 46, height: 46, borderRadius: 23 },
  avatarText: { color: PRIMARY_DARK, fontSize: 16, fontFamily: font.extraBold },
  avatarDot: { position: "absolute", right: 1, bottom: 1, width: 13, height: 13, borderRadius: 7, backgroundColor: PRIMARY, borderWidth: 2.5, borderColor: BG },
  heroCard: { borderRadius: 24, backgroundColor: "#117C68", padding: 22, minHeight: 154, justifyContent: "flex-start", overflow: "hidden", marginBottom: 14 },
  heroPillRow: { flexDirection: "row", flexWrap: "wrap", gap: 8, marginBottom: 18 },
  heroSinglePill: { marginBottom: 20 },
  memberPill: { alignSelf: "flex-start", flexDirection: "row", alignItems: "center", gap: 7, backgroundColor: "rgba(255,255,255,.16)", paddingVertical: 6, paddingHorizontal: 13, borderRadius: 20 },
  liveDot: { width: 7, height: 7, borderRadius: 4, backgroundColor: "#7DE9C4" },
  memberPillText: { color: "#fff", fontSize: 12, fontFamily: font.bold },
  heroIdentityRow: { flexDirection: "row", alignItems: "flex-start", justifyContent: "space-between", gap: 16 },
  heroIdentityText: { flex: 1 },
  heroTitle: { color: "#fff", fontSize: 25, fontFamily: font.extraBold, letterSpacing: -0.5 },
  heroMeta: { color: "rgba(255,255,255,.78)", fontSize: 13.5, marginTop: 5, fontFamily: font.regular },
  heroStatusTextRow: { flexDirection: "row", flexWrap: "wrap", alignItems: "center", gap: 5, marginTop: 3 },
  heroStatusText: { color: "rgba(255,255,255,.9)", fontSize: 12, fontFamily: font.bold },
  heroStatusDivider: { color: "rgba(255,255,255,.55)", fontSize: 12, fontFamily: font.bold },
  heroProfileImageWrap: { width: 104, height: 104, borderRadius: 52, backgroundColor: "rgba(255,255,255,.14)", alignItems: "center", justifyContent: "center", borderWidth: 1, borderColor: "rgba(255,255,255,.22)" },
  heroProfileImage: { width: 104, height: 104, borderRadius: 52 },
  heroProfileInitials: { color: "#fff", fontSize: 28, fontFamily: font.extraBold },
  heroProfileBadge: { position: "absolute", left: 8, right: 8, bottom: -5, minHeight: 28, borderRadius: 14, backgroundColor: "#fff", alignItems: "center", justifyContent: "center", paddingHorizontal: 8, borderWidth: 2, borderColor: "#117C68" },
  heroProfileBadgeText: { color: "#0A4F41", fontSize: 11, fontFamily: font.extraBold },
  heroChipRow: { flexDirection: "row", flexWrap: "wrap", gap: 8, marginTop: 16 },
  heroChip: { borderColor: "rgba(255,255,255,.2)", borderWidth: 1, borderRadius: 10, paddingVertical: 6, paddingHorizontal: 10 },
  heroChipActive: { backgroundColor: "#fff", borderColor: "#fff" },
  heroChipText: { color: "rgba(255,255,255,.82)", fontSize: 11.5, fontFamily: font.semiBold },
  heroChipTextActive: { color: "#0A4F41", fontFamily: font.extraBold },
  statRow: { flexDirection: "row", gap: 10, marginBottom: 14 },
  statCard: { flex: 1, backgroundColor: PANEL, borderColor: BORDER, borderWidth: 1, borderRadius: 18, padding: 12, minHeight: 72 },
  statValue: { color: INK, fontSize: 24, fontFamily: font.extraBold },
  statSuffix: { color: DIM, fontSize: 14, fontFamily: font.semiBold },
  statLabel: { color: MUTED, fontSize: 11.5, fontFamily: font.semiBold, marginTop: 2 },
  adminStatText: { color: INK, fontSize: 18, fontFamily: font.extraBold, marginTop: 5 },
  twoCol: { flexDirection: "row", gap: 12, marginBottom: 16 },
  infoCard: { flex: 1, backgroundColor: PANEL, borderColor: BORDER, borderWidth: 1, borderRadius: 20, padding: 18 },
  infoLabel: { color: MUTED, fontSize: 12.5, fontFamily: font.regular },
  infoValue: { color: INK, fontSize: 23, fontFamily: font.extraBold, marginTop: 6, letterSpacing: -0.5 },
  infoWarn: { color: GOLD, fontSize: 11.5, fontFamily: font.semiBold, marginTop: 2 },
  infoSub: { color: MUTED, fontSize: 11.5, fontFamily: font.semiBold, marginTop: 2 },
  earningsChartCard: { backgroundColor: PANEL, borderColor: BORDER, borderWidth: 1, borderRadius: 22, padding: 18, marginBottom: 12 },
  earningsChartHeader: { flexDirection: "row", alignItems: "flex-start", justifyContent: "space-between", gap: 14 },
  earningsChartValue: { color: INK, fontSize: 30, fontFamily: font.extraBold, letterSpacing: -0.7, marginTop: 5 },
  earningsPendingTextBlock: { alignItems: "flex-end", paddingTop: 2 },
  earningsPendingLabel: { color: MUTED, fontSize: 10.5, fontFamily: font.semiBold },
  earningsPendingValue: { color: GOLD, fontSize: 13, fontFamily: font.extraBold, marginTop: 2 },
  earningsChartSvg: { marginTop: 14, marginHorizontal: -2 },
  earningsLegendRow: { flexDirection: "row", gap: 18, marginTop: 4 },
  earningsLegendItem: { flexDirection: "row", alignItems: "center", gap: 6 },
  earningsLegendDash: { width: 16, height: 3, borderRadius: 2 },
  earningsLegendDashPending: { backgroundColor: GOLD, opacity: 0.85 },
  earningsLegendText: { color: MUTED, fontSize: 11, fontFamily: font.semiBold },
  earningsChartEmpty: { marginTop: 16, paddingVertical: 22, alignItems: "center", justifyContent: "center", borderRadius: 14, backgroundColor: "#F0F4F2" },
  earningsChartEmptyText: { color: MUTED, fontSize: 12, fontFamily: font.regular, textAlign: "center", paddingHorizontal: 18 },
  earningsCounterRow: { flexDirection: "row", marginTop: 16, paddingTop: 14, borderTopWidth: 1, borderTopColor: "#E3EAE6" },
  inlineCounter: { flex: 1, paddingHorizontal: 10 },
  inlineCounterDivider: { borderLeftWidth: 1, borderLeftColor: "#E3EAE6" },
  inlineCounterValue: { color: INK, fontSize: 22, fontFamily: font.extraBold },
  inlineCounterSuffix: { color: DIM, fontSize: 13, fontFamily: font.semiBold },
  inlineCounterLabel: { color: MUTED, fontSize: 10.5, fontFamily: font.semiBold, marginTop: 2 },
  sectionHeader: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", marginTop: 6, marginBottom: 12 },
  sectionTitle: { color: INK, fontSize: 16, fontFamily: font.extraBold, letterSpacing: -0.3 },
  sectionAction: { color: PRIMARY, fontSize: 13, fontFamily: font.semiBold },
  listCard: { backgroundColor: PANEL, borderColor: BORDER, borderWidth: 1, borderRadius: 20, padding: 10, gap: 8, marginBottom: 12 },
  activityRow: { backgroundColor: PANEL_2, borderColor: BORDER, borderWidth: 1, borderRadius: 16, padding: 12, flexDirection: "row", alignItems: "center", justifyContent: "space-between", gap: 12 },
  attendanceFlatRow: { paddingVertical: 14, flexDirection: "row", alignItems: "center", justifyContent: "space-between", gap: 12, borderBottomWidth: 1, borderBottomColor: "#E3EAE6" },
  activityTitle: { color: INK, fontSize: 14.5, fontFamily: font.semiBold },
  activityMeta: { color: MUTED, fontSize: 12, marginTop: 3, fontFamily: font.regular },
  pill: { overflow: "hidden", fontSize: 11, fontFamily: font.bold, paddingVertical: 5, paddingHorizontal: 11, borderRadius: 20 },
  upcomingCard: { backgroundColor: PANEL, borderColor: BORDER, borderWidth: 1, borderRadius: 20, padding: 16, flexDirection: "row", alignItems: "center", gap: 14 },
  joinedBadge: { flexDirection: "row", alignItems: "center", gap: 4, paddingVertical: 8, paddingHorizontal: 10, borderRadius: 12, backgroundColor: PRIMARY },
  joinedBadgeText: { color: PRIMARY_DARK, fontSize: 11, fontFamily: font.extraBold },
  dateBox: { width: 50, height: 50, borderRadius: 14, backgroundColor: "rgba(52,200,171,.14)", alignItems: "center", justifyContent: "center" },
  dateMonth: { color: PRIMARY, fontSize: 9, fontFamily: font.bold },
  dateDay: { color: PRIMARY, fontSize: 19, fontFamily: font.extraBold },
  mutedSmall: { color: MUTED, fontSize: 12, fontFamily: font.semiBold },
  screenHeaderRow: { flexDirection: "row", alignItems: "flex-start", justifyContent: "space-between", gap: 14 },
  screenTitleBlock: { paddingTop: 6, paddingBottom: 14 },
  screenTitle: { color: INK, fontSize: 22, fontFamily: font.extraBold, letterSpacing: -0.4 },
  screenSubtitle: { color: MUTED, fontSize: 13, marginTop: 1, fontFamily: font.regular },
  summaryCard: { backgroundColor: PANEL, borderColor: BORDER, borderWidth: 1, borderRadius: 20, padding: 18, flexDirection: "row", alignItems: "center", gap: 18, marginBottom: 14 },
  attendanceSummary: { backgroundColor: PANEL, borderColor: BORDER, borderWidth: 1, borderRadius: 22, padding: 18, flexDirection: "row", alignItems: "center", gap: 18, marginBottom: 14 },
  ring: { width: 112, height: 112, alignItems: "center", justifyContent: "center" },
  ringSvg: { position: "absolute", left: 0, top: 0 },
  ringValue: { color: INK, fontSize: 25, fontFamily: font.extraBold },
  ringLabel: { color: MUTED, fontSize: 10.5, fontFamily: font.semiBold },
  summaryLines: { flex: 1, gap: 8 },
  summaryLine: { flexDirection: "row", alignItems: "center", justifyContent: "space-between" },
  summaryLabel: { color: "#5F7069", fontSize: 12.5, fontFamily: font.semiBold },
  summaryValue: { color: INK, fontSize: 13, fontFamily: font.extraBold },
  modeIconGroup: { flexDirection: "row", alignItems: "center", gap: 8, paddingTop: 7 },
  modeIconButton: { width: 38, height: 38, borderRadius: 19, borderWidth: 1, borderColor: "#DCE5E0", backgroundColor: PANEL, alignItems: "center", justifyContent: "center" },
  modeIconButtonActive: { backgroundColor: PRIMARY, borderColor: PRIMARY },
  stack: { gap: 10 },
  notificationBellHeader: { width: 44, height: 44, borderRadius: 22, borderWidth: 1, borderColor: "#DCE5E0", backgroundColor: PANEL, alignItems: "center", justifyContent: "center", marginTop: 4 },
  notificationBellDot: { position: "absolute", top: -3, right: -3, minWidth: 20, height: 20, borderRadius: 10, backgroundColor: GOLD, alignItems: "center", justifyContent: "center", paddingHorizontal: 5, borderWidth: 2, borderColor: BG },
  notificationBellDotText: { color: PRIMARY_DARK, fontSize: 10, fontFamily: font.extraBold },
  notificationHero: { borderRadius: 24, backgroundColor: PANEL, borderColor: BORDER, borderWidth: 1, padding: 20, marginBottom: 16 },
  notificationList: { borderTopWidth: 1, borderTopColor: "#E3EAE6" },
  swipeRowContainer: { position: "relative", overflow: "hidden" },
  swipeRowForeground: { backgroundColor: BG },
  swipeDeleteBackground: {
    position: "absolute", top: 0, right: 0, bottom: 0, left: 0,
    backgroundColor: "#C0392B",
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "flex-end",
    gap: 7,
    paddingRight: 22,
  },
  swipeDeleteLabel: { color: "#fff", fontSize: 12, fontFamily: font.bold },
  notificationRow: { flexDirection: "row", alignItems: "flex-start", gap: 13, paddingVertical: 15, borderBottomWidth: 1, borderBottomColor: "#E3EAE6" },
  notificationRowUnread: { backgroundColor: "rgba(52,200,171,.05)" },
  notificationIcon: { width: 42, height: 42, borderRadius: 14, alignItems: "center", justifyContent: "center" },
  notificationBody: { flex: 1, minWidth: 0 },
  notificationTitleRow: { flexDirection: "row", alignItems: "center", gap: 7 },
  unreadDot: { width: 8, height: 8, borderRadius: 4, backgroundColor: GOLD },
  notificationMetaRow: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", gap: 12, marginTop: 7 },
  notificationCategory: { color: PRIMARY, fontSize: 11, fontFamily: font.bold },
  notificationTime: { color: DIM, fontSize: 11, fontFamily: font.semiBold },
  statusHero: { backgroundColor: PANEL, borderColor: BORDER, borderWidth: 1, borderRadius: 24, padding: 22, alignItems: "center", marginBottom: 14 },
  statusIcon: { width: 78, height: 78, borderRadius: 24, alignItems: "center", justifyContent: "center", marginBottom: 18 },
  statusTitle: { color: INK, fontSize: 23, fontFamily: font.extraBold, letterSpacing: -0.5 },
  statusText: { color: MUTED, fontSize: 14, lineHeight: 22, textAlign: "center", marginTop: 8 },
  statusLine: { backgroundColor: PANEL, borderColor: BORDER, borderWidth: 1, borderRadius: 16, padding: 16, flexDirection: "row", alignItems: "center", gap: 12 },
  statusLineIcon: { width: 38, height: 38, borderRadius: 13, backgroundColor: PANEL_2, alignItems: "center", justifyContent: "center" },
  earningsHero: { backgroundColor: PANEL, borderColor: BORDER, borderWidth: 1, borderRadius: 24, padding: 22, marginBottom: 18 },
  earningsValue: { color: INK, fontSize: 34, fontFamily: font.extraBold, letterSpacing: -0.7, marginTop: 6 },
  earningsSplitRow: { flexDirection: "row", marginBottom: 10 },
  earningsSplitCol: { flex: 1 },
  earningsSplitColDivider: { borderLeftWidth: 1, borderLeftColor: BORDER, paddingLeft: 16, marginLeft: 4 },
  earningsSplitValue: { color: INK, fontSize: 25, fontFamily: font.extraBold, letterSpacing: -0.5, marginTop: 6 },
  payoutList: {},
  payoutRow: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", paddingVertical: 15, gap: 12, borderBottomWidth: 1, borderBottomColor: "#E3EAE6" },
  payoutRowMain: { flex: 1 },
  payoutRowRight: { flexDirection: "row", alignItems: "center", gap: 9 },
  payoutDot: { width: 8, height: 8, borderRadius: 4, backgroundColor: GOLD },
  payoutDetailKicker: { color: MUTED, fontSize: 12, fontFamily: font.semiBold, textTransform: "uppercase", letterSpacing: 0.6 },
  payoutDetailAmount: { color: INK, fontSize: 30, fontFamily: font.extraBold, letterSpacing: -0.7, marginTop: 4, marginBottom: 14 },
  payoutDetailScroll: { maxHeight: 380 },
  payoutDetailList: { borderTopWidth: 1, borderTopColor: BORDER },
  payoutDetailRow: { flexDirection: "row", alignItems: "flex-start", justifyContent: "space-between", gap: 16, paddingVertical: 11, borderBottomWidth: 1, borderBottomColor: BORDER },
  payoutDetailLabel: { color: MUTED, fontSize: 13, fontFamily: font.regular },
  payoutDetailValue: { color: INK, fontSize: 13.5, fontFamily: font.semiBold, flex: 1, textAlign: "right" },
  payoutDetailAck: { marginTop: 16 },
  earningRow: { backgroundColor: PANEL, borderColor: BORDER, borderWidth: 1, borderRadius: 16, padding: 16, flexDirection: "row", justifyContent: "space-between", alignItems: "center", gap: 12 },
  earningFlatRow: { paddingVertical: 15, flexDirection: "row", justifyContent: "space-between", alignItems: "center", gap: 12, borderBottomWidth: 1, borderBottomColor: "#E3EAE6" },
  earningAmount: { color: PRIMARY, fontSize: 16, fontFamily: font.extraBold },
  stipendHero: { backgroundColor: PRIMARY_DARK, borderColor: BORDER, borderWidth: 1, borderRadius: 24, padding: 22, marginBottom: 14 },
  stipendHeroMeta: { color: MUTED, fontSize: 12, fontFamily: font.regular, marginTop: 4 },
  stipendContractCard: { backgroundColor: PANEL, borderColor: BORDER, borderWidth: 1, borderRadius: 20, padding: 18, marginBottom: 14 },
  stipendContractTop: { flexDirection: "row", alignItems: "flex-start", justifyContent: "space-between", gap: 12 },
  stipendContractAmount: { color: INK, fontSize: 24, fontFamily: font.extraBold, letterSpacing: -0.5, marginTop: 4 },
  stipendContractPer: { color: MUTED, fontSize: 13, fontFamily: font.semiBold, letterSpacing: 0 },
  stipendContractMeta: { color: MUTED, fontSize: 12.5, fontFamily: font.regular, marginTop: 10 },
  stipendPriorityBadge: { flexDirection: "row", alignItems: "center", gap: 6, marginTop: 12, alignSelf: "flex-start", backgroundColor: "rgba(224,178,92,.14)", paddingVertical: 5, paddingHorizontal: 11, borderRadius: 20 },
  stipendPriorityText: { color: GOLD, fontSize: 11.5, fontFamily: font.bold },
  stipendDisbRow: { paddingVertical: 15, borderBottomWidth: 1, borderBottomColor: "#E3EAE6", gap: 12 },
  stipendDisbTop: { flexDirection: "row", justifyContent: "space-between", alignItems: "center", gap: 12 },
  stipendDisbAmountBlock: { alignItems: "flex-end", gap: 6 },
  stipendAckBtn: { flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 8, height: 44, borderRadius: 12, backgroundColor: PRIMARY },
  stipendAckBtnText: { color: PRIMARY_DARK, fontSize: 14, fontFamily: font.bold },
  stipendAckedRow: { flexDirection: "row", alignItems: "center", gap: 7 },
  stipendAckedText: { color: "#1E9E63", fontSize: 12, fontFamily: font.semiBold },
  stipendScheduledText: { color: GOLD, fontSize: 12, fontFamily: font.semiBold },
  stipendModalBackdrop: { flex: 1, backgroundColor: "rgba(0,0,0,0.62)", justifyContent: "center", paddingHorizontal: 22 },
  stipendModalCard: { backgroundColor: PANEL, borderColor: BORDER, borderWidth: 1, borderRadius: 22, padding: 22 },
  stipendModalTitle: { color: INK, fontSize: 19, fontFamily: font.extraBold, letterSpacing: -0.3 },
  stipendModalSub: { color: MUTED, fontSize: 13, fontFamily: font.regular, marginTop: 6, marginBottom: 16, lineHeight: 19 },
  stipendFieldLabel: { color: "#54655F", fontSize: 12.5, fontFamily: font.bold, marginBottom: 8 },
  stipendNoteInput: { minHeight: 80, paddingTop: 12, textAlignVertical: "top" },
  stipendBtnDisabled: { opacity: 0.5 },
  settingsProfileCard: { backgroundColor: PANEL, borderColor: BORDER, borderWidth: 1, borderRadius: 22, padding: 16, flexDirection: "row", alignItems: "center", gap: 14, marginBottom: 16 },
  settingsAvatar: { width: 58, height: 58, borderRadius: 29, backgroundColor: PRIMARY, alignItems: "center", justifyContent: "center", overflow: "hidden" },
  settingsAvatarImage: { width: 58, height: 58, borderRadius: 29 },
  settingsProfileText: { flex: 1, minWidth: 0 },
  settingsProfileName: { color: INK, fontSize: 18, fontFamily: font.extraBold },
  settingsProfileMeta: { color: MUTED, fontSize: 12.5, marginTop: 3 },
  settingsMenuGroup: { backgroundColor: PANEL, borderColor: BORDER, borderWidth: 1, borderRadius: 20, overflow: "hidden", marginBottom: 16 },
  settingsRow: { minHeight: 74, paddingHorizontal: 16, paddingVertical: 14, flexDirection: "row", alignItems: "center", gap: 13, borderBottomWidth: 1, borderBottomColor: "#E3EAE6" },
  settingsRowIcon: { width: 40, height: 40, borderRadius: 14, backgroundColor: "rgba(52,200,171,.12)", alignItems: "center", justifyContent: "center" },
  settingsRowIconDanger: { backgroundColor: "rgba(236,130,120,.12)" },
  settingsRowText: { flex: 1, minWidth: 0 },
  settingsRowTitle: { color: INK, fontSize: 15, fontFamily: font.extraBold },
  settingsRowTitleDanger: { color: RED },
  settingsRowDetail: { color: MUTED, fontSize: 12.5, lineHeight: 18, marginTop: 2 },
  toggleRow: { minHeight: 78, paddingHorizontal: 16, paddingVertical: 14, flexDirection: "row", alignItems: "center", gap: 14, borderBottomWidth: 1, borderBottomColor: "#E3EAE6" },
  toggleText: { flex: 1, minWidth: 0 },
  toggleTrack: { width: 48, height: 28, borderRadius: 14, backgroundColor: "#DCE5E0", padding: 3, justifyContent: "center" },
  toggleTrackOn: { backgroundColor: PRIMARY },
  toggleThumb: { width: 22, height: 22, borderRadius: 11, backgroundColor: "#FFFFFF" },
  toggleThumbOn: { backgroundColor: PRIMARY_DARK, transform: [{ translateX: 20 }] },
  segmentRow: { flexDirection: "row", gap: 8, marginTop: 10 },
  segmentBtn: { flex: 1, minHeight: 42, borderRadius: 14, borderWidth: 1.5, borderColor: "#DCE5E0", alignItems: "center", justifyContent: "center", paddingHorizontal: 8 },
  segmentBtnActive: { backgroundColor: PRIMARY, borderColor: PRIMARY },
  segmentText: { color: MUTED, fontSize: 12.5, fontFamily: font.bold },
  segmentTextActive: { color: PRIMARY_DARK },
  profileHeader: { backgroundColor: PANEL, borderColor: BORDER, borderWidth: 1, borderRadius: 24, padding: 22, alignItems: "center", marginBottom: 14 },
  profileAvatar: { width: 78, height: 78, borderRadius: 39, backgroundColor: PRIMARY, alignItems: "center", justifyContent: "center", marginBottom: 14 },
  profileAvatarImage: { width: 78, height: 78, borderRadius: 39 },
  avatarCameraBadge: { position: "absolute", right: -1, bottom: 1, width: 28, height: 28, borderRadius: 14, backgroundColor: "#fff", alignItems: "center", justifyContent: "center", borderWidth: 2.5, borderColor: PANEL },
  profileName: { color: INK, fontSize: 22, fontFamily: font.extraBold, letterSpacing: -0.4 },
  profileMeta: { color: MUTED, fontSize: 13, marginTop: 4 },
  actionDisabled: { opacity: 0.55 },
  formCard: { backgroundColor: PANEL, borderColor: BORDER, borderWidth: 1, borderRadius: 20, padding: 16, gap: 14, marginBottom: 16 },
  fieldDivider: { height: StyleSheet.hairlineWidth, backgroundColor: BORDER, marginHorizontal: -16, opacity: 0.7 },
  profileField: { gap: 7 },
  profileFieldRow: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", gap: 12, minHeight: 24, paddingVertical: 8 },
  fieldLabel: { color: "#54655F", fontSize: 12.5, fontFamily: font.bold },
  fieldInput: { height: 50, borderRadius: 14, borderWidth: 1.5, borderColor: "#DCE5E0", backgroundColor: "#F6F8F7", color: INK, paddingHorizontal: 14, fontFamily: font.medium },
  partChipWrap: { flexDirection: "row", flexWrap: "wrap", gap: 8 },
  partChip: { paddingHorizontal: 14, height: 38, borderRadius: 12, borderWidth: 1.5, borderColor: "#DCE5E0", backgroundColor: "#F6F8F7", alignItems: "center", justifyContent: "center" },
  partChipSelected: { backgroundColor: PRIMARY, borderColor: PRIMARY },
  partChipText: { color: MUTED, fontSize: 13, fontFamily: font.semiBold },
  partChipTextSelected: { color: PRIMARY_DARK, fontFamily: font.extraBold },
  fieldValue: { flexShrink: 1, color: INK, fontSize: 14.5, fontFamily: font.semiBold, textAlign: "right" },
  fieldValueEmpty: { color: DIM, fontFamily: font.medium },
  dateFieldRow: { flexDirection: "row", alignItems: "center", justifyContent: "space-between" },
  dateFieldText: { color: INK, fontSize: 15, fontFamily: font.medium },
  dateFieldPlaceholder: { color: DIM },
  input: { minHeight: 50, borderRadius: 14, borderWidth: 1.5, borderColor: "#DCE5E0", backgroundColor: "#F6F8F7", color: INK, paddingHorizontal: 14, marginBottom: 12, fontFamily: font.medium },
  primaryBtn: { height: 54, borderRadius: 16, backgroundColor: PRIMARY, alignItems: "center", justifyContent: "center", marginBottom: 12 },
  primaryBtnDisabled: { backgroundColor: "#E0E8E4", borderWidth: 1, borderColor: "#CBD6D0" },
  primaryBtnText: { color: PRIMARY_DARK, fontSize: 16, fontFamily: font.bold },
  primaryBtnTextDisabled: { color: "#93A39D" },
  clockInInfo: { minHeight: 52, borderRadius: 16, borderWidth: 1, borderColor: "rgba(224,178,92,.28)", backgroundColor: "rgba(224,178,92,.10)", flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 8, paddingHorizontal: 14, marginBottom: 12 },
  clockInInfoText: { color: "#8A6117", fontSize: 13.5, fontFamily: font.bold, textAlign: "center", flexShrink: 1 },
  outlineBtn: { height: 54, borderRadius: 16, borderWidth: 1.5, borderColor: "#DCE5E0", alignItems: "center", justifyContent: "center" },
  outlineBtnText: { color: MUTED, fontSize: 15, fontFamily: font.bold },
  liveCard: { borderRadius: 24, backgroundColor: "#0A4F41", padding: 20, overflow: "hidden" },
  attendanceLive: { borderRadius: 20, backgroundColor: "#0A4F41", padding: 18 },
  liveBadge: { alignSelf: "flex-start", color: "#fff", backgroundColor: "rgba(255,255,255,.16)", paddingVertical: 6, paddingHorizontal: 13, borderRadius: 20, fontSize: 11.5, fontFamily: font.bold, marginBottom: 14 },
  liveTitle: { color: "#fff", fontSize: 21, fontFamily: font.extraBold, letterSpacing: -0.4 },
  liveMeta: { color: "rgba(255,255,255,.9)", fontSize: 12.5, fontFamily: font.semiBold, marginTop: 8 },
  whiteBtn: { height: 52, borderRadius: 15, backgroundColor: "#fff", flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 8, marginTop: 16 },
  whiteBtnText: { color: "#0A4F41", fontSize: 15, fontFamily: font.extraBold },
  liveJoined: { flexDirection: "row", alignItems: "center", gap: 8, alignSelf: "flex-start", marginTop: 16, backgroundColor: "rgba(255,255,255,.16)", paddingVertical: 11, paddingHorizontal: 16, borderRadius: 14 },
  liveJoinedText: { color: "#fff", fontSize: 14, fontFamily: font.extraBold },
  smallAction: { paddingVertical: 8, paddingHorizontal: 12, borderRadius: 12, backgroundColor: PRIMARY },
  smallActionText: { color: PRIMARY_DARK, fontSize: 11, fontFamily: font.extraBold },
  calendarCard: { backgroundColor: PANEL, borderColor: BORDER, borderWidth: 1, borderRadius: 20, padding: 16 },
  calendarFlat: { paddingVertical: 8 },
  calendarHeader: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", marginBottom: 12 },
  weekRow: { flexDirection: "row", justifyContent: "space-between", marginBottom: 6 },
  weekDay: { width: `${100 / 7}%`, color: DIM, fontSize: 11, fontFamily: font.bold, textAlign: "center" },
  monthGrid: { flexDirection: "row", flexWrap: "wrap" },
  dayCell: { width: `${100 / 7}%`, height: 46, alignItems: "center", justifyContent: "center", gap: 3, borderRadius: 13 },
  dayCellActive: { backgroundColor: "rgba(52,200,171,.14)" },
  dayText: { color: "#5F7069", fontSize: 13.5, fontFamily: font.semiBold },
  dayTextActive: { color: PRIMARY_DARK, backgroundColor: PRIMARY, overflow: "hidden", width: 26, height: 26, borderRadius: 13, textAlign: "center", lineHeight: 26, fontFamily: font.extraBold },
  dayDot: { width: 5, height: 5, borderRadius: 3, backgroundColor: "transparent" },
  liveMiniCard: { borderRadius: 18, backgroundColor: "#0A4F41", padding: 16, flexDirection: "row", alignItems: "center", gap: 13 },
  liveMiniFlat: { paddingVertical: 14, flexDirection: "row", alignItems: "center", gap: 13, borderTopWidth: 1, borderTopColor: "#E3EAE6", borderBottomWidth: 1, borderBottomColor: "#E3EAE6" },
  liveMiniTitle: { color: "#15231D", fontSize: 14.5, fontFamily: font.extraBold },
  liveMiniMeta: { color: "#5F7069", fontSize: 12, marginTop: 2 },
  ringSmall: { width: 54, height: 54, borderRadius: 27, borderWidth: 6, borderColor: PRIMARY, alignItems: "center", justifyContent: "center" },
  ringSmallText: { color: INK, fontSize: 13, fontFamily: font.extraBold },
  nestedBackButton: { alignSelf: "flex-start", minHeight: 44, flexDirection: "row", alignItems: "center", gap: 10, paddingRight: 14, marginBottom: 8 },
  nestedBackIcon: { width: 38, height: 38, borderRadius: 19, backgroundColor: PRIMARY, alignItems: "center", justifyContent: "center" },
  nestedBackText: { color: INK, fontSize: 15, fontFamily: font.extraBold },
  divisionHero: { borderRadius: 24, padding: 20, overflow: "hidden" },
  detailTitle: { color: INK, fontSize: 24, fontFamily: font.extraBold, letterSpacing: -0.5, marginTop: 14 },
  detailCard: { backgroundColor: PANEL, borderColor: BORDER, borderWidth: 1, borderRadius: 18, paddingHorizontal: 16 },
  detailFlat: { borderTopWidth: 1, borderTopColor: "#E3EAE6", borderBottomWidth: 1, borderBottomColor: "#E3EAE6" },
  detailLine: { flexDirection: "row", alignItems: "center", gap: 13, paddingVertical: 14, borderBottomWidth: 1, borderBottomColor: "#E8EEEA" },
  detailLabel: { color: DIM, fontSize: 10.5, fontFamily: font.bold },
  detailValue: { color: INK, fontSize: 13.5, fontFamily: font.semiBold, marginTop: 1 },
  attendeeSection: { backgroundColor: PANEL, borderColor: BORDER, borderWidth: 1, borderRadius: 18, padding: 16, gap: 14 },
  attendeeHeader: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", gap: 12 },
  attendeeAvatarStack: { minHeight: 50, flexDirection: "row", alignItems: "center", paddingLeft: 2 },
  attendeeAvatar: { width: 46, height: 46, borderRadius: 23, borderWidth: 2, borderColor: PANEL, backgroundColor: PRIMARY, alignItems: "center", justifyContent: "center", overflow: "hidden" },
  attendeeStacked: { marginLeft: -10 },
  attendeeAvatarImage: { width: 42, height: 42, borderRadius: 21 },
  attendeeInitials: { color: PRIMARY_DARK, fontSize: 12, fontFamily: font.extraBold },
  attendeeOverflow: { backgroundColor: PANEL_2, borderColor: PANEL },
  attendeeOverflowText: { color: INK, fontSize: 12, fontFamily: font.extraBold },
  attendeeChevron: { marginLeft: 8 },
  attendeeList: { borderTopWidth: 1, borderTopColor: BORDER, paddingTop: 8 },
  attendeeRow: { flexDirection: "row", alignItems: "center", gap: 12, paddingVertical: 7 },
  attendeeName: { color: INK, fontSize: 14, fontFamily: font.semiBold, flex: 1 },
  inlineError: { color: RED, fontSize: 12.5, lineHeight: 18, fontFamily: font.regular },
  joinedNotice: { flexDirection: "row", gap: 12, alignItems: "flex-start", backgroundColor: "rgba(52,200,171,.12)", borderWidth: 1, borderColor: "rgba(52,200,171,.28)", borderRadius: 16, padding: 14 },
  joinedNoticeIcon: { width: 34, height: 34, borderRadius: 17, backgroundColor: PRIMARY, alignItems: "center", justifyContent: "center" },
  joinedNoticeTitle: { color: INK, fontSize: 14.5, fontFamily: font.extraBold },
  joinedNoticeText: { color: "#5F7069", fontSize: 12.5, lineHeight: 18, fontFamily: font.regular, marginTop: 2 },
  divisionBlock: { gap: 12, marginBottom: 14 },
  divisionPanel: { backgroundColor: PANEL, borderColor: BORDER, borderWidth: 1, borderRadius: 20, padding: 18 },
  chipWrap: { flexDirection: "row", flexWrap: "wrap", gap: 7, marginTop: 12 },
  divisionChip: { borderColor: "#DCE5E0", borderWidth: 1, borderRadius: 9, paddingVertical: 6, paddingHorizontal: 11 },
  divisionChipText: { color: "#5F7069", fontSize: 12, fontFamily: font.semiBold },
  repRow: { flexDirection: "row", alignItems: "center", gap: 12, marginTop: 11 },
  repIcon: { width: 34, height: 34, borderRadius: 10, alignItems: "center", justifyContent: "center" },
  emptyCopy: { color: MUTED, fontSize: 13, paddingVertical: 18, textAlign: "center" },
  emptyState: { alignItems: "center", padding: 26, backgroundColor: PANEL, borderColor: BORDER, borderWidth: 1, borderRadius: 20 },
  emptyStateFlat: { alignItems: "center", paddingVertical: 28, borderTopWidth: 1, borderBottomWidth: 1, borderColor: "#E3EAE6" },
  noBottomBorder: { borderBottomWidth: 0 },
  centerState: { flex: 1, alignItems: "center", justifyContent: "center", paddingBottom: 80 },
  iconBadge: { width: 76, height: 76, borderRadius: 22, backgroundColor: "rgba(52,200,171,.12)", alignItems: "center", justifyContent: "center", marginBottom: 18 },
  centerTitle: { color: INK, fontSize: 22, fontFamily: font.extraBold, textAlign: "center" },
  centerText: { color: MUTED, fontSize: 14, lineHeight: 22, textAlign: "center", marginTop: 8 },
  skeletonSmall: { width: 90, height: 11, borderRadius: 6, backgroundColor: PANEL_2 },
  skeletonTitle: { width: 150, height: 18, borderRadius: 7, backgroundColor: "#E3EAE6", marginTop: 8 },
  skeletonAvatar: { width: 46, height: 46, borderRadius: 23, backgroundColor: "#E3EAE6" },
  skeletonHero: { height: 150, borderRadius: 24, backgroundColor: PANEL_2, marginBottom: 14 },
  skeletonStat: { flex: 1, height: 72, borderRadius: 18, backgroundColor: PANEL_2 },
});
