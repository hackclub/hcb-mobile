import { FlatList, View } from "react-native";
import PaymentCard from "../components/paymentCard";
import useSWR from "swr";

export default function CardsPage() {
  const { data: cards } = useSWR("/user/cards");

  if (cards) {
    return (
      <FlatList
        data={cards}
        renderItem={({ item }) => (
          <PaymentCard
            card={item}
            style={{ marginHorizontal: 20, marginVertical: 8 }}
          />
        )}
      />
    );
  }
}
