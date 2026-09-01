import React, { useState } from "react";
import {
  KeyboardAvoidingView,
  Linking,
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
import { forgotPassword } from "../api/auth";
import { font } from "../constants/fonts";

const BG = "#F1F0EC";
const PANEL = "#F4F5F0";
const BORDER = "rgba(54,68,90,.16)";
const INK = "#111527";
const MUTED = "#587284";
const PRIMARY = "#840016";
const PRIMARY_DARK = "#F4F5F0";
const GOLD = "#840016";

interface FormData {
  email: string;
}

export default function ForgotPasswordScreen({ navigation }: { navigation: { goBack: () => void } }) {
  const [loading, setLoading] = useState(false);
  const [sent, setSent] = useState(false);
  const { control, handleSubmit, getValues, formState: { errors } } = useForm<FormData>({
    defaultValues: { email: "" },
  });

  async function onSubmit(data: FormData) {
    setLoading(true);
    try {
      await forgotPassword(data.email.trim());
      setSent(true);
    } catch (err: unknown) {
      Toast.show({
        type: "error",
        text1: "Request failed",
        text2: (err as { message?: string })?.message || "Could not send reset email",
      });
    } finally {
      setLoading(false);
    }
  }

  if (sent) {
    return (
      <View style={styles.root}>
        <View style={styles.successWrap}>
          <View style={styles.successOuter}>
            <View style={styles.successInner}>
              <Ionicons name="mail-outline" size={40} color={PRIMARY} />
            </View>
          </View>
          <Text style={styles.successTitle}>Check your email</Text>
          <Text style={styles.successBody}>
            We sent a reset link to{"\n"}
            <Text style={styles.emailStrong}>{getValues("email")}</Text>
          </Text>
          <View style={styles.notice}>
            <Ionicons name="time-outline" size={15} color={GOLD} />
            <Text style={styles.noticeText}>Link expires in 30 minutes</Text>
          </View>
        </View>
        <View style={styles.bottom}>
          <TouchableOpacity style={styles.primaryBtn} onPress={() => Linking.openURL("message://").catch(() => undefined)}>
            <Text style={styles.primaryBtnText}>Open email app</Text>
          </TouchableOpacity>
          <TouchableOpacity onPress={handleSubmit(onSubmit)}>
            <Text style={styles.resend}>Didn't get it? Resend</Text>
          </TouchableOpacity>
          <TouchableOpacity onPress={() => navigation.goBack()}>
            <Text style={styles.backMuted}>Back to login</Text>
          </TouchableOpacity>
        </View>
      </View>
    );
  }

  return (
    <KeyboardAvoidingView style={styles.root} behavior={Platform.OS === "ios" ? "padding" : "height"}>
      <ScrollView contentContainerStyle={styles.scroll} keyboardShouldPersistTaps="handled">
        <TouchableOpacity style={styles.backBtn} onPress={() => navigation.goBack()}>
          <Ionicons name="chevron-back" size={22} color="#5F7069" />
        </TouchableOpacity>
        <View style={styles.iconBox}>
          <Ionicons name="lock-closed-outline" size={34} color={PRIMARY} />
        </View>
        <Text style={styles.title}>Forgot password?</Text>
        <Text style={styles.subtitle}>Enter the email linked to your membership and we'll send you a secure reset link.</Text>

        <Text style={styles.label}>Email</Text>
        <Controller
          control={control}
          name="email"
          rules={{
            required: "Email is required",
            pattern: { value: /^\S+@\S+\.\S+$/, message: "Enter a valid email" },
          }}
          render={({ field: { onChange, value } }) => (
            <View style={[styles.inputRow, errors.email && styles.inputError]}>
              <Ionicons name="mail-outline" size={18} color="#8A9A94" />
              <TextInput
                style={styles.input}
                value={value}
                onChangeText={onChange}
                placeholder="andrea.salcedo@gyocc.org"
                placeholderTextColor="#8A9A94"
                autoCapitalize="none"
                keyboardType="email-address"
              />
            </View>
          )}
        />
        {errors.email ? <Text style={styles.error}>{errors.email.message}</Text> : null}

        <View style={styles.bottom}>
          <TouchableOpacity style={[styles.primaryBtn, loading && { opacity: 0.65 }]} disabled={loading} onPress={handleSubmit(onSubmit)}>
            <Text style={styles.primaryBtnText}>{loading ? "Sending..." : "Send reset link"}</Text>
          </TouchableOpacity>
          <TouchableOpacity onPress={() => navigation.goBack()}>
            <Text style={styles.backLink}>Back to login</Text>
          </TouchableOpacity>
        </View>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: BG },
  scroll: { flexGrow: 1, paddingHorizontal: 30, paddingTop: 14, paddingBottom: 26 },
  backBtn: { width: 42, height: 42, borderRadius: 13, backgroundColor: PANEL, borderWidth: 1.5, borderColor: BORDER, alignItems: "center", justifyContent: "center" },
  iconBox: { width: 72, height: 72, borderRadius: 22, backgroundColor: "#F1F0EC", alignItems: "center", justifyContent: "center", marginTop: 26 },
  title: { color: INK, fontSize: 24, fontFamily: font.extraBold, letterSpacing: -0.5, marginTop: 20 },
  subtitle: { color: MUTED, fontSize: 14, lineHeight: 22, marginTop: 8 },
  label: { color: "#54655F", fontSize: 12.5, fontFamily: font.bold, marginTop: 24, marginBottom: 7 },
  inputRow: { height: 52, borderWidth: 1.5, borderColor: BORDER, borderRadius: 14, backgroundColor: PANEL, flexDirection: "row", alignItems: "center", paddingHorizontal: 15, gap: 10 },
  input: { flex: 1, color: INK, fontSize: 15, fontFamily: font.medium, paddingVertical: 0 },
  inputError: { borderColor: "#D64545" },
  error: { color: "#D64545", fontSize: 12, marginTop: 7 },
  bottom: { marginTop: "auto", paddingTop: 22 },
  primaryBtn: { height: 54, borderRadius: 16, backgroundColor: PRIMARY, alignItems: "center", justifyContent: "center" },
  primaryBtnText: { color: PRIMARY_DARK, fontSize: 16, fontFamily: font.bold },
  backLink: { color: PRIMARY, fontSize: 13.5, fontFamily: font.bold, textAlign: "center", marginTop: 18 },
  backMuted: { color: "#8A9A94", fontSize: 13.5, fontFamily: font.bold, textAlign: "center", marginTop: 14 },
  successWrap: { flex: 1, alignItems: "center", justifyContent: "center", paddingHorizontal: 30 },
  successOuter: { width: 104, height: 104, borderRadius: 52, backgroundColor: "#E4E8EA", alignItems: "center", justifyContent: "center" },
  successInner: { width: 74, height: 74, borderRadius: 37, backgroundColor: PRIMARY, alignItems: "center", justifyContent: "center" },
  successTitle: { color: INK, fontSize: 24, fontFamily: font.extraBold, letterSpacing: -0.5, marginTop: 26 },
  successBody: { color: MUTED, fontSize: 14, lineHeight: 23, textAlign: "center", marginTop: 10 },
  emailStrong: { color: INK, fontFamily: font.bold },
  notice: { flexDirection: "row", alignItems: "center", gap: 8, backgroundColor: "rgba(201,138,18,.16)", borderRadius: 12, paddingVertical: 11, paddingHorizontal: 16, marginTop: 18 },
  noticeText: { color: GOLD, fontSize: 12.5, fontFamily: font.semiBold },
  resend: { color: MUTED, fontSize: 13, textAlign: "center", marginTop: 16 },
});
