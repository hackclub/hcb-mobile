import { View, Text } from "react-native";

import { useIsDark } from "../../lib/useColorScheme";
import { palette } from "../../styles/theme";
import { renderMoney } from "../../utils/util";

export default function EventBalance({
  balance_cents,
}: {
  balance_cents?: number;
}) {
  const isDark = useIsDark();

  return balance_cents !== undefined ? (
    <Text
      style={{
        color: isDark ? "#7a8494" : palette.slate,
        fontSize: 15,
        fontWeight: "500",
        fontVariant: ["tabular-nums"],
      }}
    >
      {renderMoney(balance_cents)}
    </Text>
  ) : (
    <View
      style={{
        flexDirection: "row",
        alignItems: "center",
        gap: 2,
      }}
    >
      <Text
        style={{
          color: isDark ? "#5a6270" : palette.slate,
          fontSize: 15,
          fontWeight: "500",
        }}
      >
        $
      </Text>
      <View
        style={{
          backgroundColor: isDark
            ? "rgba(255, 255, 255, 0.08)"
            : "rgba(0, 0, 0, 0.08)",
          width: 80,
          height: 14,
          borderRadius: 4,
        }}
      />
    </View>
  );
}
