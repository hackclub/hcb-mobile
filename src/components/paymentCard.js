import { Text, View } from "react-native";
import { palette } from "../theme";

export default function PaymentCard({ card, ...props }) {
  return (
    <View
      style={{
        backgroundColor: palette.darkless,
        padding: 30,
        height: 200,
        borderRadius: 16,
        ...props.style,
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
