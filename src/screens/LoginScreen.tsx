import React, { useState } from "react";
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  KeyboardAvoidingView,
  Platform,
  Image,
  ScrollView,
} from "react-native";
import { useForm, Controller } from "react-hook-form";
import { Ionicons } from "@expo/vector-icons";
import Toast from "react-native-toast-message";
import { useAuth } from "../context/AuthContext";
import { font } from '../constants/fonts';

const TEAL = "#0D9488";
const BG = TEAL;

interface FormData {
  email: string;
  password: string;
}

export default function LoginScreen({ navigation }: { navigation: { navigate: (screen: string) => void; replace: (screen: string) => void } }) {
  const { login } = useAuth();
  const [loading, setLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [rememberMe, setRememberMe] = useState(false);

  const {
    control,
    handleSubmit,
    formState: { errors },
  } = useForm<FormData>({ defaultValues: { email: "", password: "" } });

  async function onSubmit(data: FormData) {
    setLoading(true);
    try {
      await login(data.email, data.password);
    } catch (err: unknown) {
      Toast.show({
        type: "error",
        text1: "Login failed",
        text2: err instanceof Error ? err.message : "Invalid credentials",
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
        {/* ── Diagonal teal header ── */}
        <View style={styles.bannerContainer}>
          {/* Solid teal fill */}
          <View style={styles.bannerFill} />
          {/* Diagonal slice at the bottom — rotated white rect */}
          <View style={styles.bannerSlice} />
          {/* Text sits above the slice */}
          <View style={styles.bannerContent}>
            <View style={styles.logoCircle}>
              <Image
                source={require("../../assets/gyocc-logo.png")}
                style={styles.logoImg}
                resizeMode="contain"
              />
            </View>
            <Text style={styles.brandName}>GYOCC Official</Text>
            <Text style={styles.title}>Login</Text>
            <Text style={styles.subtitle}>Please login to continue</Text>
          </View>
        </View>

        {/* ── Floating white card ── */}
        <View style={styles.card}>
          {/* Email */}
          <Text style={styles.label}>Email Address</Text>
          <Controller
            control={control}
            name="email"
            rules={{ required: "Email is required" }}
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

          {/* Password */}
          <Text style={styles.label}>Password</Text>
          <Controller
            control={control}
            name="password"
            rules={{ required: "Password is required" }}
            render={({ field: { onChange, value } }) => (
              <View style={[styles.inputRow, errors.password && styles.inputError]}>
                <TextInput
                  style={styles.inputInner}
                  placeholder="••••••••••••"
                  placeholderTextColor="#A0AEC0"
                  value={value}
                  onChangeText={onChange}
                  secureTextEntry={!showPassword}
                />
                <TouchableOpacity
                  onPress={() => setShowPassword((v) => !v)}
                  style={styles.eyeBtn}
                  hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
                >
                  <Ionicons
                    name={showPassword ? "eye-outline" : "eye-off-outline"}
                    size={20}
                    color="#A0AEC0"
                  />
                </TouchableOpacity>
              </View>
            )}
          />
          {errors.password && (
            <Text style={styles.errorText}>{errors.password.message}</Text>
          )}

          {/* Remember me + Forgot password */}
          <View style={styles.rememberRow}>
            <TouchableOpacity
              style={styles.rememberLeft}
              onPress={() => setRememberMe((v) => !v)}
              activeOpacity={0.7}
            >
              <View style={[styles.checkbox, rememberMe && styles.checkboxActive]}>
                {rememberMe && <Ionicons name="checkmark" size={12} color="#fff" />}
              </View>
              <Text style={styles.rememberText}>Remember me</Text>
            </TouchableOpacity>
            <TouchableOpacity
              onPress={() => navigation.navigate("ForgotPassword")}
              hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
            >
              <Text style={styles.forgotText}>Forgot Password?</Text>
            </TouchableOpacity>
          </View>

          {/* Login button */}
          <TouchableOpacity
            style={[styles.loginBtn, loading && styles.loginBtnDisabled]}
            onPress={handleSubmit(onSubmit)}
            disabled={loading}
            activeOpacity={0.85}
          >
            <Text style={styles.loginBtnText}>
              {loading ? "Signing in…" : "Login"}
            </Text>
          </TouchableOpacity>
        </View>

        {/* ── Bottom version ── */}
        <View style={styles.bottomArea}>
          <Text style={styles.bottomVersion}>Version 1.0.0</Text>
        </View>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const BANNER_HEIGHT = 340;
const SLICE_HEIGHT = 100;

const styles = StyleSheet.create({
  root: {
    flex: 1,
    backgroundColor: BG,
  },
  scroll: {
    flexGrow: 1,
  },

  // ── Diagonal banner ──
  bannerContainer: {
    height: BANNER_HEIGHT,
    overflow: "hidden",
  },
  // Full teal fill
  bannerFill: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: TEAL,
  },
  // Rotated white rect that cuts a steep diagonal left→right
  bannerSlice: {
    position: "absolute",
    bottom: -SLICE_HEIGHT / 2,
    left: -20,
    right: -20,
    height: SLICE_HEIGHT,
    backgroundColor: BG,
    transform: [{ rotate: "0deg" }],
  },
  bannerContent: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    paddingBottom: 32,
    paddingTop: 48,
  },
  brandName: {
    fontSize: 16,
    fontFamily: font.semiBold,
    color: "rgba(255,255,255,0.9)",
    marginTop: 10,
    marginBottom: 6,
    letterSpacing: 0.5,
  },
  title: {
    fontSize: 32,
    fontFamily: font.bold,
    color: "#FFFFFF",
    letterSpacing: 0.5,
  },
  subtitle: {
    fontSize: 14,
    color: "rgba(255,255,255,0.85)",
    marginTop: 8,
  },

  // ── Floating card ──
  card: {
    backgroundColor: "#FFFFFF",
    marginHorizontal: 20,
    borderRadius: 24,
    padding: 28,
    marginTop: -20,
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
  inputInner: {
    flex: 1,
    paddingVertical: 14,
    fontSize: 15,
    color: "#1A202C",
  },
  eyeBtn: {
    padding: 4,
  },
  inputError: {
    borderColor: "#EF4444",
  },
  errorText: {
    color: "#EF4444",
    fontSize: 12,
    marginTop: -10,
    marginBottom: 10,
    marginLeft: 4,
  },
  rememberRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: 20,
  },
  rememberLeft: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },
  checkbox: {
    width: 18,
    height: 18,
    borderRadius: 4,
    borderWidth: 1.5,
    borderColor: TEAL,
    alignItems: "center",
    justifyContent: "center",
  },
  checkboxActive: {
    backgroundColor: TEAL,
    borderColor: TEAL,
  },
  rememberText: {
    fontSize: 13,
    color: "#4A5568",
  },
  forgotText: {
    fontSize: 13,
    color: TEAL,
    fontFamily: font.semiBold,
  },
  loginBtn: {
    backgroundColor: TEAL,
    borderRadius: 12,
    paddingVertical: 16,
    alignItems: "center",
    marginTop: 8,
    shadowColor: TEAL,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.35,
    shadowRadius: 8,
    elevation: 6,
  },
  loginBtnDisabled: {
    opacity: 0.6,
  },
  loginBtnText: {
    color: "#FFFFFF",
    fontSize: 16,
    fontFamily: font.bold,
    letterSpacing: 0.5,
  },

  // ── Bottom ──
  bottomArea: {
    alignItems: "center",
    paddingVertical: 24,
  },
  logoCircle: {
    width: 88,
    height: 88,
    borderRadius: 44,
    backgroundColor: "#FFFFFF",
    alignItems: "center",
    justifyContent: "center",
    overflow: "hidden",
    marginBottom: 4,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.15,
    shadowRadius: 8,
    elevation: 6,
  },
  logoImg: {
    width: 68,
    height: 68,
    borderRadius: 34,
  },
  bottomVersion: {
    fontSize: 12,
    color: "rgba(255,255,255,0.5)",
    marginTop: 4,
  },
});
