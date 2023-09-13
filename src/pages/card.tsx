import { NativeStackScreenProps } from "@react-navigation/native-stack";
import { useContext } from "react";
import { ScrollView, View } from "react-native";
import useSWR from "swr";
import useSWRMutation from "swr/mutation";

import AuthContext from "../auth";
import Button from "../components/Button";
import PaymentCard from "../components/PaymentCard";
import { CardsStackParamList } from "../lib/NavigatorParamList";
import Card from "../lib/types/Card";

type Props = NativeStackScreenProps<CardsStackParamList, "Card">;

export default function CardPage({
  route: {
    params: { cardId },
  },
}: Props) {
  const { token } = useContext(AuthContext);

  const { isLoading, data: card } = useSWR<Card>(`/cards/${cardId}`);
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
      populateCache(result, _currentData) {
        return result;
      },
    },
  );

  if (isLoading || !card) {
    return null;
  }

  const toggleCardFrozen = () => {
    if (card.status == "active") {
      update("frozen");
    } else {
      update("active");
    }
  };

  return (
    <ScrollView contentContainerStyle={{ padding: 20 }}>
      <PaymentCard card={card} />
      <View style={{ flexDirection: "row", marginTop: 20 }}>
        {card.status != "canceled" && (
          <Button
            style={{ flexBasis: 0, flexGrow: 1, marginHorizontal: 10 }}
            onPress={() => toggleCardFrozen()}
            loading={isMutating}
          >
            {card.status == "active" ? "Freeze" : "Unfreeze"} card
          </Button>
        )}
        {card.type == "virtual" && (
          <Button style={{ flexBasis: 0, flexGrow: 1, marginHorizontal: 10 }}>
            Reveal details
          </Button>
        )}
      </View>
    </ScrollView>
  );
}
