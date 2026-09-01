import axios from "axios";
import { getSessionValue, setSessionValue } from "../utils/sessionStorage";
import { BASE_URL, COOKIE_KEY } from "./config";


if (__DEV__) {
  console.log(`[API] Base URL ${BASE_URL}`);
}

/**
 * Response header the backend mirrors the signed session cookie into.
 *
 * React Native hides Set-Cookie from JavaScript, so the app reads the cookie
 * back from here instead. Storing the *signed* value is what lets one session
 * satisfy both Better Auth's own endpoints and this app's session middleware.
 */
const NATIVE_SET_COOKIE_HEADER = "x-gyocc-set-cookie";

const client = axios.create({
  baseURL: BASE_URL,
  timeout: 10000,
  headers: {
    "Content-Type": "application/json",
    Origin: BASE_URL,
    // Tells the backend to mirror the signed session cookie back to us.
    "X-GYOCC-Client": "mobile",
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

/** Pull `gyocc.session_token=...` out of one or more Set-Cookie values. */
function readSessionCookie(raw: string | string[] | undefined): string | null {
  if (!raw) return null;
  const parts = Array.isArray(raw) ? raw : [raw];
  const session = parts
    .flatMap((value) => value.split(/,(?=\s*[A-Za-z0-9_.-]+=)/))
    .map((value) => value.split(";")[0].trim())
    .find((value) => value.startsWith("gyocc.session_token="));
  return session ?? null;
}

// Persist the session cookie the backend hands back.
client.interceptors.response.use(
  async (response) => {
    // The mirrored header first: on React Native it is the only one that
    // actually reaches JavaScript, and it carries the signature that Better
    // Auth verifies. Plain Set-Cookie is the fallback (web builds).
    const sessionCookie =
      readSessionCookie(response.headers[NATIVE_SET_COOKIE_HEADER]) ??
      readSessionCookie(response.headers["set-cookie"]);

    if (sessionCookie) {
      await setSessionValue(COOKIE_KEY, sessionCookie);
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
