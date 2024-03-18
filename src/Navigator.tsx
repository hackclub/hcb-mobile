import { Ionicons } from "@expo/vector-icons";
import { createBottomTabNavigator } from "@react-navigation/bottom-tabs";
import { useTheme } from "@react-navigation/native";
import { createNativeStackNavigator } from "@react-navigation/native-stack";
import { BlurView } from "expo-blur";
import * as WebBrowser from "expo-web-browser";
import { StyleSheet, useColorScheme } from "react-native";
import useSWR, { useSWRConfig } from "swr";

// import OrganizationTitle from "./components/organizations/OrganizationTitle";
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
import AccountNumberPage from "./pages/organization/AccountNumber";
import ReceiptsPage from "./pages/Receipts";
import RenameTransactionPage from "./pages/RenameTransaction";
import SettingsPage from "./pages/Settings";
import TransactionPage from "./pages/Transaction";
import { palette } from "./theme";

const Stack = createNativeStackNavigator<StackParamList>();
const CardsStack = createNativeStackNavigator<CardsStackParamList>();
const ReceiptsStack = createNativeStackNavigator<ReceiptsStackParamList>();

const Tab = createBottomTabNavigator<TabParamList>();

export default function Navigator() {
  const { data: missingReceiptData } = useSWR<PaginatedResponse<never>>(
    `/user/transactions/missing_receipt`,
  );
  const { data: invitations } = useSWR<Invitation[]>(`/user/invitations`);

  const scheme = useColorScheme();
  const { colors: themeColors } = useTheme();

  const { mutate } = useSWRConfig();

  return (
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
        // headerStyle: { backgroundColor: themeColors.background },
        headerShown: false,
        tabBarStyle: { position: "absolute" },
        tabBarBackground: () => (
          <BlurView
            tint={scheme == "dark" ? "dark" : "light"}
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
                title: "Home",
                headerLargeTitle: true,
                headerRight: () => (
                  <Ionicons.Button
                    name="add-circle-outline"
                    backgroundColor="transparent"
                    size={24}
                    underlayColor={themeColors.card}
                    color={palette.primary}
                    iconStyle={{ marginRight: 0 }}
                    onPress={() =>
                      WebBrowser.openBrowserAsync(
                        "https://hackclub.com/hcb/apply",
                        {
                          presentationStyle:
                            WebBrowser.WebBrowserPresentationStyle.POPOVER,
                          controlsColor: palette.primary,
                          dismissButtonStyle: "cancel",
                        },
                      ).then(() => {
                        mutate("/user/organizations");
                        mutate("/user/invitations");
                      })
                    }
                  />
                ),
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
                // headerTitle: () => <OrganizationTitle {...route.params} />,
                title: route.params.organization?.name || "Organization",
                headerBackTitle: "Back",
              })}
              component={OrganizationPage}
            />
            <Stack.Screen
              name="AccountNumber"
              component={AccountNumberPage}
              options={{ presentation: "modal", title: "Account Details" }}
            />
            <Stack.Screen
              options={{ headerBackTitle: "Back" }}
              name="Transaction"
              component={TransactionPage}
            />
            <Stack.Screen
              name="RenameTransaction"
              component={RenameTransactionPage}
              options={{
                presentation: "modal",
                title: "Edit Transaction Description",
              }}
            />
          </Stack.Navigator>
        )}
      </Tab.Screen>
      <Tab.Screen name="Cards" options={{ tabBarLabel: "Wallet" }}>
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
                title: `Card ····${route.params.card.last4}`,
              })}
            />
            <Stack.Screen
              options={{ headerBackTitle: "Back" }}
              name="Transaction"
              component={TransactionPage}
            />
            <Stack.Screen
              name="RenameTransaction"
              component={RenameTransactionPage}
              options={{
                presentation: "modal",
                title: "Edit Transaction Description",
              }}
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
      <Tab.Screen
        name="Settings"
        options={{ headerShown: true }}
        component={SettingsPage}
      />
    </Tab.Navigator>
  );
}
