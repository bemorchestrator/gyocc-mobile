import React, { createContext, useCallback, useContext, useEffect, useState, ReactNode } from "react";
import {
  getSession,
  signIn,
  signInWithGoogle,
  signOut,
  signUp,
  verifyEmailCode,
  sendVerificationCode,
} from "../api/auth";
import type { SignUpOutcome } from "../api/auth";
import { listMyOrganizations } from "../api/organizations";
import { User } from "../types";
import Toast from "react-native-toast-message";

/**
 * Two things gate access to the app, and they are separate:
 *
 *  1. Is there a session?      — signed in
 *  2. Is there an organization? — every feature route is org-scoped, and the
 *                                 backend returns 403 NO_ACTIVE_ORGANIZATION
 *                                 without one.
 *
 * A freshly registered account passes (1) and fails (2), which is why
 * `hasOrganization` is tracked separately: the navigator sends those users to
 * the onboarding screen instead of into an app where every screen errors.
 */
interface AuthState {
  user: User | null;
  isLoading: boolean;
  isAuthenticated: boolean;
  /** null while unknown (still checking). */
  hasOrganization: boolean | null;
  login: (email: string, password: string) => Promise<void>;
  register: (name: string, email: string, password: string) => Promise<SignUpOutcome>;
  verifyEmail: (email: string, code: string) => Promise<void>;
  resendCode: (email: string) => Promise<void>;
  loginWithGoogle: () => Promise<void>;
  logout: () => Promise<void>;
  /** Re-check organization membership, e.g. after creating or joining one. */
  refreshOrganizations: () => Promise<void>;
}

const AuthContext = createContext<AuthState>({
  user: null,
  isLoading: true,
  isAuthenticated: false,
  hasOrganization: null,
  login: async () => {},
  register: async () => "signed-in" as SignUpOutcome,
  verifyEmail: async () => {},
  resendCode: async () => {},
  loginWithGoogle: async () => {},
  logout: async () => {},
  refreshOrganizations: async () => {},
});

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [hasOrganization, setHasOrganization] = useState<boolean | null>(null);

  const loadOrganizations = useCallback(async () => {
    try {
      const orgs = await listMyOrganizations();
      setHasOrganization(orgs.length > 0);
    } catch {
      // Treat an unreadable list as "unknown but keep going" rather than
      // bouncing the user out — the onboarding screen retries on its own.
      setHasOrganization(false);
    }
  }, []);

  const adoptSession = useCallback(
    async (nextUser: User | null) => {
      setUser(nextUser);
      if (nextUser) {
        await loadOrganizations();
      } else {
        setHasOrganization(null);
      }
    },
    [loadOrganizations]
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

  async function logout() {
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
        hasOrganization,
        login,
        register,
        verifyEmail,
        resendCode,
        loginWithGoogle,
        logout,
        refreshOrganizations: loadOrganizations,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  return useContext(AuthContext);
}
