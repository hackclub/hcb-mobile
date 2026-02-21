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
        <Stack.Screen name="[id]" options={{ title: "Transactions" }} />
      </Stack>
      <TabBarStyling enabledPage="/cards" />
    </>
  );
}
