import { useTheme } from "@react-navigation/native";
import capitalize from "lodash/capitalize";
import { Dimensions, Text, View, ViewProps, StyleSheet, type AppStateStatus, AppState} from "react-native";
import { useEffect, useRef, useState } from "react";
// import Animated, {
//   SharedTransition,
//   withSpring,
// } from "react-native-reanimated";

import Card from "../lib/types/Card";
import { CardDetails } from "../lib/useStripeCardDetails";
import { palette } from "../theme";
import { redactedCardNumber, renderCardNumber } from "../util";

import CardChip from "./cards/CardChip";
import CardHCB from "./cards/CardHCB";

import * as Geopattern from "geopattern";
import { SvgXml } from 'react-native-svg';
import CardFrozen from "./cards/CardFrozen";

// const transition = SharedTransition.custom((values) => {
//   "worklet";
//   return {
//     originX: withSpring(values.targetOriginX, { damping: 20, stiffness: 200 }),
//     originY: withSpring(values.targetOriginY, { damping: 20, stiffness: 200 }),
//   };
// });

const { width } = Dimensions.get("window");

export default function PaymentCard({
  card,
  details,
  ...props
}: ViewProps & { card: Card; details?: CardDetails }) {
  const { colors: themeColors, dark } = useTheme();

  const pattern = Geopattern.generate(card.id, {scalePattern: 1.1, grayscale: card.status == 'frozen' || card.status == 'inactive' || card.status == 'canceled' ? true : false}).toString();
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
        backgroundColor:  card.type == "physical" ? 'black' : themeColors.card,
        padding: 30,
        width: width * 0.86,
        height: width * 0.86 / 1.588,
        borderRadius: 16,
        flexDirection: "column",
        justifyContent: "flex-end",
        alignItems: "stretch",
        position: "relative",
        borderWidth: 1,
        borderColor: dark ? palette.slate : palette.muted,
        ...(props.style as object),
        overflow: "hidden",
      }}
      // sharedTransitionTag={card.id}
      // sharedTransitionStyle={transition}
    >

      {card.type == "virtual" && (
        <View
          style={{
            position: 'absolute',
            flexDirection: 'row',
            justifyContent: 'flex-start',
          }}
        >
          {Array.from({ length: 20 }).map((_, index) => (
            <SvgXml
              key={index}
              xml={pattern}
              height={width * 0.86 / 1.588} 
            />
          ))}
        </View>
      )}

      {card.type == "physical" && <View style={{top: 5, right: 5, position: "absolute"}}><CardHCB /></View>}
      {card.status == "frozen" && <View style={{top: 25, left: 25, position: "absolute"}}><CardFrozen /></View>}

      {card.type == "physical" && <CardChip />}

      <Text
        style={{
          color:'white',
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
        <View>
          {card.user && (
          <Text
              style={{
                color: 'white',
                fontSize: 18,
              }}
            >
            {card.user.name}
          </Text>
          )}
          {!card.user && (
          <Text
            style={{
              color: 'white',
              fontSize: 18,
            }}
          >
            {card.organization.name}
          </Text>)}
        </View>
        <View style={{ marginLeft: "auto" }}>
          <Text
            style={{
              color: 'white',
              fontSize: 14,
              fontFamily: "JetBrains Mono",
              backgroundColor: card.type == 'virtual' ? "rgba(255, 255, 255, 0.05)" : "rgba(255, 255, 255, 0.08)",
              borderRadius: 15,
              paddingHorizontal: 10,
              paddingVertical: 3,
            }}
          >
            {card.status == "active" ? "Active" : card.status == "frozen" ? "Frozen" : card.status == "inactive" ? "Inactive" : "Cancelled"}
          </Text>
        </View>

        {/* <View style={{ marginLeft: "auto" }}>
          <Text style={{ color: 'white', fontSize: 10 }}>Exp</Text>
          <Text
            style={{
              color: 'white',
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
          <Text style={{ color: 'white', fontSize: 10 }}>CVC</Text>
          <Text
            style={{
              color: 'white',
              fontFamily: "JetBrains Mono",
              fontSize: 14,
              // There is no value called "no-contextual" in the fontVariant property
              // fontVariant: ["no-contextual"], // JetBrains Mono has a ligature for "***" lol
            }}
          >
            {details?.cvc || "●●●"}
          </Text>
        </View> */}
      </View>
    </View>
  );
}
