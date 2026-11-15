import { Linking } from "react-native";

// Public web pages for the App Store / Google Play listings only. Inside the
// app, documents open natively in LegalDocumentScreen (route "Legal"); never
// send members out to the website.
export const PRIVACY_POLICY_URL = "https://gyocc.org/privacy";
export const DELETE_ACCOUNT_URL = "https://gyocc.org/delete-account";
export const SUPPORT_EMAIL = "info@gyocc.org";

export function emailSupport(subject = "GYOCC app help") {
  return Linking.openURL(`mailto:${SUPPORT_EMAIL}?subject=${encodeURIComponent(subject)}`).catch(() => undefined);
}
