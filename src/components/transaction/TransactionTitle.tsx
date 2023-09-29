import { useTheme } from "@react-navigation/native";
import { PropsWithChildren } from "react";
import { Text } from "react-native";

import { palette } from "../../theme";

export function Muted({ children }: PropsWithChildren) {
  return (
    <Text style={{ color: palette.muted, fontWeight: "400" }}>{children}</Text>
  );
}

export default function TransactionTitle({ children }: PropsWithChildren) {
  const { colors: themeColors } = useTheme();

  return (
    <Text
      style={{
        color: themeColors.text,
        textAlign: "center",
        fontSize: 30,
        fontWeight: "700",
        marginBottom: 30,
      }}
    >
      {children}
    </Text>
  );
}
