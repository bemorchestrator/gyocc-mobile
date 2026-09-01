import client from "./client";

export type MemberSettingsPreferences = {
  rsvpReminders: boolean;
  scheduleReminders: boolean;
  payoutUpdates: boolean;
  membershipReminders: boolean;
  profilePhotoVisible: boolean;
  showProfilePhotoToMembers: boolean;
  defaultAttendanceView: "upcoming" | "calendar" | "past";
};

export const DEFAULT_MEMBER_SETTINGS: MemberSettingsPreferences = {
  rsvpReminders: true,
  scheduleReminders: true,
  payoutUpdates: true,
  membershipReminders: true,
  profilePhotoVisible: true,
  showProfilePhotoToMembers: true,
  defaultAttendanceView: "upcoming",
};

export async function getPreferences(): Promise<MemberSettingsPreferences> {
  const { data } = await client.get("/api/profile/preferences");
  return { ...DEFAULT_MEMBER_SETTINGS, ...(data?.preferences ?? {}) };
}

export async function updatePreferencesRemote(
  patch: Partial<MemberSettingsPreferences>
): Promise<MemberSettingsPreferences> {
  const { data } = await client.put("/api/profile/preferences", patch);
  return { ...DEFAULT_MEMBER_SETTINGS, ...(data?.preferences ?? {}) };
}
