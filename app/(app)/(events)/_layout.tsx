import { Navbar } from "components/Navbar";
import { Stack } from "expo-router";

import { TabBarStyling } from "../../../components/TabBarStyling";

export default function Layout() {
  return (
    <>
      <Stack screenOptions={{ header: Navbar }}>
        <Stack.Screen
          name="index"
          options={{ headerShown: false, title: "" }}
        />
        <Stack.Screen
          name="[id]/transactions"
          options={{ title: "Transactions" }}
        />
        <Stack.Screen
          name="[id]/transaction/[transactionId]"
          options={{ title: "Transaction" }}
        />
        <Stack.Screen
          name="[id]/account-numbers"
          options={{ title: "Account numbers" }}
        />
      </Stack>
      <TabBarStyling enabledPage="/" />
    </>
  );
}
