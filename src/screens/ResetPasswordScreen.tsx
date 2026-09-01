import React, { useState } from "react";
import {
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from "react-native";
import { Controller, useForm } from "react-hook-form";
import { Ionicons } from "@expo/vector-icons";
import Toast from "react-native-toast-message";
import { forgotPassword, resetPasswordWithCode } from "../api/auth";
import { checkPasswordStrength, PASSWORD_MIN_LENGTH, PASSWORD_RULES_TEXT } from "../utils/passwordRules";
import { font } from "../constants/fonts";

const BG = "#F1F0EC";
const PANEL = "#F4F5F0";
const BORDER = "rgba(54,68,90,.16)";
const INK = "#111527";
const MUTED = "#587284";
const PRIMARY = "#840016";
const PRIMARY_DARK = "#F4F5F0";

interface FormData {
  /** The six-digit code from the reset email. */
  code: string;
  email: string;
  newPassword: string;
  confirmPassword: string;
}

export default function ResetPasswordScreen({
  navigation,
  route,
}: {
  navigation: { navigate: (screen: string, params?: object) => void; goBack: () => void };
  route?: { params?: { email?: string } };
}) {
  const [loading, setLoading] = useState(false);
  const [resending, setResending] = useState(false);
  const [done, setDone] = useState(false);
  const [showNew, setShowNew] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);
  const presetEmail = route?.params?.email?.trim().toLowerCase() ?? "";
  const { control, handleSubmit, watch, getValues, formState: { errors } } = useForm<FormData>({
    defaultValues: { code: "", email: presetEmail, newPassword: "", confirmPassword: "" },
  });

  async function onSubmit(data: FormData) {
    setLoading(true);
    try {
      await resetPasswordWithCode(data.email.trim(), data.code.trim(), data.newPassword);
      setDone(true);
    } catch (err: unknown) {
      Toast.show({
        type: "error",
        text1: "Reset failed",
        text2: (err as { message?: string })?.message || "That code is invalid or has expired",
      });
    } finally {
      setLoading(false);
    }
  }

  async function handleResend() {
    const email = getValues("email").trim();
    if (!email) return;
    setResending(true);
    try {
      await forgotPassword(email);
      Toast.show({ type: "success", text1: "New code sent", text2: `Check ${email}` });
    } catch (err: unknown) {
      Toast.show({
        type: "error",
        text1: "Could not resend",
        text2: (err as { message?: string })?.message || "Please try again shortly",
      });
    } finally {
      setResending(false);
    }
  }

  if (done) {
    return (
      <View style={styles.root}>
        <View style={styles.successWrap}>
          <View style={styles.successOuter}>
            <View style={styles.successInner}>
              <Ionicons name="checkmark" size={42} color={PRIMARY} />
            </View>
          </View>
          <Text style={styles.successTitle}>Password updated</Text>
          <Text style={styles.successBody}>Your password has been changed.{"\n"}You can now sign in with your new password.</Text>
        </View>
        <View style={styles.bottom}>
          <TouchableOpacity style={styles.primaryBtn} onPress={() => navigation.navigate("Login")}>
            <Text style={styles.primaryBtnText}>Back to login</Text>
          </TouchableOpacity>
        </View>
      </View>
    );
  }

  const password = watch("newPassword");
  // Meter mirrors the actual policy: nothing counts as strong until the
  // server would accept it.
  const passwordProblem = checkPasswordStrength(password);
  const strength = passwordProblem
    ? Math.min(2, Math.max(1, Math.ceil(password.length / 5)))
    : password.length >= PASSWORD_MIN_LENGTH + 4
      ? 4
      : 3;

  return (
    <KeyboardAvoidingView style={styles.root} behavior={Platform.OS === "ios" ? "padding" : "height"}>
      <ScrollView contentContainerStyle={styles.scroll} keyboardShouldPersistTaps="handled">
        <TouchableOpacity style={styles.backBtn} onPress={() => navigation.goBack()}>
          <Ionicons name="chevron-back" size={22} color="#5F7069" />
        </TouchableOpacity>
        <Text style={styles.title}>Set a new password</Text>
        <Text style={styles.subtitle}>Enter the 6-digit code from your email, then choose a new password.</Text>

        {!presetEmail ? (
          <Field label="Email" error={errors.email?.message}>
            <Controller
              control={control}
              name="email"
              rules={{
                required: "Email is required",
                pattern: { value: /^\S+@\S+\.\S+$/, message: "Enter a valid email" },
              }}
              render={({ field: { onChange, value } }) => (
                <TextInput
                  style={styles.input}
                  value={value}
                  onChangeText={onChange}
                  placeholder="you@example.com"
                  placeholderTextColor="#8A9A94"
                  autoCapitalize="none"
                  autoCorrect={false}
                  keyboardType="email-address"
                />
              )}
            />
          </Field>
        ) : null}

        <Field label="Reset code" error={errors.code?.message}>
          <Controller
            control={control}
            name="code"
            rules={{
              required: "Reset code is required",
              pattern: { value: /^\d{6}$/, message: "Enter the 6-digit code" },
            }}
            render={({ field: { onChange, value } }) => (
              <TextInput
                style={[styles.input, styles.codeInput]}
                value={value}
                onChangeText={(next) => onChange(next.replace(/\D/g, "").slice(0, 6))}
                placeholder="123456"
                placeholderTextColor="#8A9A94"
                keyboardType="number-pad"
                inputMode="numeric"
                textContentType="oneTimeCode"
                maxLength={6}
              />
            )}
          />
        </Field>

        <Field label="New password" error={errors.newPassword?.message}>
          <View style={styles.inputWithIcon}>
            <Ionicons name="lock-closed-outline" size={18} color="#8A9A94" />
            <Controller
              control={control}
              name="newPassword"
              rules={{
                required: "Password is required",
                validate: (value: string) => checkPasswordStrength(value) ?? true,
              }}
              render={({ field: { onChange, value } }) => (
                <TextInput style={styles.inputFlex} value={value} onChangeText={onChange} secureTextEntry={!showNew} placeholder={`At least ${PASSWORD_MIN_LENGTH} characters`} placeholderTextColor="#8A9A94" />
              )}
            />
            <TouchableOpacity onPress={() => setShowNew((next) => !next)}>
              <Ionicons name={showNew ? "eye-off-outline" : "eye-outline"} size={19} color={MUTED} />
            </TouchableOpacity>
          </View>
        </Field>

        <Field label="Confirm password" error={errors.confirmPassword?.message}>
          <View style={[styles.inputWithIcon, password && !errors.confirmPassword ? { borderColor: PRIMARY } : null]}>
            <Ionicons name="lock-closed-outline" size={18} color={password ? PRIMARY : "#8A9A94"} />
            <Controller
              control={control}
              name="confirmPassword"
              rules={{
                required: "Please confirm your password",
                validate: (value) => value === password || "Passwords do not match",
              }}
              render={({ field: { onChange, value } }) => (
                <TextInput style={styles.inputFlex} value={value} onChangeText={onChange} secureTextEntry={!showConfirm} placeholder="Confirm password" placeholderTextColor="#8A9A94" />
              )}
            />
            <TouchableOpacity onPress={() => setShowConfirm((next) => !next)}>
              <Ionicons name={showConfirm ? "eye-off-outline" : "eye-outline"} size={19} color={MUTED} />
            </TouchableOpacity>
          </View>
        </Field>

        <Text style={styles.hint}>{PASSWORD_RULES_TEXT}</Text>

        <View style={styles.strengthRow}>
          {[1, 2, 3, 4].map((step) => <View key={step} style={[styles.strengthBar, step <= strength && { backgroundColor: PRIMARY }]} />)}
          <Text style={styles.strengthText}>{strength >= 3 ? "Strong" : "Weak"}</Text>
        </View>

        <View style={styles.bottom}>
          <TouchableOpacity style={[styles.primaryBtn, loading && { opacity: 0.65 }]} disabled={loading} onPress={handleSubmit(onSubmit)}>
            <Text style={styles.primaryBtnText}>{loading ? "Resetting..." : "Reset password"}</Text>
          </TouchableOpacity>
          <TouchableOpacity onPress={handleResend} disabled={resending}>
            <Text style={[styles.resend, resending && { opacity: 0.5 }]}>
              {resending ? "Sending..." : "Didn't get a code? Send another"}
            </Text>
          </TouchableOpacity>
        </View>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

function Field({ label, error, children }: { label: string; error?: string; children: React.ReactNode }) {
  return (
    <View style={styles.fieldBlock}>
      <Text style={styles.label}>{label}</Text>
      {children}
      {error ? <Text style={styles.error}>{error}</Text> : null}
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: BG },
  scroll: { flexGrow: 1, paddingHorizontal: 30, paddingTop: 14, paddingBottom: 26 },
  backBtn: { width: 42, height: 42, borderRadius: 13, backgroundColor: PANEL, borderWidth: 1.5, borderColor: BORDER, alignItems: "center", justifyContent: "center" },
  title: { color: INK, fontSize: 24, fontFamily: font.extraBold, letterSpacing: -0.5, marginTop: 22 },
  subtitle: { color: MUTED, fontSize: 14, lineHeight: 22, marginTop: 8, marginBottom: 8 },
  fieldBlock: { marginTop: 14 },
  label: { color: "#54655F", fontSize: 12.5, fontFamily: font.bold, marginBottom: 7 },
  input: { height: 52, borderWidth: 1.5, borderColor: BORDER, borderRadius: 14, backgroundColor: PANEL, color: INK, paddingHorizontal: 15, fontSize: 16, fontFamily: font.bold },
  inputWithIcon: { height: 52, borderWidth: 1.5, borderColor: BORDER, borderRadius: 14, backgroundColor: PANEL, flexDirection: "row", alignItems: "center", gap: 10, paddingHorizontal: 15 },
  inputFlex: { flex: 1, color: INK, fontSize: 15, fontFamily: font.medium, paddingVertical: 0 },
  error: { color: "#D64545", fontSize: 12, marginTop: 7 },
  hint: { color: MUTED, fontSize: 12, lineHeight: 17, marginTop: 10 },
  codeInput: { fontSize: 20, fontFamily: font.bold, letterSpacing: 6 },
  resend: { color: MUTED, fontSize: 13, textAlign: "center", marginTop: 16 },
  strengthRow: { flexDirection: "row", alignItems: "center", gap: 4, marginTop: 13 },
  strengthBar: { flex: 1, height: 5, borderRadius: 3, backgroundColor: BORDER },
  strengthText: { color: PRIMARY, fontSize: 11.5, fontFamily: font.bold, marginLeft: 6 },
  bottom: { marginTop: "auto", paddingTop: 20, paddingHorizontal: 30, paddingBottom: 26 },
  primaryBtn: { height: 54, borderRadius: 16, backgroundColor: PRIMARY, alignItems: "center", justifyContent: "center" },
  primaryBtnText: { color: PRIMARY_DARK, fontSize: 16, fontFamily: font.bold },
  successWrap: { flex: 1, alignItems: "center", justifyContent: "center", paddingHorizontal: 30 },
  successOuter: { width: 104, height: 104, borderRadius: 52, backgroundColor: "#E4E8EA", alignItems: "center", justifyContent: "center" },
  successInner: { width: 74, height: 74, borderRadius: 37, backgroundColor: PRIMARY, alignItems: "center", justifyContent: "center" },
  successTitle: { color: INK, fontSize: 24, fontFamily: font.extraBold, letterSpacing: -0.5, marginTop: 26 },
  successBody: { color: MUTED, fontSize: 14, lineHeight: 23, textAlign: "center", marginTop: 10 },
});
