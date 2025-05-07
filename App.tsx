import "expo-dev-client";

import { ActionSheetProvider } from "@expo/react-native-action-sheet";
import { LinkingOptions, NavigationContainer } from "@react-navigation/native";
import * as Sentry from "@sentry/react-native";
import { useStripeTerminal } from "@stripe/stripe-terminal-react-native";
import { useFonts } from "expo-font";
import * as Linking from "expo-linking";
import * as SecureStorage from "expo-secure-store";
import { useState, useEffect, useCallback } from "react";
import { StatusBar, useColorScheme } from "react-native";
import { AlertNotificationRoot } from "react-native-alert-notification";
import { SafeAreaProvider } from "react-native-safe-area-context";
import { SWRConfig } from "swr";

import AuthContext from "./src/auth";
import asyncStorageProvider from "./src/cacheProvider";
import { getStateFromPath } from "./src/getStateFromPath";
import useClient from "./src/lib/client";
import { TabParamList } from "./src/lib/NavigatorParamList";
import Navigator from "./src/Navigator";
import Login from "./src/pages/login";
import { lightTheme, palette, theme } from "./src/theme";

const linking: LinkingOptions<TabParamList> = {
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
  getStateFromPath,
};

function App() {
  const [fontsLoaded] = useFonts({
    "JetBrainsMono-Regular": require("./assets/fonts/JetBrainsMono-Regular.ttf"),
    "JetBrainsMono-Bold": require("./assets/fonts/JetBrainsMono-Bold.ttf"),
    "Consolas-Bold": require("./assets/fonts/CONSOLAB.ttf"),
    Damion: require("./assets/fonts/Damion-Regular.ttf"),
  });

  const [isLoading, setIsLoading] = useState(true);
  const [token, setToken] = useState<string | null>(null);
  const hcb = useClient(token);
  const scheme = useColorScheme();
  useStripeTerminal();

  Sentry.init({
    dsn: process.env.SENTRY_DSN,
    debug: true,
  });

  const fetcher = useCallback(
    async (url: string, options: RequestInit) => {
      try {
        // Allows us to use the v3 API in the v4 SWR
        return await hcb(url, options).json();
      } catch (error) {
        if (
          error.name === "HTTPError" &&
          (await error.response.json()).error === "invalid_auth"
        ) {
          setToken("");
        } else {
          throw error;
        }
      }
    },
    [hcb],
  );

  useEffect(() => {
    (async () => {
      const token = await SecureStorage.getItemAsync("token");
      setToken(token);
      setIsLoading(false);
    })();
  }, []);

  useEffect(() => {
    if (typeof token == "string") SecureStorage.setItemAsync("token", token);
  }, [token]);

  if (!fontsLoaded || isLoading) {
    return null;
  } else if (!token) {
    return (
      <AuthContext.Provider value={{ token, setToken }}>
        <Login />
      </AuthContext.Provider>
    );
  }

  return (
    <AuthContext.Provider value={{ token, setToken }}>
      <StatusBar
        barStyle={scheme == "dark" ? "light-content" : "dark-content"}
        backgroundColor={palette.background}
      />

      <SWRConfig
        value={{
          provider: asyncStorageProvider,
          fetcher,
        }}
      >
        <SafeAreaProvider>
          <ActionSheetProvider>
            <AlertNotificationRoot>
              <NavigationContainer
                theme={scheme == "dark" ? theme : lightTheme}
                linking={linking}
              >
                <Navigator />
              </NavigationContainer>
            </AlertNotificationRoot>
          </ActionSheetProvider>
        </SafeAreaProvider>
      </SWRConfig>
    </AuthContext.Provider>
  );
}

export default Sentry.wrap(App);
