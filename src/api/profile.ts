import client from "./client";
import * as FileSystem from "expo-file-system/legacy";
import { BASE_URL, COOKIE_KEY } from "./config";
import { getSessionValue } from "../utils/sessionStorage";

export interface ProfileData {
  name: string;
  email: string;
  image?: string;
  phone?: string;
  position?: string;
  section?: string;
  voicePart?: string;
  bio?: string;
  avatarUrl?: string;
  birthdate?: string;
  age?: number | null;
}

export async function getProfile(): Promise<ProfileData> {
  const { data } = await client.get("/api/profile");
  return data;
}

export async function updateProfile(payload: Partial<ProfileData>): Promise<ProfileData> {
  const { data } = await client.put("/api/profile", payload);
  return data;
}

export interface AvatarUploadAsset {
  uri: string;
  fileName?: string | null;
  mimeType?: string | null;
}

export async function uploadProfileAvatar(asset: AvatarUploadAsset): Promise<{ avatarUrl: string }> {
  const mimeType = asset.mimeType || "image/jpeg";
  const cookie = await getSessionValue(COOKIE_KEY);
  const response = await FileSystem.uploadAsync(`${BASE_URL}/api/profile/avatar`, asset.uri, {
    httpMethod: "POST",
    uploadType: FileSystem.FileSystemUploadType.MULTIPART,
    fieldName: "avatar",
    mimeType,
    headers: {
      Accept: "application/json",
      ...(cookie ? { Cookie: cookie, "X-GYOCC-Session-Cookie": cookie } : {}),
    },
  });

  let data: { avatarUrl?: string; message?: string; error?: string } = {};
  try {
    data = JSON.parse(response.body || "{}");
  } catch {
    // Preserve the server status below when it returns a non-JSON error page.
  }

  if (response.status < 200 || response.status >= 300 || !data.avatarUrl) {
    throw {
      message: data?.message || data?.error || "Invalid profile photo upload",
      status: response.status,
    };
  }

  return { avatarUrl: data.avatarUrl };
}

export async function deleteProfileAvatar(): Promise<void> {
  await client.delete("/api/profile/avatar");
}
