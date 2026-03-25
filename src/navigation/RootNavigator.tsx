import React from "react";
import { useAuth } from "../context/AuthContext";
import AuthStack from "./AuthStack";
import MainTabs from "./MainTabs";
import LoadingSpinner from "../components/LoadingSpinner";

export default function RootNavigator() {
  const { isAuthenticated, isLoading } = useAuth();

  if (isLoading) return <LoadingSpinner />;

  return isAuthenticated ? <MainTabs /> : <AuthStack />;
}
