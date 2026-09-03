import React, { createContext, useCallback, useContext, useEffect, useRef, useState, ReactNode } from "react";
import { useQueryClient } from "@tanstack/react-query";
import {
  getSession,
  signIn,
  signInWithApple,
  signInWithGoogle,
  signOut,
  signUp,
  verifyEmailCode,
  sendVerificationCode,
} from "../api/auth";
import type { SignUpOutcome } from "../api/auth";
import { User } from "../types";
import Toast from "react-native-toast-message";
import { unregisterCurrentDevicePushToken } from "../utils/pushNotifications";

interface AuthState {
  user: User | null;
  isLoading: boolean;
  isAuthenticated: boolean;
  login: (email: string, password: string) => Promise<void>;
  register: (name: string, email: string, password: string) => Promise<SignUpOutcome>;
  verifyEmail: (email: string, code: string) => Promise<void>;
  resendCode: (email: string) => Promise<void>;
  loginWithGoogle: () => Promise<void>;
  loginWithApple: () => Promise<void>;
  logout: () => Promise<void>;
}

const AuthContext = createContext<AuthState>({
  user: null,
  isLoading: true,
  isAuthenticated: false,
  login: async () => {},
  register: async () => "signed-in" as SignUpOutcome,
  verifyEmail: async () => {},
  resendCode: async () => {},
  loginWithGoogle: async () => {},
  loginWithApple: async () => {},
  logout: async () => {},
});

export function AuthProvider({ children }: { children: ReactNode }) {
  const queryClient = useQueryClient();
  const [user, setUser] = useState<User | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const activeUserId = useRef<string | null>(null);
  const adoptSession = useCallback(
    async (nextUser: User | null) => {
      const nextUserId = nextUser?._id ?? null;
      if (activeUserId.current !== nextUserId) {
        // Query keys are intentionally shared throughout the app. Purge every
        // account-scoped cache before a different user can render it.
        queryClient.clear();
        activeUserId.current = nextUserId;
      }
      setUser(nextUser);
      // The backend pins every authenticated account to GYOCC. There is no
      // organization choice or organization onboarding in this app.
    },
    [queryClient]
  );

  useEffect(() => {
    let cancelled = false;

    (async () => {
      try {
        const session = await getSession();
        if (!cancelled) await adoptSession(session?.user ?? null);
      } catch {
        if (!cancelled) await adoptSession(null);
      } finally {
        if (!cancelled) setIsLoading(false);
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [adoptSession]);

  async function login(email: string, password: string) {
    const result = await signIn(email, password);
    await adoptSession(result.user);
  }

  async function register(name: string, email: string, password: string) {
    const result = await signUp(name, email, password);
    if (result.user) await adoptSession(result.user);
    return result.outcome;
  }

  async function verifyEmail(email: string, code: string) {
    const verified = await verifyEmailCode(email, code);
    if (!verified) {
      throw new Error("Your email is confirmed, but signing in failed. Please log in.");
    }
    await adoptSession(verified);
  }

  async function resendCode(email: string) {
    await sendVerificationCode(email);
  }

  async function loginWithGoogle() {
    const result = await signInWithGoogle();
    await adoptSession(result.user);
  }

  async function loginWithApple() {
    const result = await signInWithApple();
    await adoptSession(result.user);
  }

  async function logout() {
    try {
      // This must happen before signOut deletes the session cookie; the API
      // only lets the token's owning account revoke it.
      await unregisterCurrentDevicePushToken();
    } catch (error) {
      Toast.show({
        type: "error",
        text1: "Could not sign out safely",
        text2: (error as { message?: string })?.message ?? "Check your connection and try again.",
      });
      return;
    }

    try {
      await signOut();
    } catch {
      // ignore sign-out errors
    }
    await adoptSession(null);
    Toast.show({ type: "success", text1: "Signed out" });
  }

  return (
    <AuthContext.Provider
      value={{
        user,
        isLoading,
        isAuthenticated: !!user,
        login,
        register,
        verifyEmail,
        resendCode,
        loginWithGoogle,
        loginWithApple,
        logout,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  return useContext(AuthContext);
}
