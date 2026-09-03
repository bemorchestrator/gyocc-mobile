import Constants from "expo-constants";
import * as AppleAuthentication from "expo-apple-authentication";
import * as Linking from "expo-linking";
import * as WebBrowser from "expo-web-browser";
import { Platform } from "react-native";
import { getSessionValue, setSessionValue } from "../utils/sessionStorage";
import { AUTH_BASE_URL, COOKIE_KEY } from "./config";

const APP_SCHEME = resolveAppScheme();
const OAUTH_CALLBACK_URL = resolveOAuthCallbackUrl();
const AUTH_ORIGIN = resolveAuthOrigin(OAUTH_CALLBACK_URL);

type SocialSignInResponse = {
  token?: string;
  url?: string;
  redirect?: boolean;
  appleName?: string;
  error?: {
    message?: string;
    code?: string;
  };
};

export async function signInWithGoogleSocial() {
  console.log("[Google Auth] Starting social sign-in", {
    authBaseURL: AUTH_BASE_URL,
    callbackURL: OAUTH_CALLBACK_URL,
    authOrigin: AUTH_ORIGIN,
    appOwnership: Constants.appOwnership ?? null,
    scheme: APP_SCHEME,
    platform: Platform.OS,
  });

  const response = await requestGoogleAuthorizationUrl();
  console.log("[Google Auth] signIn.social returned", {
    hasError: Boolean(response.error),
    hasUrl: Boolean(response.url),
    redirected: response.redirect ?? null,
  });

  if (response.error) {
    console.error("[Google Auth] signIn.social error", response.error);
    throw new Error(response.error.message || "Google sign-in failed.");
  }

  await completeNativeOAuth(response.url);
  console.log("[Google Auth] Session cookie persist complete");

  return response;
}

export async function isAppleSignInAvailable(): Promise<boolean> {
  return Platform.OS === "ios" && AppleAuthentication.isAvailableAsync();
}

/**
 * Use the system Apple sheet, then let Better Auth validate Apple's signed ID
 * token and create the same session used by email and Google sign-in.
 */
export async function signInWithAppleSocial(): Promise<SocialSignInResponse> {
  if (!(await isAppleSignInAvailable())) {
    throw new Error("Sign in with Apple is not available on this device.");
  }

  let credential: AppleAuthentication.AppleAuthenticationCredential;
  try {
    credential = await AppleAuthentication.signInAsync({
      requestedScopes: [
        AppleAuthentication.AppleAuthenticationScope.FULL_NAME,
        AppleAuthentication.AppleAuthenticationScope.EMAIL,
      ],
    });
  } catch (error) {
    if ((error as { code?: string })?.code === "ERR_REQUEST_CANCELED") {
      throw new Error("Apple sign-in was cancelled.");
    }
    throw error;
  }

  if (!credential.identityToken) {
    throw new Error("Apple sign-in completed, but no identity token was returned.");
  }

  const appleName = credential.fullName
    ? AppleAuthentication.formatFullName(credential.fullName).trim()
    : "";

  const result = await fetch(`${AUTH_BASE_URL}/api/auth/sign-in/social`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "expo-origin": AUTH_ORIGIN,
      "X-GYOCC-Client": "mobile",
      Cookie: (await getSessionValue(COOKIE_KEY)) ?? "",
    },
    body: JSON.stringify({
      provider: "apple",
      callbackURL: OAUTH_CALLBACK_URL,
      idToken: { token: credential.identityToken },
    }),
  });

  const data = (await result.json().catch(() => ({}))) as SocialSignInResponse;
  if (!result.ok || data.error) {
    throw new Error(data.error?.message || `Apple sign-in failed (${result.status}).`);
  }

  const cookieHeader = result.headers.get("x-gyocc-set-cookie");
  const sessionCookie = cookieHeader ? extractSessionCookie(cookieHeader) : null;
  if (sessionCookie) {
    await setSessionValue(COOKIE_KEY, sessionCookie);
  }

  return { ...data, appleName: appleName || undefined };
}

async function requestGoogleAuthorizationUrl(): Promise<SocialSignInResponse> {
  const result = await fetch(`${AUTH_BASE_URL}/api/auth/sign-in/social`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "expo-origin": AUTH_ORIGIN,
      Cookie: (await getSessionValue(COOKIE_KEY)) ?? "",
    },
    body: JSON.stringify({
      provider: "google",
      callbackURL: OAUTH_CALLBACK_URL,
      newUserCallbackURL: OAUTH_CALLBACK_URL,
      errorCallbackURL: OAUTH_CALLBACK_URL,
      disableRedirect: true,
    }),
  });

  const data = (await result.json().catch(() => ({}))) as SocialSignInResponse;
  if (!result.ok) {
    throw new Error(data.error?.message || `Google sign-in failed (${result.status}).`);
  }

  return data;
}

async function completeNativeOAuth(authorizationUrl?: string | null) {
  if (!authorizationUrl) {
    throw new Error("Google did not return an authorization URL.");
  }

  const params = new URLSearchParams({ authorizationURL: authorizationUrl });
  const proxyUrl = `${AUTH_BASE_URL}/api/auth/expo-authorization-proxy?${params.toString()}`;

  console.log("[Google Auth] Opening native auth session", {
    callbackURL: OAUTH_CALLBACK_URL,
    hasAuthorizationUrl: true,
  });

  if (Platform.OS === "android") {
    WebBrowser.dismissAuthSession();
  }

  const result = await WebBrowser.openAuthSessionAsync(proxyUrl, OAUTH_CALLBACK_URL);
  console.log("[Google Auth] Native auth session result", { type: result.type });

  if (result.type !== "success") {
    throw new Error("Google sign-in was cancelled.");
  }

  const cookieHeader = new URL(result.url).searchParams.get("cookie");
  if (!cookieHeader) {
    throw new Error("Google sign-in completed, but no session cookie was returned.");
  }

  const sessionCookie = extractSessionCookie(cookieHeader);
  if (!sessionCookie) {
    throw new Error("Google sign-in completed, but the returned cookie was not a session.");
  }

  await setSessionValue(COOKIE_KEY, sessionCookie);
}

function extractSessionCookie(cookieHeader: string): string | null {
  const decoded = decodeURIComponent(cookieHeader);
  return extractCookie(decoded, "gyocc.session_token");
}

function extractCookie(cookieHeader: string, cookieName: string): string | null {
  const escapedName = cookieName.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
  const match = cookieHeader.match(new RegExp(`(?:^|,\\s*|;\\s*)(?:__Secure-)?${escapedName}=([^;,]+)`));
  return match ? `${cookieName}=${match[1]}` : null;
}

function resolveAppScheme(): string {
  const configured = Constants.expoConfig?.scheme;
  if (Array.isArray(configured)) return configured[0] || "gyocc";
  return configured || "gyocc";
}

function resolveOAuthCallbackUrl(): string {
  if (Constants.appOwnership === "expo") {
    return Linking.createURL("/auth/callback");
  }
  return `${APP_SCHEME}://auth/callback`;
}

function resolveAuthOrigin(callbackUrl: string): string {
  if (callbackUrl.startsWith("exp://")) {
    return callbackUrl;
  }
  return `${APP_SCHEME}://`;
}
