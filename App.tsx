import "expo-dev-client";
import { ActionSheetProvider } from "@expo/react-native-action-sheet";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { LinkingOptions, NavigationContainer } from "@react-navigation/native";
import { useFonts } from "expo-font";
import * as Linking from "expo-linking";
import * as SecureStorage from "expo-secure-store";
import { useState, useEffect, useCallback } from "react";
import { AppState, StatusBar, useColorScheme } from "react-native";
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
  const [fontsLoaded] = useFonts({
    "JetBrainsMono-Regular": require("./assets/fonts/JetBrainsMono-Regular.ttf"),
    "JetBrainsMono-Bold": require("./assets/fonts/JetBrainsMono-Bold.ttf"),
  });

  const [isLoading, setIsLoading] = useState(true);
  const [token, setToken] = useState<string | null>(null);
  const [provider, setProvider] = useState<Map<string, any> | null>(null);
  const hcb = useClient(token);
  const scheme = useColorScheme();

  const fetcher = useCallback(
    async (url: string) => {
      try {
        return await hcb(url).json();
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

  useEffect(() => {
    const initializeProvider = async () => {
      const map = new Map();
      try {
        const appCache = await AsyncStorage.getItem('app-cache');
        if (appCache) {
          JSON.parse(appCache).forEach(([key, value]: [string, any]) => {
            map.set(key, value);
          });
        }
        setProvider(map);
      } catch (error) {
        console.error('Error initializing asyncStorageProvider:', error);
      }
    };

    initializeProvider();
  }, []);

  const saveAppCache = useCallback(async () => {
    if (provider) {
      try {
        const appCache = JSON.stringify(Array.from(provider.entries()));
        await AsyncStorage.setItem('app-cache', appCache);
      } catch (error) {
        console.error('Error saving asyncStorageProvider cache:', error);
      }
    }
  }, [provider]);

  useEffect(() => {
    const handleAppStateChange = (nextAppState: string) => {
      if (nextAppState === 'background' || nextAppState === 'inactive') {
        saveAppCache();
      }
    };

    const appStateListener = AppState.addEventListener('change', handleAppStateChange);

    return () => {
      appStateListener.remove();
    };
  }, [saveAppCache]);

  if (!provider || !fontsLoaded || isLoading) {
    return null; // Or a loading spinner if desired
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
            <NavigationContainer
              theme={scheme == "dark" ? theme : lightTheme}
              linking={linking}
            >
              <Navigator />
            </NavigationContainer>
          </ActionSheetProvider>
        </SafeAreaProvider>
      </SWRConfig>
    </AuthContext.Provider>
  );
}
