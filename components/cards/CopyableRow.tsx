import { useTheme } from "expo-router/react-navigation";
import { Text } from "@/components/Text";
import { View, TouchableOpacity } from "react-native";

import { palette } from "@/styles/theme";

export default function CopyableRow({
  label,
  value,
  onCopy,
}: {
  label: string;
  value: string;
  onCopy: () => void;
}) {
  const { colors: themeColors } = useTheme();
  return (
    <View
      style={{
        flexDirection: "row",
        justifyContent: "space-between",
        marginBottom: 12,
      }}
    >
      <Text style={{ fontSize: 16, color: themeColors.text, flexShrink: 1 }}>
        {label}
      </Text>
      <View style={{ flex: 1, alignItems: "flex-end" }}>
        <TouchableOpacity onPress={onCopy}>
          <Text
            style={{
              color: palette.muted,
              fontSize: 16,
              fontWeight: "500",
              fontFamily: "JetBrainsMono-Regular",
            }}
          >
            {value}
          </Text>
        </TouchableOpacity>
      </View>
    </View>
  );
}
