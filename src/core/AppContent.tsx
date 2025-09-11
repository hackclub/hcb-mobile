import { ActionSheetProvider } from "@expo/react-native-action-sheet";
import { Ionicons } from "@expo/vector-icons";
import {
  NavigationContainer,
  LinkingOptions,
  NavigationContainerRef,
} from "@react-navigation/native";
import { StripeTerminalProvider } from "@stripe/stripe-terminal-react-native";
import * as Linking from "expo-linking";
import * as LocalAuthentication from "expo-local-authentication";
import * as QuickActions from "expo-quick-actions";
import * as SplashScreen from "expo-splash-screen";
import { StatusBar } from "expo-status-bar";
import * as SystemUI from "expo-system-ui";
import * as Updates from "expo-updates";
import {
  useRef,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
} from "react";
import { ColorSchemeName, View, Text, ActivityIndicator } from "react-native";
import { AlertNotificationRoot } from "react-native-alert-notification";
import { GestureHandlerRootView } from "react-native-gesture-handler";
import {
  SafeAreaProvider,
  useSafeAreaInsets,
} from "react-native-safe-area-context";
import { SWRConfig } from "swr";

import AuthContext from "../auth/auth";
import useClient from "../lib/client";
import { logCriticalError, logError } from "../lib/errorUtils";
import { TabParamList } from "../lib/NavigatorParamList";
import { useIsDark } from "../lib/useColorScheme";
import { useOffline } from "../lib/useOffline";
import { resetStripeTerminalInitialization } from "../lib/useStripeTerminalInit";
import Login from "../pages/login";
import { CacheProvider } from "../providers/cacheProvider";
import { useLinkingPref } from "../providers/LinkingContext";
import { useThemeContext } from "../providers/ThemeContext";
import { lightTheme, palette, theme } from "../styles/theme";
import { getStateFromPath } from "../utils/getStateFromPath";

import { navRef } from "./navigationRef";
import Navigator from "./Navigator";

function OfflineBanner() {
  const insets = useSafeAreaInsets();
  const { isOnline } = useOffline();

  if (isOnline) return null;

  return (
    <View
      style={{
        position: "absolute",
        zIndex: 999,
        width: "100%",
        alignItems: "center",
        pointerEvents: "none",
        top: insets.top + 6,
      }}
    >
      <View
        style={{
          flexDirection: "row",
          alignItems: "center",
          backgroundColor: theme.dark
            ? palette.darkless
            : lightTheme.colors.card,
          paddingVertical: 8,
          paddingHorizontal: 16,
          borderRadius: 20,
          shadowColor: "#000",
          shadowOffset: {
            width: 0,
            height: 3,
          },
          shadowOpacity: 0.2,
          shadowRadius: 5,
          elevation: 6,
        }}
      >
        <Ionicons
          name="cloud-offline-outline"
          size={18}
          color={palette.primary}
        />
        <Text
          style={{
            color: palette.primary,
            fontWeight: "bold",
            marginLeft: 8,
            fontSize: 15,
          }}
        >
          Offline Mode
        </Text>
      </View>
    </View>
  );
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
  const [finishedUpdateCheck, setFinishedUpdateCheck] = useState(false);
  const isDark = useIsDark();
  const navigationRef = useRef<NavigationContainerRef<TabParamList>>(null);
  const hcb = useClient();

  // Reset Stripe Terminal initialization state on app start
  useEffect(() => {
    resetStripeTerminalInitialization();
  }, []);

  const [lastTokenFetch, setLastTokenFetch] = useState<number>(0);
  const [tokenFetchAttempts, setTokenFetchAttempts] = useState<number>(0);
  const TOKEN_FETCH_COOLDOWN = 5000;
  const MAX_TOKEN_FETCH_ATTEMPTS = 3;

  const fetchTokenProvider = async (): Promise<string> => {
    const now = Date.now();

    if (now - lastTokenFetch < TOKEN_FETCH_COOLDOWN) {
      throw new Error(
        `Rate limited: Please wait ${Math.ceil((TOKEN_FETCH_COOLDOWN - (now - lastTokenFetch)) / 1000)} seconds before retrying`,
      );
    }

    if (tokenFetchAttempts >= MAX_TOKEN_FETCH_ATTEMPTS) {
      throw new Error(
        `Maximum token fetch attempts (${MAX_TOKEN_FETCH_ATTEMPTS}) exceeded. Please restart the app.`,
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

      setTokenFetchAttempts(0);

      return token.terminal_connection_token.secret;
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
  }, []);

  // Handle quick action routing
  useEffect(() => {
    const subscription = QuickActions.addListener((action) => {
      if (action?.params?.href && navRef.current) {
        // Use the navigation reference to navigate to the specified href
        const href = action.params.href as string;
        if (href === "/cards") {
          navRef.current.navigate("Cards", {
            screen: "CardList",
          });
        } else if (href === "/receipts") {
          navRef.current.navigate("Receipts");
        } else if (href === "/settings") {
          navRef.current.navigate("Settings");
        } else {
          navRef.current.navigate("Home", {
            screen: "Event",
            params: { orgId: href.replace("/", "") as `org_${string}` },
          });
        }
      }
    });

    return () => subscription?.remove();
  }, []);

  useEffect(() => {
    const setStatusBar = async () => {
      await SystemUI.setBackgroundColorAsync(isDark ? "#252429" : "#F6F6F6");
    };
    setStatusBar();
    const checkAuth = async () => {
      if (tokens?.accessToken) {
        if ((await process.env.EXPO_PUBLIC_APP_VARIANT) === "development") {
          // bypass auth for development
          setIsAuthenticated(true);
          setAppIsReady(true);
          return;
        }
        try {
          // Check if biometric authentication is available
          const hasHardware = await LocalAuthentication.hasHardwareAsync();
          const isEnrolled = await LocalAuthentication.isEnrolledAsync();

          if (!hasHardware || !isEnrolled) {
            console.log("Biometric authentication not available, bypassing...");
            setIsAuthenticated(true);
            setAppIsReady(true);
            return;
          }

          const result = await LocalAuthentication.authenticateAsync({
            promptMessage: "Authenticate to access HCB",
            cancelLabel: "Cancel",
            fallbackLabel: "Use passcode",
            disableDeviceFallback: false,
          });

          if (result.success) {
            setIsAuthenticated(true);
          } else {
            logError(
              "Biometric authentication failed",
              new Error(result.error || "Authentication failed"),
              {
                context: { action: "biometric_auth", errorType: result.error },
              },
            );
            setIsAuthenticated(false);
          }
        } catch (error) {
          logError("Biometric authentication error", error, {
            context: { action: "biometric_auth" },
          });
          setIsAuthenticated(false);
        }
      } else {
        console.log("No access token, skipping biometric authentication");
        setIsAuthenticated(true);
      }
      setAppIsReady(true);
    };

    checkAuth();
  }, [isDark, tokens?.accessToken]);

  useEffect(() => {
    if (tokens) {
      const now = Date.now();
      if (tokens.expiresAt <= now + 5 * 60 * 1000) {
        refreshAccessToken().catch((error) => {
          logError("Failed to preemptively refresh token", error, {
            shouldReportToSentry: true,
          });
        });
      }
    } else {
      console.log("Token state updated - user is logged out");
    }
  }, [refreshAccessToken, tokens]);

  useEffect(() => {
    const handleUpdates = async () => {
      try {
        const availableUpdate = await Updates.checkForUpdateAsync();

        if (availableUpdate.isAvailable) {
          Updates.fetchUpdateAsync().catch((error) => {
            logError("Failed to download update in background", error, {
              shouldReportToSentry: true,
            });
          });
        }

        setFinishedUpdateCheck(true);
      } catch (error) {
        logCriticalError(`Error handling updates: ${error}`, error, {
          context: { action: "handle_updates" },
        });
        setFinishedUpdateCheck(true);
      }
    };

    handleUpdates();
  }, []);

  const onLayoutRootView = useCallback(() => {
    if (appIsReady && finishedUpdateCheck) {
      SplashScreen.hide();
    }
  }, [appIsReady, finishedUpdateCheck]);

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
            logError("Failed to open URL in browser", err, {
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
              logError("Failed to open URL in browser", err, {
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
    <StripeTerminalProvider tokenProvider={fetchTokenProvider}>
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
            }}
          >
            <SafeAreaProvider>
              <ActionSheetProvider>
                <AlertNotificationRoot theme={isDark ? "dark" : "light"}>
                  <NavigationContainer
                    ref={navigationRef}
                    theme={navTheme}
                    linking={linking}
                    onReady={onNavigationReady}
                  >
                    <OfflineBanner />
                    {tokens?.accessToken && isAuthenticated ? (
                      <Navigator />
                    ) : (
                      <Login />
                    )}
                  </NavigationContainer>
                </AlertNotificationRoot>
              </ActionSheetProvider>
            </SafeAreaProvider>
          </SWRConfig>
        </GestureHandlerRootView>
      </View>
    </StripeTerminalProvider>
  );
}
