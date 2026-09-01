import { useEffect, useRef } from "react";
import { Platform } from "react-native";
import Constants from "expo-constants";
import * as Notifications from "expo-notifications";
import * as SecureStore from "expo-secure-store";

import { registerPushToken, unregisterPushToken } from "../api/notifications";

const PUSH_DEVICE_ID_KEY = "gyocc_push_device_id";

Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldPlaySound: true,
    shouldSetBadge: true,
    shouldShowBanner: true,
    shouldShowList: true,
  }),
});

export function usePushNotifications(userId?: string | null) {
  const registeredTokenRef = useRef<string | null>(null);

  useEffect(() => {
    if (!userId || Platform.OS === "web") return;
    let cancelled = false;

    async function register() {
      const token = await getExpoPushToken();
      if (!token || cancelled) return;
      await registerPushToken({
        token,
        platform: normalizePlatform(Platform.OS),
        deviceId: await getOrCreateDeviceId(),
        experienceId: Constants.expoConfig?.slug ?? null,
      });
      registeredTokenRef.current = token;
    }

    register().catch((error) => {
      if (__DEV__) console.warn("[push] registration failed", error);
    });

    return () => {
      cancelled = true;
      const token = registeredTokenRef.current;
      registeredTokenRef.current = null;
      if (token) unregisterPushToken(token).catch(() => undefined);
    };
  }, [userId]);
}

async function getExpoPushToken(): Promise<string | null> {
  if (Platform.OS === "android") {
    await Notifications.setNotificationChannelAsync("default", {
      name: "GYOCC updates",
      importance: Notifications.AndroidImportance.DEFAULT,
    });
  }

  const existing = await Notifications.getPermissionsAsync();
  const finalStatus =
    existing.status === "granted" ? existing.status : (await Notifications.requestPermissionsAsync()).status;
  if (finalStatus !== "granted") return null;

  const projectId = Constants.expoConfig?.extra?.eas?.projectId ?? Constants.easConfig?.projectId ?? undefined;
  const response = await Notifications.getExpoPushTokenAsync(projectId ? { projectId } : undefined);
  return response.data;
}

async function getOrCreateDeviceId(): Promise<string | null> {
  if (Platform.OS === "web") return null;
  const existing = await SecureStore.getItemAsync(PUSH_DEVICE_ID_KEY);
  if (existing) return existing;
  const id = `${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 12)}`;
  await SecureStore.setItemAsync(PUSH_DEVICE_ID_KEY, id);
  return id;
}

function normalizePlatform(platform: string): "ios" | "android" | "web" | "unknown" {
  if (platform === "ios" || platform === "android" || platform === "web") return platform;
  return "unknown";
}
