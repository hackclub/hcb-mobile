import { useTheme } from "@react-navigation/native";
import capitalize from "lodash/capitalize";
import { useEffect, useRef, useState } from "react";
import {
  AppState,
  type AppStateStatus,
  Text,
  View,
  ViewProps,
} from "react-native";
// import Animated, {
//   SharedTransition,
//   withSpring,
// } from "react-native-reanimated";

import Card from "../lib/types/Card";
import { CardDetails } from "../lib/useStripeCardDetails";
import { palette } from "../theme";
import { redactedCardNumber, renderCardNumber } from "../util";

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
  details,
  ...props
}: ViewProps & { card: Card; details?: CardDetails }) {
  const { colors: themeColors, dark } = useTheme();

  const appState = useRef(AppState.currentState);
  const [isAppInBackground, setisAppInBackground] = useState(appState.current);

  // Add listener for whenever app goes into the background on iOS
  // to hide the card details (e.g. in app switcher)
  // https://reactnative.dev/docs/appstate
  useEffect(() => {
    const subscription = AppState.addEventListener(
      "change",
      (nextAppState: AppStateStatus) => {
        appState.current = nextAppState;
        setisAppInBackground(appState.current);
      },
    );

    return () => subscription.remove();
  });

  return (
    <View
      style={{
        backgroundColor: themeColors.card,
        padding: 30,
        height: 200,
        borderRadius: 16,
        flexDirection: "column",
        justifyContent: "flex-end",
        alignItems: "stretch",
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
            alignSelf: "flex-start",
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
          fontSize: 23,
          marginBottom: 4,
          fontFamily: "JetBrains Mono",
        }}
      >
        {details && isAppInBackground === "active"
          ? renderCardNumber(details.number)
          : redactedCardNumber(card.last4)}
      </Text>
      <View style={{ flexDirection: "row", alignItems: "center", gap: 10 }}>
        <Text
          style={{
            color: palette.muted,
            fontSize: 18,
          }}
        >
          {card.organization.name}
        </Text>
        <View style={{ marginLeft: "auto" }}>
          <Text style={{ color: palette.muted, fontSize: 10 }}>Exp</Text>
          <Text
            style={{
              color: themeColors.text,
              fontFamily: "JetBrains Mono",
              fontSize: 14,
            }}
          >
            {card.exp_month?.toLocaleString("en-US", {
              minimumIntegerDigits: 2,
            })}
            /{card.exp_year?.toString().slice(-2)}
          </Text>
        </View>
        <View>
          <Text style={{ color: palette.muted, fontSize: 10 }}>CVC</Text>
          <Text
            style={{
              color: themeColors.text,
              fontFamily: "JetBrains Mono",
              fontSize: 14,
              fontVariant: ["no-contextual"], // JetBrains Mono has a ligature for "***" lol
            }}
          >
            {details?.cvc || "***"}
          </Text>
        </View>
      </View>
    </View>
  );
}
