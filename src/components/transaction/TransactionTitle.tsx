import { useTheme } from "@react-navigation/native";
import { PropsWithChildren, ReactNode } from "react";
import { Text, View } from "react-native";

import { palette } from "../../theme";

export function Muted({ children }: PropsWithChildren) {
  return (
    <Text style={{ color: palette.muted, fontWeight: "400" }}>{children}</Text>
  );
}

export default function TransactionTitle({
  children,
  badge,
}: PropsWithChildren<{ badge?: ReactNode }>) {
  const { colors: themeColors } = useTheme();

  return (
    <View style={{ alignItems: "center" }}>
      {badge && <View style={{ marginBottom: 5 }}>{badge}</View>}
      <Text
        style={{
          color: themeColors.text,
          textAlign: "center",
          fontSize: 30,
          fontWeight: "700",
          marginBottom: 20,
        }}
      >
        {children}
      </Text>
    </View>
  );
}
