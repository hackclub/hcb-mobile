import { useBottomTabBarHeight } from "@react-navigation/bottom-tabs";
import { FlatList } from "react-native";
import useSWR from "swr";

import PaymentCard from "../components/PaymentCard";
import Card from "../lib/types/Card";

export default function CardsPage() {
  const { data: cards } = useSWR<Card[]>("/user/cards");
  const tabBarHeight = useBottomTabBarHeight();

  if (cards) {
    return (
      <FlatList
        data={cards}
        contentContainerStyle={{ paddingBottom: tabBarHeight }}
        scrollIndicatorInsets={{ bottom: tabBarHeight }}
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
