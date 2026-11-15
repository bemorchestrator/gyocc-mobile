import { Linking } from "react-native";
import * as WebBrowser from "expo-web-browser";

// Public pages the stores require us to link from inside the app.
export const PRIVACY_POLICY_URL = "https://gyocc.org/privacy";
export const DELETE_ACCOUNT_URL = "https://gyocc.org/delete-account";
export const SUPPORT_EMAIL = "info@gyocc.org";

export function openPrivacyPolicy() {
  return WebBrowser.openBrowserAsync(PRIVACY_POLICY_URL).catch(() => Linking.openURL(PRIVACY_POLICY_URL));
}

export function emailSupport(subject = "GYOCC app help") {
  return Linking.openURL(`mailto:${SUPPORT_EMAIL}?subject=${encodeURIComponent(subject)}`).catch(() => undefined);
}
