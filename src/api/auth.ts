import * as SecureStore from "expo-secure-store";
import client, { COOKIE_KEY } from "./client";
import { User } from "../types";

export async function signIn(
  email: string,
  password: string
): Promise<{ user: User; token?: string }> {
  const { data } = await client.post("/api/auth/sign-in/email", {
    email,
    password,
  });
  // Better Auth returns the session token in the JSON body.
  // Build the cookie value the backend expects (same format as set-cookie).
  const token = data.token ?? data.session?.token;
  if (token) {
    await SecureStore.setItemAsync(COOKIE_KEY, `gyocc.session_token=${token}`);
  }
  return data;
}

export async function signOut(): Promise<void> {
  await client.post("/api/auth/sign-out").catch(() => {});
  await SecureStore.deleteItemAsync(COOKIE_KEY);
}

export async function getSession(): Promise<{ user: User } | null> {
  try {
    const { data } = await client.get("/api/auth/get-session");
    return data?.user ? data : null;
  } catch {
    return null;
  }
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
