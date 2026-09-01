import client, { COOKIE_KEY } from "./client";
import { User } from "../types";
import { deleteSessionValue, getSessionValue, setSessionValue } from "../utils/sessionStorage";
import { signInWithGoogleSocial } from "./betterAuthClient";

function tokenFrom(data: unknown): string | null {
  const record = (data ?? {}) as { token?: unknown; session?: { token?: unknown } };
  const token = record.token ?? record.session?.token;
  return typeof token === "string" && token.length > 0 ? token : null;
}

/**
 * Make sure this session is stored, preferring the SIGNED cookie.
 *
 * The response interceptor in client.ts has already saved the signed cookie
 * the backend mirrored back (`<token>.<signature>`). That signature is what
 * Better Auth verifies, so keeping it means one session works everywhere —
 * both this app's session middleware and Better Auth's own endpoints.
 *
 * The unsigned token from the JSON body is only a fallback, for the case where
 * the mirrored header never arrived (an older backend, or a proxy that strips
 * unknown headers). It still authenticates against this app's middleware, so
 * sign-in keeps working; only the Better-Auth-native routes would be unhappy.
 */
async function ensureSessionStored(data: unknown): Promise<boolean> {
  const token = tokenFrom(data);
  const stored = await getSessionValue(COOKIE_KEY);

  // The interceptor already saved a cookie for this session — keep it, it is
  // the signed one.
  if (stored && (!token || stored.includes(token))) return true;

  if (!token) return false;
  await setSessionValue(COOKIE_KEY, `gyocc.session_token=${token}`);
  return true;
}

export async function signIn(
  email: string,
  password: string
): Promise<{ user: User; token?: string }> {
  await deleteSessionValue(COOKIE_KEY);

  const { data } = await client.post("/api/auth/sign-in/email", {
    email,
    password,
  });
  await ensureSessionStored(data);

  const session = await getSession();
  if (!session?.user) {
    throw new Error("Sign-in succeeded, but no mobile session was returned.");
  }

  if (session.user.email?.toLowerCase() !== email.trim().toLowerCase()) {
    await deleteSessionValue(COOKIE_KEY);
    throw new Error("The mobile session did not match the signed-in account. Please try again.");
  }

  return { ...data, user: session.user };
}

export type SignUpOutcome = "signed-in" | "needs-verification";

/**
 * Create an account.
 *
 * The backend never mails anything automatically on sign-up, so this asks for
 * a one-time code straight afterwards. The app confirms an address with a
 * six-digit code rather than a link: a link tapped inside a mail app opens in
 * that app's own browser, which has no access to the native session — the user
 * ends up verified but still signed out, with no way to get back.
 */
export async function signUp(
  name: string,
  email: string,
  password: string
): Promise<{ user: User | null; outcome: SignUpOutcome }> {
  await deleteSessionValue(COOKIE_KEY);

  const { data } = await client.post("/api/auth/sign-up/email", { name, email, password });

  const token = tokenFrom(data);
  if (!token) {
    // Verification is required (production): the account exists but is locked
    // until the address is confirmed with a code. The verification screen
    // requests that code itself — sending it here would fold a mail failure
    // into "could not create account", which would be a lie: the account is
    // already there, and the user just needs a code they can retry for.
    return { user: null, outcome: "needs-verification" };
  }

  // Verification is off (development) — the session is live immediately.
  await ensureSessionStored(data);
  const session = await getSession();
  return { user: session?.user ?? null, outcome: "signed-in" };
}

/**
 * Ask the backend to email a fresh six-digit confirmation code.
 *
 * Goes through /api/account rather than Better Auth's endpoint directly:
 * Better Auth sends the mail as a background task and answers "success"
 * whatever happens, so a broken mail server would leave this screen telling
 * people to check an inbox that will never receive anything. The wrapper
 * reports a real delivery failure instead.
 */
export async function sendVerificationCode(email: string): Promise<void> {
  await client.post("/api/account/verification-code", {
    email: email.trim().toLowerCase(),
  });
}

/**
 * Confirm an email address with the code from the email.
 * On success the backend signs the user in and returns a session token.
 */
export async function verifyEmailCode(email: string, otp: string): Promise<User | null> {
  // Confirming the code signs the user in, so drop any stale cookie first —
  // otherwise ensureSessionStored could keep one belonging to another account.
  await deleteSessionValue(COOKIE_KEY);

  const { data } = await client.post("/api/auth/email-otp/verify-email", {
    email: email.trim().toLowerCase(),
    otp: otp.trim(),
  });
  await ensureSessionStored(data);

  const session = await getSession();
  return session?.user ?? null;
}

export async function signInWithGoogle(): Promise<{ user: User }> {
  await deleteSessionValue(COOKIE_KEY);
  await signInWithGoogleSocial();
  const session = await getSession();
  console.log("[Google Auth] Session after OAuth", {
    hasSession: Boolean(session),
    hasUser: Boolean(session?.user),
    email: session?.user?.email ?? null,
  });
  if (!session?.user) {
    throw new Error("Google sign-in completed, but no session was returned.");
  }

  return session;
}

export async function signOut(): Promise<void> {
  await client.post("/api/auth/sign-out").catch(() => {});
  await deleteSessionValue(COOKIE_KEY);
}

/**
 * Read the current session.
 *
 * Uses Better Auth's own endpoint, which only needs a valid session — NOT
 * /api/profile, which additionally requires an active organization. Asking the
 * org-scoped route first meant a freshly registered user (who belongs to no
 * organization yet) looked signed out, so the app could never show them the
 * screen where they join one.
 */
export async function getSession(): Promise<{ user: User } | null> {
  try {
    const { data } = await client.get("/api/auth/get-session", { skipErrorLog: true } as never);
    const user = (data as { user?: Record<string, unknown> } | null)?.user;
    if (user) {
      return {
        user: {
          _id: String(user.id ?? user._id ?? user.email ?? ""),
          name: String(user.name ?? ""),
          email: String(user.email ?? ""),
          image: typeof user.image === "string" ? user.image : undefined,
        },
      };
    }
  } catch {
    // Fall through: mobile raw-token sessions aren't always resolvable by the
    // Better Auth handler, so try the app's own profile route as a backstop.
  }

  try {
    const { data } = await client.get("/api/profile", { skipErrorLog: true } as never);
    if (data?.email) {
      return {
        user: {
          _id: data.id ?? data.email,
          name: data.name,
          email: data.email,
          image: data.image,
        },
      };
    }
  } catch {
    return null;
  }

  return null;
}

// ── Password reset (one-time code) ───────────────────────────────────────────
// Same reasoning as email verification: a reset *link* opens in the mail app's
// browser, away from the app that needs the new password.

export async function forgotPassword(email: string): Promise<void> {
  await client.post("/api/account/password-reset-code", {
    email: email.trim().toLowerCase(),
  });
}

export async function resetPasswordWithCode(
  email: string,
  otp: string,
  password: string
): Promise<void> {
  await client.post("/api/auth/email-otp/reset-password", {
    email: email.trim().toLowerCase(),
    otp: otp.trim(),
    password,
  });
}
