const {
  withDangerousMod,
  withAndroidManifest,
  AndroidConfig,
} = require("@expo/config-plugins");
const path = require("path");
const fs = require("fs");

const { getMainApplicationOrThrow } = AndroidConfig.Manifest;

function withIntercomExpoPushRouter(config, props = {}) {
  const serviceName = props.serviceName ?? "AppFirebaseMessagingService";

  console.log("🔧 Running withIntercomExpoPushRouter plugin...");
  console.log(`📦 Service name: ${serviceName}`);

  config = withDangerousMod(config, [
    "android",
    async (cfg) => {
      const projectRoot = cfg.modRequest.projectRoot;

      const packageName =
        cfg.android?.package ?? AndroidConfig.Package.getPackageName(cfg);

      if (!packageName) {
        throw new Error(
          "withIntercomExpoPushRouter: Missing android.package in app config.",
        );
      }

      console.log(`📱 Android package: ${packageName}`);

      const packagePath = packageName.replace(/\./g, "/");
      const kotlinDir = path.join(
        projectRoot,
        "android",
        "app",
        "src",
        "main",
        "java",
        packagePath,
      );

      console.log(`📁 Kotlin directory: ${kotlinDir}`);

      fs.mkdirSync(kotlinDir, { recursive: true });

      const kotlinFilePath = path.join(kotlinDir, `${serviceName}.kt`);

      const contents = `package ${packageName}

import com.google.firebase.messaging.RemoteMessage
import expo.modules.notifications.service.ExpoFirebaseMessagingService
import com.intercom.reactnative.IntercomModule

class ${serviceName} : ExpoFirebaseMessagingService() {

    override fun onNewToken(token: String) {
        super.onNewToken(token)
        IntercomModule.sendTokenToIntercom(application, token)
    }

    override fun onMessageReceived(message: RemoteMessage) {
        super.onMessageReceived(message)
    }
}
`;

      fs.writeFileSync(kotlinFilePath, contents, "utf8");
      console.log(`✅ Created Kotlin service: ${kotlinFilePath}`);

      const buildGradlePath = path.join(
        projectRoot,
        "android",
        "app",
        "build.gradle",
      );

      if (fs.existsSync(buildGradlePath)) {
        let buildGradle = fs.readFileSync(buildGradlePath, "utf8");

        const firebaseBomDep =
          "implementation platform('com.google.firebase:firebase-bom:33.0.0')";
        const firebaseMessagingDep =
          "implementation 'com.google.firebase:firebase-messaging'";

        if (!buildGradle.includes("firebase-messaging")) {
          console.log(
            "📝 Adding Firebase Messaging dependency to build.gradle...",
          );

          const dependenciesRegex = /(dependencies\s*\{[\s\S]*?)(^\})/m;
          const match = buildGradle.match(dependenciesRegex);

          if (match) {
            buildGradle = buildGradle.replace(
              dependenciesRegex,
              `$1\n    // Firebase Messaging (required for ${serviceName})\n    ${firebaseBomDep}\n    ${firebaseMessagingDep}\n$2`,
            );

            fs.writeFileSync(buildGradlePath, buildGradle, "utf8");
            console.log(
              "✅ Added Firebase Messaging dependency to build.gradle",
            );
          } else {
            console.warn(
              "⚠️ Could not find dependencies block in build.gradle",
            );
          }
        } else {
          console.log(
            "ℹ️ Firebase Messaging dependency already exists in build.gradle",
          );
        }
      }

      return cfg;
    },
  ]);

  config = withAndroidManifest(config, (cfg) => {
    console.log("📝 Patching AndroidManifest.xml...");

    const manifest = cfg.modResults;
    const mainApplication = getMainApplicationOrThrow(manifest);

    const packageName =
      cfg.android?.package ?? AndroidConfig.Package.getPackageName(cfg);

    if (!packageName) {
      throw new Error(
        "withIntercomExpoPushRouter: Missing android.package in app config.",
      );
    }

    const fqcn = `${packageName}.${serviceName}`;

    mainApplication.service = mainApplication.service ?? [];

    const originalCount = mainApplication.service.length;
    mainApplication.service = mainApplication.service.filter((s) => {
      const name = s?.$?.["android:name"];
      const isExpoFCMService =
        name ===
          "expo.modules.notifications.service.ExpoFirebaseMessagingService" ||
        String(name).endsWith(".ExpoFirebaseMessagingService");

      if (isExpoFCMService) {
        console.log(`🗑️  Removing default Expo FCM service: ${name}`);
      }
      return !isExpoFCMService;
    });

    if (mainApplication.service.length < originalCount) {
      console.log(
        `✅ Removed ${originalCount - mainApplication.service.length} default Expo FCM service(s)`,
      );
    }

    const existingIndex = mainApplication.service.findIndex(
      (s) => s?.$?.["android:name"] === fqcn,
    );

    const serviceEntry = {
      $: {
        "android:name": fqcn,
        "android:exported": "false",
      },
      "intent-filter": [
        {
          action: [
            {
              $: { "android:name": "com.google.firebase.MESSAGING_EVENT" },
            },
          ],
        },
      ],
    };

    if (existingIndex >= 0) {
      mainApplication.service[existingIndex] = serviceEntry;
      console.log(`🔄 Updated existing FCM routing service: ${fqcn}`);
    } else {
      mainApplication.service.push(serviceEntry);
      console.log(`➕ Added FCM routing service: ${fqcn}`);
    }

    console.log("✅ AndroidManifest.xml patched successfully");

    return cfg;
  });

  return config;
}

module.exports = withIntercomExpoPushRouter;
