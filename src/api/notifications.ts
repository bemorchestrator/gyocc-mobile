import client from "./client";

export type NotificationType =
  | "admin_event_published"
  | "admin_rehearsal_published"
  | "admin_gig_published"
  | "member_event_assigned"
  | "member_rehearsal_assigned"
  | "member_gig_assigned"
  | "member_rsvp_updated"
  | "member_attendance_updated"
  | "member_payout_updated"
  | "member_stipend_disbursed";

export interface AppNotification {
  id: string;
  type: NotificationType;
  title: string;
  body: string;
  sourceType: "event" | "rehearsal" | "gig" | "member" | "system" | "stipend";
  sourceId: string | null;
  actionUrl: string | null;
  metadata: Record<string, unknown>;
  readAt: string | null;
  createdAt: string;
}

export interface PagedNotifications {
  items: AppNotification[];
  unreadCount: number;
  nextCursor: string | null;
}

export async function getNotifications(limit = 50): Promise<PagedNotifications> {
  const { data } = await client.get("/api/notifications", { params: { limit } });
  return data;
}

export async function markNotificationRead(id: string): Promise<{ notification: AppNotification; unreadCount: number }> {
  const { data } = await client.patch(`/api/notifications/${encodeURIComponent(id)}/read`);
  return data;
}

export async function markAllNotificationsRead(): Promise<{ marked: number; unreadCount: number }> {
  const { data } = await client.patch("/api/notifications/read-all");
  return data;
}

export async function deleteNotification(id: string): Promise<{ deleted: boolean; unreadCount: number }> {
  const { data } = await client.delete(`/api/notifications/${encodeURIComponent(id)}`);
  return data;
}

export interface RegisterPushTokenInput {
  token: string;
  platform: "ios" | "android" | "web" | "unknown";
  deviceId?: string | null;
  experienceId?: string | null;
}

export async function registerPushToken(input: RegisterPushTokenInput): Promise<void> {
  await client.post("/api/notifications/push-token", input);
}

export async function unregisterPushToken(token: string): Promise<void> {
  await client.delete("/api/notifications/push-token", { data: { token } });
}
