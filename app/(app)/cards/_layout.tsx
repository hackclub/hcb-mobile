import { Ionicons } from "@expo/vector-icons";
import { router, Stack } from "expo-router";
import { Pressable } from "react-native";

export default function Layout() {
  return (
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
        options={{ title: "Cards", headerLargeTitle: true }}
      />
      <Stack.Screen name="[id]" options={{ title: "Card" }} />
      <Stack.Screen
        name="card-grants/[id]/index"
        options={{ title: "Grant Card" }}
      />
      <Stack.Screen
        name="card-grants/[id]/manage"
        options={{
          presentation: "formSheet",
          title: "Manage Grant",
          headerShown: true,
          headerTransparent: false,
          headerBlurEffect: "systemMaterial",
          sheetAllowedDetents: [0.75, 1.0],
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
        name="transactions/[transactionId]"
        options={{ title: "Transaction" }}
      />
      <Stack.Screen name="order/index" options={{ title: "Order a Card" }} />
      <Stack.Screen name="order/[id]" options={{ title: "Order a Card" }} />
    </Stack>
  );
}
