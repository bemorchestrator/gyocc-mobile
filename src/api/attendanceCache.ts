import type { QueryClient } from "@tanstack/react-query";

export const ATTENDANCE_QUERY_KEYS = {
  portal: ["member-portal"] as const,
  overview: ["member-attendance-overview"] as const,
  notifications: ["notifications"] as const,
};

/** Refresh every UI projection affected by a canonical attendance write. */
export async function refreshAttendanceData(queryClient: QueryClient) {
  await Promise.all([
    queryClient.invalidateQueries({ queryKey: ATTENDANCE_QUERY_KEYS.portal, refetchType: "all" }),
    queryClient.invalidateQueries({ queryKey: ATTENDANCE_QUERY_KEYS.overview, refetchType: "all" }),
    queryClient.invalidateQueries({ queryKey: ATTENDANCE_QUERY_KEYS.notifications, refetchType: "all" }),
  ]);
}
