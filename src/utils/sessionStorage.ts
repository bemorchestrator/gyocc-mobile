import AsyncStorage from "@react-native-async-storage/async-storage";
import { Platform } from "react-native";

type SecureStoreModule = typeof import("expo-secure-store");

let secureStorePromise: Promise<SecureStoreModule | null> | null = null;

async function getSecureStore() {
  if (Platform.OS === "web") return null;

  secureStorePromise ??= import("expo-secure-store")
    .then((module) => module)
    .catch((error) => {
      if (__DEV__) {
        console.warn("[Storage] SecureStore unavailable, using AsyncStorage.", error?.message ?? error);
      }
      return null;
    });

  return secureStorePromise;
}

export async function getSessionValue(key: string) {
  const secureStore = await getSecureStore();
  if (secureStore) {
    try {
      const available = await secureStore.isAvailableAsync();
      if (available) return secureStore.getItemAsync(key);
    } catch (error) {
      if (__DEV__) {
        console.warn("[Storage] SecureStore read failed, using AsyncStorage.", error);
      }
    }
  }

  return AsyncStorage.getItem(key);
}

export async function setSessionValue(key: string, value: string) {
  const secureStore = await getSecureStore();
  if (secureStore) {
    try {
      const available = await secureStore.isAvailableAsync();
      if (available) {
        await secureStore.setItemAsync(key, value);
        return;
      }
    } catch (error) {
      if (__DEV__) {
        console.warn("[Storage] SecureStore write failed, using AsyncStorage.", error);
      }
    }
  }

  await AsyncStorage.setItem(key, value);
}

export async function deleteSessionValue(key: string) {
  const secureStore = await getSecureStore();
  if (secureStore) {
    try {
      const available = await secureStore.isAvailableAsync();
      if (available) {
        await secureStore.deleteItemAsync(key);
      }
    } catch (error) {
      if (__DEV__) {
        console.warn("[Storage] SecureStore delete failed, using AsyncStorage.", error);
      }
    }
  }

  await AsyncStorage.removeItem(key);
}
