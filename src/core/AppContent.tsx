import { ActionSheetProvider } from "@expo/react-native-action-sheet";
import AsyncStorage from "@react-native-async-storage/async-storage";
import {
  NavigationContainer,
  LinkingOptions,
  NavigationContainerRef,
} from "@react-navigation/native";
import { StripeTerminalProvider } from "@stripe/stripe-terminal-react-native";
import * as Linking from "expo-linking";
import * as LocalAuthentication from "expo-local-authentication";
import * as SplashScreen from "expo-splash-screen";
import { StatusBar } from "expo-status-bar";
import * as SystemUI from "expo-system-ui";
import {
  useRef,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
} from "react";
import {
  ColorSchemeName,
  View,
  ActivityIndicator,
  Platform,
} from "react-native";
import { AlertNotificationRoot } from "react-native-alert-notification";
import { GestureHandlerRootView } from "react-native-gesture-handler";
import { SafeAreaProvider, SafeAreaView } from "react-native-safe-area-context";
import { SWRConfig } from "swr";

import { routingInstrumentation } from "../../App";
import AuthContext from "../auth/auth";
import SentryUserBridge from "../components/core/SentryUserBridge";
import useClient from "../lib/client";
import { TabParamList } from "../lib/NavigatorParamList";
import { useIsDark } from "../lib/useColorScheme";
import {
  resetStripeTerminalInitialization,
  useStripeTerminalInit,
} from "../lib/useStripeTerminalInit";
import Login from "../pages/login";
import { CacheProvider } from "../providers/cacheProvider";
import { useLinkingPref } from "../providers/LinkingContext";
import { useThemeContext } from "../providers/ThemeContext";
import { lightTheme, theme } from "../styles/theme";
import { getStateFromPath } from "../utils/getStateFromPath";

import { navRef } from "./navigationRef";
import Navigator from "./Navigator";

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

export default function AppContent({
  scheme,
  cache,
}: {
  scheme: ColorSchemeName;
  cache: CacheProvider;
}) {
  const { tokens, refreshAccessToken } = useContext(AuthContext);
  const { theme: themePref } = useThemeContext();
  const { enabled: isUniversalLinkingEnabled } = useLinkingPref();
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [appIsReady, setAppIsReady] = useState(false);
  const isDark = useIsDark();
  const navigationRef = useRef<NavigationContainerRef<TabParamList>>(null);
  const isBiometricAuthInProgress = useRef(false);
  const hcb = useClient();

  useEffect(() => {
    resetStripeTerminalInitialization();
    setTokenFetchAttempts(0);
    setLastTokenFetch(0);
    setCachedToken(null);
    setTokenExpiry(0);
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

    // Return cached token if it's still valid
    if (cachedToken && now < tokenExpiry) {
      console.log("Using cached Stripe Terminal connection token");
      return cachedToken;
    }

    // Check if we should actually fetch the token
    // Only fetch if the user is authenticated and has access token
    if (!tokens?.accessToken) {
      console.log(
        "No access token available, skipping Stripe Terminal token fetch",
      );
      throw new Error("Authentication required for Stripe Terminal connection");
    }

    // Check rate limiting
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
      console.log("Fetching new Stripe Terminal connection token...");
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

      // Cache the token
      setCachedToken(newToken);
      setTokenExpiry(newExpiry);
      setTokenFetchAttempts(0);

      console.log(
        "Successfully fetched and cached Stripe Terminal connection token",
      );
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

  // Sentry user binding must occur within SWRConfig provider. We'll mount a child component later.

  const onNavigationReady = useCallback(() => {
    navRef.current = navigationRef.current;
    routingInstrumentation.registerNavigationContainer(navigationRef);
  }, []);

  useEffect(() => {
    const setStatusBar = async () => {
      await SystemUI.setBackgroundColorAsync(isDark ? "#252429" : "#fff");
    };
    setStatusBar();
    const checkAuth = async () => {
      if (tokens?.accessToken) {
        if (__DEV__) {
          // bypass auth for development
          setIsAuthenticated(true);
          setAppIsReady(true);
          return;
        }
        try {
          const biometricsRequired = await AsyncStorage.getItem(
            "biometrics_required",
          );

          if (biometricsRequired !== "true") {
            console.log("Biometric authentication not required, bypassing...");
            setIsAuthenticated(true);
            setAppIsReady(true);
            return;
          }

          // Check if biometric authentication is available
          const hasHardware = await LocalAuthentication.hasHardwareAsync();
          const isEnrolled = await LocalAuthentication.isEnrolledAsync();

          if (!hasHardware || !isEnrolled) {
            console.log("Biometric authentication not available, bypassing...");
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
            setIsAuthenticated(true);
          } else {
            console.error(
              "Biometric authentication failed",
              new Error(result.error || "Authentication failed"),
              {
                context: { action: "biometric_auth", errorType: result.error },
              },
            );
            setIsAuthenticated(false);
          }
          setAppIsReady(true);
          isBiometricAuthInProgress.current = false;
        } catch (error) {
          console.error("Biometric authentication error", error, {
            context: { action: "biometric_auth" },
          });
          setIsAuthenticated(false);
          setAppIsReady(true);
          isBiometricAuthInProgress.current = false;
        }
      } else {
        console.log("No access token, skipping biometric authentication");
        setIsAuthenticated(true);
        setAppIsReady(true);
      }
    };

    checkAuth();
  }, [tokens?.accessToken]);

  useEffect(() => {
    if (tokens) {
      const now = Date.now();
      if (tokens.expiresAt <= now + 5 * 60 * 1000) {
        refreshAccessToken().catch((error) => {
          console.error("Failed to preemptively refresh token", error);
        });
      }
    } else {
      console.log("Token state updated - user is logged out");
    }
  }, [refreshAccessToken, tokens]);

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
                path: "hcb/:transactionId",
                parse: {
                  transactionId: (id) => `txn_${id}`,
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
          path.startsWith("/roles")
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
                  revalidateOnFocus: true,
                  revalidateOnReconnect: true,
                  dedupingInterval: 2000,
                  shouldRetryOnError: true,
                  keepPreviousData: true,
                  errorRetryCount: 3,
                  errorRetryInterval: 1000,
                }}
              >
                <SentryUserBridge />
                <ActionSheetProvider>
                  <AlertNotificationRoot theme={isDark ? "dark" : "light"}>
                    <NavigationContainer
                      ref={navigationRef}
                      theme={navTheme}
                      linking={linking}
                      onReady={onNavigationReady}
                    >
                      {tokens?.accessToken && isAuthenticated ? (
                        <Navigator />
                      ) : (
                        <Login />
                      )}
                    </NavigationContainer>
                  </AlertNotificationRoot>
                </ActionSheetProvider>
              </SWRConfig>
            </GestureHandlerRootView>
          </View>
        </StripeTerminalProvider>
      </SafeAreaView>
    </SafeAreaProvider>
  );
}
