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
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { StatusBar } from "expo-status-bar";
import { Controller, useForm } from "react-hook-form";
import Toast from "react-native-toast-message";
import { useAuth } from "../context/AuthContext";
import WelcomeBackdrop from "../components/WelcomeBackdrop";
import { checkPasswordStrength, PASSWORD_MIN_LENGTH, PASSWORD_RULES_TEXT } from "../utils/passwordRules";
import { font } from "../constants/fonts";

const BG = "#840016";
const HEADER = "#F1F0EC";
const FIELD = "#F4F5F0";
const INK = "#F1F0EC";
const FIELD_INK = "#3F3230";
const MUTED = "#8A7E78";
const PRIMARY = "#840016";
const ON_PRIMARY = "#F4F5F0";


interface FormData {
  name: string;
  email: string;
  password: string;
  confirm: string;
}

export default function RegisterScreen({ navigation }: { navigation: { navigate: (screen: string, params?: object) => void; goBack: () => void } }) {
  const { register } = useAuth();
  const insets = useSafeAreaInsets();
  const { height } = useWindowDimensions();
  const [loading, setLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const { control, handleSubmit, watch, formState: { errors } } = useForm<FormData>({
    defaultValues: { name: "", email: "", password: "", confirm: "" },
  });
  const password = watch("password");
  const name = watch("name");
  const email = watch("email");

  async function onSubmit(data: FormData) {
    setLoading(true);
    const trimmedEmail = data.email.trim().toLowerCase();
    try {
      const outcome = await register(data.name.trim(), trimmedEmail, data.password);
      if (outcome === "needs-verification") {
        Toast.show({ type: "success", text1: "Check your email", text2: "We sent you a 6-digit code." });
        navigation.navigate("VerifyEmail", { email: trimmedEmail });
      }
      // On "signed-in" the session is live and the navigator opens GYOCC.
    } catch (err: unknown) {
      Toast.show({
        type: "error",
        text1: "Could not create account",
        text2: (err as { message?: string })?.message || "Please try again",
      });
    } finally {
      setLoading(false);
    }
  }

  return (
    <View style={styles.root}>
      <StatusBar style="dark" />
      <WelcomeBackdrop />

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

          <View style={{ height: Math.max(96, height * .15) }} />

          <View style={styles.panel}>
            <Text style={styles.title}>Create account</Text>
            <Text style={styles.subtitle}>Set up your sign-in. Your conductor assigns your section and access.</Text>

            <View style={styles.form}>
              <Controller
                control={control}
                name="name"
                rules={{ required: "Name is required", minLength: { value: 2, message: "Enter your full name" } }}
                render={({ field: { onChange, value } }) => (
                  <View>
                    <Text style={styles.inputLabel}>Full name</Text>
                    <TextInput
                      style={[styles.input, errors.name && styles.inputError]}
                      placeholder="Juan dela Cruz"
                      placeholderTextColor={MUTED}
                      value={value}
                      onChangeText={onChange}
                      autoCapitalize="words"
                    />
                  </View>
                )}
              />
              {errors.name ? <Text style={styles.error}>{errors.name.message}</Text> : null}

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
                rules={{
                  required: "Password is required",
                  validate: (value: string) =>
                    checkPasswordStrength(value, { email, name }) ?? true,
                }}
                render={({ field: { onChange, value } }) => (
                  <View>
                    <Text style={styles.inputLabel}>Password</Text>
                    <View style={[styles.passwordField, errors.password && styles.inputError]}>
                      <TextInput
                        style={styles.passwordInput}
                        placeholder={`At least ${PASSWORD_MIN_LENGTH} characters`}
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
              {errors.password ? (
                <Text style={styles.error}>{errors.password.message}</Text>
              ) : (
                <Text style={styles.hint}>{PASSWORD_RULES_TEXT}</Text>
              )}

              <Controller
                control={control}
                name="confirm"
                rules={{
                  required: "Confirm your password",
                  validate: (value) => value === password || "Passwords do not match",
                }}
                render={({ field: { onChange, value } }) => (
                  <View>
                    <Text style={styles.inputLabel}>Confirm password</Text>
                    <TextInput
                      style={[styles.input, errors.confirm && styles.inputError]}
                      placeholder="Re-enter your password"
                      placeholderTextColor={MUTED}
                      value={value}
                      onChangeText={onChange}
                      secureTextEntry={!showPassword}
                    />
                  </View>
                )}
              />
              {errors.confirm ? <Text style={styles.error}>{errors.confirm.message}</Text> : null}

              <TouchableOpacity style={[styles.primaryBtn, loading && { opacity: 0.65 }]} disabled={loading} onPress={handleSubmit(onSubmit)}>
                <Text style={styles.primaryBtnText}>{loading ? "Creating account…" : "Create account"}</Text>
              </TouchableOpacity>
            </View>

            <TouchableOpacity style={styles.footerLink} onPress={() => navigation.navigate("Login")}>
              <Text style={styles.footer}>Already have an account? Log in</Text>
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
  hint: { color: ON_PRIMARY, opacity: 0.7, fontSize: 11, lineHeight: 15, fontFamily: font.regular, marginTop: -8, marginLeft: 3 },
  primaryBtn: { height: 56, borderRadius: 16, backgroundColor: HEADER, alignItems: "center", justifyContent: "center", marginTop: 5, shadowColor: "#2E0008", shadowOpacity: 0.32, shadowRadius: 14, shadowOffset: { width: 0, height: 7 }, elevation: 4 },
  primaryBtnText: { color: PRIMARY, fontSize: 14, fontFamily: font.bold },
  footerLink: { marginTop: 24, alignSelf: "center" },
  footer: { color: ON_PRIMARY, opacity: 0.78, fontSize: 12, lineHeight: 17, fontFamily: font.semiBold, textAlign: "center" },
});
