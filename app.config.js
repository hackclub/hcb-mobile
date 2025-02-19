import { checkAutomatically } from "expo-updates";
import appIcons from "./src/lib/AppIconList";
const IS_DEV = process.env.APP_VARIANT === "development";

export default {
  expo: {
    name: IS_DEV ? "HCB (dev)" : "HCB",
    slug: "hcb-mobile",
    owner: "hackclub",
    version: "1.0.0",
    scheme: "hcb",
    orientation: "portrait",
    icon: "./assets/app-icon.png",
    userInterfaceStyle: "automatic",
    splash: {
      image: "./assets/splash.png",
      resizeMode: "contain",
      backgroundColor: "#EC3750",
    },
    assetBundlePatterns: ["**/*"],
    ios: {
      supportsTablet: false,
      bundleIdentifier: IS_DEV ? "com.hackclub.hcb.dev" : "com.hackclub.hcb",
      buildNumber: "1.0.0.15",
      config: {
        usesNonExemptEncryption: false,
      },
      associatedDomains: [
        "applinks:hcb.hackclub.com",
        "applinks:bank.hackclub.com",
      ],
      // entitlements: {
      //   "com.apple.developer.proximity-reader.payment.acceptance": true,
      // }
    },
    android: {
      icon: "./assets/app-icon.png",
      adaptiveIcon: {
        foregroundImage: "./assets/app-icon-foreground.png",
        monochromeImage: "./assets/app-icon-monochrome.png",
        backgroundColor: "#EC3750",
      },
      package: IS_DEV ? "com.hackclub.hcb.dev" : "com.hackclub.hcb",
    },
    web: {
      bundler: "metro",
    },
    extra: {
      eas: {
        projectId: "dfc97c77-31b1-4267-896f-9472c87f166c",
      },
    },
    updates: {
      url: "https://u.expo.dev/dfc97c77-31b1-4267-896f-9472c87f166c",
      fallbackToCacheTimeout: 0,
      checkAutomatically: "NEVER",
    },
    runtimeVersion: {
      policy: "appVersion",
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
          bluetoothBackgroundMode: true,
          locationWhenInUsePermission:
            "Location access is required in order to accept payments.",
          bluetoothPeripheralPermission:
            "Bluetooth access is required in order to connect to supported bluetooth card readers.",
          bluetoothAlwaysUsagePermission:
            "This app uses Bluetooth to connect to supported card readers.",
        },
      ],
      [
        "expo-build-properties",
        {
          android: {
            minSdkVersion: 26,
            packagingOptions: {
              pickFirst: ["org/bouncycastle/pqc/crypto/picnic/lowmcL*", "org/bouncycastle/x509/CertPathReviewerMessages*"]
            }
          },
        },
      ],
      ["expo-alternate-app-icons", appIcons],
    ],
  },
};
