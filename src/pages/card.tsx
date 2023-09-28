import { useBottomTabBarHeight } from "@react-navigation/bottom-tabs";
import { NativeStackScreenProps } from "@react-navigation/native-stack";
import * as Haptics from "expo-haptics";
import { useContext } from "react";
import { ScrollView, View, Text, ActivityIndicator } from "react-native";
import useSWR, { mutate } from "swr";
import useSWRMutation from "swr/mutation";

import AuthContext from "../auth";
import Button from "../components/Button";
import PaymentCard from "../components/PaymentCard";
import Transaction from "../components/Transaction";
import { CardsStackParamList } from "../lib/NavigatorParamList";
import Card from "../lib/types/Card";
import ITransaction from "../lib/types/Transaction";
import { palette } from "../theme";

type Props = NativeStackScreenProps<CardsStackParamList, "Card">;

export default function CardPage({
  route: {
    params: { cardId },
  },
}: Props) {
  const { token } = useContext(AuthContext);

  const { data: card } = useSWR<Card>(`/cards/${cardId}`);
  const { data: transactions, isLoading: transactionsLoading } = useSWR<{
    data: ITransaction[];
  }>(`/cards/${cardId}/transactions`);

  const { trigger: update, isMutating } = useSWRMutation<
    Card,
    unknown,
    string,
    "frozen" | "active",
    Card
  >(
    `/cards/${cardId}`,
    (url, { arg }) =>
      fetch(process.env.EXPO_PUBLIC_API_BASE + url, {
        body: JSON.stringify({ status: arg }),
        method: "PATCH",
        headers: {
          Authorization: `Bearer ${token}`,
          "Content-Type": "application/json",
        },
      }).then((r) => r.json()),
    {
      populateCache: (result) => result,
      onSuccess: () => {
        Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
        mutate(`/user/cards`);
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
      <PaymentCard card={card} style={{ marginBottom: 20 }} />

      {card.status != "canceled" && (
        <View style={{ flexDirection: "row", marginBottom: 20 }}>
          <Button
            style={{
              flexBasis: 0,
              flexGrow: 1,
              marginHorizontal: 10,
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
                marginHorizontal: 10,
                opacity: 0.6,
              }}
            >
              Reveal details
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
          {transactions.data.map((transaction, index) => (
            <Transaction
              transaction={transaction}
              key={transaction.id}
              top={index == 0}
              bottom={index == transactions.data.length - 1}
              hideAvatar
            />
          ))}
        </>
      )}
    </ScrollView>
  );
}
