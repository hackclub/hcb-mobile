import { Text, View, ViewProps } from "react-native";
import { palette } from "../theme";
import Card from "../lib/types/Card";

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
        ...(props.style as object),
      }}
    >
      <Text
        style={{
          color: palette.smoke,
        }}
      >
        ···· {card.last4 || "····"}
      </Text>
      <Text
        style={{
          color: palette.smoke,
        }}
      >
        {card.status}
      </Text>
    </View>
  );
}
