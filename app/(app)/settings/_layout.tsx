import { Navbar } from "components/Navbar";
import { Stack, useNavigation, usePathname } from "expo-router";
import { useEffect } from "react";

function TabBarStyling() {
  const navigation = useNavigation();
  const pathname = usePathname();

  useEffect(() => {
    if (pathname !== "/settings")
      navigation.setOptions({ tabBarStyle: { display: "none" } });
    return () => navigation.setOptions({ tabBarStyle: { display: "flex" } });
  }, [pathname, navigation]);

  return null;
}

export default function Layout() {
  return (
    <>
      <Stack
        screenOptions={{
          header: (t) => <Navbar t={t} />,
        }}
      >
        <Stack.Screen
          name="index"
          options={{ headerShown: false, title: "" }}
        />
        <Stack.Screen name="[id]" options={{ title: "Transactions" }} />
      </Stack>
      <TabBarStyling />
    </>
  );
}
