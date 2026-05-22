import { ActionSheetProvider } from "@expo/react-native-action-sheet";
import Intercom from "@intercom/intercom-react-native";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { ThemeProvider } from "expo-router/react-navigation";
import { StripeTerminalProvider } from "@stripe/stripe-terminal-react-native";
import * as Linking from "expo-linking";
import * as LocalAuthentication from "expo-local-authentication";
import * as Notifications from "expo-notifications";
import { usePathname, useRouter } from "expo-router";
import { NativeTabs } from "expo-router/unstable-native-tabs";
import * as SplashScreen from "expo-splash-screen";
import { StatusBar } from "expo-status-bar";
import * as SystemUI from "expo-system-ui";
import {
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import { ActivityIndicator, Appearance, Platform, View } from "react-native";
import { AlertNotificationRoot } from "react-native-alert-notification";
import { GestureHandlerRootView } from "react-native-gesture-handler";
import { SafeAreaProvider, SafeAreaView } from "react-native-safe-area-context";
import useSWR, { SWRConfig } from "swr";

import { SWRCacheProvider } from "../_layout";

import AuthContext from "@/auth/auth";
import { tokenResponseToLegacyTokens } from "@/auth/tokenUtils";
import SentryUserBridge from "@/components/core/SentryUserBridge";
import UserChangeDetector from "@/components/core/UserChangeDetector";
import { DevToolsPanel } from "@/components/devtools";
import useClient from "@/lib/client";
import { DevToolsProvider } from "@/lib/devtools";
import { PaginatedResponse } from "@/lib/types/HcbApiObject";
import Invitation from "@/lib/types/Invitation";
import { useIsDark } from "@/lib/useColorScheme";
import { usePushNotifications } from "@/lib/usePushNotifications";
import {
  resetStripeTerminalInitialization,
  useStripeTerminalInit,
} from "@/lib/useStripeTerminalInit";
import { useUpdateMonitor } from "@/lib/useUpdateMonitor";
import { useLinkingPref } from "@/providers/LinkingContext";
import { useShareIntentContext } from "@/providers/ShareIntentContext";
import { useThemeContext } from "@/providers/ThemeContext";
import { lightTheme, theme } from "@/styles/theme";
import { trackAppOpen } from "@/utils/storeReview";

interface HTTPError extends Error {
  status?: number;
  response?: {
    status?: number;
  };
}

function StripeTerminalInitializer({ enabled }: { enabled: boolean }) {
  useStripeTerminalInit({
    enabled,
    enableReaderPreConnection: true,
    enableSoftwareUpdates: true,
  });

  return null;
}

SplashScreen.preventAutoHideAsync();

SplashScreen.setOptions({
  duration: 500,
  fade: true,
});

const ROOT_TABS = ["/", "/cards", "/receipts", "/settings"];

function Navigation() {
  const { data: missingReceiptData } = useSWR<PaginatedResponse<never>>(
    "user/transactions/missing_receipt",
  );
  const { data: invitations } = useSWR<Invitation[]>(`user/invitations`);

  const { pendingShareIntent, clearPendingShareIntent, hasPendingShareIntent } =
    useShareIntentContext();

  const router = useRouter();
  const pathname = usePathname();

  const isAtRoot = ROOT_TABS.includes(pathname);

  useEffect(() => {
    if (hasPendingShareIntent && pendingShareIntent) {
      router.navigate({
        pathname: "/share-intent",
        params: {
          images: JSON.stringify(pendingShareIntent.images),
          missingTransactions: JSON.stringify(
            pendingShareIntent.missingTransactions,
          ),
        },
      });
      clearPendingShareIntent();
    }
  }, [
    hasPendingShareIntent,
    pendingShareIntent,
    clearPendingShareIntent,
    router,
  ]);

  return (
    <NativeTabs tintColor="#ec3750" hidden={!isAtRoot}>
      <NativeTabs.Trigger name="(events)">
        <NativeTabs.Trigger.Icon
          src={require("../../assets/tab-icons/home.png")}
          renderingMode="template"
        />
        <NativeTabs.Trigger.Label>Home</NativeTabs.Trigger.Label>
        {!!invitations?.length && (
          <NativeTabs.Trigger.Badge>
            {invitations.length.toString()}
          </NativeTabs.Trigger.Badge>
        )}
      </NativeTabs.Trigger>
      <NativeTabs.Trigger name="cards">
        <NativeTabs.Trigger.Icon
          src={require("../../assets/tab-icons/card.png")}
          renderingMode="template"
        />
        <NativeTabs.Trigger.Label>Cards</NativeTabs.Trigger.Label>
      </NativeTabs.Trigger>
      <NativeTabs.Trigger name="receipts">
        <NativeTabs.Trigger.Icon
          src={require("../../assets/tab-icons/payment-docs.png")}
          renderingMode="template"
        />
        <NativeTabs.Trigger.Label>Receipts</NativeTabs.Trigger.Label>
        {!!missingReceiptData?.total_count && (
          <NativeTabs.Trigger.Badge>
            {missingReceiptData.total_count.toString()}
          </NativeTabs.Trigger.Badge>
        )}
      </NativeTabs.Trigger>
      <NativeTabs.Trigger name="settings">
        <NativeTabs.Trigger.Icon
          src={require("../../assets/tab-icons/settings.png")}
          renderingMode="template"
        />
        <NativeTabs.Trigger.Label>Settings</NativeTabs.Trigger.Label>
      </NativeTabs.Trigger>
    </NativeTabs>
  );
}

export default function Layout() {
  const { scheme, cache } = useContext(SWRCacheProvider)!;
  const { tokenResponse, codeVerifier, setTokenResponse } =
    useContext(AuthContext);

  const tokens = useMemo(
    () => tokenResponseToLegacyTokens(tokenResponse, codeVerifier),
    [tokenResponse, codeVerifier],
  );
  const { theme: themePref } = useThemeContext();
  const { enabled: isUniversalLinkingEnabled } = useLinkingPref();
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [appIsReady, setAppIsReady] = useState(false);
  const isDark = useIsDark();
  const isBiometricAuthInProgress = useRef(false);
  const lastAuthenticatedToken = useRef<string | null>(null);
  const hasPassedBiometrics = useRef(false);
  const hcb = useClient();
  const { register: registerPushNotifications } = usePushNotifications();
  const pushNotificationsRegistered = useRef(false);

  useUpdateMonitor();

  useEffect(() => {
    resetStripeTerminalInitialization();
    setTokenFetchAttempts(0);
    setLastTokenFetch(0);
    setCachedToken(null);
    setTokenExpiry(0);
  }, []);

  useEffect(() => {
    const initializeIntercom = async () => {
      try {
        const apiKey = Platform.select({
          ios: process.env.EXPO_PUBLIC_INTERCOM_IOS_API_KEY,
          android: process.env.EXPO_PUBLIC_INTERCOM_ANDROID_API_KEY,
        });
        await Intercom.initialize(
          apiKey,
          process.env.EXPO_PUBLIC_INTERCOM_APP_ID,
        );
      } catch (error) {
        console.error("Error initializing Intercom", error);
      }
    };
    initializeIntercom().catch((error) => {
      console.error("Error initializing Intercom", error);
    });
  }, []);

  const [lastTokenFetch, setLastTokenFetch] = useState<number>(0);
  const [tokenFetchAttempts, setTokenFetchAttempts] = useState<number>(0);
  const [cachedToken, setCachedToken] = useState<string | null>(null);
  const [tokenExpiry, setTokenExpiry] = useState<number>(0);
  const TOKEN_FETCH_COOLDOWN = 5000;
  const MAX_TOKEN_FETCH_ATTEMPTS = 3;
  const TOKEN_CACHE_DURATION = 10 * 60 * 1000;

  const fetchTokenProvider = async (): Promise<string> => {
    const now = Date.now();

    if (cachedToken && now < tokenExpiry) {
      return cachedToken;
    }

    if (!tokens?.accessToken) {
      return "";
    }

    if (now - lastTokenFetch < TOKEN_FETCH_COOLDOWN) {
      const waitTime = Math.ceil(
        (TOKEN_FETCH_COOLDOWN - (now - lastTokenFetch)) / 1000,
      );
      throw new Error(
        `Rate limited: Please wait ${waitTime} seconds before retrying`,
      );
    }

    if (tokenFetchAttempts >= MAX_TOKEN_FETCH_ATTEMPTS) {
      console.error(
        `Maximum token fetch attempts (${MAX_TOKEN_FETCH_ATTEMPTS}) exceeded`,
      );
      setTimeout(() => {
        setTokenFetchAttempts(0);
        setLastTokenFetch(0);
      }, 60000);
      throw new Error(
        `Maximum token fetch attempts (${MAX_TOKEN_FETCH_ATTEMPTS}) exceeded. Please wait before retrying.`,
      );
    }

    try {
      setLastTokenFetch(now);
      setTokenFetchAttempts((prev) => prev + 1);

      const token = (await hcb
        .get("stripe_terminal_connection_token")
        .json()) as {
        terminal_connection_token: {
          secret: string;
        };
      };

      const newToken = token.terminal_connection_token.secret;
      const newExpiry = now + TOKEN_CACHE_DURATION;

      setCachedToken(newToken);
      setTokenExpiry(newExpiry);
      setTokenFetchAttempts(0);

      return newToken;
    } catch (error) {
      console.error("Token fetch failed:", error);

      if (
        error &&
        typeof error === "object" &&
        "status" in error &&
        error.status === 429
      ) {
        const backoffTime = Math.min(
          TOKEN_FETCH_COOLDOWN * Math.pow(2, tokenFetchAttempts),
          30000,
        );
        throw new Error(
          `Rate limited (429). Please wait ${Math.ceil(backoffTime / 1000)} seconds before retrying.`,
        );
      }

      throw error;
    }
  };

  useEffect(() => {
    const setStatusBar = async () => {
      await SystemUI.setBackgroundColorAsync(isDark ? "#252429" : "#fff");
      // When themePref is "system", defer to the device's actual color scheme
      if (themePref === "system") {
        Appearance.setColorScheme(null);
      } else {
        Appearance.setColorScheme(isDark ? "dark" : "light");
      }
    };
    setStatusBar();
  }, [isDark, themePref]);

  useEffect(() => {
    const checkAuth = async () => {
      if (tokens?.accessToken) {
        if (
          lastAuthenticatedToken.current === tokens.accessToken &&
          hasPassedBiometrics.current
        ) {
          return;
        }

        // On token refresh, update the reference without re-prompting for biometrics
        if (
          lastAuthenticatedToken.current !== null &&
          hasPassedBiometrics.current
        ) {
          lastAuthenticatedToken.current = tokens.accessToken;
          return;
        }

        if (__DEV__) {
          lastAuthenticatedToken.current = tokens.accessToken;
          setIsAuthenticated(true);
          setAppIsReady(true);
          return;
        }
        try {
          const biometricsRequired = await AsyncStorage.getItem(
            "biometrics_required",
          );

          if (biometricsRequired !== "true") {
            lastAuthenticatedToken.current = tokens.accessToken;
            hasPassedBiometrics.current = true;
            setIsAuthenticated(true);
            setAppIsReady(true);
            return;
          }

          const hasHardware = await LocalAuthentication.hasHardwareAsync();
          const isEnrolled = await LocalAuthentication.isEnrolledAsync();

          if (!hasHardware || !isEnrolled) {
            lastAuthenticatedToken.current = tokens.accessToken;
            hasPassedBiometrics.current = true;
            setIsAuthenticated(true);
            setAppIsReady(true);
            return;
          }

          if (isBiometricAuthInProgress.current) {
            return;
          }

          isBiometricAuthInProgress.current = true;

          const result = await LocalAuthentication.authenticateAsync({
            promptMessage: "Authenticate to access HCB",
            cancelLabel: "Cancel",
            fallbackLabel: "Use passcode",
            disableDeviceFallback: false,
          });

          if (result.success) {
            lastAuthenticatedToken.current = tokens.accessToken;
            hasPassedBiometrics.current = true;
            setIsAuthenticated(true);
          } else {
            hasPassedBiometrics.current = false;
            lastAuthenticatedToken.current = null;
            setIsAuthenticated(false);
            void setTokenResponse(null);
          }
          setAppIsReady(true);
          isBiometricAuthInProgress.current = false;
        } catch (error) {
          console.error("Biometric authentication error", error, {
            context: { action: "biometric_auth" },
          });
          hasPassedBiometrics.current = false;
          lastAuthenticatedToken.current = null;
          setIsAuthenticated(false);
          void setTokenResponse(null);
          setAppIsReady(true);
          isBiometricAuthInProgress.current = false;
        }
      } else {
        lastAuthenticatedToken.current = null;
        hasPassedBiometrics.current = false;
        setIsAuthenticated(true);
        setAppIsReady(true);
      }
    };

    let cancelled = false;

    checkAuth().catch((error) => {
      if (!cancelled) {
        console.error("Unexpected error in checkAuth", error);
        setIsAuthenticated(false);
        void setTokenResponse(null);
        setAppIsReady(true);
        isBiometricAuthInProgress.current = false;
      }
    });

    return () => {
      cancelled = true;
    };
  }, [tokenResponse?.accessToken, setTokenResponse, tokens]);

  useEffect(() => {
    if (
      tokens?.accessToken &&
      isAuthenticated &&
      appIsReady &&
      !pushNotificationsRegistered.current
    ) {
      pushNotificationsRegistered.current = true;
      registerPushNotifications().then((result) => {
        if (result.nativePushToken) {
          Intercom.sendTokenToIntercom(result.nativePushToken);
        }
      });
    }
  }, [
    tokens?.accessToken,
    isAuthenticated,
    appIsReady,
    registerPushNotifications,
  ]);

  useEffect(() => {
    if (appIsReady) {
      trackAppOpen();
    }
  }, [appIsReady]);

  useEffect(() => {
    Intercom.setInAppMessageVisibility("GONE");

    const notifSubscription =
      Notifications.addNotificationResponseReceivedListener((response) => {
        const contentData = response.notification.request.content.data as
          | Record<string, unknown>
          | undefined;
        const trigger = response.notification.request.trigger as {
          payload?: Record<string, unknown>;
        } | null;
        const data = contentData || trigger?.payload;
        if (data?.intercom_push_type) {
          Intercom.present();
        }
      });

    return () => {
      notifSubscription.remove();
    };
  }, []);

  const onLayoutRootView = useCallback(() => {
    if (appIsReady) {
      SplashScreen.hide();
    }
  }, [appIsReady]);

  // Redirect blocked paths to the browser and honour the universal linking toggle.
  // Cold-start deep links are handled by Expo Router via app.json linking config.
  useEffect(() => {
    if (isUniversalLinkingEnabled === null) return;

    const blockedPaths = [
      "/branding",
      "/security",
      "/roles",
      "/wrapped",
      "/mobile",
      "/applications",
    ];

    const subscription = Linking.addEventListener("url", ({ url }) => {
      if (!url || url.includes("dataUrl=hcbShareKey")) return;

      try {
        const parsed = new URL(url);
        if (blockedPaths.some((p) => parsed.pathname.startsWith(p))) {
          Linking.openURL(
            new URL(parsed.pathname, "https://hcb.hackclub.com").toString(),
          ).catch((err) =>
            console.error("Failed to open URL in browser", err, {
              context: { url },
            }),
          );
          return;
        }
      } catch {
        // Ignore URL parse errors
      }

      if (!isUniversalLinkingEnabled) {
        Linking.openURL(url).catch((err) =>
          console.error("Failed to open URL in browser", err, {
            context: { url },
          }),
        );
      }
    });

    return () => subscription.remove();
  }, [isUniversalLinkingEnabled]);

  const fetcher = (url: string, options?: RequestInit) => {
    return hcb(url, options).json();
  };

  let navTheme = lightTheme;
  if (themePref === "dark") navTheme = theme;
  else if (themePref === "system")
    navTheme = scheme === "dark" ? theme : lightTheme;

  if (isUniversalLinkingEnabled === null) {
    return <ActivityIndicator color="white" />;
  }

  if (tokens?.accessToken && !isAuthenticated) {
    return <ActivityIndicator color={isDark ? "white" : "black"} />;
  }

  if (!appIsReady) {
    return null;
  }

  return (
    <SafeAreaProvider>
      <SafeAreaView
        edges={Platform.OS === "android" ? ["bottom"] : []}
        style={{ flex: 1 }}
      >
        <StripeTerminalProvider tokenProvider={fetchTokenProvider}>
          <StripeTerminalInitializer
            enabled={!!tokens?.accessToken && isAuthenticated}
          />
          <View onLayout={onLayoutRootView} style={{ flex: 1 }}>
            <GestureHandlerRootView>
              <StatusBar style={isDark ? "light" : "dark"} />

              <SWRConfig
                value={{
                  provider: () => cache,
                  fetcher,
                  revalidateOnFocus: false,
                  revalidateOnReconnect: true,
                  revalidateIfStale: true,
                  dedupingInterval: 1000,
                  shouldRetryOnError: true,
                  keepPreviousData: true,
                  errorRetryCount: 5,
                  errorRetryInterval: 500,
                  refreshInterval: 0,
                  loadingTimeout: 3000,
                  focusThrottleInterval: 10000,
                  onErrorRetry: (
                    error,
                    key,
                    config,
                    revalidate,
                    { retryCount },
                  ) => {
                    const errorWithStatus = error as HTTPError;
                    const status =
                      errorWithStatus?.status ||
                      errorWithStatus?.response?.status;

                    if (status === 404) {
                      return;
                    }

                    if (
                      status &&
                      status >= 400 &&
                      status < 500 &&
                      status !== 429
                    ) {
                      return;
                    }

                    if (retryCount >= 5) return;

                    const baseTimeout = 500 * Math.pow(1.5, retryCount);
                    const jitter = Math.random() * 200;
                    const timeout = Math.min(baseTimeout + jitter, 5000);

                    setTimeout(() => {
                      revalidate({ retryCount });
                    }, timeout);
                  },
                  onError: (error, key) => {
                    if (
                      error instanceof Error &&
                      error.name !== "AbortError" &&
                      error.name !== "NetworkError"
                    ) {
                      console.error(`Global SWR error for ${key}:`, error);
                    }
                  },
                }}
              >
                <DevToolsProvider>
                  <SentryUserBridge />
                  <UserChangeDetector />
                  <ActionSheetProvider>
                    <AlertNotificationRoot theme={isDark ? "dark" : "light"}>
                      <ThemeProvider value={navTheme}>
                        <Navigation />
                      </ThemeProvider>
                    </AlertNotificationRoot>
                  </ActionSheetProvider>
                  <DevToolsPanel />
                </DevToolsProvider>
              </SWRConfig>
            </GestureHandlerRootView>
          </View>
        </StripeTerminalProvider>
      </SafeAreaView>
    </SafeAreaProvider>
  );
}
