import { router, usePathname } from "expo-router";
import { useTheme } from "expo-router/react-navigation";
import { useEffect } from "react";
import { ActivityIndicator, View } from "react-native";

import Button from "@/components/Button";
import { Text } from "@/components/Text";
import { openOnWebsite } from "@/utils/handoff";

export default function NotFound() {
  const { colors: themeColors } = useTheme();
  const pathname = usePathname();

  useEffect(() => {
    openOnWebsite(pathname).then(() => {
      if (router.canGoBack()) router.back();
      else router.replace("/");
    });
  }, [pathname]);

  return (
    <View
      style={{
        flex: 1,
        backgroundColor: themeColors.background,
        justifyContent: "center",
        alignItems: "center",
        padding: 24,
        gap: 16,
      }}
    >
      <ActivityIndicator />
      <Text style={{ color: themeColors.text, textAlign: "center" }}>
        Opening in your browser…
      </Text>
      <Button
        onPress={() => openOnWebsite(pathname)}
        style={{ marginTop: 8 }}
      >
        Open manually
      </Button>
    </View>
  );
}
