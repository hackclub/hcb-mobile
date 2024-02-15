import "expo-dev-client";

import { LinkingOptions, NavigationContainer } from "@react-navigation/native";
import * as Linking from "expo-linking";
import * as SecureStorage from "expo-secure-store";
import { useState, useEffect } from "react";
import { StatusBar, useColorScheme } from "react-native";
import { SafeAreaProvider } from "react-native-safe-area-context";
import { SWRConfig } from "swr";

import AuthContext from "./src/auth";
import { getStateFromPath } from "./src/getStateFromPath";
import { TabParamList } from "./src/lib/NavigatorParamList";
import Navigator from "./src/Navigator";
import Login from "./src/pages/login";
import { lightTheme, palette, theme } from "./src/theme";

const linking: LinkingOptions<TabParamList> = {
  prefixes: [
    Linking.createURL("/"),
    "https://bank.hackclub.com",
    "https://hcb.hackclub.com",
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
        },
      },
      Cards: {
        initialRouteName: "CardList",
        screens: {
          CardList: "my/cards",
        },
      },
    },
  },
  getStateFromPath,
};

export default function App() {
  const [isLoading, setIsLoading] = useState(true);
  const [token, setToken] = useState<string | null>(null);

  const scheme = useColorScheme();

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

  if (isLoading) {
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
          fetcher: (url) =>
            fetch(process.env.EXPO_PUBLIC_API_BASE + url, {
              headers: { Authorization: `Bearer ${token}` },
            })
              .then((res) => {
                if (!res.ok) {
                  throw res;
                }
                return res;
              })
              .then((res) => res.json())
              .then((res) => {
                if (res.error === "invalid_auth") {
                  // OAuth token either expired or was revoked
                  setToken("");
                  return;
                }
                return res;
              }),
        }}
      >
        <SafeAreaProvider>
          <NavigationContainer
            theme={scheme == "dark" ? theme : lightTheme}
            linking={linking}
          >
            <Navigator />
          </NavigationContainer>
        </SafeAreaProvider>
      </SWRConfig>
    </AuthContext.Provider>
  );
}
