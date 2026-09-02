import React from "react";
import { Platform } from "react-native";
import { useAuth } from "../context/AuthContext";
import AuthStack from "./AuthStack";
import MainTabs from "./MainTabs";
import LoadingSpinner from "../components/LoadingSpinner";

export default function RootNavigator() {
  const { isAuthenticated, isLoading } = useAuth();
  const previewMember =
    __DEV__ &&
    Platform.OS === "web" &&
    typeof window !== "undefined" &&
    (window.location?.search ?? "").includes("preview=member");

  if (isLoading) return <LoadingSpinner />;

  if (previewMember) return <MainTabs />;
  if (!isAuthenticated) return <AuthStack />;

  return <MainTabs />;
}
