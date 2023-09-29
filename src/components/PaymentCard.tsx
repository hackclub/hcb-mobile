import { useTheme } from "@react-navigation/native";
import capitalize from "lodash/capitalize";
import { Text, View, ViewProps } from "react-native";
// import Animated, {
//   SharedTransition,
//   withSpring,
// } from "react-native-reanimated";

import Card from "../lib/types/Card";
import { palette } from "../theme";

import CardChip from "./cards/CardChip";

// const transition = SharedTransition.custom((values) => {
//   "worklet";
//   return {
//     originX: withSpring(values.targetOriginX, { damping: 20, stiffness: 200 }),
//     originY: withSpring(values.targetOriginY, { damping: 20, stiffness: 200 }),
//   };
// });

export default function PaymentCard({
  card,
  ...props
}: ViewProps & { card: Card }) {
  const { colors: themeColors, dark } = useTheme();

  return (
    <View
      style={{
        backgroundColor: themeColors.card,
        padding: 30,
        height: 200,
        borderRadius: 16,
        flexDirection: "column",
        justifyContent: "flex-end",
        alignItems: "flex-start",
        position: "relative",
        borderWidth: 1,
        borderColor: dark ? palette.slate : palette.muted,
        ...(props.style as object),
      }}
      // sharedTransitionTag={card.id}
      // sharedTransitionStyle={transition}
    >
      {card.status != "active" && (
        <View
          style={{
            marginBottom: "auto",
            backgroundColor: dark ? "rgb(35, 44, 52)" : "transparent",
            borderRadius: 30,
            paddingHorizontal: 16,
            paddingVertical: 6,
            borderColor: "rgb(91, 192, 222)",
            borderWidth: 1,
          }}
        >
          <Text
            style={{
              color: "rgb(91, 192, 222)",
              fontWeight: "600",
            }}
          >
            {capitalize(card.status)}
          </Text>
        </View>
      )}

      {card.type == "physical" && <CardChip />}
      <Text
        style={{
          color: themeColors.text,
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
