import { Ionicons } from "@expo/vector-icons";
import { PropsWithChildren } from "react";
import { View, ViewStyle } from "react-native";
import { Text } from "components/Text";
import { palette } from "../styles/theme";

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
        backgroundColor: `${color}40`,
        paddingVertical: 4,
        paddingHorizontal: 12,
        borderRadius: 8,
        flexDirection: "row",
        alignItems: "center",
        gap: 5,
        ...style,
      }}
      accessible={true}
      accessibilityRole={accessibilityRole}
      accessibilityLabel={
        accessibilityLabel ||
        (typeof children === "string" ? children : "Badge")
      }
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
