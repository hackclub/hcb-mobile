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
        <Stack.Screen name="app-icon" options={{ title: "App Icon" }} />
        <Stack.Screen name="deep-linking" options={{ title: "Deep Linking" }} />
        <Stack.Screen name="tutorials" options={{ title: "Tutorials" }} />
        <Stack.Screen name="about" options={{ title: "About" }} />
      </Stack>
      <TabBarStyling enabledPage="/settings" />
    </>
  );
}
