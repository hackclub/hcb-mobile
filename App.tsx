import "expo-dev-client";

import * as SentryReact from "@sentry/react";
import * as Sentry from "@sentry/react-native";
import { StripeProvider } from "@stripe/stripe-react-native";
import * as BackgroundTask from "expo-background-task";
import { useFonts } from "expo-font";
import { ShareIntentProvider as ExpoShareIntentProvider } from "expo-share-intent";
import * as TaskManager from "expo-task-manager";
import * as Updates from "expo-updates";
import { useColorScheme } from "react-native";

import { AuthProvider } from "./src/auth/AuthProvider";
import { CustomAlertProvider } from "./src/components/alert/CustomAlertProvider";
import { DevToolsPanel } from "./src/components/devtools";
import AppContent from "./src/core/AppContent";
import { DevToolsProvider } from "./src/lib/devtools";
import { useCache } from "./src/providers/cacheProvider";
import { LinkingProvider } from "./src/providers/LinkingContext";
import { ShareIntentProvider } from "./src/providers/ShareIntentContext";
import { ThemeProvider } from "./src/providers/ThemeContext";

const routingInstrumentation = Sentry.reactNavigationIntegration({
  enableTimeToInitialDisplay: true,
});

Sentry.init({
  dsn: process.env.EXPO_PUBLIC_SENTRY_DSN,
  debug: false,
  enableLogs: true,
  attachScreenshot: true,
  integrations: [
    routingInstrumentation,
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
    Sentry.feedbackIntegration(),
  ],
  sendDefaultPii: true,
  tracesSampleRate: 1.0,
  profilesSampleRate: 0.5,
  replaysSessionSampleRate: 0.1,
  replaysOnErrorSampleRate: 1.0,
});

export { routingInstrumentation };

const BACKGROUND_TASK_NAME = "task-run-expo-update";

export const setupBackgroundUpdates = async () => {
  TaskManager.defineTask(BACKGROUND_TASK_NAME, async () => {
    const update = await Updates.checkForUpdateAsync();
    if (update.isAvailable) {
      await Updates.fetchUpdateAsync();
      await Updates.reloadAsync();
    }
    return Promise.resolve();
  });

  await BackgroundTask.registerTaskAsync(BACKGROUND_TASK_NAME, {
    minimumInterval: 60 * 24,
  });
};

setupBackgroundUpdates();

function App() {
  const [fontsLoaded] = useFonts({
    "JetBrainsMono-Regular": require("./assets/fonts/JetBrainsMono-Regular.ttf"),
    "JetBrainsMono-Bold": require("./assets/fonts/JetBrainsMono-Bold.ttf"),
    "Consolas-Bold": require("./assets/fonts/CONSOLAB.ttf"),
    Damion: require("./assets/fonts/Damion-Regular.ttf"),
  });

  const scheme = useColorScheme();
  const cache = useCache();

  if (!fontsLoaded) {
    return null;
  }

  return (
    <StripeProvider publishableKey={process.env.EXPO_PUBLIC_STRIPE_API_KEY}>
      <ExpoShareIntentProvider>
        <ThemeProvider>
          <AuthProvider>
            <DevToolsProvider>
              <ShareIntentProvider>
                <LinkingProvider>
                  <CustomAlertProvider>
                    <AppContent scheme={scheme} cache={cache} />
                  </CustomAlertProvider>
                </LinkingProvider>
              </ShareIntentProvider>
              <DevToolsPanel />
            </DevToolsProvider>
          </AuthProvider>
        </ThemeProvider>
      </ExpoShareIntentProvider>
    </StripeProvider>
  );
}

export default Sentry.wrap(App);
