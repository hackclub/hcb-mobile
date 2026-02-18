import { Slot, Stack } from "expo-router";

export default function Layout() {
  return (
    <Stack>
      <Stack.Screen name="index" options={{ headerShown: false, title: "" }} />
      <Stack.Screen
        name="[id]/transactions"
        options={{ title: "Transactions" }}
      />
    </Stack>
  );
}
