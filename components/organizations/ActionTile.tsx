import Icon from "@thedev132/hackclub-icons-rn";
import { useTheme } from "expo-router/react-navigation";
import { ColorValue, Pressable, View } from "react-native";

import { Text } from "@/components/Text";
import { useIsDark } from "@/lib/useColorScheme";
import { cardBorderColor, subTextColor } from "@/styles/theme";

interface ActionTileProps {
  icon: React.ComponentProps<typeof Icon>["glyph"];
  label: string;
  onPress: () => void;
  /** Greys the tile out, makes it non-interactive, and replaces the label
   *  with "Coming soon". */
  comingSoon?: boolean;
}

export default function ActionTile({
  icon,
  label,
  onPress,
  comingSoon = false,
}: ActionTileProps) {
  const { colors: themeColors } = useTheme();
  const isDark = useIsDark();
  const contentColor = comingSoon
    ? subTextColor(isDark)
    : (themeColors.text as ColorValue);
  return (
    <Pressable
      onPress={onPress}
      disabled={comingSoon}
      style={({ pressed }) => ({
        flex: 1,
        backgroundColor: themeColors.card,
        borderRadius: 8,
        borderWidth: 1,
        borderColor: cardBorderColor(isDark),
        paddingVertical: 18,
        paddingHorizontal: 14,
        gap: 10,
        opacity: pressed ? 0.6 : 1,
      })}
    >
      <View
        style={{
          width: 36,
          height: 36,
          borderRadius: 8,
          backgroundColor: isDark
            ? "rgba(255,255,255,0.07)"
            : "rgba(0,0,0,0.05)",
          alignItems: "center",
          justifyContent: "center",
        }}
      >
        <Icon glyph={icon} size={20} color={contentColor as string} />
      </View>
      <Text
        style={{
          color: contentColor,
          fontSize: 15,
          fontWeight: "600",
        }}
      >
        {comingSoon ? "Coming soon" : label}
      </Text>
    </Pressable>
  );
}
