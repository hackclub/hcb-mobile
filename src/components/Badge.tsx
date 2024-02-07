import { Ionicons } from "@expo/vector-icons";
import { PropsWithChildren } from "react";
import { View, Text, ViewStyle } from "react-native";

import { palette } from "../theme";

type Props = PropsWithChildren<
  {
    icon?: React.ComponentProps<typeof Ionicons>["name"];
    color?: string;
  } & { style?: ViewStyle }
>;

export default function Badge({
  children,
  icon,
  color = palette.muted,
  style,
}: Props) {
  return (
    <View
      style={{
        backgroundColor: `${color}40`,
        paddingVertical: 4,
        paddingHorizontal: 12,
        borderRadius: 8,
        flexDirection: "row",
        alignItems: "center",
        gap: 5,
        ...style,
      }}
    >
      {icon && <Ionicons name={icon} color={color} size={20} />}
      <Text
        style={{
          color,
          textTransform: "uppercase",
        }}
      >
        {children}
      </Text>
    </View>
  );
}
