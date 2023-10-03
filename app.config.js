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
      supportsTablet: true,
      bundleIdentifier: IS_DEV ? "com.hackclub.hcb.dev" : "com.hackclub.hcb",
      buildNumber: "1.0.0.2",
      config: {
        usesNonExemptEncryption: false,
      },
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
    plugins: [
      [
        "expo-image-picker",
        {
          cameraPermission: "Allow HCB to take photos of receipts",
        },
      ],
      [
        "@config-plugins/react-native-dynamic-app-icon",
        [
          "./assets/icons/logo-ios.png",
          "./assets/icons/logo-dark-mode.png",
          "./assets/icons/logo-alt-1-neon.png",
          "./assets/icons/logo-alt-2-neon.png",
          "./assets/icons/logo-outernet.png",
          "./assets/icons/logo-sinerider.png",
          "./assets/icons/logo-slash-z.png",
          "./assets/icons/logo-sprig-village.png",
          "./assets/icons/logo-flagship.png",
          "./assets/icons/logo-hack-night-2.png",
          "./assets/icons/logo-hack-night.png",
          "./assets/icons/logo-418.png",
        ],
      ],
    ],
  },
};
