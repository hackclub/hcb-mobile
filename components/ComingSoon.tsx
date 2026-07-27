import Icon from "@thedev132/hackclub-icons-rn";
import { useTheme } from "expo-router/react-navigation";
import { Platform, View } from "react-native";

import { Text } from "@/components/Text";
import { useIsDark } from "@/lib/useColorScheme";
import { palette } from "@/styles/theme";

interface ComingSoonProps {
  icon?: React.ComponentProps<typeof Icon>["glyph"];
  title?: string;
  description?: string;
}

export default function ComingSoon({
  icon = "clock",
  title = "Coming soon",
  description = "This feature isn't ready yet.\nCheck back in a future update.",
}: ComingSoonProps) {
  const { colors: themeColors } = useTheme();
  const isDark = useIsDark();

  const iconBgColor = isDark
    ? "rgba(255, 255, 255, 0.05)"
    : "rgba(0, 0, 0, 0.03)";
  const mutedColor = isDark ? "#6b7280" : palette.muted;

  return (
    <View
      style={{
        flex: 1,
        alignItems: "center",
        justifyContent: "center",
        padding: 32,
        backgroundColor: themeColors.background,
      }}
    >
      <View
        style={{
          width: 80,
          height: 80,
          borderRadius: 40,
          backgroundColor: iconBgColor,
          alignItems: "center",
          justifyContent: "center",
          marginBottom: 20,
          ...(Platform.OS === "ios" && {
            shadowColor: "#000",
            shadowOffset: { width: 0, height: 2 },
            shadowOpacity: isDark ? 0.2 : 0.05,
            shadowRadius: 8,
          }),
        }}
      >
        <Icon glyph={icon} color={mutedColor} size={36} />
      </View>
      <Text
        style={{
          color: themeColors.text,
          fontSize: 20,
          fontWeight: "700",
          marginBottom: 8,
          letterSpacing: -0.3,
        }}
      >
        {title}
      </Text>
      <Text
        style={{
          color: mutedColor,
          textAlign: "center",
          fontSize: 15,
          lineHeight: 22,
        }}
      >
        {description}
      </Text>
    </View>
  );
}
