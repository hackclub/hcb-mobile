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
        options={{ title: "Settings", headerLargeTitle: true }}
      />
      <Stack.Screen name="app-icon" options={{ title: "App Icon" }} />
      <Stack.Screen name="deep-linking" options={{ title: "Deep Linking" }} />
      <Stack.Screen name="tutorials" options={{ title: "Tutorials" }} />
      <Stack.Screen name="about" options={{ title: "About" }} />
    </Stack>
  );
}
