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

export function getBaseUrl() {
  const configuredUrl = process.env.EXPO_PUBLIC_API_URL?.trim();
  if (configuredUrl) {
    return normalizeUrl(configuredUrl);
  }

  if (__DEV__) {
    return getDevelopmentApiUrl();
  }

  return "https://api.gyocc.org";
}

export function getAuthBaseUrl() {
  const configuredAuthUrl = process.env.EXPO_PUBLIC_AUTH_API_URL?.trim();
  if (configuredAuthUrl) {
    return normalizeUrl(configuredAuthUrl);
  }

  if (__DEV__) {
    return "https://api.gyocc.org";
  }

  return getBaseUrl();
}

export const BASE_URL = getBaseUrl();
export const AUTH_BASE_URL = getAuthBaseUrl();
export const COOKIE_KEY = "gyocc_session_cookie";
