import "expo-dev-client";

import {
  getStateFromPath,
  LinkingOptions,
  NavigationContainer,
} from "@react-navigation/native";
import * as Linking from "expo-linking";
import * as SecureStorage from "expo-secure-store";
import { useState, useEffect } from "react";
import { StatusBar, useColorScheme } from "react-native";
import { SafeAreaProvider } from "react-native-safe-area-context";
import { SWRConfig } from "swr";

import AuthContext from "./src/auth";
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
    },
  },
  getStateFromPath(path, options) {
    console.log(path);
    const orgMatch = path.match(/^\/?([^/#]+)(?:#([a-zA-Z0-9]+))?$/);
    if (orgMatch) {
      const [, orgId, transactionId] = orgMatch;
      if (transactionId) {
        return {
          routes: [
            {
              name: "Home",
              state: {
                routes: [
                  { name: "Organizations" },
                  { name: "Event", params: { orgId } },
                  {
                    name: "Transaction",
                    params: { transactionId: `txn_${transactionId}`, orgId },
                  },
                ],
              },
            },
          ],
        };
      } else {
        return {
          routes: [
            {
              name: "Home",
              state: {
                routes: [
                  { name: "Organizations" },
                  { name: "Event", params: { orgId } },
                ],
              },
            },
          ],
        };
      }
    }
    return getStateFromPath(path, options);
  },
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
