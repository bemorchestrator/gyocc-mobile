import axios from "axios";
import { getSessionValue, setSessionValue } from "../utils/sessionStorage";
import { BASE_URL, COOKIE_KEY } from "./config";


if (__DEV__) {
  console.log(`[API] Base URL ${BASE_URL}`);
}

const client = axios.create({
  baseURL: BASE_URL,
  timeout: 10000,
  headers: {
    "Content-Type": "application/json",
    Origin: BASE_URL,
  },
});

// Inject stored session cookie on every request
client.interceptors.request.use(async (config) => {
  const cookie = await getSessionValue(COOKIE_KEY);
  if (cookie) {
    config.headers["Cookie"] = cookie;
    config.headers["X-GYOCC-Session-Cookie"] = cookie;
  }
  if (__DEV__) {
    const requestUrl = `${config.baseURL ?? BASE_URL}${config.url ?? ""}`;
    console.log(`[API] ${config.method?.toUpperCase()} ${requestUrl}`);
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
        await setSessionValue(COOKIE_KEY, sessionCookie);
      }
    }
    return response;
  },
  (error) => {
    const skipErrorLog = Boolean((error.config as { skipErrorLog?: boolean } | undefined)?.skipErrorLog);
    const message =
      error.response?.data?.message ||
      error.response?.data?.error ||
      error.message ||
      "Something went wrong";
    if (__DEV__ && !skipErrorLog) {
      console.error(`[API Error] ${error.response?.status}: ${message}`);
    }
    return Promise.reject({ message, status: error.response?.status });
  }
);

export { COOKIE_KEY, BASE_URL };
export default client;
