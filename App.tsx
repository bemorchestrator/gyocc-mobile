import React from "react";
import { AppState, Platform } from "react-native";
import { StatusBar } from "expo-status-bar";
import { SafeAreaProvider } from "react-native-safe-area-context";
import { NavigationContainer } from "@react-navigation/native";
import { QueryClient, QueryClientProvider, focusManager } from "@tanstack/react-query";
import Toast from "react-native-toast-message";
import { useFonts } from "expo-font";
import {
  Inter_400Regular,
  Inter_500Medium,
  Inter_600SemiBold,
  Inter_700Bold,
  Inter_800ExtraBold,
  Inter_900Black,
} from "@expo-google-fonts/inter";
import { AuthProvider } from "./src/context/AuthContext";
import { useAuth } from "./src/context/AuthContext";
import RootNavigator from "./src/navigation/RootNavigator";
import LoadingSpinner from "./src/components/LoadingSpinner";
import { usePushNotifications } from "./src/utils/pushNotifications";
import { useRealtimeSync } from "./src/api/realtime";

// Deep links kept for anyone landing from an older email. Both flows now use
// one-time codes instead of links (a link tapped in a mail app opens in that
// app's own browser, which can't reach the native session), so these screens
// take an email address and prompt for the code rather than consuming a token.
const linking = {
  prefixes: ["gyocc://"],
  config: {
    screens: {
      ResetPassword: "reset-password",
      VerifyEmail: "verify-email",
    },
  },
};

const queryClient = new QueryClient({
  defaultOptions: {
    queries: { retry: 1, staleTime: 30_000, refetchOnWindowFocus: true },
  },
});

// React Query has no notion of "focus" in React Native, so wire it to AppState:
// bringing the app to the foreground marks queries focused and refetches any
// that have gone stale (covers admin edits/deletes made while backgrounded).
focusManager.setEventListener((handleFocus) => {
  const subscription = AppState.addEventListener("change", (status) => {
    if (Platform.OS !== "web") handleFocus(status === "active");
  });
  return () => subscription.remove();
});

export default function App() {
  const [fontsLoaded] = useFonts({
    Inter_400Regular,
    Inter_500Medium,
    Inter_600SemiBold,
    Inter_700Bold,
    Inter_800ExtraBold,
    Inter_900Black,
  });

  // Same welcome screen as the session-restore state, so the launch does not
  // flash a bare background before the fonts land.
  if (!fontsLoaded) return <LoadingSpinner />;

  return (
    <SafeAreaProvider>
      <QueryClientProvider client={queryClient}>
        <AuthProvider>
          <AppShell />
        </AuthProvider>
      </QueryClientProvider>
      <Toast />
    </SafeAreaProvider>
  );
}

function AppShell() {
  const { user, isAuthenticated } = useAuth();
  usePushNotifications(user?._id);
  useRealtimeSync(isAuthenticated);

  return (
    <NavigationContainer linking={linking}>
      <RootNavigator />
      <StatusBar style="dark" />
    </NavigationContainer>
  );
}
