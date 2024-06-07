import { Ionicons } from "@expo/vector-icons";
import { MenuView } from "@react-native-menu/menu";
import { useBottomTabBarHeight } from "@react-navigation/bottom-tabs";
import { useFocusEffect } from "@react-navigation/native";
import { NativeStackScreenProps } from "@react-navigation/native-stack";
import { useEffect, useState } from "react";
import { FlatList, Pressable, useColorScheme } from "react-native";
import useSWR from "swr";

import PaymentCard from "../components/PaymentCard";
import { CardsStackParamList } from "../lib/NavigatorParamList";
import Card from "../lib/types/Card";
import { palette } from "../theme";

type Props = NativeStackScreenProps<CardsStackParamList, "CardList">;

export default function CardsPage({ navigation }: Props) {
  const { data: cards, mutate: reloadCards } =
    useSWR<(Card & Required<Pick<Card, "last4">>)[]>("user/cards");
  const tabBarHeight = useBottomTabBarHeight();
  const scheme = useColorScheme();

  useFocusEffect(() => {
    reloadCards();
  });

  const [frozenCardsShown, setFrozenCardsShown] = useState(false);

  useEffect(() => {
    navigation.setOptions({
      headerRight: () => (
        <MenuView
          actions={[
            {
              id: "showFrozenCards",
              title: "Show inactive cards",
              state: frozenCardsShown ? "on" : "off",
            },
          ]}
          onPressAction={({ nativeEvent: { event } }) => {
            if (event == "showFrozenCards") {
              setFrozenCardsShown((x) => !x);
            }
          }}
          themeVariant={scheme || undefined}
        >
          <Ionicons.Button
            name="ellipsis-horizontal-circle"
            backgroundColor="transparent"
            size={24}
            color={palette.primary}
            iconStyle={{ marginRight: 0 }}
          />
        </MenuView>
      ),
    });
  }, [navigation, frozenCardsShown, scheme]);

  if (cards) {
    return (
      <FlatList
        data={
          frozenCardsShown ? cards : cards.filter((c) => c.status == "active")
        }
        contentContainerStyle={{
          paddingBottom: tabBarHeight + 20,
          paddingTop: 20,
        }}
        scrollIndicatorInsets={{ bottom: tabBarHeight }}
        // onRefresh={() => refresh()}
        // refreshing={isValidating}
        renderItem={({ item }) => (
          <Pressable
            onPress={() =>
              navigation.navigate("Card", {
                card: item,
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
