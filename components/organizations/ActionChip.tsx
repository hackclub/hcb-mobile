import { useTheme } from "expo-router/react-navigation";
import Icon from "@thedev132/hackclub-icons-rn";
import { Pressable } from "react-native";

import { Text } from "@/components/Text";
import { palette } from "@/styles/theme";

interface ActionChipProps {
  icon: string;
  label: string;
  onPress: () => void;
}

export default function ActionChip({ icon, label, onPress }: ActionChipProps) {
  const { colors: themeColors } = useTheme();
  return (
    <Pressable
      onPress={onPress}
      style={({ pressed }) => ({
        flexDirection: "row",
        alignItems: "center",
        gap: 6,
        backgroundColor: themeColors.card,
        paddingVertical: 10,
        paddingHorizontal: 14,
        borderRadius: 12,
        opacity: pressed ? 0.6 : 1,
      })}
    >
      <Icon glyph={icon} size={16} color={palette.muted} />
      <Text
        style={{ color: themeColors.text, fontSize: 14, fontWeight: "500" }}
      >
        {label}
      </Text>
    </Pressable>
  );
}
