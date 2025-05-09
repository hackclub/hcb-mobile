import { useBottomTabBarHeight } from "@react-navigation/bottom-tabs";
import { useTheme } from "@react-navigation/native";
import { NativeStackScreenProps } from "@react-navigation/native-stack";
import * as Haptics from "expo-haptics";
import { useEffect, useState } from "react";
import {
  ScrollView,
  View,
  Text,
  ActivityIndicator,
  TouchableHighlight,
} from "react-native";
import useSWR, { useSWRConfig } from "swr";
import useSWRMutation from "swr/mutation";

import Button from "../components/Button";
import PaymentCard from "../components/PaymentCard";
import Transaction from "../components/Transaction";
import UserAvatar from "../components/UserAvatar";
import useClient from "../lib/client";
import { CardsStackParamList } from "../lib/NavigatorParamList";
import Card from "../lib/types/Card";
import GrantCard from "../lib/types/GrantCard";
import ITransaction from "../lib/types/Transaction";
import useStripeCardDetails from "../lib/useStripeCardDetails";
import { palette } from "../theme";
import { redactedCardNumber, renderCardNumber, renderMoney } from "../util";

type Props = NativeStackScreenProps<CardsStackParamList, "Card">;

export default function CardPage({
  route: {
    params: { card: _card },
  },
  navigation,
}: Props) {
  const { colors: themeColors } = useTheme();
  const hcb = useClient();
  const isGrantCard = (_card as GrantCard).amount_cents != null;

  const {
    details,
    toggle: toggleDetailsRevealed,
    revealed: detailsRevealed,
    loading: detailsLoading,
  } = useStripeCardDetails(_card.id);

  const { data: card = _card } = useSWR<Card>(`cards/${_card.id}`, {
    fallbackData: _card,
  });
  const [cardName, setCardName] = useState(_card.name);
  useEffect(() => {
    if (card?.name) {
      setCardName(card.name);
    } else if (card?.user) {
      setCardName(
        `${card.user.name.split(" ")[0]} ${card.user.name.split(" ")[1].charAt(0)}'s Card`,
      );
    }
  }, [card]);
  useEffect(() => {
    navigation.setOptions({
      title: cardName,
    });
  }, [cardName, navigation]);

  const { data: transactions, isLoading: transactionsLoading } = useSWR<{
    data: ITransaction[];
  }>(`cards/${_card.id}/transactions`);

  const { mutate } = useSWRConfig();
  const [cardLoaded, setCardLoaded] = useState(false);

  const { trigger: update, isMutating } = useSWRMutation<
    Card,
    unknown,
    string,
    "frozen" | "active",
    Card
  >(
    `cards/${_card.id}`,
    (url, { arg }) => hcb.patch(url, { json: { status: arg } }).json(),
    {
      populateCache: true,
      onSuccess: () => {
        Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
        mutate(`user/cards`);
      },
    },
  );

  const tabBarHeight = useBottomTabBarHeight();

  if (!card && !cardLoaded) {
    return <ActivityIndicator />;
  }

  const toggleCardFrozen = () => {
    if (card.status == "active") {
      update("frozen");
    } else {
      update("active");
    }
  };

  return (
    <ScrollView
      contentContainerStyle={{ padding: 20, paddingBottom: tabBarHeight + 20 }}
      scrollIndicatorInsets={{ bottom: tabBarHeight }}
    >
      <View style={{ alignItems: "center" }}>
        <PaymentCard
          details={details}
          card={isGrantCard ? (_card as GrantCard) : card}
          onCardLoad={() => setCardLoaded(true)}
          style={{ marginBottom: 20 }}
        />
      </View>

      {card.status != "canceled" && (
        <View
          style={{
            flexDirection: "row",
            marginBottom: 20,
            justifyContent: "center",
            gap: 20,
          }}
        >
          {(card.status !== "expired" || !isGrantCard) && (
            <Button
              style={{
                flexBasis: 0,
                flexGrow: 1,
                // marginR: 10,
                backgroundColor: "#5bc0de",
                borderTopWidth: 0,
              }}
              color="#186177"
              onPress={() => toggleCardFrozen()}
              loading={isMutating}
            >
              {card.status == "active" ? "Freeze" : "Unfreeze"} card
            </Button>
          )}
          {card.type == "virtual" && _card.status != "canceled" && (
            <Button
              style={{
                flexBasis: 0,
                flexGrow: 1,
              }}
              onPress={() => toggleDetailsRevealed()}
              loading={detailsLoading}
            >
              {detailsRevealed ? "Hide" : "Reveal"} details
            </Button>
          )}
        </View>
      )}

      {!detailsLoading || details !== undefined ? (
        <View
          style={{
            marginBottom: 20,
            backgroundColor: themeColors.card,
            padding: 15,
            borderRadius: 15,
          }}
        >
          {card.user ? (
            <View
              style={{
                flexDirection: "row",
                alignContent: "center",
                alignItems: "center",
                marginBottom: 20,
              }}
            >
              <UserAvatar
                user={card.user}
                size={36}
                style={{ marginRight: 5 }}
              />
              <Text style={{ color: themeColors.text, fontSize: 18 }}>
                {cardName}
              </Text>
            </View>
          ) : null}
          <View
            style={{ flexDirection: "row", justifyContent: "space-between" }}
          >
            <Text style={{ color: themeColors.text }}>Card number</Text>
            <Text style={{ color: palette.muted }}>
              {detailsRevealed && details
                ? renderCardNumber(details.number)
                : redactedCardNumber(isGrantCard ? _card.last4 : card?.last4)}
            </Text>
          </View>
          <View
            style={{ flexDirection: "row", justifyContent: "space-between" }}
          >
            <Text style={{ color: themeColors.text }}>Expires</Text>
            <Text style={{ color: palette.muted }}>
              {detailsRevealed && details
                ? `${String(details.exp_month).padStart(2, "0")}/${details.exp_year}`
                : "••/••"}
            </Text>
          </View>
          <View
            style={{ flexDirection: "row", justifyContent: "space-between" }}
          >
            <Text style={{ color: themeColors.text }}>CVC</Text>
            <Text style={{ color: palette.muted }}>
              {detailsRevealed ? details && details.cvc : "•••"}
            </Text>
          </View>
        </View>
      ) : (
        <ActivityIndicator />
      )}

      {isGrantCard && (
        <View
          style={{
            padding: 10,
            marginBottom: 10,
          }}
        >
          <Text
            style={{
              color: themeColors.text,
              fontSize: 18,
              textAlign: "center",
            }}
          >
            Amount:{" "}
            {_card?.status == "expired" || _card?.status == "canceled"
              ? "$0"
              : renderMoney(
                  (card as GrantCard).amount_cents -
                    (card?.total_spent_cents ?? 0),
                )}
          </Text>
        </View>
      )}

      {transactionsLoading ? (
        <ActivityIndicator />
      ) : transactions === undefined || transactions.data.length === 0 ? (
        <Text
          style={{
            color: palette.muted,
            fontSize: 16,
            marginTop: 12,
            textAlign: "center",
          }}
        >
          There are no purchases on this card.
        </Text>
      ) : (
        <>
          <View
            style={{
              flex: 1,
              flexDirection: "row",
              justifyContent: "space-between",
            }}
          >
            <Text
              style={{
                color: palette.muted,
                fontSize: 12,
                textTransform: "uppercase",
                marginBottom: 8,
                marginTop: 10,
              }}
            >
              Transactions
            </Text>
            {card.total_spent_cents != null && (
              <Text
                style={{
                  color: palette.muted,
                  fontSize: 12,
                  textTransform: "uppercase",
                  marginBottom: 8,
                  marginTop: 10,
                }}
              >
                <Text style={{ color: themeColors.text }}>
                  {renderMoney(card.total_spent_cents)}
                </Text>{" "}
                spent
              </Text>
            )}
          </View>
          {transactions.data.map((transaction, index) => (
            <TouchableHighlight
              key={transaction.id}
              onPress={() => {
                navigation.navigate("Transaction", {
                  orgId: card.organization.id,
                  transaction,
                  transactionId: transaction.id,
                });
              }}
              underlayColor={themeColors.background}
              activeOpacity={0.7}
            >
              <Transaction
                transaction={transaction}
                top={index == 0}
                bottom={index == transactions.data.length - 1}
                hideAvatar
                orgId={card.organization.id}
              />
            </TouchableHighlight>
          ))}
        </>
      )}
    </ScrollView>
  );
}
