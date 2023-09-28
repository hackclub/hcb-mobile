import { PropsWithChildren } from "react";
import { Text } from "react-native";

import { palette } from "../../theme";

export function Muted({ children }: PropsWithChildren) {
  return (
    <Text style={{ color: palette.muted, fontWeight: "400" }}>{children}</Text>
  );
}

export default function TransactionTitle({ children }: PropsWithChildren) {
  return (
    <Text
      style={{
        color: palette.smoke,
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
