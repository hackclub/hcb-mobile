import { NavigationContainer, DarkTheme } from "@react-navigation/native";
import { createNativeStackNavigator } from "@react-navigation/native-stack";
import {
  Text,
  View,
  Image,
  Button,
  PlatformColor,
  StyleSheet,
} from "react-native";
import Ionicons from "@expo/vector-icons/Ionicons";
import { useState, useEffect } from "react";
import * as SecureStorage from "expo-secure-store";
import AuthContext from "./src/auth";
import { SWRConfig, useSWRConfig } from "swr";
import { BlurView } from "expo-blur";

import Login from "./src/pages/login";
import Home from "./src/pages/index";
import { palette, theme } from "./src/theme";
import { createBottomTabNavigator } from "@react-navigation/bottom-tabs";
import Organization from "./src/pages/organization";
import CardsPage from "./src/pages/cards";

const Stack = createNativeStackNavigator();
const Tab = createBottomTabNavigator();

export default function App() {
  const [isSignedIn, setIsSignedIn] = useState(null);
  const [token, setToken] = useState(null);

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
      <SWRConfig
        value={{
          fetcher: (url) =>
            fetch(process.env.EXPO_PUBLIC_API_BASE + url, {
              headers: { Authorization: `Bearer ${token}` },
            }).then((res) => res.json()),
        }}
      >
        <NavigationContainer theme={theme}>
          <Tab.Navigator
            screenOptions={({ route }) => ({
              tabBarIcon: ({ focused, color, size }) => {
                let iconName;

                if (route.name === "Home") {
                  iconName = focused ? "home" : "home-outline";
                } else if (route.name === "Cards") {
                  iconName = focused ? "card" : "card-outline";
                } else if (route.name === "Receipts") {
                  iconName = focused ? "receipt" : "receipt-outline";
                } else if (route.name === "Settings") {
                  iconName = focused ? "settings" : "settings-outline";
                }

                return <Ionicons name={iconName} size={size} color={color} />;
              },
              headerStyle: { backgroundColor: palette.background },
              // tabBarStyle: { position: "absolute" },
              // tabBarBackground: () => (
              //   <BlurView
              //     tint="dark"
              //     intensity={100}
              //     style={StyleSheet.absoluteFill}
              //   />
              // ),
            })}
          >
            <Tab.Screen
              name="Home"
              options={{
                headerShown: false,
              }}
            >
              {() => (
                <Stack.Navigator
                  screenOptions={{
                    headerStyle: { backgroundColor: palette.background },
                    headerLargeTitleShadowVisible: false,
                  }}
                >
                  <Stack.Screen
                    name="Organizations"
                    component={Home}
                    options={{
                      headerLargeTitle: true,
                    }}
                  />
                  <Stack.Screen
                    name="Event"
                    options={({ route }) => ({
                      headerTitle: ({ children }) => (
                        <View
                          style={{ flexDirection: "row", alignItems: "center" }}
                        >
                          {route.params.image && (
                            <Image
                              source={{ uri: route.params.image }}
                              style={{ marginRight: 10, borderRadius: 4 }}
                              width={25}
                              height={25}
                            />
                          )}
                          <Text
                            style={{
                              color: palette.smoke,
                              fontWeight: 600,
                              fontSize: 17,
                            }}
                          >
                            {children}
                          </Text>
                        </View>
                      ),
                      title: route.params.title,
                      headerBackTitle: "Back",
                    })}
                    component={Organization}
                  />
                </Stack.Navigator>
              )}
            </Tab.Screen>
            <Tab.Screen name="Cards" component={CardsPage} />
            <Tab.Screen name="Receipts">
              {(props) => <Text>receipts!</Text>}
            </Tab.Screen>
            <Tab.Screen name="Settings">
              {() => {
                const { mutate } = useSWRConfig();

                return (
                  <View>
                    <Button title="log out" onPress={() => setToken("")} />
                    <Button
                      title="clear cache"
                      onPress={() =>
                        mutate(() => true, undefined, { revalidate: false })
                      }
                    />
                  </View>
                );
              }}
            </Tab.Screen>
          </Tab.Navigator>
        </NavigationContainer>
      </SWRConfig>
    </AuthContext.Provider>
  );
}
