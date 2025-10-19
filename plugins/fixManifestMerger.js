const { withDangerousMod } = require("@expo/config-plugins");
const fs = require("fs");
const path = require("path");

/**
 * Expo plugin to fix Android manifest merger conflicts
 * Specifically handles supportsRtl conflict with HelpScout Beacon library
 */
function withManifestMergerFix(config) {
  console.log("🔧 Running manifest merger fix plugin...");

  return withDangerousMod(config, [
    "android",
    async (config) => {
      const projectRoot = config.modRequest.projectRoot;
      const androidPath = path.join(projectRoot, "android");
      const manifestPath = path.join(
        androidPath,
        "app",
        "src",
        "main",
        "AndroidManifest.xml",
      );

      console.log("📁 Project root:", projectRoot);
      console.log("📱 Android manifest path:", manifestPath);

      // Check if manifest exists
      if (!fs.existsSync(manifestPath)) {
        console.log(
          "⚠️  AndroidManifest.xml not found, skipping manifest merger fix",
        );
        return config;
      }

      try {
        await fixManifestMergerConflict(manifestPath);
        console.log("✅ Fixed Android manifest merger conflict");
      } catch (error) {
        console.error(
          "❌ Error fixing manifest merger conflict:",
          error.message,
        );
        throw error;
      }

      return config;
    },
  ]);
}

/**
 * Fix the supportsRtl manifest merger conflict by adding tools:replace attribute
 */
async function fixManifestMergerConflict(manifestPath) {
  console.log("📝 Fixing manifest merger conflict...");

  let manifestContent = fs.readFileSync(manifestPath, "utf8");

  // Check if the fix is already applied
  if (manifestContent.includes('tools:replace="android:supportsRtl"')) {
    console.log("✅ Manifest merger fix already applied");
    return;
  }

  // Find the application element and add tools:replace attribute
  const applicationRegex =
    /(<application[^>]*)(android:supportsRtl="true"[^>]*)(>)/;

  if (applicationRegex.test(manifestContent)) {
    manifestContent = manifestContent.replace(
      applicationRegex,
      '$1$2 tools:replace="android:supportsRtl"$3',
    );

    fs.writeFileSync(manifestPath, manifestContent);
    console.log(
      '✅ Added tools:replace="android:supportsRtl" to application element',
    );
  } else {
    console.log(
      '⚠️  Could not find application element with supportsRtl="true" in manifest',
    );
  }
}

module.exports = withManifestMergerFix;
