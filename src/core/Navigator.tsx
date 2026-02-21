import { Ionicons } from "@expo/vector-icons";
import { createBottomTabNavigator } from "@react-navigation/bottom-tabs";
import { CommonActions, useTheme } from "@react-navigation/native";
import { createNativeStackNavigator } from "@react-navigation/native-stack";
import Icon from "@thedev132/hackclub-icons-rn";
import { BlurView } from "expo-blur";
import * as WebBrowser from "expo-web-browser";
import { useEffect } from "react";
import { Platform, StyleSheet } from "react-native";
import useSWR, { useSWRConfig } from "swr";

import About from "@/app/(app)/settings/About";
import AccountNumberPage from "../../app/(app)/(events)/[id]/account-numbers";
import CardPage from "../../app/(app)/cards/[id]";
import ReceiptsPage from "../../app/(app)/receipts";
import { navRef } from "../core/navigationRef";
import {
  CardsStackParamList,
  ReceiptsStackParamList,
  SettingsStackParamList,
  StackParamList,
  TabParamList,
} from "../lib/NavigatorParamList";
import { PaginatedResponse } from "../lib/types/HcbApiObject";
import Invitation from "../lib/types/Invitation";
import { useIsDark } from "../lib/useColorScheme";
import CardsPage from "../pages/cards";
import GrantCardPage from "../pages/cards/GrantCard";
import OrderCardPage from "../pages/cards/OrderCard";
import Home from "../pages/index";
import InvitationPage from "../pages/Invitation";
import OrganizationPage from "../pages/organization";
import OrganizationDonationPage from "../pages/organization/Donation";
import NewDonationPage from "../pages/organization/NewDonation";
import ProcessDonationPage from "../pages/organization/ProcessDonation";
import OrganizationTeamPage from "../pages/organization/Team";
import TransferPage from "../pages/organization/transfer";
import ReceiptSelectionModal from "../pages/ReceiptSelectionModal";
import RenameTransactionPage from "../pages/RenameTransaction";
import AppIconSelector from "../pages/settings/AppIconSelector";
import DeepLinkingSettings from "../pages/settings/DeepLinkingSettings";
import SettingsPage from "../pages/settings/Settings";
import Tutorials from "../pages/settings/Tutorials";
import ShareIntentModal from "../pages/ShareIntentModal";
import TransactionPage from "../pages/Transaction";
import { useShareIntentContext } from "../providers/ShareIntentContext";
import { palette } from "../styles/theme";
import * as Haptics from "../utils/haptics";

const Stack = createNativeStackNavigator<StackParamList>();
const CardsStack = createNativeStackNavigator<CardsStackParamList>();
const ReceiptsStack = createNativeStackNavigator<ReceiptsStackParamList>();
const SettingsStack = createNativeStackNavigator<SettingsStackParamList>();

const Tab = createBottomTabNavigator<TabParamList>();

export default function Navigator() {
  const { data: missingReceiptData } = useSWR<PaginatedResponse<never>>(
    `user/transactions/missing_receipt`,
  );
  const { data: invitations } = useSWR<Invitation[]>(`user/invitations`);

  const { colors: themeColors } = useTheme();

  const { mutate } = useSWRConfig();
  const isDark = useIsDark();

  const { pendingShareIntent, clearPendingShareIntent, hasPendingShareIntent } =
    useShareIntentContext();

  useEffect(() => {
    if (
      hasPendingShareIntent &&
      pendingShareIntent &&
      navRef.current &&
      navRef.current.isReady()
    ) {
      navRef.current.navigate("Home", {
        screen: "ShareIntentModal",
        params: pendingShareIntent as StackParamList["ShareIntentModal"],
      });
      clearPendingShareIntent();
    }
  }, [hasPendingShareIntent, pendingShareIntent, clearPendingShareIntent]);

  return (
    <Tab.Navigator
      screenOptions={({ route }) => ({
        tabBarIcon: ({ color, size }) => {
          let iconName: React.ComponentProps<typeof Icon>["glyph"];

          if (route.name === "Home") {
            iconName = "home";
            size = 30;
          } else if (route.name === "Cards") {
            iconName = "card";
            size = 28;
          } else if (route.name === "Receipts") {
            iconName = "payment-docs";
            size = 28;
          } else if (route.name === "Settings") {
            iconName = "settings";
            size = 36;
          }

          return <Icon glyph={iconName} size={size} color={color} />;
        },
        tabBarAccessibilityLabel:
          route.name === "Home"
            ? "Home tab"
            : route.name === "Cards"
              ? "Cards tab"
              : route.name === "Receipts"
                ? "Receipts tab"
                : route.name === "Settings"
                  ? "Settings tab"
                  : undefined,
        // headerStyle: { backgroundColor: themeColors.background },
        headerShown: false,
        ...(Platform.OS === "android"
          ? {
            tabBarStyle: {
              position: "absolute",
              paddingBottom: 5,
              height: 50,
              elevation: 0,
            },
          }
          : {
            tabBarStyle: {
              position: "absolute",
            },
          }),
        tabBarHideOnKeyboard: true,
        tabBarBackground: () =>
          Platform.OS === "ios" ? (
            <BlurView
              tint={isDark ? "dark" : "light"}
              intensity={100}
              style={StyleSheet.absoluteFill}
              experimentalBlurMethod="dimezisBlurView"
            />
          ) : null,
      })}
      screenListeners={({ navigation, route }) => ({
        tabPress: (e) => {
          // Add haptic feedback for all tab presses
          Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Rigid);

          if (route.name === "Home") {
            const state = navigation.getState();
            const currentTab = state.routes[state.index];

            if (currentTab.name === "Home" && currentTab.state) {
              const homeStackState = currentTab.state;
              if (
                (homeStackState.index && homeStackState.index > 0) ||
                homeStackState.routes[homeStackState.index ?? 0].name !==
                "Organizations"
              ) {
                e.preventDefault();
                navigation.dispatch(
                  CommonActions.reset({
                    index: 0,
                    routes: [
                      {
                        name: "Home",
                        state: {
                          routes: [{ name: "Organizations" }],
                          index: 0,
                        },
                      },
                    ],
                  }),
                );
              }
            }
          }
        },
      })}
    >
      <Tab.Screen
        name="Home"
        options={{
          tabBarBadge: invitations?.length || undefined,
          tabBarLabel: "Home",
        }}
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
                headerTransparent: Platform.OS === "ios",
                headerRight: () => (
                  <Ionicons.Button
                    name="add-circle-outline"
                    backgroundColor="transparent"
                    size={24}
                    underlayColor={themeColors.card}
                    color={themeColors.text}
                    iconStyle={{ marginRight: 0 }}
                    accessibilityLabel="Apply for new organization"
                    accessibilityHint="Opens the HCB application form in browser"
                    accessibilityRole="button"
                    onPress={() => {
                      WebBrowser.openBrowserAsync(
                        "https://hackclub.com/hcb/apply",
                        {
                          presentationStyle:
                            WebBrowser.WebBrowserPresentationStyle.POPOVER,
                          controlsColor: palette.primary,
                          dismissButtonStyle: "cancel",
                        },
                      ).then(() => {
                        mutate("user/organizations");
                        mutate("user/invitations");
                      });
                    }}
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
              name="OrganizationTeam"
              component={OrganizationTeamPage}
              options={{
                headerBackTitle: "Back",
                title: "Team",
              }}
            />
            <Stack.Screen
              name="OrganizationDonation"
              component={OrganizationDonationPage}
              options={{
                headerBackTitle: "Back",
                title: "Collect Donations",
              }}
            />
            <Stack.Screen
              name="NewDonation"
              component={NewDonationPage}
              options={{
                headerBackTitle: "Back",
                title: "New Donation",
              }}
            />
            <Stack.Screen
              name="ProcessDonation"
              component={ProcessDonationPage}
              options={{
                presentation: "modal",
                title: "Process Donation",
                headerTitle: "Process Donation",
              }}
            />
            <Stack.Screen
              options={({ route }) => ({
                headerBackTitle: "Back",
                title: route.params?.title || "Transaction",
              })}
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
            <Stack.Screen
              name="Transfer"
              component={TransferPage}
              options={{
                presentation: "modal",
                title: "Send Transfer",
              }}
            />
            <Stack.Screen
              name="GrantCard"
              component={GrantCardPage}
              options={() => ({ title: "Grant Card" })}
            />
            <Stack.Screen
              name="ShareIntentModal"
              component={ShareIntentModal}
              options={{
                presentation: "modal",
                title: "Assign Receipts",
                headerShown: false,
                animation: "slide_from_bottom",
              }}
            />
          </Stack.Navigator>
        )}
      </Tab.Screen>
      <Tab.Screen name="Cards" options={{ tabBarLabel: "Cards" }}>
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
              options={() => ({ title: "Card" })}
            />
            <CardsStack.Screen
              name="GrantCard"
              component={GrantCardPage}
              options={() => ({ title: "Card" })}
            />
            <CardsStack.Screen
              name="OrderCard"
              component={OrderCardPage}
              options={{
                presentation: "card",
                headerShown: true,
                title: "Order a Card",
                headerBackTitle: "Cards",
                headerShadowVisible: false,
                headerTransparent: true,
              }}
            />
            <Stack.Screen
              options={({ route }) => ({
                headerBackTitle: "Back",
                title: route.params?.title || "Transaction",
              })}
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
          tabBarLabel: "Receipts",
        }}
      >
        {() => (
          <ReceiptsStack.Navigator>
            <ReceiptsStack.Screen
              name="MissingReceiptList"
              options={{ title: "Missing Receipts" }}
              component={ReceiptsPage}
            />
            <ReceiptsStack.Screen
              name="ReceiptSelectionModal"
              component={ReceiptSelectionModal}
              options={{
                presentation: "modal",
                title: "Select Receipts",
                headerShown: false,
                animation: "slide_from_bottom",
              }}
            />
            <ReceiptsStack.Screen
              name="ReceiptTransaction"
              component={TransactionPage}
              options={({ route }) => ({
                headerBackTitle: "Back",
                title:
                  (route.params as { title?: string })?.title || "Transaction",
              })}
            />
          </ReceiptsStack.Navigator>
        )}
      </Tab.Screen>
      <Tab.Screen
        name="Settings"
        options={{
          headerShown: false,
          tabBarLabel: "Settings",
        }}
      >
        {() => (
          <SettingsStack.Navigator>
            <SettingsStack.Screen
              name="SettingsMain"
              component={SettingsPage}
              options={{ title: "Settings" }}
            />
            <SettingsStack.Screen
              name="AppIconSelector"
              component={AppIconSelector}
              options={{ title: "App Icon" }}
            />
            <SettingsStack.Screen
              name="DeepLinkingSettings"
              component={DeepLinkingSettings}
              options={{ title: "Deep Linking" }}
            />
            <SettingsStack.Screen
              name="Tutorials"
              component={Tutorials}
              options={{ title: "Tutorials" }}
            />
            <SettingsStack.Screen
              name="About"
              component={About}
              options={{ title: "About" }}
            />
          </SettingsStack.Navigator>
        )}
      </Tab.Screen>
    </Tab.Navigator>
  );
}
