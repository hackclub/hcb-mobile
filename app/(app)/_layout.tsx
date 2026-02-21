import { ActionSheetProvider } from "@expo/react-native-action-sheet";
import Intercom from "@intercom/intercom-react-native";
import AsyncStorage from "@react-native-async-storage/async-storage";
import {
  LinkingOptions,
  NavigationContainerRef,
  ThemeProvider,
} from "@react-navigation/native";
import { StripeTerminalProvider } from "@stripe/stripe-terminal-react-native";
import Icon from "@thedev132/hackclub-icons-rn";
import * as Haptics from "expo-haptics";
import * as Linking from "expo-linking";
import * as LocalAuthentication from "expo-local-authentication";
import * as Notifications from "expo-notifications";
import { Tabs } from "expo-router";
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
import {
  ActivityIndicator,
  Appearance,
  Dimensions,
  Platform,
  View,
} from "react-native";
import { AlertNotificationRoot } from "react-native-alert-notification";
import { GestureHandlerRootView } from "react-native-gesture-handler";
import {
  SafeAreaProvider,
  SafeAreaView,
  useSafeAreaInsets,
} from "react-native-safe-area-context";
import { SWRConfig } from "swr";

import { routingInstrumentation, SWRCacheProvider } from "../_layout";

import AuthContext from "@/auth/auth";
import { tokenResponseToLegacyTokens } from "@/auth/tokenUtils";
import SentryUserBridge from "@/components/core/SentryUserBridge";
import UserChangeDetector from "@/components/core/UserChangeDetector";
import { DevToolsPanel } from "@/components/devtools";
import { navRef } from "@/core/navigationRef";
import useClient from "@/lib/client";
import { DevToolsProvider } from "@/lib/devtools";
import { TabParamList } from "@/lib/NavigatorParamList";
import { useIsDark } from "@/lib/useColorScheme";
import { usePushNotifications } from "@/lib/usePushNotifications";
import {
  resetStripeTerminalInitialization,
  useStripeTerminalInit,
} from "@/lib/useStripeTerminalInit";
import { useUpdateMonitor } from "@/lib/useUpdateMonitor";
import { useLinkingPref } from "@/providers/LinkingContext";
import { useThemeContext } from "@/providers/ThemeContext";
import { lightTheme, theme } from "@/styles/theme";
import { getStateFromPath } from "@/utils/getStateFromPath";
import { trackAppOpen } from "@/utils/storeReview";
import { BlurView } from "expo-blur";
import { DEFAULT_BOTTOM_NAV_STYLE } from "components/TabBarStyling";

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

export default function Layout() {
  const { scheme, cache } = useContext(SWRCacheProvider);
  const { tokenResponse, codeVerifier, setTokenResponse } =
    useContext(AuthContext);

  // Extract tokens from tokenResponse for backward compatibility
  const tokens = useMemo(
    () => tokenResponseToLegacyTokens(tokenResponse, codeVerifier),
    [tokenResponse, codeVerifier],
  );
  const insets = useSafeAreaInsets();
  const { theme: themePref } = useThemeContext();
  const { enabled: isUniversalLinkingEnabled } = useLinkingPref();
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [appIsReady, setAppIsReady] = useState(false);
  const isDark = useIsDark();
  const navigationRef = useRef<NavigationContainerRef<TabParamList>>(null);
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
  const TOKEN_CACHE_DURATION = 10 * 60 * 1000; // 10 minutes

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
      console.warn(
        `Rate limited: Please wait ${waitTime} seconds before retrying`,
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
        ); // Max 30 seconds
        console.warn(
          `Rate limited (429). Please wait ${Math.ceil(backoffTime / 1000)} seconds before retrying.`,
        );
        throw new Error(
          `Rate limited (429). Please wait ${Math.ceil(backoffTime / 1000)} seconds before retrying.`,
        );
      }

      throw error;
    }
  };
  useEffect(() => {
    navRef.current = navigationRef.current;
  }, []);

  const onNavigationReady = useCallback(() => {
    navRef.current = navigationRef.current;
    routingInstrumentation.registerNavigationContainer(navigationRef);
  }, []);

  useEffect(() => {
    const setStatusBar = async () => {
      await SystemUI.setBackgroundColorAsync(isDark ? "#252429" : "#fff");
      // Only override Appearance when NOT using system theme
      // When themePref is "system", set to null to use actual device theme
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
          console.log(
            "Already authenticated for this token, skipping biometric auth",
          );
          return;
        }

        // If user was already authenticated (token refresh scenario), update token without re-prompting
        if (
          lastAuthenticatedToken.current !== null &&
          hasPassedBiometrics.current
        ) {
          console.log(
            "Token refreshed, user already authenticated - updating token without re-prompting biometrics",
          );
          lastAuthenticatedToken.current = tokens.accessToken;
          return;
        }

        // if (__DEV__) {
        //   // bypass auth for development
        //   lastAuthenticatedToken.current = tokens.accessToken;
        //   setIsAuthenticated(true);
        //   setAppIsReady(true);
        //   return;
        // }
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

          // Check if biometric authentication is available
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
            console.log(
              "Biometric authentication already in progress, skipping...",
            );
            return;
          }

          isBiometricAuthInProgress.current = true;

          // Keep splash screen visible during biometric authentication
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
          setAppIsReady(true);
          isBiometricAuthInProgress.current = false;
        }
      } else {
        console.log("No access token, skipping biometric authentication");
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
      console.log("registering push notifications");
      registerPushNotifications().then((result) => {
        console.log("result", result);
        if (result.expoPushToken || result.nativePushToken) {
          console.log("Push notifications registered successfully", {
            expoPushToken: result.expoPushToken,
            nativePushToken: result.nativePushToken,
            nativePushTokenType: result.nativePushTokenType,
          });
          if (result.nativePushToken) {
            Intercom.sendTokenToIntercom(result.nativePushToken);
            console.log("Push token sent to Intercom", result.nativePushToken);
          }
          // TODO: Send tokens to backend when endpoint is available
          // hcb.post("user/push_tokens", {
          //   json: {
          //     expo_push_token: result.expoPushToken,
          //   },
          // });
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

  const linking: LinkingOptions<TabParamList> = useMemo(
    () => ({
      prefixes: [
        Linking.createURL("/"),
        "https://bank.hackclub.com",
        "https://hcb.hackclub.com",
        "http://bank.hackclub.com",
        "http://hcb.hackclub.com",
      ],
      config: {
        screens: {
          Home: {
            initialRouteName: "Organizations",
            screens: {
              Invitation: "invites/:inviteId",
              Transaction: {
                path: "hcb/:transactionId/:attachReceipt?",
                parse: {
                  transactionId: (id) => `txn_${id}`,
                  attachReceipt: (attachReceipt) => attachReceipt,
                },
              },
              Event: ":orgId",
            },
          },
          Cards: {
            initialRouteName: "CardList",
            screens: {
              CardList: "my/cards",
              Card: {
                path: "stripe_cards/:cardId",
                parse: { cardId: (id: string) => id },
              },
              GrantCard: {
                path: "grants/:grantId",
                parse: { grantId: (id: string) => id },
              },
            },
          },
          Receipts: "my/inbox",
        },
      },
      getStateFromPath: (path, options) => {
        if (path.includes("dataUrl=hcbShareKey")) {
          return undefined;
        }
        if (
          path.startsWith("/branding") ||
          path.startsWith("/security") ||
          path.startsWith("/roles") ||
          path.startsWith("/wrapped") ||
          path.startsWith("/mobile") ||
          path.startsWith("/applications")
        ) {
          Linking.openURL(new URL(path, "https://hcb.hackclub.com").toString());
          return undefined;
        }
        return getStateFromPath(path, options);
      },
      getInitialURL: async () => {
        if (isUniversalLinkingEnabled === null) {
          await new Promise((resolve) => {
            const check = setInterval(() => {
              if (isUniversalLinkingEnabled !== null) {
                clearInterval(check);
                resolve(undefined);
              }
            }, 50);
          });
        }

        const url = await Linking.getInitialURL();
        if (url && isUniversalLinkingEnabled === false) {
          Linking.openURL(url).catch((err) =>
            console.error("Failed to open URL in browser", err, {
              context: { url },
            }),
          );
          return null;
        }
        return url;
      },
      subscribe: (listener) => {
        const subscription = Linking.addEventListener("url", ({ url }) => {
          if (url && !isUniversalLinkingEnabled) {
            Linking.openURL(url).catch((err) =>
              console.error("Failed to open URL in browser", err, {
                context: { url },
              }),
            );
          } else {
            listener(url);
          }
        });
        return () => {
          subscription.remove();
        };
      },
    }),
    [isUniversalLinkingEnabled],
  );

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

  if (!appIsReady) {
    return null;
  }

  return (
    <SafeAreaProvider>
      <SafeAreaView
        edges={Platform.OS == "android" ? ["bottom"] : []}
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
                      console.log(
                        `Global retry for ${key} (attempt ${retryCount + 1})`,
                      );
                      revalidate({ retryCount });
                    }, timeout);
                  },
                  onSuccess: (_data, key) => {
                    if (__DEV__) {
                      console.log(`Successfully fetched: ${key}`);
                    }
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
                        <BlurView
                          intensity={20}
                          style={{
                            height: insets.top,
                            position: "absolute",
                            top: 0,
                            left: 0,
                            width: "100%",
                            zIndex: 1,
                          }}
                        />
                        <Tabs
                          ref={navigationRef}
                          screenOptions={{
                            headerShown: false,
                            tabBarStyle: DEFAULT_BOTTOM_NAV_STYLE,
                          }}
                          screenListeners={{
                            tabPress: () =>
                              Haptics.impactAsync(
                                Haptics.ImpactFeedbackStyle.Rigid,
                              ),
                          }}
                        >
                          <Tabs.Screen
                            name="(events)"
                            options={{
                              title: "Home",
                              tabBarAccessibilityLabel: "Home Tab",
                              tabBarIcon: ({ color }) => (
                                <Icon glyph="home" size={28} color={color} />
                              ),
                            }}
                          />
                          <Tabs.Screen
                            name="cards"
                            options={{
                              title: "Cards",
                              tabBarAccessibilityLabel: "Cards Tab",
                              tabBarIcon: ({ color }) => (
                                <Icon glyph="card" size={28} color={color} />
                              ),
                            }}
                          />
                          <Tabs.Screen
                            name="receipts"
                            options={{
                              title: "Receipts",
                              tabBarAccessibilityLabel: "Receipts Tab",
                              tabBarIcon: ({ color }) => (
                                <Icon
                                  glyph="payment-docs"
                                  size={28}
                                  color={color}
                                />
                              ),
                            }}
                          />
                          <Tabs.Screen
                            name="settings"
                            options={{
                              title: "Settings",
                              tabBarAccessibilityLabel: "Settings Tab",
                              tabBarIcon: ({ color }) => (
                                <Icon
                                  glyph="settings"
                                  size={28}
                                  color={color}
                                />
                              ),
                            }}
                          />
                        </Tabs>
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
