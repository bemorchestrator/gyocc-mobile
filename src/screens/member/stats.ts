// Numbers behind the analytics Home, My Season and This Month screens
// (design/mockups/board-3-home-analytics.png). All derived from the member
// portal payload; nothing extra is fetched.
import { endOfMonth, format, isWithinInterval, startOfMonth, subMonths } from "date-fns";
import { AttendanceRecord, MemberPortalData, PortalActivity } from "../../api/memberPortal";
import { callEnd, shortDuration, sortedCalls } from "./kit";

/** Past calls whose outcome is known (not still "Pending"). Oldest first. */
export function settledRecords(portal: MemberPortalData | undefined, now = new Date()) {
  return (portal?.attendance.history ?? [])
    .filter((r) => new Date(r.date) <= now)
    .filter((r) => r.attended || r.attendanceStatus !== "Pending")
    .sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());
}

export function isOnTime(r: AttendanceRecord) {
  return r.attended && !(r.lateMinutes && r.lateMinutes > 0);
}

/** Attendance rate per month for the last `months` months, current month last. */
export function monthlyRates(records: AttendanceRecord[], now = new Date(), months = 6) {
  return Array.from({ length: months }, (_, i) => {
    const month = startOfMonth(subMonths(now, months - 1 - i));
    const inMonth = records.filter((r) => isWithinInterval(new Date(r.date), { start: month, end: endOfMonth(month) }));
    const attended = inMonth.filter((r) => r.attended).length;
    return {
      key: format(month, "yyyy-MM"),
      label: format(month, "MMM"),
      total: inMonth.length,
      rate: inMonth.length ? Math.round((attended / inMonth.length) * 100) : null,
    };
  });
}

/** Hours between clock-in and clock-out across calls that have both. */
export function hoursOnStage(records: AttendanceRecord[]) {
  const ms = records.reduce((sum, r) => {
    if (!r.clockInAt || !r.clockOutAt) return sum;
    const span = new Date(r.clockOutAt).getTime() - new Date(r.clockInAt).getTime();
    return span > 0 && span < 16 * 60 * 60 * 1000 ? sum + span : sum;
  }, 0);
  return Math.round(ms / (60 * 60 * 1000));
}

/** Most calls attended in a row. An approved excuse neither breaks nor extends it. */
export function longestStreak(records: AttendanceRecord[]) {
  let best = 0;
  let run = 0;
  for (const r of records) {
    if (r.attended) best = Math.max(best, ++run);
    else if (r.excuseStatus !== "Approved") run = 0;
  }
  return best;
}

/** Every call in the current month (past and upcoming), counted by kind. */
export function monthCalls(portal: MemberPortalData | undefined, now = new Date()) {
  const start = startOfMonth(now);
  const end = endOfMonth(now);
  const seen = new Map<string, string>();
  const add = (type: string, id: string, date: string) => {
    if (isWithinInterval(new Date(date), { start, end })) seen.set(`${type}:${id}`, type);
  };
  for (const r of portal?.attendance.history ?? []) add(r.sourceType, r.sourceId, r.date);
  for (const c of portal?.upcoming ?? []) add(c.type, c.sourceId, c.date);
  const types = [...seen.values()];
  const rehearsals = types.filter((t) => t === "rehearsal").length;
  const gigs = types.filter((t) => t === "gig").length;
  const events = types.filter((t) => t === "event").length;
  return { rehearsals, gigs, events, total: types.length };
}

/** The call in progress, or the next one coming up. */
export function nextCall(portal: MemberPortalData | undefined, now = new Date()) {
  return sortedCalls(portal).find((call) => callEnd(call) > now) ?? null;
}

/** "Ends in 40m", "Begins in 45m", "Begins in 2d 3h". */
export function countdown(call: PortalActivity, now = new Date()) {
  const start = new Date(call.date);
  if (now >= start) return `Ends in ${shortDuration(callEnd(call).getTime() - now.getTime())}`;
  const ms = start.getTime() - now.getTime();
  const day = 24 * 60 * 60 * 1000;
  if (ms < day) return `Begins in ${shortDuration(ms)}`;
  const days = Math.floor(ms / day);
  const hours = Math.floor((ms % day) / (60 * 60 * 1000));
  return `Begins in ${days}d${hours ? ` ${hours}h` : ""}`;
}
