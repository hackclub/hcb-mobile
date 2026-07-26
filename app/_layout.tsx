import "expo-dev-client";

// Polyfill AbortSignal.throwIfAborted which is missing in Hermes
if (
  typeof AbortSignal !== "undefined" &&
  !AbortSignal.prototype.throwIfAborted
) {
  AbortSignal.prototype.throwIfAborted = function () {
    if (this.aborted) throw this.reason;
  };
}

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
import {
  ColorSchemeName,
  Pressable,
  Text,
  useColorScheme,
  View,
} from "react-native";
import { SafeAreaProvider } from "react-native-safe-area-context";

import { CustomAlertProvider } from "@/components/alert/CustomAlertProvider";
import ToastHost from "@/components/toast/ToastHost";
import AuthContext from "@/lib/auth/auth";
import { AuthProvider } from "@/lib/auth/AuthProvider";
import { installNavigationGuard } from "@/lib/navigationGuard";
import { CacheProvider, useCache } from "@/lib/providers/cacheProvider";
import { LinkingProvider } from "@/lib/providers/LinkingContext";
import { ShareIntentProvider } from "@/lib/providers/ShareIntentContext";
import { ThemeProvider } from "@/lib/providers/ThemeContext";
import { openOnWebsite } from "@/utils/handoff";

export const SWRCacheProvider = createContext<{
  scheme: ColorSchemeName;
  cache: CacheProvider;
} | null>(null);

export const ReadyContext = createContext<
  [boolean, (ready: boolean) => void] | null
>(null);

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

// Swallow accidental double-taps that would otherwise stack duplicate screens.
installNavigationGuard();

function RootLayoutNav() {
  const { tokenResponse } = useContext(AuthContext);
  const readyContext = useContext(ReadyContext);
  const isReady = readyContext?.[0] ?? false;
  const hasToken = !!tokenResponse?.accessToken;
  const lastAuthState = React.useRef<boolean | null>(null);

  useEffect(() => {
    if (!isReady) return;

    // Avoid infinite redirects when auth state hasn't changed
    if (lastAuthState.current === hasToken) {
      return;
    }

    lastAuthState.current = hasToken;

    if (hasToken) {
      router.replace("/(app)/(events)/");
    } else {
      router.replace("/login");
    }
  }, [hasToken, isReady]);

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
  });

  const scheme = useColorScheme();
  const cache = useCache();
  const [isReady, setIsReady] = React.useState(false);

  if (!fontsLoaded) {
    return null;
  }

  return (
    <SafeAreaProvider>
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
                    {/* Mounted at the root, not in (app), so toasts raised from
                        receipt-selection and share-intent are covered too. */}
                    <ToastHost />
                  </LinkingProvider>
                </ShareIntentProvider>
              </ReadyContext.Provider>
            </AuthProvider>
          </ThemeProvider>
        </ExpoShareIntentProvider>
      </StripeProvider>
    </SafeAreaProvider>
  );
}

export function ErrorBoundary({
  error,
  retry,
}: {
  error: Error;
  retry: () => void;
}) {
  useEffect(() => {
    Sentry.captureException(error);
  }, [error]);

  const isDark = useColorScheme() === "dark";
  const background = isDark ? "#000" : "#fff";
  const text = isDark ? "#fff" : "#000";

  return (
    <View
      style={{
        flex: 1,
        backgroundColor: background,
        justifyContent: "center",
        alignItems: "center",
        padding: 24,
        gap: 16,
      }}
    >
      <Text
        style={{
          color: text,
          fontSize: 22,
          fontWeight: "700",
          textAlign: "center",
        }}
      >
        Something went wrong
      </Text>
      <Text style={{ color: text, textAlign: "center", opacity: 0.6 }}>
        {error.message || "The app hit an unexpected error."}
      </Text>
      <Pressable
        onPress={retry}
        style={{
          width: "100%",
          marginTop: 8,
          backgroundColor: "#f47080",
          borderRadius: 6,
          paddingVertical: 12,
          alignItems: "center",
        }}
      >
        <Text style={{ color: "#1f0008", fontWeight: "600", fontSize: 16 }}>
          Try Again
        </Text>
      </Pressable>
      <Pressable
        onPress={() => openOnWebsite("/")}
        style={{
          width: "100%",
          borderRadius: 6,
          borderWidth: 1,
          borderColor: text,
          paddingVertical: 12,
          alignItems: "center",
        }}
      >
        <Text style={{ color: text, fontWeight: "600", fontSize: 16 }}>
          Continue on Website
        </Text>
      </Pressable>
    </View>
  );
}

export default Sentry.wrap(Layout);
