import React, { useCallback, useEffect, useRef, useState } from "react";
import {
  Image,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { StatusBar } from "expo-status-bar";
import Toast from "react-native-toast-message";
import { useAuth } from "../context/AuthContext";
import WelcomeBackdrop from "../components/WelcomeBackdrop";
import OtpInput from "../components/OtpInput";
import { font } from "../constants/fonts";

const BG = "#840016";
const HEADER = "#F1F0EC";
const INK = "#F1F0EC";
const ON_PRIMARY = "#F4F5F0";
const PRIMARY = "#840016";

const CODE_LENGTH = 6;
const RESEND_COOLDOWN_SECONDS = 45;

/**
 * Confirm an email address with a six-digit code.
 *
 * The app deliberately does not use the emailed verification *link*: tapping a
 * link in a mail app opens it in that app's own in-app browser, which cannot
 * reach the native session. People ended up with a verified address and no way
 * back into the app. A code they can read and type works everywhere.
 */
export default function VerifyEmailScreen({
  navigation,
  route,
}: {
  navigation: { navigate: (screen: string, params?: object) => void; goBack: () => void };
  route?: { params?: { email?: string } };
}) {
  const { verifyEmail, resendCode } = useAuth();
  const insets = useSafeAreaInsets();

  const email = route?.params?.email?.trim().toLowerCase() ?? "";
  const [code, setCode] = useState("");
  const [verifying, setVerifying] = useState(false);
  const [error, setError] = useState("");
  const [cooldown, setCooldown] = useState(RESEND_COOLDOWN_SECONDS);
  const [resending, setResending] = useState(false);
  const [sendingInitial, setSendingInitial] = useState(true);
  const submittedFor = useRef<string | null>(null);
  const requestedFor = useRef<string | null>(null);

  // Request the first code from here rather than during sign-up, so a mail
  // failure shows up on the screen that can retry it instead of masquerading
  // as a failed registration.
  useEffect(() => {
    if (!email || requestedFor.current === email) return;
    requestedFor.current = email;

    let cancelled = false;
    (async () => {
      try {
        await resendCode(email);
      } catch (err: unknown) {
        if (!cancelled) {
          setError(
            (err as { message?: string })?.message ??
              "We couldn't send your code. Tap resend to try again."
          );
        }
      } finally {
        if (!cancelled) setSendingInitial(false);
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [email, resendCode]);

  useEffect(() => {
    if (cooldown <= 0) return;
    const timer = setTimeout(() => setCooldown((n) => n - 1), 1000);
    return () => clearTimeout(timer);
  }, [cooldown]);

  const submit = useCallback(
    async (value: string) => {
      if (value.length !== CODE_LENGTH || verifying) return;
      // The code auto-submits when the last digit lands; guard against the
      // same value being sent twice (each attempt counts against the limit).
      if (submittedFor.current === value) return;
      submittedFor.current = value;

      setVerifying(true);
      setError("");
      try {
        await verifyEmail(email, value);
        Toast.show({ type: "success", text1: "Email confirmed", text2: "Welcome to GYOCC." });
        // On success the navigator swaps directly into GYOCC. The backend
        // supplies the account's default GYOCC membership automatically.
      } catch (err: unknown) {
        const message = (err as { message?: string })?.message ?? "That code didn't work.";
        setError(message);
        setCode("");
        submittedFor.current = null;
      } finally {
        setVerifying(false);
      }
    },
    [email, verifyEmail, verifying]
  );

  const handleResend = async () => {
    if (cooldown > 0 || resending) return;
    setResending(true);
    setError("");
    try {
      await resendCode(email);
      setCooldown(RESEND_COOLDOWN_SECONDS);
      setCode("");
      submittedFor.current = null;
      Toast.show({ type: "success", text1: "New code sent", text2: `Check ${email}` });
    } catch (err: unknown) {
      setError((err as { message?: string })?.message ?? "Could not send a new code.");
    } finally {
      setResending(false);
    }
  };

  if (!email) {
    return (
      <View style={styles.root}>
        <WelcomeBackdrop />
        <View style={[styles.scroll, { paddingTop: insets.top + 80 }]}>
          <Text style={styles.title}>Something went wrong</Text>
          <Text style={styles.subtitle}>
            We don&apos;t know which address to confirm. Please sign in again.
          </Text>
          <TouchableOpacity style={styles.primaryBtn} onPress={() => navigation.navigate("Login")}>
            <Text style={styles.primaryBtnText}>Back to login</Text>
          </TouchableOpacity>
        </View>
      </View>
    );
  }

  return (
    <View style={styles.root}>
      <StatusBar style="dark" />
      <WelcomeBackdrop />

      <KeyboardAvoidingView style={styles.fill} behavior={Platform.OS === "ios" ? "padding" : "height"}>
        <ScrollView
          contentContainerStyle={[
            styles.scroll,
            { paddingTop: insets.top + 18, paddingBottom: insets.bottom + 28 },
          ]}
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}
        >
          <View style={styles.topBar}>
            <TouchableOpacity accessibilityLabel="Back" style={styles.back} onPress={() => navigation.goBack()}>
              <Ionicons name="arrow-back" size={20} color="#3F3230" />
            </TouchableOpacity>
          </View>

          <View style={styles.brand}>
            <Image
              source={require("../../assets/portal-logo-transparent.png")}
              style={styles.logo}
              resizeMode="contain"
            />
          </View>

          <View style={{ height: 72 }} />

          <View style={styles.panel}>
            <Text style={styles.title}>Enter your code</Text>
            <Text style={styles.subtitle}>
              {sendingInitial ? "Sending a" : "We sent a"} {CODE_LENGTH}-digit code to{"\n"}
              <Text style={styles.emailStrong}>{email}</Text>
            </Text>

            <View style={styles.codeWrap}>
              <OtpInput
                value={code}
                onChange={(next) => {
                  setCode(next);
                  if (error) setError("");
                }}
                onComplete={submit}
                length={CODE_LENGTH}
                hasError={Boolean(error)}
                editable={!verifying}
              />
            </View>

            {error ? <Text style={styles.error}>{error}</Text> : null}

            <View style={styles.notice}>
              <Ionicons name="time-outline" size={15} color={HEADER} />
              <Text style={styles.noticeText}>The code expires in 10 minutes</Text>
            </View>

            <TouchableOpacity
              style={[styles.primaryBtn, (verifying || code.length !== CODE_LENGTH) && { opacity: 0.65 }]}
              disabled={verifying || code.length !== CODE_LENGTH}
              onPress={() => submit(code)}
            >
              <Text style={styles.primaryBtnText}>{verifying ? "Confirming…" : "Confirm email"}</Text>
            </TouchableOpacity>

            <TouchableOpacity style={styles.footerLink} onPress={handleResend} disabled={cooldown > 0 || resending}>
              <Text style={[styles.footer, (cooldown > 0 || resending) && { opacity: 0.5 }]}>
                {resending
                  ? "Sending…"
                  : cooldown > 0
                    ? `Didn't get it? Resend in ${cooldown}s`
                    : "Didn't get it? Send a new code"}
              </Text>
            </TouchableOpacity>

            <TouchableOpacity style={styles.footerLink} onPress={() => navigation.navigate("Login")}>
              <Text style={styles.footer}>Back to login</Text>
            </TouchableOpacity>
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: BG },
  fill: { flex: 1 },
  scroll: { flexGrow: 1, paddingHorizontal: 26 },
  topBar: { height: 40, justifyContent: "center" },
  back: {
    width: 40,
    height: 40,
    borderRadius: 14,
    backgroundColor: "rgba(132,0,22,.09)",
    alignItems: "center",
    justifyContent: "center",
  },
  brand: { alignItems: "center", justifyContent: "center" },
  logo: { width: "100%", height: 118 },
  panel: { flexGrow: 1 },
  title: {
    color: INK,
    fontSize: 30,
    lineHeight: 36,
    fontFamily: font.extraBold,
    textShadowColor: "rgba(46,0,8,.45)",
    textShadowOffset: { width: 0, height: 2 },
    textShadowRadius: 12,
  },
  subtitle: {
    color: ON_PRIMARY,
    opacity: 0.82,
    fontSize: 13,
    lineHeight: 20,
    fontFamily: font.regular,
    marginTop: 7,
    maxWidth: 320,
  },
  emailStrong: { fontFamily: font.bold, opacity: 1 },
  codeWrap: { marginTop: 28 },
  error: { color: "#FFC9CE", fontSize: 12, fontFamily: font.medium, marginTop: 12 },
  notice: { flexDirection: "row", alignItems: "center", gap: 6, marginTop: 16 },
  noticeText: { color: ON_PRIMARY, opacity: 0.75, fontSize: 12, fontFamily: font.medium },
  primaryBtn: {
    height: 56,
    borderRadius: 16,
    backgroundColor: HEADER,
    alignItems: "center",
    justifyContent: "center",
    marginTop: 24,
    shadowColor: "#2E0008",
    shadowOpacity: 0.32,
    shadowRadius: 14,
    shadowOffset: { width: 0, height: 7 },
    elevation: 4,
  },
  primaryBtnText: { color: PRIMARY, fontSize: 14, fontFamily: font.bold },
  footerLink: { marginTop: 20, alignSelf: "center" },
  footer: {
    color: ON_PRIMARY,
    opacity: 0.78,
    fontSize: 12,
    lineHeight: 17,
    fontFamily: font.semiBold,
    textAlign: "center",
  },
});
