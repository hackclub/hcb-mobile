import { Ionicons } from "@expo/vector-icons";
import { createBottomTabNavigator } from "@react-navigation/bottom-tabs";
import { createNativeStackNavigator } from "@react-navigation/native-stack";
import { BlurView } from "expo-blur";
import { useContext } from "react";
import { View, Button, StyleSheet } from "react-native";
import useSWR from "swr";

import AuthContext from "./auth";
import OrganizationTitle from "./components/organizations/OrganizationTitle";
import {
  StackParamList,
  CardsStackParamList,
  ReceiptsStackParamList,
  TabParamList,
} from "./lib/NavigatorParamList";
import { PaginatedResponse } from "./lib/types/HcbApiObject";
import Invitation from "./lib/types/Invitation";
import CardPage from "./pages/card";
import CardsPage from "./pages/cards";
import Home from "./pages/index";
import InvitationPage from "./pages/Invitation";
import OrganizationPage from "./pages/organization";
import ReceiptsPage from "./pages/Receipts";
import TransactionPage from "./pages/Transaction";
import { palette } from "./theme";

const Stack = createNativeStackNavigator<StackParamList>();
const CardsStack = createNativeStackNavigator<CardsStackParamList>();
const ReceiptsStack = createNativeStackNavigator<ReceiptsStackParamList>();

const Tab = createBottomTabNavigator<TabParamList>();

export default function Navigator() {
  const { setToken } = useContext(AuthContext);
  const { data: missingReceiptData } = useSWR<PaginatedResponse<never>>(
    `/user/transactions/missing_receipt`,
  );
  const { data: invitations } = useSWR<Invitation[]>(`/user/invitations`);

  return (
    <Tab.Navigator
      screenOptions={({ route }) => ({
        tabBarBadgeStyle: { backgroundColor: palette.primary },
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
        headerShown: false,
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
        options={{ tabBarBadge: invitations?.length || undefined }}
      >
        {() => (
          <Stack.Navigator
            screenOptions={{
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
              name="Invitation"
              component={InvitationPage}
              options={{
                presentation: "modal",
                headerShown: false,
              }}
            />
            <Stack.Screen
              name="Event"
              options={({ route }) => ({
                headerTitle: () => <OrganizationTitle {...route.params} />,
                title: route.params.organization.name,
                headerBackTitle: "Back",
              })}
              component={OrganizationPage}
            />
            <Stack.Screen
              options={{ headerBackTitle: "Back" }}
              name="Transaction"
              component={TransactionPage}
            />
          </Stack.Navigator>
        )}
      </Tab.Screen>
      <Tab.Screen name="Cards">
        {() => (
          <CardsStack.Navigator>
            <CardsStack.Screen
              name="CardList"
              component={CardsPage}
              options={{ title: "Cards" }}
            />
            <CardsStack.Screen
              name="Card"
              component={CardPage}
              options={({ route }) => ({
                title: `Card ····${route.params.last4}`,
              })}
            />
          </CardsStack.Navigator>
        )}
      </Tab.Screen>
      <Tab.Screen
        name="Receipts"
        options={{
          tabBarBadge: missingReceiptData?.total_count || undefined,
        }}
      >
        {() => (
          <ReceiptsStack.Navigator>
            <ReceiptsStack.Screen
              name="MissingReceiptList"
              options={{ title: "Missing Receipts" }}
              component={ReceiptsPage}
            />
          </ReceiptsStack.Navigator>
        )}
      </Tab.Screen>
      <Tab.Screen name="Settings" options={{ headerShown: true }}>
        {() => (
          <View>
            <Button title="log out" onPress={() => setToken("")} />
          </View>
        )}
      </Tab.Screen>
    </Tab.Navigator>
  );
}
