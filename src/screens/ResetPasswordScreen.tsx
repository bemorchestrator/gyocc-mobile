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
import { resetPassword } from "../api/auth";
import { font } from '../constants/fonts';

const TEAL = "#0D9488";

interface FormData {
  token: string;
  newPassword: string;
  confirmPassword: string;
}

export default function ResetPasswordScreen({ navigation }: { navigation: { navigate: (screen: string) => void; goBack: () => void } }) {
  const [loading, setLoading] = useState(false);
  const [done, setDone] = useState(false);
  const [showNew, setShowNew] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);

  const { control, handleSubmit, watch, formState: { errors } } = useForm<FormData>({
    defaultValues: { token: "", newPassword: "", confirmPassword: "" },
  });

  async function onSubmit(data: FormData) {
    setLoading(true);
    try {
      await resetPassword(data.token.trim(), data.newPassword);
      setDone(true);
    } catch (err: unknown) {
      Toast.show({
        type: "error",
        text1: "Reset failed",
        text2: err instanceof Error ? err.message : "Invalid or expired token",
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
          <Text style={styles.title}>Reset Password</Text>
          <Text style={styles.subtitle}>
            Paste the token from your reset email and choose a new password
          </Text>
        </View>

        {/* Card */}
        <View style={styles.card}>
          {!done ? (
            <>
              {/* Token */}
              <Text style={styles.label}>Reset Token</Text>
              <Controller
                control={control}
                name="token"
                rules={{ required: "Token is required" }}
                render={({ field: { onChange, value } }) => (
                  <TextInput
                    style={[styles.input, errors.token && styles.inputError]}
                    placeholder="Paste token from email"
                    placeholderTextColor="#A0AEC0"
                    value={value}
                    onChangeText={onChange}
                    autoCapitalize="none"
                    autoCorrect={false}
                  />
                )}
              />
              {errors.token && <Text style={styles.errorText}>{errors.token.message}</Text>}

              {/* New password */}
              <Text style={styles.label}>New Password</Text>
              <Controller
                control={control}
                name="newPassword"
                rules={{
                  required: "Password is required",
                  minLength: { value: 8, message: "Minimum 8 characters" },
                }}
                render={({ field: { onChange, value } }) => (
                  <View style={[styles.inputRow, errors.newPassword && styles.inputError]}>
                    <TextInput
                      style={styles.inputInner}
                      placeholder="••••••••"
                      placeholderTextColor="#A0AEC0"
                      value={value}
                      onChangeText={onChange}
                      secureTextEntry={!showNew}
                    />
                    <TouchableOpacity onPress={() => setShowNew(v => !v)} style={styles.eyeBtn}>
                      <Ionicons name={showNew ? "eye-outline" : "eye-off-outline"} size={20} color="#A0AEC0" />
                    </TouchableOpacity>
                  </View>
                )}
              />
              {errors.newPassword && <Text style={styles.errorText}>{errors.newPassword.message}</Text>}

              {/* Confirm password */}
              <Text style={styles.label}>Confirm Password</Text>
              <Controller
                control={control}
                name="confirmPassword"
                rules={{
                  required: "Please confirm your password",
                  validate: (v) => v === watch("newPassword") || "Passwords do not match",
                }}
                render={({ field: { onChange, value } }) => (
                  <View style={[styles.inputRow, errors.confirmPassword && styles.inputError]}>
                    <TextInput
                      style={styles.inputInner}
                      placeholder="••••••••"
                      placeholderTextColor="#A0AEC0"
                      value={value}
                      onChangeText={onChange}
                      secureTextEntry={!showConfirm}
                    />
                    <TouchableOpacity onPress={() => setShowConfirm(v => !v)} style={styles.eyeBtn}>
                      <Ionicons name={showConfirm ? "eye-outline" : "eye-off-outline"} size={20} color="#A0AEC0" />
                    </TouchableOpacity>
                  </View>
                )}
              />
              {errors.confirmPassword && <Text style={styles.errorText}>{errors.confirmPassword.message}</Text>}

              <TouchableOpacity
                style={[styles.btn, loading && styles.btnDisabled]}
                onPress={handleSubmit(onSubmit)}
                disabled={loading}
                activeOpacity={0.85}
              >
                <Text style={styles.btnText}>{loading ? "Resetting…" : "Reset Password"}</Text>
              </TouchableOpacity>
            </>
          ) : (
            /* Success */
            <View style={styles.successContainer}>
              <View style={styles.successIcon}>
                <Ionicons name="checkmark-circle-outline" size={44} color={TEAL} />
              </View>
              <Text style={styles.successTitle}>Password Reset!</Text>
              <Text style={styles.successBody}>
                Your password has been updated successfully.
              </Text>
              <TouchableOpacity
                style={[styles.btn, { marginTop: 24 }]}
                onPress={() => navigation.navigate("Login")}
                activeOpacity={0.85}
              >
                <Text style={styles.btnText}>Back to Login</Text>
              </TouchableOpacity>
            </View>
          )}

          {!done && (
            <TouchableOpacity
              style={styles.backToLogin}
              onPress={() => navigation.navigate("Login")}
            >
              <Ionicons name="arrow-back-outline" size={14} color={TEAL} />
              <Text style={styles.backToLoginText}>Back to Login</Text>
            </TouchableOpacity>
          )}
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
  backBtn: { marginBottom: 20, alignSelf: "flex-start" },
  title: { fontSize: 28, fontFamily: font.bold, color: "#fff", letterSpacing: 0.5 },
  subtitle: { fontSize: 14, color: "rgba(255,255,255,0.8)", marginTop: 8, lineHeight: 20 },

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
  label: { fontSize: 14, fontFamily: font.bold, color: TEAL, marginBottom: 8 },
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
  inputRow: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#F3F4F6",
    borderRadius: 10,
    paddingHorizontal: 16,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: "transparent",
  },
  inputInner: { flex: 1, paddingVertical: 14, fontSize: 15, color: "#1A202C" },
  eyeBtn: { padding: 4 },
  inputError: { borderColor: "#EF4444" },
  errorText: { color: "#EF4444", fontSize: 12, marginTop: -10, marginBottom: 10, marginLeft: 4 },

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
  btnText: { color: "#fff", fontSize: 16, fontFamily: font.bold, letterSpacing: 0.5 },

  successContainer: { alignItems: "center", paddingVertical: 12 },
  successIcon: {
    width: 88,
    height: 88,
    borderRadius: 44,
    backgroundColor: "#F0FDFA",
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 20,
  },
  successTitle: { fontSize: 20, fontFamily: font.bold, color: "#1A202C", marginBottom: 10 },
  successBody: { fontSize: 14, color: "#6B7280", textAlign: "center", lineHeight: 22 },

  backToLogin: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 6,
    marginTop: 20,
  },
  backToLoginText: { fontSize: 13, color: TEAL, fontFamily: font.semiBold },
});
