import { useTheme } from "@react-navigation/native";
import { TouchableOpacity, View, Text } from "react-native";

import Card from "../../lib/types/Card";
import GrantCard from "../../lib/types/GrantCard";
import { CardDetails as StripeCardDetails } from "../../lib/useStripeCardDetails";
import { renderMoney } from "../../utils/util";
import PaymentCard from "../PaymentCard";

interface CardDisplayProps {
  card: Card;
  grantCard?: GrantCard;
  isGrantCard: boolean;
  cardExpanded: boolean;
  setCardExpanded: (expanded: boolean) => void;
  details: StripeCardDetails | undefined;
  onCardLoad: () => void;
  pattern?: string;
  patternDimensions?: { width: number; height: number };
  cardName: string;
}

export default function CardDisplay({
  card,
  isGrantCard,
  cardExpanded,
  setCardExpanded,
  details,
  onCardLoad,
  pattern,
  patternDimensions,
}: CardDisplayProps) {
  const { colors: themeColors } = useTheme();

  return (
    <TouchableOpacity
      style={{ alignItems: "center", marginBottom: 20 }}
      activeOpacity={0.9}
      onPress={() => setCardExpanded(!cardExpanded)}
    >
      <PaymentCard
        details={details}
        card={card}
        onCardLoad={onCardLoad}
        style={{ marginBottom: 10 }}
        pattern={pattern}
        patternDimensions={patternDimensions}
      />

      {isGrantCard && (
        <View style={{ alignItems: "center", marginTop: 10 }}>
          <Text
            style={{
              fontSize: 14,
              opacity: 0.7,
              color: themeColors.text,
            }}
          >
            Available Balance
          </Text>
          <Text
            style={{
              fontSize: 24,
              fontWeight: "bold",
              marginTop: 5,
              color: themeColors.text,
            }}
          >
            {card?.status == "expired" || card?.status == "canceled"
              ? "$0"
              : renderMoney(card?.balance_available ?? 0)}
          </Text>
        </View>
      )}
    </TouchableOpacity>
  );
}
