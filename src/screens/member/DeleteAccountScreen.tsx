// Delete account: what goes, what stays, one proof that it is really you, done.
// Required by App Store guideline 5.1.1(v) and Google Play's deletion policy.
import React from "react";
import { ActivityIndicator, Alert, KeyboardAvoidingView, Platform, Pressable, ScrollView, StyleSheet, Text, TextInput, View } from "react-native";
import { useNavigation } from "@react-navigation/native";
import { useMutation, useQuery } from "@tanstack/react-query";
import { StatusBar } from "expo-status-bar";
import Toast from "react-native-toast-message";
import { DeletionMethod, DeletionProof, deleteMyAccount, getDeletionOptions, sendDeletionCode } from "../../api/account";
import { isAppleSignInAvailable, requestAppleCredential } from "../../api/auth";
import { emailSupport, SUPPORT_EMAIL } from "../../constants/links";
import { useAuth } from "../../context/AuthContext";
import { C, F, GUTTER, Headline, TopBar } from "./kit";

const DELETED = [
  "Your login, email, and Google or Apple sign-in",
  "Your phone, part, birthday and profile photo",
  "Your inbox, reminders and devices",
  "The GPS points saved when you clocked in or out",
];
const KEPT = [
  "Attendance times and pay records stay in the choir's books, under “Former member”, with nothing that names you.",
];

export default function DeleteAccountScreen() {
  const navigation = useNavigation<any>();
  const { forgetDeletedAccount } = useAuth();
  const options = useQuery({ queryKey: ["account-deletion"], queryFn: getDeletionOptions, retry: 1 });
  const apple = useQuery({ queryKey: ["apple-available"], queryFn: isAppleSignInAvailable, enabled: Platform.OS === "ios" });

  const [method, setMethod] = React.useState<DeletionMethod | null>(null);
  const [password, setPassword] = React.useState("");
  const [code, setCode] = React.useState("");
  const [codeSent, setCodeSent] = React.useState(false);

  // Pick the easiest proof this account and phone support.
  React.useEffect(() => {
    if (method || !options.data) return;
    const m = options.data.methods;
    if (m.includes("apple") && apple.data) setMethod("apple");
    else if (m.includes("password")) setMethod("password");
    else setMethod("email-code");
  }, [options.data, apple.data, method]);

  const send = useMutation({
    mutationFn: sendDeletionCode,
    onSuccess: () => {
      setCodeSent(true);
      Toast.show({ type: "success", text1: "Code sent", text2: options.data?.email });
    },
    onError: (error: { message?: string }) => Toast.show({ type: "error", text1: "Could not send the code", text2: error.message }),
  });

  const remove = useMutation({
    mutationFn: async () => {
      let proof: DeletionProof;
      if (method === "apple") {
        const credential = await requestAppleCredential();
        proof = { apple: { identityToken: credential.identityToken, authorizationCode: credential.authorizationCode, nonce: credential.nonce } };
      } else if (method === "password") {
        proof = { password };
      } else {
        proof = { code: code.trim() };
      }
      await deleteMyAccount(proof);
    },
    onSuccess: async () => {
      Toast.show({ type: "success", text1: "Your account has been deleted", text2: "Thank you for making music with GYOCC." });
      await forgetDeletedAccount();
    },
    onError: (error: { message?: string }) => {
      if (/cancel/i.test(error.message ?? "")) return;
      Toast.show({ type: "error", text1: "Account not deleted", text2: error.message });
    },
  });

  const ready =
    method === "apple" ||
    (method === "password" && password.length > 0) ||
    (method === "email-code" && codeSent && code.trim().length === 6);

  const confirm = () => {
    Alert.alert(
      "Delete your account?",
      "This happens straight away and can't be undone.",
      [
        { text: "Cancel", style: "cancel" },
        { text: "Delete", style: "destructive", onPress: () => remove.mutate() },
      ]
    );
  };

  const busy = remove.isPending;

  return (
    <View style={styles.root}>
      <StatusBar style="dark" />
      <TopBar left={{ kind: "back", label: "Back", onPress: () => (navigation.canGoBack() ? navigation.goBack() : navigation.navigate("Profile")) }} />
      <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === "ios" ? "padding" : undefined}>
        <ScrollView contentContainerStyle={{ paddingBottom: 80 }} keyboardShouldPersistTaps="handled" showsVerticalScrollIndicator={false}>
          <Headline strong="Delete" light="account" />

          <View style={styles.block}>
            <Text style={styles.label}>We delete</Text>
            {DELETED.map((line) => <Text key={line} style={styles.item}>{line}</Text>)}
          </View>
          <View style={styles.block}>
            <Text style={styles.label}>We keep</Text>
            {KEPT.map((line) => <Text key={line} style={styles.item}>{line}</Text>)}
          </View>

          {options.isLoading ? <ActivityIndicator style={{ marginTop: 40 }} color={C.grey} /> : null}
          {options.isError ? (
            <View style={styles.block}>
              <Text style={styles.item}>We couldn't load this right now. Check your connection and try again.</Text>
              <Pressable onPress={() => options.refetch()} hitSlop={10}><Text style={styles.action}>Try again</Text></Pressable>
            </View>
          ) : null}

          {options.data?.blocked ? (
            <View style={styles.block}>
              <Text style={styles.label}>Hand over first</Text>
              <Text style={styles.item}>
                You own the GYOCC organization, so your account can't be deleted until ownership moves to another admin.
              </Text>
              <Pressable onPress={() => emailSupport("Delete my GYOCC account")} hitSlop={10}><Text style={styles.action}>Email {SUPPORT_EMAIL}</Text></Pressable>
            </View>
          ) : null}

          {options.data && !options.data.blocked && method ? (
            <View style={styles.block}>
              <Text style={styles.label}>Confirm it's you</Text>

              {method === "apple" ? (
                <Text style={styles.item}>You'll confirm with Apple when you tap Delete. This also removes GYOCC from your Apple ID.</Text>
              ) : null}

              {method === "password" ? (
                <TextInput
                  value={password}
                  onChangeText={setPassword}
                  secureTextEntry
                  autoCapitalize="none"
                  autoCorrect={false}
                  placeholder="Your password"
                  placeholderTextColor={C.faint}
                  style={styles.input}
                  selectionColor={C.maroon}
                  editable={!busy}
                />
              ) : null}

              {method === "email-code" ? (
                <>
                  <Text style={styles.item}>We'll email a 6-digit code to {options.data.email}.</Text>
                  <Pressable disabled={send.isPending || busy} onPress={() => send.mutate()} hitSlop={10}>
                    <Text style={styles.action}>{send.isPending ? "Sending…" : codeSent ? "Send a new code" : "Email me a code"}</Text>
                  </Pressable>
                  {codeSent ? (
                    <TextInput
                      value={code}
                      onChangeText={(value) => setCode(value.replace(/\D/g, "").slice(0, 6))}
                      keyboardType="number-pad"
                      textContentType="oneTimeCode"
                      placeholder="6-digit code"
                      placeholderTextColor={C.faint}
                      style={styles.input}
                      selectionColor={C.maroon}
                      editable={!busy}
                    />
                  ) : null}
                </>
              ) : null}

              {method !== "email-code" ? (
                <Pressable disabled={busy} onPress={() => setMethod("email-code")} hitSlop={10}>
                  <Text style={styles.switch}>Use an email code instead</Text>
                </Pressable>
              ) : null}
            </View>
          ) : null}

          {options.data && !options.data.blocked ? (
            <Pressable
              accessibilityRole="button"
              disabled={!ready || busy}
              onPress={confirm}
              style={({ pressed }) => [styles.delete, (!ready || busy) && { opacity: 0.35 }, pressed && { opacity: 0.8 }]}
            >
              <Text style={styles.deleteText}>{busy ? "Deleting…" : "Delete my account"}</Text>
              <Text style={styles.deleteArrow}>{"→"}</Text>
            </Pressable>
          ) : null}
        </ScrollView>
      </KeyboardAvoidingView>
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: C.paper },
  block: { paddingHorizontal: GUTTER, marginTop: 30 },
  label: { fontFamily: F.medium, fontSize: 15.5, color: C.ink, marginBottom: 6 },
  item: { fontFamily: F.regular, fontSize: 14, lineHeight: 21, color: C.grey, marginTop: 4 },
  action: { marginTop: 14, fontFamily: F.demi, fontSize: 15, color: C.maroon },
  switch: { marginTop: 18, fontFamily: F.regular, fontSize: 13.5, color: C.grey, textDecorationLine: "underline" },
  input: { marginTop: 14, borderBottomWidth: 1.5, borderBottomColor: C.ink, paddingVertical: 8, fontFamily: F.regular, fontSize: 17, color: C.ink },
  delete: { marginTop: 44, marginHorizontal: GUTTER, backgroundColor: C.maroon, paddingVertical: 20, paddingHorizontal: 22, flexDirection: "row", alignItems: "center", justifyContent: "space-between" },
  deleteText: { fontFamily: F.medium, fontSize: 16, color: "#FFFFFF" },
  deleteArrow: { fontFamily: F.regular, fontSize: 22, color: "#FFFFFF" },
});
