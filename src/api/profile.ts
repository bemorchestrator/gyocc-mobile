import client from "./client";
import * as FileSystem from "expo-file-system/legacy";
import { ImageManipulator, SaveFormat } from "expo-image-manipulator";
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
  // The regular API client and expo-file-system use separate native networking
  // sessions. Refresh through the regular client first so the backend can
  // mirror the session it actually accepted back into SecureStore before the
  // upload task reads it.
  await client.get("/api/profile", { skipErrorLog: true } as never);

  // Photo-library assets can be HEIC/AVIF or several megabytes even after the
  // system crop UI. Normalize them here so every profile screen uploads the
  // same small, server-supported payload instead of relying on picker metadata.
  const imageContext = ImageManipulator.manipulate(asset.uri);
  imageContext.resize({ width: 1024 });
  const imageRef = await imageContext.renderAsync();
  const preparedImage = await imageRef.saveAsync({
    compress: 0.78,
    format: SaveFormat.JPEG,
  });

  const cookie = await getSessionValue(COOKIE_KEY);
  const response = await FileSystem.uploadAsync(`${BASE_URL}/api/profile/avatar`, preparedImage.uri, {
    httpMethod: "POST",
    uploadType: FileSystem.FileSystemUploadType.MULTIPART,
    fieldName: "avatar",
    mimeType: "image/jpeg",
    headers: {
      Accept: "application/json",
      Origin: BASE_URL,
      "X-GYOCC-Client": "mobile",
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
