import { useBottomTabBarHeight } from "@react-navigation/bottom-tabs";
import { useTheme } from "@react-navigation/native";
import { NativeStackScreenProps } from "@react-navigation/native-stack";
import * as Haptics from "expo-haptics";
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
import useClient from "../lib/client";
import { CardsStackParamList } from "../lib/NavigatorParamList";
import Card from "../lib/types/Card";
import ITransaction from "../lib/types/Transaction";
import useStripeCardDetails from "../lib/useStripeCardDetails";
import { palette } from "../theme";
import { renderMoney } from "../util";

type Props = NativeStackScreenProps<CardsStackParamList, "Card">;

export default function CardPage({
  route: {
    params: { card: _card },
  },
  navigation,
}: Props) {
  const { colors: themeColors } = useTheme();
  const hcb = useClient();

  const {
    details,
    toggle: toggleDetailsRevealed,
    revealed: detailsRevealed,
    loading: detailsLoading,
  } = useStripeCardDetails(_card.id);
  const { data: card } = useSWR<Card>(`cards/${_card.id}`, {
    fallbackData: _card,
  });
  const { data: transactions, isLoading: transactionsLoading } = useSWR<{
    data: ITransaction[];
  }>(`cards/${_card.id}/transactions`);

  const { mutate } = useSWRConfig();

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

  if (!card) {
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
      <PaymentCard details={details} card={card} style={{ marginBottom: 20 }} />

      {card.status != "canceled" && (
        <View
          style={{
            flexDirection: "row",
            marginBottom: 20,
            justifyContent: "center",
            gap: 20,
          }}
        >
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
          {card.type == "virtual" && (
            <Button
              style={{
                flexBasis: 0,
                flexGrow: 1,
                // marginHorizontal: 10,
              }}
              onPress={() => toggleDetailsRevealed()}
              loading={detailsLoading}
            >
              {detailsRevealed ? "Hide" : "Reveal"} details
            </Button>
          )}
        </View>
      )}

      {transactionsLoading || transactions === undefined ? (
        <ActivityIndicator />
      ) : transactions.data.length == 0 ? (
        <Text
          style={{
            color: palette.muted,
            fontSize: 16,
            marginTop: 12,
            textAlign: "center",
          }}
        >
          No purchases on this card yet.
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
            {card.total_spent_cents && (
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
              />
            </TouchableHighlight>
          ))}
        </>
      )}
    </ScrollView>
  );
}
