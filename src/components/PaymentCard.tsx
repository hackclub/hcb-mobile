import { Text, View, ViewProps } from "react-native";

import Card from "../lib/types/Card";
import { palette } from "../theme";

import CardChip from "./cards/CardChip";

export default function PaymentCard({
  card,
  ...props
}: ViewProps & { card: Card }) {
  return (
    <View
      style={{
        backgroundColor: palette.darkless,
        padding: 30,
        height: 200,
        borderRadius: 16,
        flexDirection: "column",
        justifyContent: "flex-end",
        opacity: card.status != "active" ? 0.5 : 1,
        position: "relative",
        ...(props.style as object),
      }}
    >
      {card.type == "physical" && <CardChip />}
      <Text
        style={{
          color: palette.smoke,
          fontSize: 24,
          marginBottom: 4,
        }}
      >
        ···· ···· ···· {card.last4 || "····"}
      </Text>
      <Text
        style={{
          color: palette.muted,
          fontSize: 18,
        }}
      >
        {card.organization.name}
      </Text>
    </View>
  );
}
