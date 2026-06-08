import { useTheme } from "expo-router/react-navigation";
import Icon from "@thedev132/hackclub-icons-rn";
import { Pressable, View } from "react-native";

import { Text } from "@/components/Text";
import { useIsDark } from "@/lib/useColorScheme";
import { cardBorderColor } from "@/styles/theme";

interface ActionTileProps {
  icon: string;
  label: string;
  onPress: () => void;
}

export default function ActionTile({ icon, label, onPress }: ActionTileProps) {
  const { colors: themeColors } = useTheme();
  const isDark = useIsDark();
  return (
    <Pressable
      onPress={onPress}
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
        <Icon glyph={icon} size={20} color={themeColors.text} />
      </View>
      <Text
        style={{
          color: themeColors.text,
          fontSize: 15,
          fontWeight: "600",
        }}
      >
        {label}
      </Text>
    </Pressable>
  );
}
