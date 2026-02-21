import { BlurView } from "expo-blur";
import { useNavigation, usePathname } from "expo-router";
import { useEffect } from "react";
import { useSafeAreaInsets } from "react-native-safe-area-context";

export const DEFAULT_BOTTOM_NAV_STYLE = {
  zIndex: 99,
  backgroundColor: "transparent",
  display: "flex",
  position: "absolute",
  bottom: 0,
  left: 0,
};

export function TabBarStyling({ enabledPage }: { enabledPage: string }) {
  const navigation = useNavigation();
  const pathname = usePathname();
  const insets = useSafeAreaInsets();

  useEffect(() => {
    if (pathname !== enabledPage)
      navigation.setOptions({ tabBarStyle: { display: "none" } });
    return () =>
      navigation.setOptions({ tabBarStyle: DEFAULT_BOTTOM_NAV_STYLE });
  }, [pathname, navigation, enabledPage]);

  return (
    pathname === enabledPage && (
      <BlurView
        style={{
          pointerEvents: "none",
          height: insets.bottom + 50,
          position: "absolute",
          bottom: 0,
          left: 0,
          width: "100%",
          zIndex: 1,
        }}
      />
    )
  );
}
