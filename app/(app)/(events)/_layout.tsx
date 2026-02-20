import { Navbar } from "components/Navbar";
import { Stack, useNavigation, usePathname } from "expo-router";
import { useEffect } from "react";

function TabBarStyling() {
  const navigation = useNavigation();
  const pathname = usePathname();

  useEffect(() => {
    if (pathname !== "/")
      navigation.setOptions({ tabBarStyle: { display: "none" } });
    return () => navigation.setOptions({ tabBarStyle: { display: "flex" } });
  }, [pathname, navigation]);

  return null;
}

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
      </Stack>
      <TabBarStyling />
    </>
  );
}
