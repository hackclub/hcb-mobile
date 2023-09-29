import "expo-dev-client";

import { NavigationContainer } from "@react-navigation/native";
import * as SecureStorage from "expo-secure-store";
import { useState, useEffect } from "react";
import { StatusBar, useColorScheme } from "react-native";
import { SafeAreaProvider } from "react-native-safe-area-context";
import { SWRConfig } from "swr";

import AuthContext from "./src/auth";
import Navigator from "./src/Navigator";
import Login from "./src/pages/login";
import { lightTheme, palette, theme } from "./src/theme";

export default function App() {
  const [isSignedIn, setIsSignedIn] = useState<boolean | null>(null);
  const [token, setToken] = useState<string | null>(null);

  const scheme = useColorScheme();

  useEffect(() => {
    (async () => {
      const token = await SecureStorage.getItemAsync("token");
      setToken(token);
    })();
  }, []);

  useEffect(() => {
    setIsSignedIn(!!token);
    if (typeof token == "string") SecureStorage.setItemAsync("token", token);
  }, [token]);

  if (isSignedIn === null) {
    return null;
  } else if (!isSignedIn) {
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
            }).then((res) => res.json()),
        }}
      >
        <SafeAreaProvider>
          <NavigationContainer theme={scheme == "dark" ? theme : lightTheme}>
            <Navigator />
          </NavigationContainer>
        </SafeAreaProvider>
      </SWRConfig>
    </AuthContext.Provider>
  );
}
