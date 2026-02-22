import { useTheme } from "@react-navigation/native";
import { PropsWithChildren, ReactNode } from "react";
import { View } from "react-native";
import { Text } from "components/Text";

import { palette } from "../../styles/theme";

export function Muted({ children }: PropsWithChildren) {
  return <Text style={{ color: palette.muted, fontSize: 30 }}>{children}</Text>;
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
        bold
        style={{
          color: themeColors.text,
          textAlign: "center",
          fontSize: 30,
          marginBottom: 20,
        }}
      >
        {children}
      </Text>
    </View>
  );
}
