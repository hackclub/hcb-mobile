import { Navbar } from "components/Navbar";
import { Stack } from "expo-router";

import { TabBarStyling } from "../../../components/TabBarStyling";

export default function Layout() {
  return (
    <>
      <Stack screenOptions={{ header: Navbar }}>
        <Stack.Screen name="index" options={{ headerShown: false, title: "" }} />
        <Stack.Screen
          name="selection"
          options={{
            presentation: "modal",
            title: "Select Receipts",
            headerShown: false,
            animation: "slide_from_bottom",
          }}
        />
      </Stack>
      <TabBarStyling />
    </>
  );
}
