import { useTheme } from "@react-navigation/native";
import Constants from "expo-constants";
import * as Geopattern from "geopattern";
import { useEffect, useRef, useState } from "react";
import {
  Text,
  View,
  ViewProps,
  type AppStateStatus,
  AppState,
  useWindowDimensions,
} from "react-native";
import { SvgUri, SvgXml } from "react-native-svg";

import Card from "../lib/types/Card";
import GrantCard from "../lib/types/GrantCard";
import { CardDetails } from "../lib/useStripeCardDetails";
import { palette } from "../theme";
import { redactedCardNumber, renderCardNumber } from "../util";

import CardChip from "./cards/CardChip";
import CardFrozen from "./cards/CardFrozen";
import CardHCB from "./cards/CardHCB";

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
  onCardLoad,
  ...props
}: ViewProps & {
  card: Card;
  details?: CardDetails;
  onCardLoad?: (cardId: string, dimensions: { width: number; height: number }) => void;
}) {
  const { colors: themeColors, dark } = useTheme();

  console.log("PaymentCard", card);

  const patternForMeasurements = Geopattern.generate(card.id, {
    scalePattern: 1.1,
    grayscale: card.status != "active",
  }).toSvg();

  const pattern = Geopattern.generate(card.id, {
    scalePattern: 1.1,
    grayscale:
      card.status == "active" ? false : true,
  }).toDataUri();

  const extractDimensions = (svg: string) => {
    const widthMatch = svg.match(/width="(\d+(\.\d+)?)"/);
    const heightMatch = svg.match(/height="(\d+(\.\d+)?)"/);
    return {
      svgWidth: widthMatch ? parseFloat(widthMatch[1]) : 0,
      svgHeight: heightMatch ? parseFloat(heightMatch[1]) : 0,
    };
  };

  const { svgWidth, svgHeight } = extractDimensions(patternForMeasurements);

  const appState = useRef(AppState.currentState);
  const [isAppInBackground, setisAppInBackground] = useState(appState.current);
  const { width } = useWindowDimensions();

  if ((card as GrantCard).amount_cents) {
    card.type = "virtual";
  }


  useEffect(() => {
    if (onCardLoad) {
      onCardLoad(card.id, { width: svgWidth, height: svgHeight });
    }
  }, []);

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
        backgroundColor: card.type == "physical" ? "black" : themeColors.card,
        padding: 30,
        width: width * 0.86,
        height: (width * 0.86) / 1.588,
        borderRadius: 15,
        flexDirection: "column",
        justifyContent: "flex-end",
        alignItems: "stretch",
        position: "relative",
        borderWidth: 0,
        borderColor: dark ? palette.slate : palette.muted,
        ...(props.style as object),
        overflow: "hidden",
      }}
    >
      {card.type == "virtual" && (
        <View
          style={{
            position: "absolute",
            flexDirection: "row",
            flexWrap: "wrap",
            width: width * 0.86,
            height: (width * 0.86) / 1.5,
          }}
        >
          {Constants.platform?.android ? (
            <SvgXml xml={patternForMeasurements} width={svgWidth} height={svgHeight} />
          ) : (
            <SvgUri uri={pattern} width={svgWidth} height={svgHeight} />
          )
          }
        </View>
      )}

      {card.type == "physical" && (
        <View style={{ top: 5, right: 5, position: "absolute" }}>
          <CardHCB />
        </View>
      )}
      {card.status == "frozen" && (
        <View style={{ top: 25, left: 25, position: "absolute" }}>
          <CardFrozen />
        </View>
      )}

      {card.type == "physical" && <CardChip />}
      <Text
        style={{
          color: "white",
          fontSize: 18,
          marginBottom: 4,
          fontFamily: "Consolas-Bold",
        }}
      >
        {details && isAppInBackground === "active"
          ? renderCardNumber(details.number)
          : redactedCardNumber(card.last4)}
      </Text>
      <View style={{ flexDirection: "row", alignItems: "center", gap: 10 }}>
        <View>
          <Text
            style={{
              color: 'white',
              fontFamily: "Consolas-Bold",
              fontSize: 18,
              width: 180,
              textTransform: "uppercase",
            }}
            numberOfLines={1}
            ellipsizeMode="tail"
          >
            {card.user ? card.user.name : card.organization.name}
          </Text>
        </View>
        <View style={{ position: "absolute", right: 0 }}>
          <Text
            style={{
              color: "white",
              fontSize: 14,
              fontFamily: "Consolas-Bold",
              fontWeight: 700,
              textTransform: "uppercase",
              backgroundColor:
                card.type == "virtual"
                  ? "rgba(255, 255, 255, 0.05)"
                  : "rgba(255, 255, 255, 0.08)",
              borderRadius: 15,
              paddingHorizontal: 10,
              paddingVertical: 3,
              overflow: "hidden",
            }}
          >
            {card.status}
          </Text>
        </View>
      </View>
    </View>
  );
}
