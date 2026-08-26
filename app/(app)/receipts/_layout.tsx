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
        options={{ title: "Receipts", headerLargeTitle: true }}
      />
      <Stack.Screen
        name="transactions/[transactionId]"
        options={{ title: "Transaction" }}
      />
    </Stack>
  );
}
