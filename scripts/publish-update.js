/* eslint-disable */

const fs = require("fs");
const path = require("path");
const { execSync, execFileSync } = require("child_process");

const args = process.argv.slice(2);
const messageIndex = args.indexOf("--message");
const channelIndex = args.indexOf("--channel");
const environmentIndex = args.indexOf("--environment");

const message = messageIndex !== -1 ? args[messageIndex + 1] : "Update";
const channel = channelIndex !== -1 ? args[channelIndex + 1] : "production";
const environment =
  environmentIndex !== -1 ? args[environmentIndex + 1] : "production";

const appConfigPath = path.join(__dirname, "..", "app.config.js");
const backupPath = path.join(__dirname, "..", "app.config.backup.js");

try {
  // Bundle yellowpages data before publishing update
  console.log("📦 Bundling yellow_pages data...");
  execSync("node scripts/bundle-yellowpages.js", {
    stdio: "inherit",
    env: { ...process.env },
  });

  const appConfigContent = fs.readFileSync(appConfigPath, "utf8");
  fs.writeFileSync(backupPath, appConfigContent);
  console.log("✅ Backed up app.config.js");
  let modifiedContent = appConfigContent;
  // Use replacer functions: a replacement string would expand $&, $' and $$
  // in the message.
  if (modifiedContent.includes("extra: {")) {
    modifiedContent = modifiedContent.replace(
      /extra: \{/,
      () => `extra: {\n      message: ${JSON.stringify(message)},`,
    );
  } else {
    modifiedContent = modifiedContent.replace(
      /expo: \{/,
      () =>
        `expo: {\n    extra: {\n      message: ${JSON.stringify(message)},\n    },`,
    );
  }

  fs.writeFileSync(appConfigPath, modifiedContent);
  console.log("✅ Added message to app.config.js extra section");
  console.log("\n🚀 Running eas update...\n");

  // Pass arguments as an array so no shell parses them. The message comes
  // from the commit, and backticks or $(...) in it would otherwise run as
  // commands.
  execFileSync(
    "npx",
    [
      "eas-cli",
      "update",
      "--channel",
      channel,
      "--environment",
      environment,
      "--non-interactive",
      "--message",
      message,
    ],
    {
      stdio: "inherit",
      env: { ...process.env },
    },
  );

  console.log("\n✅ Update published successfully!");
} catch (error) {
  console.error("❌ Error:", error.message);
  process.exit(1);
} finally {
  if (fs.existsSync(backupPath)) {
    fs.copyFileSync(backupPath, appConfigPath);
    fs.unlinkSync(backupPath);
  }
}
