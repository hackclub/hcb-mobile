import { ReactElement } from "react";
import { View, Text } from "react-native";

import { palette } from "../../theme";

export default function TransactionDetails({
  details,
}: {
  details: { label: string; value: ReactElement | string }[];
}) {
  return details.map(({ label, value }, index) => (
    <View
      key={label}
      style={{
        backgroundColor: palette.darkless,
        display: "flex",
        flexDirection: "row",
        justifyContent: "space-between",
        alignItems: "center",
        padding: 10,
        borderTopLeftRadius: index == 0 ? 8 : 0,
        borderTopRightRadius: index == 0 ? 8 : 0,
        borderBottomLeftRadius: index == details.length - 1 ? 8 : 0,
        borderBottomRightRadius: index == details.length - 1 ? 8 : 0,
        maxHeight: 40,
        gap: 10,
      }}
    >
      <Text style={{ color: palette.muted }}>{label}</Text>
      {typeof value == "string" ? (
        <Text
          numberOfLines={1}
          style={{
            color: palette.smoke,
            overflow: "hidden",
            flex: 1,
            textAlign: "right",
          }}
        >
          {value}
        </Text>
      ) : (
        value
      )}
    </View>
  ));
}
