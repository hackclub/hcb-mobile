import { useTheme } from "@react-navigation/native";
import capitalize from "lodash/capitalize";
import { ImageBackground, Text, View, ViewProps } from "react-native";
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

  const pattern = Geopattern.generate(card.id).toString();

  return (
    <View
      style={{
        backgroundColor:  card.type == "physical" ? 'black' : themeColors.card,
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
        overflow: "hidden",
      }}
      // sharedTransitionTag={card.id}
      // sharedTransitionStyle={transition}
    >

      {card.type == "virtual" && (
        <View
          style={{
            position: 'absolute',
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            flexDirection: 'row',
            justifyContent: 'flex-start',
          }}
        >
          {Array.from({ length: 20 }).map((_, index) => (
            <SvgXml
              key={index}
              xml={pattern}
              height={200} 
              preserveAspectRatio="xMidYMid slice"
            />
          ))}
        </View>
      )}

      {card.status != "active" && (
        <View
          style={{
            marginBottom: "auto",
            backgroundColor: dark ? "rgb(35, 44, 520)" : "transparent",
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

      {card.type == "physical" && <View style={{top: 5, right: 5, position: "absolute"}}><CardHCB /></View>}
      {card.type == "physical" && <CardChip />}
      <Text
        style={{
          color:'white',
          fontSize: 23,
          marginBottom: 4,
          fontFamily: "JetBrains Mono",
        }}
      >
        {details
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
        </View>
      </View>
    </View>
  );
}
