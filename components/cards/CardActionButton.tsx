import Icon from "@thedev132/hackclub-icons-rn";
import { useTheme } from "expo-router/react-navigation";
import { ComponentProps } from "react";
import {
  ActivityIndicator,
  Pressable,
  StyleProp,
  ViewStyle,
} from "react-native";

import { Text } from "@/components/Text";
import { useIsDark } from "@/lib/useColorScheme";
import { cardBorderColor, palette } from "@/styles/theme";

export default function CardActionButton({
  icon,
  label,
  onPress,
  loading,
  destructive,
  style,
}: {
  icon: ComponentProps<typeof Icon>["glyph"];
  label: string;
  onPress?: () => void;
  loading?: boolean;
  destructive?: boolean;
  style?: StyleProp<ViewStyle>;
}) {
  const { colors: themeColors } = useTheme();
  const isDark = useIsDark();
  const color = destructive ? palette.primary : (themeColors.text as string);

  return (
    <Pressable
      onPress={onPress}
      disabled={loading}
      style={({ pressed }) => [
        {
          flexDirection: "row",
          alignItems: "center",
          justifyContent: "center",
          gap: 8,
          backgroundColor: themeColors.card,
          borderWidth: 1,
          borderColor: cardBorderColor(isDark),
          borderRadius: 8,
          paddingVertical: 12,
          paddingHorizontal: 14,
          opacity: pressed ? 0.6 : 1,
        },
        style,
      ]}
    >
      {loading ? (
        <ActivityIndicator size="small" color={color} />
      ) : (
        <Icon glyph={icon} size={20} color={color} />
      )}
      <Text style={{ fontSize: 16, fontWeight: "600", color }}>{label}</Text>
    </Pressable>
  );
}
