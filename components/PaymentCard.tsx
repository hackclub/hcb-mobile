import Icon from "@thedev132/hackclub-icons-rn";
import { Image, type ImageLoadEventData } from "expo-image";
import { useTheme } from "expo-router/react-navigation";
import { memo, useEffect, useState } from "react";
import {
  AppState,
  InteractionManager,
  useWindowDimensions,
  View,
  ViewProps,
} from "react-native";
import { SvgXml } from "react-native-svg";

import CardChip from "./cards/CardChip";

import { Text } from "@/components/Text";
import Card from "@/lib/types/Card";
import GrantCard from "@/lib/types/GrantCard";
import { CardDetails } from "@/lib/useStripeCardDetails";
import { palette } from "@/styles/theme";
import { redactedCardNumber, renderCardNumber } from "@/utils/format";

const CardPatternLayer = memo(function CardPatternLayer({
  pattern,
  width,
  height,
}: {
  pattern: string;
  width: number;
  height: number;
}) {
  const [ready, setReady] = useState(false);

  useEffect(() => {
    const task = InteractionManager.runAfterInteractions(() => setReady(true));
    const fallback = setTimeout(() => setReady(true), 300);
    return () => {
      task.cancel();
      clearTimeout(fallback);
    };
  }, []);

  if (!ready) return null;

  return (
    <View
      style={{
        position: "absolute",
        flexDirection: "row",
        flexWrap: "wrap",
        width,
        height,
      }}
    >
      <SvgXml xml={pattern} width="100%" height="100%" />
    </View>
  );
});

export default function PaymentCard({
  card,
  details,
  onCardLoad,
  pattern,
  patternDimensions,
  ...props
}: ViewProps & {
  card: Card;
  details?: CardDetails;
  onCardLoad?: (
    cardId: string,
    dimensions: { width: number; height: number },
  ) => void;
  pattern?: string;
  patternDimensions?: { width: number; height: number };
}) {
  const { colors: themeColors, dark } = useTheme();
  const [isAppActive, setIsAppActive] = useState(
    () => AppState.currentState === "active",
  );
  const { width } = useWindowDimensions();
  const [logoAspect, setLogoAspect] = useState(2);
  const isCardDataValid = card && card.id;

  useEffect(() => {
    if (onCardLoad && isCardDataValid && patternDimensions) {
      onCardLoad(card.id, patternDimensions);
    }
  }, [card?.id, onCardLoad, patternDimensions, isCardDataValid]);

  useEffect(() => {
    if (!details) return;

    const subscription = AppState.addEventListener("change", (nextAppState) => {
      setIsAppActive(nextAppState === "active");
    });

    return () => subscription.remove();
  }, [details]);

  const cardType = (card as GrantCard)?.amount_cents ? "virtual" : card.type;
  const isPhysical = cardType === "physical";
  const isVirtual = cardType === "virtual";
  const isBlackCard = card.personalization?.color === "black";
  const cardTextColor = isBlackCard || isVirtual ? "white" : "black";
  const cardIconColor = isBlackCard ? "white" : "black";

  if (!isCardDataValid) {
    return (
      <View
        style={{
          backgroundColor: dark ? "#222" : "#eee",
          padding: 30,
          width: width,
          height: width / 1.588,
          borderRadius: 15,
          justifyContent: "center",
          alignItems: "center",
          ...(props.style as object),
        }}
      >
        <Text style={{ color: dark ? "#999" : "#666" }}>Loading card...</Text>
      </View>
    );
  }

  return (
    <View
      style={{
        backgroundColor: isPhysical
          ? isBlackCard
            ? "black"
            : "white"
          : themeColors.card,
        padding: 30,
        width: width - 40,
        height: (width - 40) / 1.588,
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
      {isVirtual && pattern && (
        <CardPatternLayer
          pattern={pattern}
          width={width - 40}
          height={(width - 40) / 1.5}
        />
      )}

      {isPhysical && !card.personalization?.logo_url && (
        <View
          style={{
            position: "absolute",
            top: 15,
            right: 0,
            width: 100,
            height: 40,
            alignItems: "flex-end",
            justifyContent: "center",
            overflow: "hidden",
          }}
        >
          <Icon glyph="bank-account" size={40} color={cardIconColor} />
        </View>
      )}

      {isPhysical && card.personalization?.logo_url && (
        <View
          style={{
            position: "absolute",
            top: 15,
            right: 15,
            width: "100%",
            height: 40,
            overflow: "hidden",
            alignItems: "flex-end",
          }}
        >
          <Image
            contentFit="contain"
            cachePolicy="memory-disk"
            source={{ uri: card.personalization.logo_url }}
            onLoad={({ source }: ImageLoadEventData) => {
              if (source?.width && source?.height) {
                setLogoAspect(source.width / source.height);
              }
            }}
            style={{
              width: "auto",
              height: 40,
              tintColor: cardIconColor,
              aspectRatio: logoAspect,
            }}
          />
        </View>
      )}

      {card.status === "frozen" && (
        <>
          <Image
            source={require("../assets/card-frost.png")}
            style={{
              position: "absolute",
              top: 0,
              left: 0,
              width: width,
              height: width / 1.588,
              opacity: 0.32,
              borderRadius: 15,
              objectFit: "cover",
            }}
          />
          <View style={{ top: 25, left: 25, position: "absolute" }}>
            <Icon
              glyph="freeze"
              size={32}
              color={cardIconColor}
              opacity={0.5}
            />
          </View>
        </>
      )}

      {isPhysical && <CardChip />}
      <Text
        numberOfLines={1}
        adjustsFontSizeToFit
        minimumFontScale={0.75}
        style={{
          color: cardTextColor,
          fontSize: 18,
          marginBottom: 4,
          fontFamily: "Consolas-Bold",
        }}
      >
        {details && isAppActive
          ? renderCardNumber(details.number)
          : redactedCardNumber(card.last4)}
      </Text>
      <View style={{ flexDirection: "row", alignItems: "center", gap: 10 }}>
        <View style={{ flex: 1, flexShrink: 1 }}>
          <Text
            style={{
              color: cardTextColor,
              fontFamily: "Consolas-Bold",
              fontSize: 18,
              textTransform: "uppercase",
            }}
            numberOfLines={1}
            ellipsizeMode="tail"
          >
            {card.user?.name || card.organization?.name || "Card Holder"}
          </Text>
        </View>
        <View>
          <Text
            style={{
              color: cardTextColor,
              fontSize: 14,
              fontFamily: "Consolas-Bold",
              fontWeight: 700,
              textTransform: "uppercase",
              backgroundColor: isVirtual
                ? "rgba(255, 255, 255, 0.05)"
                : "rgba(255, 255, 255, 0.08)",
              borderRadius: 15,
              paddingHorizontal: 10,
              paddingVertical: 3,
              overflow: "hidden",
            }}
          >
            {card.status === "expired" ? "canceled" : card.status}
          </Text>
        </View>
      </View>
    </View>
  );
}
