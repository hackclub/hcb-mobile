const { withAppDelegate } = require("@expo/config-plugins");

function withIntercomIOSPush(config) {
  console.log("🔧 Running withIntercomIOSPush plugin...");

  return withAppDelegate(config, (cfg) => {
    let contents = cfg.modResults.contents;

    // Check if push notification methods already exist
    if (contents.includes("didRegisterForRemoteNotificationsWithDeviceToken")) {
      console.log("ℹ️ Push notification methods already exist in AppDelegate");
      return cfg;
    }

    // Add UserNotifications import if not present
    if (!contents.includes("import UserNotifications")) {
      contents = contents.replace(
        "import Expo",
        "import Expo\nimport UserNotifications",
      );
    }

    // Find the closing brace of the AppDelegate class and add push methods before it
    const pushMethods = `
  // Push Notifications for Intercom
  public override func application(
    _ application: UIApplication,
    didRegisterForRemoteNotificationsWithDeviceToken deviceToken: Data
  ) {
    IntercomModule.setDeviceToken(deviceToken)
    super.application(application, didRegisterForRemoteNotificationsWithDeviceToken: deviceToken)
  }

  public override func application(
    _ application: UIApplication,
    didFailToRegisterForRemoteNotificationsWithError error: Error
  ) {
    print("Failed to register for remote notifications: \\(error)")
    super.application(application, didFailToRegisterForRemoteNotificationsWithError: error)
  }
`;

    // Insert before the closing brace of AppDelegate class
    // Find the pattern: closing brace after Universal Links method
    const insertPoint = contents.lastIndexOf("}\n\nclass ReactNativeDelegate");

    if (insertPoint !== -1) {
      contents =
        contents.slice(0, insertPoint) +
        pushMethods +
        contents.slice(insertPoint);
      console.log("✅ Added push notification methods to AppDelegate");
    } else {
      // Fallback: try to find the class closing brace differently
      const appDelegateEnd = contents.indexOf("class ReactNativeDelegate");
      if (appDelegateEnd !== -1) {
        // Find the } before ReactNativeDelegate
        let bracePos = appDelegateEnd - 1;
        while (bracePos > 0 && contents[bracePos] !== "}") {
          bracePos--;
        }
        if (bracePos > 0) {
          contents =
            contents.slice(0, bracePos) +
            pushMethods +
            contents.slice(bracePos);
          console.log(
            "✅ Added push notification methods to AppDelegate (fallback)",
          );
        }
      }
    }

    cfg.modResults.contents = contents;
    return cfg;
  });
}

module.exports = withIntercomIOSPush;
