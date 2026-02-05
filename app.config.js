import appIcons from "./src/lib/AppIconList";
const IS_DEV = false;

export default {
  expo: {
    name: IS_DEV ? "HCB (dev)" : "HCB",
    slug: "hcb-mobile",
    owner: "hackclub",
    version: "1.0.3",
    platforms: ["ios", "android"],
    scheme: "hcb",
    orientation: "portrait",
    icon: "./assets/app-icon.png",
    userInterfaceStyle: "automatic",
    assetBundlePatterns: ["**/*"],
    newArchEnabled: true,
    ios: {
      icon: "./assets/icons/default.icon",
      supportsTablet: false,
      bundleIdentifier: IS_DEV ? "com.hackclub.hcb.dev" : "com.hackclub.hcb",
      buildNumber: "1",
      autoIncrement: "buildNumber",
      config: {
        usesNonExemptEncryption: false,
      },
      associatedDomains: [
        "applinks:hcb.hackclub.com",
        "applinks:bank.hackclub.com",
      ],
      entitlements: {
        "com.apple.developer.payment-pass-provisioning": true,
        "com.apple.developer.proximity-reader.payment.acceptance": true,
      },
      infoPlist: {
        NSCameraUsageDescription:
          "Access your camera to take photos of receipts",
        NSMicrophoneUsageDescription:
          "Access your microphone to transcribe voice messages in help conversations",
      },
    },
    android: {
      icon: "./assets/app-icon.png",
      googleServicesFile: "./private-sdk/google-services.json",
      adaptiveIcon: {
        foregroundImage: "./assets/app-icon-foreground.png",
        monochromeImage: "./assets/app-icon-monochrome.png",
        backgroundColor: "#EC3750",
      },
      blockedPermissions: [
        "android.permission.READ_MEDIA_IMAGES",
        "android.permission.READ_MEDIA_VIDEO",
      ],
      package: IS_DEV ? "com.hackclub.hcb.dev" : "com.hackclub.hcb",
      versionCode: 3,
      edgeToEdgeEnabled: true,
      intentFilters: [
        {
          action: "VIEW",
          autoVerify: true,
          data: {
            scheme: "https",
            host: "hcb.hackclub.com",
          },
          category: ["BROWSABLE", "DEFAULT"],
        },
      ],
    },
    extra: {
      eas: {
        projectId: "dfc97c77-31b1-4267-896f-9472c87f166c",
      },
    },
    runtimeVersion: {
      policy: "appVersion",
    },
    experiments: {
      remoteBuildCache: {
        provider: "eas",
      },
    },
    updates: {
      url: "https://u.expo.dev/dfc97c77-31b1-4267-896f-9472c87f166c",
    },
    plugins: [
      [
        "expo-image-picker",
        {
          cameraPermission: "Allow HCB to take photos of receipts",
          photosPermission: "Allow HCB to access your photos for receipts",
        },
      ],
      "expo-secure-store",
      [
        "expo-local-authentication",
        { faceIDPermission: "Allow $(PRODUCT_NAME) to use Face ID." },
      ],
      [
        "@stripe/stripe-terminal-react-native",
        {
          locationWhenInUsePermission:
            "Location access is required in order to accept payments.",
        },
      ],
      [
        "expo-build-properties",
        {
          android: {
            minSdkVersion: 26,
            javaMaxHeapSize: "4g",
            dexOptions: {
              javaMaxHeapSize: "4g",
            },
            jvmArgs: ["-Xmx4g", "-XX:+UseG1GC", "-XX:MaxGCPauseMillis=200"],
            // Additional build optimizations
            enableProguardInReleaseBuilds: false,
            enableSeparateBuildPerCPUArchitecture: false,
            universalApk: false,
            // Reduce memory usage during packaging
            packagingOptions: {
              pickFirst: [
                "org/bouncycastle/pqc/crypto/picnic/lowmcL*",
                "org/bouncycastle/x509/CertPathReviewerMessages*",
              ],
              exclude: [
                "META-INF/DEPENDENCIES",
                "META-INF/LICENSE",
                "META-INF/LICENSE.txt",
                "META-INF/license.txt",
                "META-INF/NOTICE",
                "META-INF/NOTICE.txt",
                "META-INF/notice.txt",
                "META-INF/ASL2.0",
              ],
            },
          },
        },
      ],
      ["expo-alternate-app-icons", appIcons],
      [
        "@sentry/react-native/expo",
        {
          url: "https://sentry.io/",
          project: "hcb-mobile",
          organization: "hack-club-hcb",
        },
      ],
      [
        "expo-splash-screen",
        {
          ios: {
            backgroundColor: "#EC3750",
            image: "./assets/splash-ios.png",
            enableFullScreenImage_legacy: true,
          },
          android: {
            backgroundColor: "#EC3750",
            image: "./assets/splash-android.png",
            resizeMode: "cover",
          },
        },
      ],
      [
        "expo-document-picker",
        {
          iCloudContainerEnvironment: "Production",
        },
      ],
      [
        "expo-share-intent",
        {
          iosActivationRules: {
            NSExtensionActivationSupportsImageWithMaxCount: 5,
            NSExtensionActivationSupportsFileWithMaxCount: 5,
          },
          androidIntentFilters: ["image/*"],
        },
      ],
      [
        "expo-location",
        {
          locationAlwaysAndWhenInUsePermission:
            "Allow HCB to use your location for payments.",
        },
      ],
      [
        "expo-web-browser",
        {
          experimentalLauncherActivity: true,
        },
      ],
      "expo-background-task",
      [
        "@intercom/intercom-react-native",
        {
          appId: process.env.EXPO_PUBLIC_INTERCOM_APP_ID,
          androidApiKey: process.env.EXPO_PUBLIC_INTERCOM_ANDROID_API_KEY,
          iosApiKey: process.env.EXPO_PUBLIC_INTERCOM_IOS_API_KEY,
        },
      ],
      [
        "expo-notifications",
        {
          icon: "./assets/app-icon.png",
          color: "#EC3750",
        },
      ],
      [
        "./plugins/withIntercomExpoPushRouter.js",
        { serviceName: "AppFirebaseMessagingService" },
      ],
      "./plugins/withIntercomIOSPush.js",
      "./plugins/usePrivateSDK.js",
    ],
  },
};
