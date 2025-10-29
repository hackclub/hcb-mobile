import "expo-dev-client";

import * as SentryReact from "@sentry/react";
import * as Sentry from "@sentry/react-native";
import { StripeProvider } from "@stripe/stripe-react-native";
import { useFonts } from "expo-font";
import { ShareIntentProvider as ExpoShareIntentProvider } from "expo-share-intent";
import { useColorScheme } from "react-native";

import { AuthProvider } from "./src/auth/AuthProvider";
import { CustomAlertProvider } from "./src/components/alert/CustomAlertProvider";
import AppContent from "./src/core/AppContent";
import { useCache } from "./src/providers/cacheProvider";
import { LinkingProvider } from "./src/providers/LinkingContext";
import { ShareIntentProvider } from "./src/providers/ShareIntentContext";
import { ThemeProvider } from "./src/providers/ThemeContext";

function App() {
  const [fontsLoaded] = useFonts({
    "JetBrainsMono-Regular": require("./assets/fonts/JetBrainsMono-Regular.ttf"),
    "JetBrainsMono-Bold": require("./assets/fonts/JetBrainsMono-Bold.ttf"),
    "Consolas-Bold": require("./assets/fonts/CONSOLAB.ttf"),
    Damion: require("./assets/fonts/Damion-Regular.ttf"),
  });

  const scheme = useColorScheme();
  const cache = useCache();

  if (process.env.NODE_ENV === "production") {
    Sentry.init({
      dsn: process.env.EXPO_PUBLIC_SENTRY_DSN,
      debug: false,
      enableLogs: true,
      integrations: [
        Sentry.reactNativeTracingIntegration(),
        Sentry.reactNativeErrorHandlersIntegration(),
        Sentry.consoleLoggingIntegration({
          levels: ["log", "warn", "error"],
        }),
        SentryReact.captureConsoleIntegration({
          levels: ["error"],
        }),
        Sentry.breadcrumbsIntegration({
          console: true,
          dom: true,
          sentry: true,
        }),
        Sentry.reactNativeInfoIntegration(),
        Sentry.viewHierarchyIntegration(),
        Sentry.mobileReplayIntegration({ maskAllVectors: false }),
      ],
      sendDefaultPii: true,
      tracesSampleRate: 1.0,
      profilesSampleRate: 0.5,
      replaysSessionSampleRate: 0.1,
      replaysOnErrorSampleRate: 1.0,
    });
  }

  if (!fontsLoaded) {
    return null;
  }

  return (
    <StripeProvider publishableKey={process.env.EXPO_PUBLIC_STRIPE_API_KEY}>
      <ExpoShareIntentProvider>
        <ThemeProvider>
          <AuthProvider>
            <ShareIntentProvider>
              <LinkingProvider>
                <CustomAlertProvider>
                  <AppContent scheme={scheme} cache={cache} />
                </CustomAlertProvider>
              </LinkingProvider>
            </ShareIntentProvider>
          </AuthProvider>
        </ThemeProvider>
      </ExpoShareIntentProvider>
    </StripeProvider>
  );
}

export default Sentry.wrap(App);
