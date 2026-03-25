import React, { createContext, useContext, useEffect, useState, ReactNode } from "react";
import { getSession, signIn, signOut } from "../api/auth";
import { User } from "../types";
import Toast from "react-native-toast-message";

interface AuthState {
  user: User | null;
  isLoading: boolean;
  isAuthenticated: boolean;
  login: (email: string, password: string) => Promise<void>;
  logout: () => Promise<void>;
}

const AuthContext = createContext<AuthState>({
  user: null,
  isLoading: true,
  isAuthenticated: false,
  login: async () => {},
  logout: async () => {},
});

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    checkSession();
  }, []);

  async function checkSession() {
    try {
      const session = await getSession();
      if (session?.user) {
        setUser(session.user);
      }
    } catch {
      // not authenticated
    } finally {
      setIsLoading(false);
    }
  }

  async function login(email: string, password: string) {
    const result = await signIn(email, password);
    setUser(result.user);
  }

  async function logout() {
    try {
      await signOut();
    } catch {
      // ignore sign-out errors
    }
    setUser(null);
    Toast.show({ type: "success", text1: "Signed out" });
  }

  return (
    <AuthContext.Provider
      value={{
        user,
        isLoading,
        isAuthenticated: !!user,
        login,
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
