import { useNavigation, usePathname } from "expo-router";
import { useEffect } from "react";

export function TabBarStyling({ enabledPage }: { enabledPage?: string }) {
  const navigation = useNavigation();
  const pathname = usePathname();

  useEffect(() => {
    if (!enabledPage) return;
    if (pathname !== enabledPage)
      navigation.setOptions({ tabBarStyle: { display: "none" } });
    return () => navigation.setOptions({ tabBarStyle: undefined });
  }, [pathname, navigation, enabledPage]);

  return null;
}
