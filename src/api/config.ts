import Constants from "expo-constants";
import { Platform } from "react-native";

function normalizeUrl(url: string) {
  return url.replace(/\/+$/, "");
}

function getDevelopmentApiUrl() {
  const configuredUrl = process.env.EXPO_PUBLIC_API_URL?.trim();
  if (configuredUrl) {
    return normalizeUrl(configuredUrl);
  }

  const debuggerHost =
    Constants.expoConfig?.hostUri ?? Constants.manifest2?.extra?.expoGo?.debuggerHost;
  const host = debuggerHost?.split(":")[0];
  if (host) return `http://${host}:5001`;
  if (Platform.OS === "android") return "http://10.0.2.2:5001";
  return "http://localhost:5001";
}

const PRODUCTION_API_URL = "https://api.gyocc.org";

// Standalone (Release) builds always talk to production. EXPO_PUBLIC_* values
// from mobile/.env are inlined into every bundle, so honoring them outside
// __DEV__ would bake a LAN address into a phone install and split sign-in
// (production) from data (an unreachable local backend).
export function getBaseUrl() {
  if (!__DEV__) {
    return PRODUCTION_API_URL;
  }

  return getDevelopmentApiUrl();
}

export function getAuthBaseUrl() {
  if (!__DEV__) {
    return PRODUCTION_API_URL;
  }

  const configuredAuthUrl = process.env.EXPO_PUBLIC_AUTH_API_URL?.trim();
  if (configuredAuthUrl) {
    return normalizeUrl(configuredAuthUrl);
  }

  return PRODUCTION_API_URL;
}

export const BASE_URL = getBaseUrl();
export const AUTH_BASE_URL = getAuthBaseUrl();
export const COOKIE_KEY = "gyocc_session_cookie";
