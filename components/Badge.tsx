import { Ionicons } from "@expo/vector-icons";
import { PropsWithChildren } from "react";
import { View, ViewStyle } from "react-native";

import { Text } from "@/components/Text";
import { palette } from "@/styles/theme";

type Props = PropsWithChildren<
  {
    icon?: React.ComponentProps<typeof Ionicons>["name"];
    color?: string;
    accessibilityLabel?: string;
    accessibilityRole?: "text" | "button";
  } & { style?: ViewStyle }
>;

export default function Badge({
  children,
  icon,
  color = palette.muted,
  style,
  accessibilityLabel,
  accessibilityRole = "text",
}: Props) {
  return (
    <View
      style={{
        backgroundColor: `${color}26`,
        paddingVertical: 3,
        paddingHorizontal: 8,
        borderRadius: 9999,
        flexDirection: "row",
        alignItems: "center",
        alignSelf: "flex-start",
        gap: 4,
        ...style,
      }}
      accessible={true}
      accessibilityRole={accessibilityRole}
      accessibilityLabel={
        accessibilityLabel ||
        (typeof children === "string" ? children : "Badge")
      }
    >
      {icon && <Ionicons name={icon} color={color} size={16} />}
      <Text
        style={{
          color,
          fontSize: 12,
          fontWeight: "500",
          letterSpacing: 0.1,
        }}
      >
        {children}
      </Text>
    </View>
  );
}
