import "expo-dev-client";

import * as SentryReact from "@sentry/react";
import * as Sentry from "@sentry/react-native";
import { StripeProvider } from "@stripe/stripe-react-native";
import * as BackgroundTask from "expo-background-task";
import { useFonts } from "expo-font";
import { router, Slot } from "expo-router";
import { ShareIntentProvider as ExpoShareIntentProvider } from "expo-share-intent";
import * as TaskManager from "expo-task-manager";
import * as Updates from "expo-updates";
import React, { createContext, useContext, useEffect } from "react";
import { ActivityIndicator, ColorSchemeName, useColorScheme, View } from "react-native";

import { AuthProvider } from "@/auth/AuthProvider";
import AuthContext from "@/auth/auth";
import { CustomAlertProvider } from "@/components/alert/CustomAlertProvider";
import { CacheProvider, useCache } from "@/providers/cacheProvider";
import { LinkingProvider } from "@/providers/LinkingContext";
import { ShareIntentProvider } from "@/providers/ShareIntentContext";
import { ThemeProvider } from "@/providers/ThemeContext";

export const SWRCacheProvider = createContext<{
  scheme: ColorSchemeName;
  cache: CacheProvider;
} | null>(null);

export const ReadyContext = createContext<[boolean, (ready: boolean) => void] | null>(null);

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

// Routing guard component that handles navigation based on auth state
function RootLayoutNav() {
  const { tokenResponse } = useContext(AuthContext);
  const readyContext = useContext(ReadyContext);
  const isReady = readyContext?.[0] ?? false;
  const hasToken = !!tokenResponse?.accessToken;
  const lastAuthState = React.useRef<boolean | null>(null);

  useEffect(() => {
    if (!isReady) return;

    // Only navigate if auth state has changed to avoid infinite redirects
    if (lastAuthState.current === hasToken) {
      return;
    }

    lastAuthState.current = hasToken;

    // If user has a token, navigate to the app
    if (hasToken) {
      router.replace("/(app)/(events)/");
    } else {
      // If no token, navigate to login
      router.replace("/login");
    }
  }, [hasToken, isReady]);

  // Show nothing while initializing
  if (!isReady) {
    return null;
  }

  return <Slot />;
}

function Layout() {
  const [fontsLoaded] = useFonts({
    "JetBrainsMono-Regular": require("../assets/fonts/JetBrainsMono-Regular.ttf"),
    "JetBrainsMono-Bold": require("../assets/fonts/JetBrainsMono-Bold.ttf"),
    "Consolas-Bold": require("../assets/fonts/CONSOLAB.ttf"),
    Damion: require("../assets/fonts/Damion-Regular.ttf"),
    Regular: require("../assets/fonts/Regular.ttf"),
    Italic: require("../assets/fonts/Italic.ttf"),
    Bold: require("../assets/fonts/Bold.ttf"),
  });

  const scheme = useColorScheme();
  const cache = useCache();
  const [isReady, setIsReady] = React.useState(false);

  if (!fontsLoaded) {
    return null;
  }

  return (
    <StripeProvider publishableKey={process.env.EXPO_PUBLIC_STRIPE_API_KEY}>
      <ExpoShareIntentProvider>
        <ThemeProvider>
          <AuthProvider onAuthReady={() => setIsReady(true)}>
            <ReadyContext.Provider value={[isReady, setIsReady]}>
              <ShareIntentProvider>
                <LinkingProvider>
                  <CustomAlertProvider>
                    <SWRCacheProvider.Provider value={{ scheme, cache }}>
                      <RootLayoutNav />
                    </SWRCacheProvider.Provider>
                  </CustomAlertProvider>
                </LinkingProvider>
              </ShareIntentProvider>
            </ReadyContext.Provider>
          </AuthProvider>
        </ThemeProvider>
      </ExpoShareIntentProvider>
    </StripeProvider>
  );
}

export default Sentry.wrap(Layout);
