import client from "./client";
import { Platform } from "react-native";

export type ActivityType = "rehearsal" | "gig" | "event";

export interface ClockLocationEvidence {
  latitude: number;
  longitude: number;
  accuracyMeters: number;
  capturedAt: string;
  isMocked?: boolean;
}

export interface PortalActivity {
  id: string;
  type: ActivityType;
  sourceId: string;
  title: string;
  date: string;
  endDate?: string;
  venueName?: string;
  venueAddress?: string;
  venueLatitude?: number;
  venueLongitude?: number;
  geofenceRadiusMeters?: number;
  locationRequired?: boolean;
  locationConfigured?: boolean;
  status: string;
  role: string;
  confirmation: string;
  isAssigned?: boolean;
  attended: boolean;
  attendanceStatus?: string;
  clockInAt?: string | null;
  clockOutAt?: string | null;
  lateMinutes?: number;
  earlyLeaveMinutes?: number;
  excuseStatus?: "None" | "Pending" | "Approved" | "Rejected" | string;
  requiresClockOut?: boolean;
  attendanceMode?: "standard" | "full";
  canClockIn?: boolean;
  canClockOut?: boolean;
  clockInBlockedReason?: { code: string; message: string } | null;
  payoutAmount: number;
  clockInWindow?: {
    opensAt: string;
    closesAt: string;
    isOpen: boolean;
    isUpcoming: boolean;
    isPast: boolean;
  };
}

export interface AttendanceRecord {
  id: string;
  sourceType: ActivityType;
  sourceId: string;
  title: string;
  date: string;
  eventType: string;
  role: string;
  confirmation: string;
  attended: boolean;
  attendanceStatus?: string;
  clockInAt?: string | null;
  clockOutAt?: string | null;
  lateMinutes?: number;
  earlyLeaveMinutes?: number;
  excuseStatus?: "None" | "Pending" | "Approved" | "Rejected" | string;
}

export interface MemberPortalData {
  year: number;
  user: {
    id: string;
    name: string;
    email: string;
    image?: string;
    emailVerified: boolean;
    birthdate?: string;
    age?: number | null;
  };
  member: {
    id: string;
    name: string;
    email?: string;
    phone?: string;
    avatarUrl?: string;
    section: "Choir" | "Orchestra" | "Rondalla" | "Both" | string;
    rank: "Conductor" | "Senior" | "Junior" | "Apprentice";
    level: 1 | 2 | null;
    voicePart?: string;
    status: "Active" | "Inactive" | "On Leave";
    joinDate: string;
  };
  attendance: {
    gigsTotal: number;
    gigsAttended: number;
    eventsTotal: number;
    eventsAttended: number;
    rehearsalsTotal: number;
    rehearsalsAttended: number;
    overallTotal: number;
    overallAttended: number;
    attendanceRate: number;
    reliability?: {
      attendanceRate: number;
      lateCount: number;
      totalLateMinutes: number;
      averageLateMinutes: number;
      noShowCount: number;
      earlyLeaveCount: number;
      excusedCount: number;
      unexcusedLateOrAbsentCount: number;
    };
    history: AttendanceRecord[];
  };
  earnings: {
    year: number;
    total: number;
    pending: number;
    gigs: PortalActivity[];
  };
  upcoming: PortalActivity[];
}

function isPreviewMode() {
  return (
    __DEV__ &&
    Platform.OS === "web" &&
    typeof window !== "undefined" &&
    (window.location?.search ?? "").includes("preview=member")
  );
}

function mockPortal(): MemberPortalData {
  const now = new Date();
  const openStart = new Date(now.getTime() - 10 * 60 * 1000);
  const openEnd = new Date(now.getTime() + 90 * 60 * 1000);
  const nextWeek = new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000);
  return {
    year: now.getFullYear(),
    user: {
      id: "preview-user",
      name: "Andrea Salcedo",
      email: "andrea.salcedo@gyocc.org",
      emailVerified: true,
    },
    member: {
      id: "preview-member",
      name: "Andrea Salcedo",
      email: "andrea.salcedo@gyocc.org",
      phone: "+63 912 345 6789",
      section: "Orchestra",
      rank: "Senior",
      level: 2,
      status: "Active",
      joinDate: "2022-03-12T00:00:00.000Z",
    },
    attendance: {
      gigsTotal: 9,
      gigsAttended: 7,
      eventsTotal: 5,
      eventsAttended: 4,
      rehearsalsTotal: 20,
      rehearsalsAttended: 18,
      overallTotal: 34,
      overallAttended: 29,
      attendanceRate: 85,
      reliability: {
        attendanceRate: 85,
        lateCount: 2,
        totalLateMinutes: 18,
        averageLateMinutes: 9,
        noShowCount: 1,
        earlyLeaveCount: 0,
        excusedCount: 1,
        unexcusedLateOrAbsentCount: 2,
      },
      history: [
        { id: "h1", sourceType: "rehearsal", sourceId: "r1", title: "Weekly Sectional Rehearsal", date: "2026-06-25T10:00:00.000Z", eventType: "Rehearsal", role: "Participant", confirmation: "Confirmed", attended: true },
        { id: "h2", sourceType: "gig", sourceId: "g1", title: "Cebu Heritage Gala", date: "2026-06-14T10:00:00.000Z", eventType: "Gala", role: "Performer", confirmation: "Confirmed", attended: true },
        { id: "h3", sourceType: "event", sourceId: "e1", title: "Founder's Day Concert", date: "2026-06-07T10:00:00.000Z", eventType: "Concert", role: "Performer", confirmation: "Confirmed", attended: true },
        { id: "h4", sourceType: "rehearsal", sourceId: "r2", title: "Full Orchestra Rehearsal", date: "2026-06-04T10:00:00.000Z", eventType: "Rehearsal", role: "Participant", confirmation: "Pending", attended: false },
      ],
    },
    earnings: {
      year: now.getFullYear(),
      total: 7300,
      pending: 2500,
      gigs: [
        { id: "g1p", type: "gig", sourceId: "g1", title: "Cebu Heritage Gala", date: "2026-06-14T10:00:00.000Z", venueName: "Waterfront Hotel", status: "Completed", role: "Performer", confirmation: "Confirmed", attended: true, payoutAmount: 3000 },
        { id: "g2p", type: "gig", sourceId: "g2", title: "Ayala Spring Concert", date: "2026-05-24T10:00:00.000Z", venueName: "Ayala Center", status: "Completed", role: "Performer", confirmation: "Confirmed", attended: true, payoutAmount: 2500 },
      ],
    },
    upcoming: [
      { id: "r-live", type: "rehearsal", sourceId: "r-live", title: "Full Orchestra Rehearsal", date: openStart.toISOString(), endDate: openEnd.toISOString(), venueName: "CICC Practice Hall", status: "Scheduled", role: "1st Violin", confirmation: "Confirmed", attended: false, attendanceStatus: "Pending", requiresClockOut: false, canClockIn: true, canClockOut: false, payoutAmount: 0, clockInWindow: { opensAt: new Date(openStart.getTime() - 30 * 60 * 1000).toISOString(), closesAt: openEnd.toISOString(), isOpen: true, isUpcoming: false, isPast: false } },
      { id: "g-next", type: "gig", sourceId: "g-next", title: "SM Seaside Gig", date: nextWeek.toISOString(), endDate: new Date(nextWeek.getTime() + 2 * 60 * 60 * 1000).toISOString(), venueName: "SM Seaside Atrium", status: "Confirmed", role: "Performer", confirmation: "Confirmed", attended: false, attendanceStatus: "Pending", requiresClockOut: true, canClockIn: false, canClockOut: false, payoutAmount: 2500, clockInWindow: { opensAt: new Date(nextWeek.getTime() - 30 * 60 * 1000).toISOString(), closesAt: new Date(nextWeek.getTime() + 2 * 60 * 60 * 1000).toISOString(), isOpen: false, isUpcoming: true, isPast: false } },
      { id: "e-next", type: "event", sourceId: "e-next", title: "Independence Day Concert", date: new Date(now.getTime() + 14 * 24 * 60 * 60 * 1000).toISOString(), venueName: "Plaza Independencia", status: "Published", role: "Performer", confirmation: "Pending", attended: false, attendanceStatus: "Pending", requiresClockOut: true, canClockIn: false, canClockOut: false, payoutAmount: 0, clockInWindow: { opensAt: new Date(now.getTime() + 14 * 24 * 60 * 60 * 1000 - 30 * 60 * 1000).toISOString(), closesAt: new Date(now.getTime() + 14 * 24 * 60 * 60 * 1000 + 2 * 60 * 60 * 1000).toISOString(), isOpen: false, isUpcoming: true, isPast: false } },
    ],
  };
}

export async function getMemberPortal(): Promise<MemberPortalData> {
  if (isPreviewMode()) return mockPortal();
  const { data } = await client.get("/api/profile/member-portal", { skipErrorLog: true } as never);
  return data;
}

export interface ClockInResult {
  success: true;
  alreadyClockedIn?: boolean;
  attendance?: { id: string; clockInAt?: string | null };
}

export async function clockInActivity(type: ActivityType, sourceId: string, location: ClockLocationEvidence, excuseReason?: string): Promise<ClockInResult> {
  if (isPreviewMode()) return { success: true };
  const { data } = await client.post<ClockInResult>("/api/profile/member-portal/clock-in", { type, sourceId, location, excuseReason });
  return data;
}

export async function clockOutActivity(type: ActivityType, sourceId: string): Promise<void> {
  if (isPreviewMode()) return;
  await client.post("/api/profile/member-portal/clock-out", { type, sourceId });
}

export async function rsvpActivity(
  type: ActivityType,
  sourceId: string,
  confirmation: "Pending" | "Confirmed" | "Declined"
): Promise<void> {
  if (isPreviewMode()) return;
  await client.post("/api/profile/member-portal/rsvp", { type, sourceId, confirmation });
}
