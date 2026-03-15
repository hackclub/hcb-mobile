import { Ionicons } from "@expo/vector-icons";
import { router, Stack } from "expo-router";
import { useContext, useEffect } from "react";
import { Pressable } from "react-native";

import AuthContext from "@/auth/auth";

function AuthRedirect() {
  const { tokenResponse } = useContext(AuthContext);

  useEffect(() => {
    if (!tokenResponse) router.replace("/login");
  }, [tokenResponse]);

  return null;
}

export default function Layout() {
  return (
    <>
      <AuthRedirect />
      <Stack
        screenOptions={{
          headerTransparent: true,
          headerBlurEffect: "none",
          headerShadowVisible: false,
          headerLargeTitleShadowVisible: false,
          headerLargeStyle: { backgroundColor: "transparent" },
          headerBackButtonDisplayMode: "minimal",
        }}
      >
        <Stack.Screen
          name="index"
          options={{ title: "Organizations", headerLargeTitle: true }}
        />
        <Stack.Screen name="[id]/index" options={{ title: "" }} />
        <Stack.Screen name="[id]/team" options={{ title: "Team" }} />
        <Stack.Screen
          name="[id]/transfer"
          options={{ title: "Transfer Money" }}
        />
        <Stack.Screen
          name="[id]/cards/order"
          options={{ title: "Order a Card" }}
        />
        <Stack.Screen
          name="[id]/transactions/index"
          options={{ title: "Transactions" }}
        />
        <Stack.Screen
          name="[id]/transactions/[transactionId]/index"
          options={{ title: "Transaction" }}
        />
        <Stack.Screen
          name="[id]/transactions/[transactionId]/rename"
          options={{ title: "Rename Transaction" }}
        />
        <Stack.Screen
          name="[id]/account-numbers"
          options={{
            presentation: "formSheet",
            title: "Account Numbers",
            headerShown: true,
            headerTransparent: false,
            headerBlurEffect: "systemMaterial",
            sheetAllowedDetents: [0.5, 1.0],
            sheetGrabberVisible: true,
            sheetCornerRadius: 20,
            headerRight: () => (
              <Pressable onPress={() => router.back()} hitSlop={8}>
                <Ionicons name="close" size={28} color="#8e8e93" />
              </Pressable>
            ),
          }}
        />
        <Stack.Screen
          name="[id]/donations/index"
          options={{ title: "Collect Donations" }}
        />
        <Stack.Screen
          name="[id]/donations/new"
          options={{ title: "New Donation" }}
        />
        <Stack.Screen
          name="[id]/donations/process"
          options={{ presentation: "modal", title: "Process Donation" }}
        />
        <Stack.Screen
          name="invitation/[id]"
          options={{ title: "Invitation" }}
        />
      </Stack>
    </>
  );
}
