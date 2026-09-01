const fs = require("node:fs");
const path = require("node:path");
const appJson = require("./app.json");

function readEnvValue(filePath, name) {
  try {
    const line = fs
      .readFileSync(filePath, "utf8")
      .split(/\r?\n/)
      .find((entry) => new RegExp(`^\\s*${name}\\s*=`).test(entry));
    if (!line) return undefined;

    const raw = line.slice(line.indexOf("=") + 1).trim();
    if (
      (raw.startsWith('"') && raw.endsWith('"')) ||
      (raw.startsWith("'") && raw.endsWith("'"))
    ) {
      return raw.slice(1, -1).trim();
    }
    return raw;
  } catch {
    return undefined;
  }
}

module.exports = () => {
  const sharedGoogleMapsApiKey =
    process.env.GOOGLE_MAPS_API_KEY?.trim() ||
    readEnvValue(path.resolve(__dirname, ".env"), "GOOGLE_MAPS_API_KEY");
  const androidGoogleMapsApiKey =
    process.env.GOOGLE_MAPS_ANDROID_API_KEY?.trim() || sharedGoogleMapsApiKey;
  const iosGoogleMapsApiKey =
    process.env.GOOGLE_MAPS_IOS_API_KEY?.trim() || sharedGoogleMapsApiKey;

  const plugins = [...appJson.expo.plugins];
  if (androidGoogleMapsApiKey || iosGoogleMapsApiKey) {
    plugins.push([
      "react-native-maps",
      {
        ...(androidGoogleMapsApiKey ? { androidGoogleMapsApiKey } : {}),
        ...(iosGoogleMapsApiKey ? { iosGoogleMapsApiKey } : {}),
      },
    ]);
  }

  return {
    ...appJson.expo,
    plugins,
    extra: {
      ...(appJson.expo.extra ?? {}),
      googleMapsConfigured: {
        android: Boolean(androidGoogleMapsApiKey),
        ios: Boolean(iosGoogleMapsApiKey),
      },
    },
  };
};
