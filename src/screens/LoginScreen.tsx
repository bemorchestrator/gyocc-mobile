import React, { useState } from "react";
import {
  Image,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
  useWindowDimensions,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import * as AppleAuthentication from "expo-apple-authentication";
import { LinearGradient } from "expo-linear-gradient";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { StatusBar } from "expo-status-bar";
import { Controller, useForm } from "react-hook-form";
import Toast from "react-native-toast-message";
import { useAuth } from "../context/AuthContext";
import { font } from "../constants/fonts";

const BG = "#840016";
const HEADER = "#F1F0EC";
const FIELD = "#F4F5F0";
const INK = "#F1F0EC";
const FIELD_INK = "#3F3230";
const MUTED = "#8A7E78";
const PRIMARY = "#840016";
const ON_PRIMARY = "#F4F5F0";

// Cream at the top so the dark wordmark stays readable, clearing through the
// middle to reveal the choir, then settling into maroon behind the form.
const SCRIM_COLORS = [
  HEADER,
  "rgba(241,240,236,.97)",
  "rgba(241,240,236,.14)",
  "rgba(132,0,22,.34)",
  "rgba(132,0,22,.88)",
  BG,
  "#66000F",
] as const;
const SCRIM_STOPS = [0, .15, .25, .35, .44, .54, 1] as const;

interface FormData {
  email: string;
  password: string;
}

export default function LoginScreen({ navigation }: { navigation: { navigate: (screen: string, params?: object) => void; goBack: () => void } }) {
  const { login, loginWithApple, loginWithGoogle } = useAuth();
  const insets = useSafeAreaInsets();
  const { height } = useWindowDimensions();
  const [loading, setLoading] = useState(false);
  const [socialLoading, setSocialLoading] = useState<"google" | "apple" | null>(null);
  const [showPassword, setShowPassword] = useState(false);
  const { control, handleSubmit, formState: { errors } } = useForm<FormData>({
    defaultValues: { email: "", password: "" },
  });

  async function onSubmit(data: FormData) {
    if (socialLoading) return;
    setLoading(true);
    const email = data.email.trim().toLowerCase();
    try {
      await login(email, data.password);
    } catch (err: unknown) {
      const message = (err as { message?: string })?.message ?? "";

      // The account exists but the address was never confirmed. Send them to
      // the code screen rather than leaving them retrying a password that is
      // perfectly correct.
      if (/verif/i.test(message)) {
        Toast.show({
          type: "success",
          text1: "Confirm your email first",
          text2: "We'll send a 6-digit code to get you in.",
        });
        navigation.navigate("VerifyEmail", { email });
        return;
      }

      Toast.show({
        type: "error",
        text1: "Login failed",
        text2: message || "Invalid credentials",
      });
    } finally {
      setLoading(false);
    }
  }

  async function onSocialSignIn(provider: "google" | "apple") {
    if (loading || socialLoading) return;
    setSocialLoading(provider);
    try {
      if (provider === "google") {
        await loginWithGoogle();
      } else {
        await loginWithApple();
      }
    } catch (err: unknown) {
      const message = (err as { message?: string })?.message ?? "Could not complete sign-in.";
      const cancelled = /cancel/i.test(message);
      if (!cancelled) {
        Toast.show({
          type: "error",
          text1: `${provider === "google" ? "Google" : "Apple"} sign-in failed`,
          text2: message,
        });
      }
    } finally {
      setSocialLoading(null);
    }
  }

  return (
    <View style={styles.root}>
      <StatusBar style="dark" />
      <Image source={require("../../assets/login-backdrop.jpg")} style={styles.backdrop} resizeMode="cover" />
      <LinearGradient colors={SCRIM_COLORS} locations={SCRIM_STOPS} style={styles.backdrop} pointerEvents="none" />

      <KeyboardAvoidingView style={styles.fill} behavior={Platform.OS === "ios" ? "padding" : "height"}>
        <ScrollView
          contentContainerStyle={[styles.scroll, { paddingTop: insets.top + 18, paddingBottom: insets.bottom + 28 }]}
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}
        >
          <View style={styles.topBar}>
            <TouchableOpacity accessibilityLabel="Back" style={styles.back} onPress={() => navigation.goBack()}>
              <Ionicons name="arrow-back" size={20} color="#3F3230" />
            </TouchableOpacity>
          </View>

          <View style={styles.brand}>
            <Image source={require("../../assets/portal-logo-transparent.png")} style={styles.logo} resizeMode="contain" />
          </View>

          {/* Uncovered band where the circle of singers reads through. */}
          <View style={{ height: Math.max(124, height * .21) }} />

          <View style={styles.panel}>
            <Text style={styles.title}>Welcome back</Text>
            <Text style={styles.subtitle}>Sign in to continue to your music family.</Text>

            <View style={styles.form}>
              <Controller
                control={control}
                name="email"
                rules={{
                  required: "Email is required",
                  pattern: { value: /^\S+@\S+\.\S+$/, message: "Enter a valid email" },
                }}
                render={({ field: { onChange, value } }) => (
                  <View>
                    <Text style={styles.inputLabel}>Email address</Text>
                    <TextInput
                      style={[styles.input, errors.email && styles.inputError]}
                      placeholder="you@example.com"
                      placeholderTextColor={MUTED}
                      value={value}
                      onChangeText={onChange}
                      autoCapitalize="none"
                      autoCorrect={false}
                      keyboardType="email-address"
                    />
                  </View>
                )}
              />
              {errors.email ? <Text style={styles.error}>{errors.email.message}</Text> : null}

              <Controller
                control={control}
                name="password"
                rules={{ required: "Password is required" }}
                render={({ field: { onChange, value } }) => (
                  <View>
                    <Text style={styles.inputLabel}>Password</Text>
                    <View style={[styles.passwordField, errors.password && styles.inputError]}>
                      <TextInput
                        style={styles.passwordInput}
                        placeholder="Enter your password"
                        placeholderTextColor={MUTED}
                        value={value}
                        onChangeText={onChange}
                        secureTextEntry={!showPassword}
                      />
                      <TouchableOpacity style={styles.showButton} onPress={() => setShowPassword((next) => !next)}>
                        <Text style={styles.show}>{showPassword ? "Hide" : "Show"}</Text>
                      </TouchableOpacity>
                    </View>
                  </View>
                )}
              />
              {errors.password ? <Text style={styles.error}>{errors.password.message}</Text> : null}

              <View style={styles.optionsRow}>
                <TouchableOpacity onPress={() => navigation.navigate("ForgotPassword")}>
                  <Text style={styles.link}>Forgot password?</Text>
                </TouchableOpacity>
              </View>

              <TouchableOpacity style={[styles.primaryBtn, (loading || socialLoading) && styles.disabledBtn]} disabled={loading || Boolean(socialLoading)} onPress={handleSubmit(onSubmit)}>
                <Text style={styles.primaryBtnText}>{loading ? "Signing in…" : "Sign in"}</Text>
              </TouchableOpacity>

              <View style={styles.dividerRow}>
                <View style={styles.dividerLine} />
                <Text style={styles.dividerText}>or continue with</Text>
                <View style={styles.dividerLine} />
              </View>

              <TouchableOpacity
                accessibilityRole="button"
                accessibilityLabel="Continue with Google"
                style={[styles.socialBtn, (loading || socialLoading) && styles.disabledBtn]}
                disabled={loading || Boolean(socialLoading)}
                onPress={() => onSocialSignIn("google")}
              >
                <Ionicons name="logo-google" size={20} color="#3F3230" />
                <Text style={styles.socialBtnText}>
                  {socialLoading === "google" ? "Connecting…" : "Continue with Google"}
                </Text>
              </TouchableOpacity>

              {Platform.OS === "ios" ? (
                <View style={(loading || socialLoading) && styles.disabledBtn} pointerEvents={loading || socialLoading ? "none" : "auto"}>
                  <AppleAuthentication.AppleAuthenticationButton
                    buttonType={AppleAuthentication.AppleAuthenticationButtonType.CONTINUE}
                    buttonStyle={AppleAuthentication.AppleAuthenticationButtonStyle.WHITE}
                    cornerRadius={16}
                    style={styles.appleBtn}
                    onPress={() => onSocialSignIn("apple")}
                  />
                </View>
              ) : null}
            </View>

            <Text style={styles.footer}>Need an account? Ask your conductor or section admin.</Text>
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: BG },
  fill: { flex: 1 },
  backdrop: { position: "absolute", top: 0, left: 0, right: 0, bottom: 0, width: "100%", height: "100%" },
  scroll: { flexGrow: 1, paddingHorizontal: 26 },
  topBar: { height: 40, justifyContent: "center" },
  back: { width: 40, height: 40, borderRadius: 14, backgroundColor: "rgba(132,0,22,.09)", alignItems: "center", justifyContent: "center" },
  brand: { alignItems: "center", justifyContent: "center" },
  logo: { width: "100%", height: 118 },
  panel: { flexGrow: 1 },
  title: { color: INK, fontSize: 30, lineHeight: 36, fontFamily: font.extraBold, textShadowColor: "rgba(46,0,8,.45)", textShadowOffset: { width: 0, height: 2 }, textShadowRadius: 12 },
  subtitle: { color: ON_PRIMARY, opacity: 0.82, fontSize: 13, lineHeight: 20, fontFamily: font.regular, marginTop: 7, maxWidth: 310 },
  form: { marginTop: 26, gap: 15 },
  inputLabel: { color: INK, fontSize: 12, fontFamily: font.semiBold, marginBottom: 8, marginLeft: 2 },
  input: { height: 56, borderRadius: 16, backgroundColor: FIELD, color: FIELD_INK, fontSize: 14, fontFamily: font.medium, paddingHorizontal: 17 },
  passwordField: { height: 56, borderRadius: 16, backgroundColor: FIELD, flexDirection: "row", alignItems: "center", paddingLeft: 17 },
  passwordInput: { flex: 1, height: "100%", color: FIELD_INK, fontSize: 14, fontFamily: font.medium, padding: 0 },
  showButton: { height: "100%", justifyContent: "center", paddingHorizontal: 17 },
  show: { color: PRIMARY, fontSize: 12, fontFamily: font.bold },
  inputError: { backgroundColor: "#E8D7D8" },
  error: { color: "#FFC9CE", fontSize: 11, fontFamily: font.medium, marginTop: -8, marginLeft: 3 },
  optionsRow: { alignItems: "flex-end", marginTop: -2 },
  link: { color: ON_PRIMARY, fontSize: 12, fontFamily: font.semiBold },
  primaryBtn: { height: 56, borderRadius: 16, backgroundColor: HEADER, alignItems: "center", justifyContent: "center", marginTop: 5, shadowColor: "#2E0008", shadowOpacity: 0.32, shadowRadius: 14, shadowOffset: { width: 0, height: 7 }, elevation: 4 },
  primaryBtnText: { color: PRIMARY, fontSize: 14, fontFamily: font.bold },
  dividerRow: { flexDirection: "row", alignItems: "center", gap: 10, marginVertical: 3 },
  dividerLine: { flex: 1, height: StyleSheet.hairlineWidth, backgroundColor: "rgba(244,245,240,.46)" },
  dividerText: { color: ON_PRIMARY, opacity: 0.76, fontSize: 11, fontFamily: font.medium },
  socialBtn: { height: 56, borderRadius: 16, backgroundColor: FIELD, flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 10 },
  socialBtnText: { color: FIELD_INK, fontSize: 14, fontFamily: font.semiBold },
  appleBtn: { width: "100%", height: 56 },
  disabledBtn: { opacity: 0.65 },
  footer: { color: ON_PRIMARY, opacity: 0.72, fontSize: 11, lineHeight: 17, fontFamily: font.regular, textAlign: "center", marginTop: 27 },
});
