import React from "react";
import { Platform } from "react-native";
import { useAuth } from "../context/AuthContext";
import AuthStack from "./AuthStack";
import MainTabs from "./MainTabs";
import OnboardingScreen from "../screens/OnboardingScreen";
import LoadingSpinner from "../components/LoadingSpinner";

/**
 * Three states, not two.
 *
 * Signed in is not the same as ready to use the app: every backend route is
 * scoped to an organization, so an account that belongs to none has to join or
 * create one first. Sending those users straight to MainTabs meant every tab
 * failed with 403 NO_ACTIVE_ORGANIZATION.
 */
export default function RootNavigator() {
  const { isAuthenticated, isLoading, hasOrganization } = useAuth();
  const previewMember =
    __DEV__ &&
    Platform.OS === "web" &&
    typeof window !== "undefined" &&
    (window.location?.search ?? "").includes("preview=member");

  if (isLoading) return <LoadingSpinner />;

  if (previewMember) return <MainTabs />;
  if (!isAuthenticated) return <AuthStack />;
  // hasOrganization === null means the check is still in flight.
  if (hasOrganization === null) return <LoadingSpinner />;
  if (!hasOrganization) return <OnboardingScreen />;

  return <MainTabs />;
}
