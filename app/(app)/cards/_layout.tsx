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
        <Stack.Screen name="[id]" options={{ title: "Card" }} />
        <Stack.Screen
          name="card-grants/[id]"
          options={{ title: "Grant Card" }}
        />
      </Stack>
      <TabBarStyling enabledPage="/cards" />
    </>
  );
}
