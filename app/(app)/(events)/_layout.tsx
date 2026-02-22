import { Navbar } from "components/Navbar";
import { TabBarStyling } from "components/TabBarStyling";
import { router, Stack } from "expo-router";
import { useContext, useEffect } from "react";

import AuthContext from "@/auth/auth";

function AuthRedirect() {
  const { tokenResponse } = useContext(AuthContext);

  useEffect(() => {
    if (!tokenResponse)
      router.replace("/login")

  }, [tokenResponse]);

  return null;
}

export default function Layout() {
  return (
    <>
      <AuthRedirect />
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
          name="[id]/transactions/[transactionId]"
          options={{ title: "Transaction" }}
        />
        <Stack.Screen
          name="[id]/transactions/[transactionId]/rename"
          options={{ title: "Rename transaction" }}
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
