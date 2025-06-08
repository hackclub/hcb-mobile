import { ActionSheetProvider } from "@expo/react-native-action-sheet";
import { Ionicons } from "@expo/vector-icons";
import { NavigationContainer, LinkingOptions } from "@react-navigation/native";
import * as Linking from "expo-linking";
import { useContext, useEffect, useMemo } from "react";
import {
  StatusBar,
  ColorSchemeName,
  View,
  Text,
  ActivityIndicator,
} from "react-native";
import { AlertNotificationRoot } from "react-native-alert-notification";
import {
  SafeAreaProvider,
  useSafeAreaInsets,
} from "react-native-safe-area-context";
import { SWRConfig } from "swr";

import AuthContext from "./auth";
import { CacheProvider } from "./cacheProvider";
import { getStateFromPath } from "./getStateFromPath";
import useClient from "./lib/client";
import { TabParamList } from "./lib/NavigatorParamList";
import { useOffline } from "./lib/useOffline";
import { LinkingProvider, useLinkingPref } from "./LinkingContext";
import Navigator from "./Navigator";
import Login from "./pages/login";
import { lightTheme, palette, theme } from "./theme";
import { useThemeContext } from "./ThemeContext";

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

export default function AppContent({
  scheme,
  cache,
}: {
  scheme: ColorSchemeName;
  cache: CacheProvider;
}) {
  return (
    <LinkingProvider>
      <InnerAppContent scheme={scheme} cache={cache} />
    </LinkingProvider>
  );
}

function InnerAppContent({
  scheme,
  cache,
}: {
  scheme: ColorSchemeName;
  cache: CacheProvider;
}) {
  const { tokens, refreshAccessToken } = useContext(AuthContext);
  const hcb = useClient();
  const { theme: themePref } = useThemeContext();
  const { enabled: isUniversalLinkingEnabled } = useLinkingPref();

  useEffect(() => {
    if (tokens) {
      console.log("Token state updated - user is authenticated");
      const now = Date.now();
      if (tokens.expiresAt <= now + 5 * 60 * 1000) {
        refreshAccessToken().catch(error => {
          console.error("Failed to preemptively refresh token:", error);
        });
      }
    } else {
      console.log("Token state updated - user is logged out");
    }
  }, [tokens]);

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
            },
          },
          Receipts: "my/inbox",
        },
      },
      getStateFromPath: (path, options) => {
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
            console.error("Failed to open URL in browser:", err),
          );
          return null;
        }
        return url;
      },
      subscribe: (listener) => {
        const subscription = Linking.addEventListener("url", ({ url }) => {
          if (url && !isUniversalLinkingEnabled) {
            Linking.openURL(url).catch((err) =>
              console.error("Failed to open URL in browser:", err),
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

  return (
    <>
      <StatusBar
        barStyle={
          themePref === "dark" || (themePref === "system" && scheme == "dark")
            ? "light-content"
            : "dark-content"
        }
        backgroundColor={palette.background}
      />

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
            <AlertNotificationRoot>
              <NavigationContainer theme={navTheme} linking={linking}>
                <OfflineBanner />
                {tokens?.accessToken ? <Navigator /> : <Login />}
              </NavigationContainer>
            </AlertNotificationRoot>
          </ActionSheetProvider>
        </SafeAreaProvider>
      </SWRConfig>
    </>
  );
}
