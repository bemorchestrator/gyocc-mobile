import React, { useState } from "react";
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
} from "react-native";
import { useForm, Controller } from "react-hook-form";
import { Ionicons } from "@expo/vector-icons";
import Toast from "react-native-toast-message";
import { forgotPassword } from "../api/auth";
import { font } from '../constants/fonts';

const TEAL = "#0D9488";

interface FormData {
  email: string;
}

export default function ForgotPasswordScreen({ navigation }: { navigation: { navigate: (screen: string) => void; goBack: () => void } }) {
  const [loading, setLoading] = useState(false);
  const [sent, setSent] = useState(false);

  const { control, handleSubmit, formState: { errors }, getValues } = useForm<FormData>({
    defaultValues: { email: "" },
  });

  async function onSubmit(data: FormData) {
    setLoading(true);
    try {
      await forgotPassword(data.email);
      setSent(true);
    } catch (err: unknown) {
      Toast.show({
        type: "error",
        text1: "Request failed",
        text2: err instanceof Error ? err.message : "Could not send reset email",
      });
    } finally {
      setLoading(false);
    }
  }

  return (
    <KeyboardAvoidingView
      style={styles.root}
      behavior={Platform.OS === "ios" ? "padding" : "height"}
    >
      <ScrollView
        contentContainerStyle={styles.scroll}
        keyboardShouldPersistTaps="handled"
        showsVerticalScrollIndicator={false}
        bounces={false}
      >
        {/* Teal header */}
        <View style={styles.banner}>
          <TouchableOpacity
            style={styles.backBtn}
            onPress={() => navigation.goBack()}
            hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
          >
            <Ionicons name="arrow-back" size={22} color="#fff" />
          </TouchableOpacity>
          <Text style={styles.title}>Forgot Password</Text>
          <Text style={styles.subtitle}>
            Enter your email and we'll send you a reset link
          </Text>
        </View>

        {/* Card */}
        <View style={styles.card}>
          {!sent ? (
            <>
              <Text style={styles.label}>Email Address</Text>
              <Controller
                control={control}
                name="email"
                rules={{
                  required: "Email is required",
                  pattern: { value: /^\S+@\S+\.\S+$/, message: "Enter a valid email" },
                }}
                render={({ field: { onChange, value } }) => (
                  <TextInput
                    style={[styles.input, errors.email && styles.inputError]}
                    placeholder="email@gmail.com"
                    placeholderTextColor="#A0AEC0"
                    value={value}
                    onChangeText={onChange}
                    autoCapitalize="none"
                    keyboardType="email-address"
                    autoCorrect={false}
                  />
                )}
              />
              {errors.email && (
                <Text style={styles.errorText}>{errors.email.message}</Text>
              )}

              <TouchableOpacity
                style={[styles.btn, loading && styles.btnDisabled]}
                onPress={handleSubmit(onSubmit)}
                disabled={loading}
                activeOpacity={0.85}
              >
                <Text style={styles.btnText}>
                  {loading ? "Sending…" : "Send Reset Link"}
                </Text>
              </TouchableOpacity>
            </>
          ) : (
            /* Success state */
            <View style={styles.successContainer}>
              <View style={styles.successIcon}>
                <Ionicons name="mail-outline" size={40} color={TEAL} />
              </View>
              <Text style={styles.successTitle}>Check your inbox</Text>
              <Text style={styles.successBody}>
                A password reset link has been sent to{"\n"}
                <Text style={styles.successEmail}>{getValues("email")}</Text>
              </Text>
              <TouchableOpacity
                style={[styles.btn, { marginTop: 24 }]}
                onPress={() => navigation.navigate("ResetPassword")}
                activeOpacity={0.85}
              >
                <Text style={styles.btnText}>Enter Reset Code</Text>
              </TouchableOpacity>
            </View>
          )}

          <TouchableOpacity
            style={styles.backToLogin}
            onPress={() => navigation.goBack()}
          >
            <Ionicons name="arrow-back-outline" size={14} color={TEAL} />
            <Text style={styles.backToLoginText}>Back to Login</Text>
          </TouchableOpacity>
        </View>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: TEAL },
  scroll: { flexGrow: 1 },

  banner: {
    backgroundColor: TEAL,
    paddingTop: 64,
    paddingBottom: 80,
    paddingHorizontal: 28,
  },
  backBtn: {
    marginBottom: 20,
    alignSelf: "flex-start",
  },
  title: {
    fontSize: 28,
    fontFamily: font.bold,
    color: "#fff",
    letterSpacing: 0.5,
  },
  subtitle: {
    fontSize: 14,
    color: "rgba(255,255,255,0.8)",
    marginTop: 8,
    lineHeight: 20,
  },

  card: {
    backgroundColor: "#fff",
    marginHorizontal: 20,
    borderRadius: 24,
    padding: 28,
    marginTop: -40,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.12,
    shadowRadius: 24,
    elevation: 10,
  },
  label: {
    fontSize: 14,
    fontFamily: font.bold,
    color: TEAL,
    marginBottom: 8,
  },
  input: {
    backgroundColor: "#F3F4F6",
    borderRadius: 10,
    paddingHorizontal: 16,
    paddingVertical: 14,
    fontSize: 15,
    color: "#1A202C",
    marginBottom: 16,
    borderWidth: 1,
    borderColor: "transparent",
  },
  inputError: { borderColor: "#EF4444" },
  errorText: {
    color: "#EF4444",
    fontSize: 12,
    marginTop: -10,
    marginBottom: 10,
    marginLeft: 4,
  },
  btn: {
    backgroundColor: TEAL,
    borderRadius: 12,
    paddingVertical: 16,
    alignItems: "center",
    shadowColor: TEAL,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.35,
    shadowRadius: 8,
    elevation: 6,
  },
  btnDisabled: { opacity: 0.6 },
  btnText: {
    color: "#fff",
    fontSize: 16,
    fontFamily: font.bold,
    letterSpacing: 0.5,
  },

  // Success state
  successContainer: { alignItems: "center", paddingVertical: 12 },
  successIcon: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: "#F0FDFA",
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 20,
  },
  successTitle: {
    fontSize: 20,
    fontFamily: font.bold,
    color: "#1A202C",
    marginBottom: 10,
  },
  successBody: {
    fontSize: 14,
    color: "#6B7280",
    textAlign: "center",
    lineHeight: 22,
  },
  successEmail: { fontFamily: font.bold, color: "#1A202C" },

  backToLogin: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 6,
    marginTop: 20,
  },
  backToLoginText: {
    fontSize: 13,
    color: TEAL,
    fontFamily: font.semiBold,
  },
});
