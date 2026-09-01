import Constants from "expo-constants";
import { Platform } from "react-native";
import { PROVIDER_GOOGLE, type Provider } from "react-native-maps";

type GoogleMapsConfiguration = boolean | { android?: boolean; ios?: boolean };

const configuration = Constants.expoConfig?.extra
  ?.googleMapsConfigured as GoogleMapsConfiguration | undefined;

export const googleMapsConfigured =
  typeof configuration === "boolean"
    ? configuration
    : Platform.OS === "android"
      ? configuration?.android === true
      : Platform.OS === "ios"
        ? configuration?.ios === true
        : false;

export const googleMapsProvider: Provider | undefined =
  (Platform.OS === "android" || Platform.OS === "ios") && googleMapsConfigured
    ? PROVIDER_GOOGLE
    : undefined;
