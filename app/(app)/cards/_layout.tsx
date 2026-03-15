import { Stack } from "expo-router";

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
        name="card-grants/[id]"
        options={{ title: "Grant Card" }}
      />
      <Stack.Screen
        name="transactions/[transactionId]"
        options={{ title: "Transaction" }}
      />
      <Stack.Screen
        name="order/[id]"
        options={{ title: "Order a Card" }}
      />
    </Stack>
  );
}
