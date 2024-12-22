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
      buildNumber: "1.0.0.12",
      config: {
        usesNonExemptEncryption: false,
      },
      associatedDomains: [
        "applinks:hcb.hackclub.com",
        "applinks:bank.hackclub.com",
      ],
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
          photosPermission: "Allow HCB to access your photos for receipts",
        },
      ],
      [
        "expo-font",
        {
          fonts: [
            "./assets/fonts/JetBrainsMono-Regular.ttf",
            "./assets/fonts/JetBrainsMono-Bold.ttf",
          ],
        },
      ],
      "expo-secure-store",
      [
        "expo-local-authentication",
        { faceIDPermission: "Allow $(PRODUCT_NAME) to use Face ID." },
      ],
      [
        "expo-alternate-app-icons",
        [
          {
            "name": "Default",
            "ios": "./assets/app-icon.png", 
            "android": {
              "foregroundImage": "./assets/app-icon-foreground.png",
              "backgroundColor": "#EC3750",
            }
          },
          {
            "name": "Artskillz",
            "ios": "./assets/icons/art-skillz.png", 
            "android": {
              "foregroundImage": "./assets/icons/art-skillz-foreground.png",
              "backgroundColor": "#FF2500",
            }
          },
          {
            "name": "Dev",
            "ios": "./assets/icons/dev.png",
            "android": {
              "foregroundImage": "./assets/icons/dev-foreground.png",
              "backgroundColor": "#33D6A6",
            }
          },
          {
            "name": "Cashmoney",
            "ios": "./assets/icons/cash-money.png",
            "android": {
              "foregroundImage": "./assets/icons/cash-money-foreground.png",
              "backgroundColor": "#fff",
            }
          },
          {
            "name": "Hacknight",
            "ios": "./assets/icons/hack-night.png",
            "android": {
              "foregroundImage": "./assets/icons/hack-night.png",
              "backgroundColor": "#FFD700",
            }
          },
          {
            "name": "Testflight",
            "ios": "./assets/icons/testflight.png",
            "android": {
              "foregroundImage": "./assets/icons/testflight.png",
              "backgroundColor": "#FFD700",
            }
          },

        ]
      ]
    ],
  },
};
