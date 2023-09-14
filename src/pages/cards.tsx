import { useBottomTabBarHeight } from "@react-navigation/bottom-tabs";
import { NativeStackScreenProps } from "@react-navigation/native-stack";
import { FlatList, Pressable } from "react-native";
import useSWR from "swr";

import PaymentCard from "../components/PaymentCard";
import listPreloader from "../lib/listPreloader";
import { CardsStackParamList } from "../lib/NavigatorParamList";
import Card from "../lib/types/Card";

type Props = NativeStackScreenProps<CardsStackParamList, "CardList">;

export default function CardsPage({ navigation }: Props) {
  const {
    data: cards,
    mutate: refresh,
    isValidating,
  } = useSWR<Card[]>("/user/cards", {
    use: [listPreloader<Card>((c) => `/cards/${c.id}`)],
  });
  const tabBarHeight = useBottomTabBarHeight();

  if (cards) {
    return (
      <FlatList
        data={cards}
        contentContainerStyle={{
          paddingBottom: tabBarHeight + 20,
          paddingTop: 20,
        }}
        scrollIndicatorInsets={{ bottom: tabBarHeight }}
        onRefresh={() => refresh()}
        refreshing={isValidating}
        renderItem={({ item }) => (
          <Pressable
            onPress={() =>
              navigation.navigate("Card", {
                cardId: item.id,
                last4: item.last4!,
              })
            }
          >
            <PaymentCard
              card={item}
              style={{ marginHorizontal: 20, marginVertical: 8 }}
            />
          </Pressable>
        )}
      />
    );
  }
}
