import client, { COOKIE_KEY } from "./client";
import { User } from "../types";
import { deleteSessionValue, setSessionValue } from "../utils/sessionStorage";
import { signInWithGoogleSocial } from "./betterAuthClient";

export async function signIn(
  email: string,
  password: string
): Promise<{ user: User; token?: string }> {
  await deleteSessionValue(COOKIE_KEY);

  const { data } = await client.post("/api/auth/sign-in/email", {
    email,
    password,
  });
  // Better Auth returns the session token in the JSON body.
  // Build the cookie value the backend expects (same format as set-cookie).
  const token = data.token ?? data.session?.token;
  if (token) {
    await setSessionValue(COOKIE_KEY, `gyocc.session_token=${token}`);
  }

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

export type SignUpOutcome = "signed-in" | "needs-verification" | "awaiting-access";

export async function signUp(
  name: string,
  email: string,
  password: string
): Promise<{ user: User | null; outcome: SignUpOutcome }> {
  await deleteSessionValue(COOKIE_KEY);

  const { data } = await client.post("/api/auth/sign-up/email", { name, email, password });
  // Better Auth only returns a session token when email verification is off.
  // In production the account exists but stays locked until the address is confirmed.
  const token = data.token ?? data.session?.token;
  if (!token) return { user: null, outcome: "needs-verification" };

  await setSessionValue(COOKIE_KEY, `gyocc.session_token=${token}`);
  const session = await getSession();
  if (!session?.user) {
    // The account is real, but every API route is org-scoped and a fresh signup
    // belongs to no organization yet — an admin has to grant access first.
    await deleteSessionValue(COOKIE_KEY);
    return { user: null, outcome: "awaiting-access" };
  }

  return { user: session.user, outcome: "signed-in" };
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

export async function getSession(): Promise<{ user: User } | null> {
  try {
    const { data } = await client.get("/api/profile", { skipErrorLog: true } as never);
    return data?.email
        ? {
          user: {
            _id: data.id ?? data.email,
            name: data.name,
            email: data.email,
            image: data.image,
          },
        }
      : null;
  } catch {
    // Fall back below for Better Auth-managed browser/native cookies.
  }

  try {
    const { data } = await client.get("/api/auth/get-session", { skipErrorLog: true } as never);
    if (data?.user) return data;
  } catch {
    return null;
  }

  return null;
}

export async function forgotPassword(email: string): Promise<void> {
  await client.post("/api/auth/request-password-reset", {
    email,
    redirectTo: "gyocc://reset-password",
  });
}

export async function resetPassword(token: string, newPassword: string): Promise<void> {
  await client.post("/api/auth/reset-password", {
    token,
    newPassword,
  });
}
