import client from "./client";

export interface ProfileData {
  name: string;
  email: string;
  image?: string;
  phone?: string;
  position?: string;
  section?: string;
  bio?: string;
  avatarUrl?: string;
}

export async function getProfile(): Promise<ProfileData> {
  const { data } = await client.get("/api/profile");
  return data;
}

export async function updateProfile(payload: Partial<ProfileData>): Promise<ProfileData> {
  const { data } = await client.put("/api/profile", payload);
  return data;
}

export async function listPayoutRates() {
  const { data } = await client.get("/api/payout-rates");
  return data?.rates ?? [];
}
