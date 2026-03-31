import axios from "axios";
import * as SecureStore from "expo-secure-store";
import Constants from "expo-constants";

// Dynamically resolve the dev machine's IP from Expo's debuggerHost
const getBaseUrl = () => {
  if (__DEV__) {
    const debuggerHost =
      Constants.expoConfig?.hostUri ?? Constants.manifest2?.extra?.expoGo?.debuggerHost;
    const host = debuggerHost?.split(":")[0];
    if (host) return `http://${host}:5001`;
    return "http://localhost:5001";
  }
  return "https://api.gyocc.org";
};

const BASE_URL = getBaseUrl();
const COOKIE_KEY = "gyocc_session_cookie";

const client = axios.create({
  baseURL: BASE_URL,
  timeout: 10000,
  headers: {
    "Content-Type": "application/json",
  },
});

// Inject stored session cookie on every request
client.interceptors.request.use(async (config) => {
  const cookie = await SecureStore.getItemAsync(COOKIE_KEY);
  if (cookie) {
    config.headers["Cookie"] = cookie;
  }
  if (__DEV__) {
    console.log(`[API] ${config.method?.toUpperCase()} ${config.url}`);
  }
  return config;
});

// Capture set-cookie headers from responses and persist them
client.interceptors.response.use(
  async (response) => {
    const setCookie = response.headers["set-cookie"];
    if (setCookie) {
      // Extract session_token cookie (the one that matters for auth)
      const sessionCookie = setCookie
        .map((c: string) => c.split(";")[0])
        .filter((c: string) => c.startsWith("gyocc.session_token="))
        .join("; ");
      if (sessionCookie) {
        await SecureStore.setItemAsync(COOKIE_KEY, sessionCookie);
      }
    }
    return response;
  },
  (error) => {
    const message =
      error.response?.data?.message ||
      error.response?.data?.error ||
      error.message ||
      "Something went wrong";
    if (__DEV__) {
      console.error(`[API Error] ${error.response?.status}: ${message}`);
    }
    return Promise.reject({ message, status: error.response?.status });
  }
);

export { COOKIE_KEY, BASE_URL };
export default client;
