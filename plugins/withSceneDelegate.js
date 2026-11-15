// Adopts the UIScene app lifecycle on iOS.
//
// Apps built with the iOS 27 SDK (Xcode 27+) crash on launch on iOS 27 unless
// they declare a scene manifest and create their window from a scene delegate
// (UIKit traps in _UIApplicationEvaluateRuntimeIssueForNoSceneLifecycleAdoption).
// Expo 57's template still creates the window in AppDelegate, so this plugin:
//   1. adds UIApplicationSceneManifest to Info.plist, and
//   2. moves window creation out of AppDelegate into a SceneDelegate, forwarding
//      deep links / universal links the scene receives to the AppDelegate.
// Remove it once the Expo template adopts scenes itself.
const { withAppDelegate, withInfoPlist } = require("expo/config-plugins");

const SCENE_MANIFEST = {
  UIApplicationSupportsMultipleScenes: false,
  UISceneConfigurations: {
    UIWindowSceneSessionRoleApplication: [
      {
        UISceneConfigurationName: "Default Configuration",
        UISceneDelegateClassName: "$(PRODUCT_MODULE_NAME).SceneDelegate",
      },
    ],
  },
};

const WINDOW_BLOCK =
  /#if os\(iOS\) \|\| os\(tvOS\)\s*\n\s*window = UIWindow\(frame: UIScreen\.main\.bounds\)\s*\n\s*factory\.startReactNative\(\s*withModuleName: "main",\s*in: window,\s*launchOptions: launchOptions\)\s*\n\s*#endif/;

const FACTORY_PROPERTY = /(\n(\s*)var reactNativeFactory: RCTReactNativeFactory\?\n)/;

const SCENE_DELEGATE = `
// @generated begin with-scene-delegate - plugins/withSceneDelegate.js
class SceneDelegate: UIResponder, UIWindowSceneDelegate {
  var window: UIWindow?

  func scene(
    _ scene: UIScene,
    willConnectTo session: UISceneSession,
    options connectionOptions: UIScene.ConnectionOptions
  ) {
    guard let windowScene = scene as? UIWindowScene,
          let appDelegate = UIApplication.shared.delegate as? AppDelegate,
          let factory = appDelegate.reactNativeFactory else { return }

    // Under the scene lifecycle a cold-start deep link arrives here, not in
    // launchOptions, so hand it to React Native the way Linking expects it.
    var launchOptions = appDelegate.launchOptions ?? [:]
    if let url = connectionOptions.urlContexts.first?.url {
      launchOptions[.url] = url
    }
    if let activity = connectionOptions.userActivities.first {
      launchOptions[.userActivityDictionary] = [
        UIApplication.LaunchOptionsKey.userActivityType: activity.activityType,
        "UIApplicationLaunchOptionsUserActivityKey": activity,
      ]
    }

    let window = UIWindow(windowScene: windowScene)
    self.window = window
    appDelegate.window = window
    factory.startReactNative(withModuleName: "main", in: window, launchOptions: launchOptions)
  }

  func scene(_ scene: UIScene, openURLContexts URLContexts: Set<UIOpenURLContext>) {
    guard let appDelegate = UIApplication.shared.delegate as? AppDelegate else { return }
    for context in URLContexts {
      _ = appDelegate.application(UIApplication.shared, open: context.url, options: [:])
    }
  }

  func scene(_ scene: UIScene, continue userActivity: NSUserActivity) {
    guard let appDelegate = UIApplication.shared.delegate as? AppDelegate else { return }
    _ = appDelegate.application(UIApplication.shared, continue: userActivity) { _ in }
  }
}
// @generated end with-scene-delegate
`;

function patchAppDelegate(src) {
  if (src.includes("class SceneDelegate")) return src;

  if (!WINDOW_BLOCK.test(src) || !FACTORY_PROPERTY.test(src)) {
    throw new Error(
      "withSceneDelegate: AppDelegate.swift no longer matches the expected Expo template. " +
        "Update plugins/withSceneDelegate.js for the new template."
    );
  }

  return (
    src
      .replace(
        FACTORY_PROPERTY,
        "$1$2var launchOptions: [UIApplication.LaunchOptionsKey: Any]?\n"
      )
      // The window is now created by SceneDelegate once the scene connects.
      .replace(WINDOW_BLOCK, "    self.launchOptions = launchOptions")
      .trimEnd() +
    "\n" +
    SCENE_DELEGATE
  );
}

module.exports = function withSceneDelegate(config) {
  config = withInfoPlist(config, (cfg) => {
    cfg.modResults.UIApplicationSceneManifest = SCENE_MANIFEST;
    return cfg;
  });

  config = withAppDelegate(config, (cfg) => {
    if (cfg.modResults.language !== "swift") {
      throw new Error("withSceneDelegate: only a Swift AppDelegate is supported.");
    }
    cfg.modResults.contents = patchAppDelegate(cfg.modResults.contents);
    return cfg;
  });

  return config;
};
