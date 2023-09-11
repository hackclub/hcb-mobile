import Ionicons from "@expo/vector-icons/Ionicons";
import { createBottomTabNavigator } from "@react-navigation/bottom-tabs";
import { NavigationContainer } from "@react-navigation/native";
import { createNativeStackNavigator } from "@react-navigation/native-stack";
import { BlurView } from "expo-blur";
import * as SecureStorage from "expo-secure-store";
import { useState, useEffect } from "react";
import { Text, View, Image, Button, StyleSheet } from "react-native";
import { SWRConfig, useSWRConfig } from "swr";

import AuthContext from "./src/auth";
import { StackParamList, TabParamList } from "./src/lib/NavigatorParamList";
import CardsPage from "./src/pages/cards";
import Home from "./src/pages/index";
import Login from "./src/pages/login";
import Organization from "./src/pages/organization";
import { palette, theme } from "./src/theme";

const Stack = createNativeStackNavigator<StackParamList>();
const Tab = createBottomTabNavigator<TabParamList>();

export default function App() {
  const [isSignedIn, setIsSignedIn] = useState<boolean | null>(null);
  const [token, setToken] = useState<string | null>(null);

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
                let iconName: React.ComponentProps<typeof Ionicons>["name"];

                if (route.name === "Home") {
                  iconName = focused ? "home" : "home-outline";
                } else if (route.name === "Cards") {
                  iconName = focused ? "card" : "card-outline";
                } else if (route.name === "Receipts") {
                  iconName = focused ? "receipt" : "receipt-outline";
                } else if (route.name === "Settings") {
                  iconName = focused ? "settings" : "settings-outline";
                } else {
                  throw new Error("unknown route name");
                }

                return <Ionicons name={iconName} size={size} color={color} />;
              },
              headerStyle: { backgroundColor: palette.background },
              tabBarStyle: { position: "absolute" },
              tabBarBackground: () => (
                <BlurView
                  tint="dark"
                  intensity={100}
                  style={StyleSheet.absoluteFill}
                />
              ),
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
                              fontWeight: "600",
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
              {() => <Text>receipts!</Text>}
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
