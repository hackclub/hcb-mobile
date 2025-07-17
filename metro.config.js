// This replaces `const { getDefaultConfig } = require('expo/metro-config');`
// eslint-disable-next-line @typescript-eslint/no-var-requires
const { getSentryExpoConfig } = require("@sentry/react-native/metro");

// This replaces `const config = getDefaultConfig(__dirname);`
// eslint-disable-next-line no-undef
const config = getSentryExpoConfig(__dirname, {
  annotateReactComponents: true,
});

// eslint-disable-next-line no-undef
module.exports = config;
