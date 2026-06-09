import { useTheme } from "expo-router/react-navigation";
import { PropsWithChildren, ReactNode } from "react";
import { View } from "react-native";

import Badge from "@/components/Badge";
import { Text } from "@/components/Text";
import { TransactionBase } from "@/lib/types/Transaction";
import { palette } from "@/styles/theme";

export function statusBadge(
  transaction: Pick<TransactionBase, "pending" | "declined" | "reversed">,
) {
  if (transaction.pending) {
    return (
      <Badge icon="information-circle-outline" color={palette.info}>
        Pending
      </Badge>
    );
  }
  if (transaction.reversed) {
    return (
      <Badge icon="information-circle-outline" color={palette.info}>
        Reversed
      </Badge>
    );
  }
  if (transaction.declined) {
    return (
      <Badge icon="information-circle-outline" color={palette.primary}>
        Declined
      </Badge>
    );
  }
  return null;
}

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
