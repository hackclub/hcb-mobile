import { Ionicons } from "@expo/vector-icons";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { MenuView } from "@react-native-menu/menu";
import { useBottomTabBarHeight } from "@react-navigation/bottom-tabs";
import { useFocusEffect } from "@react-navigation/native";
import { NativeStackScreenProps } from "@react-navigation/native-stack";
import { useEffect, useState } from "react";
import {
  ActivityIndicator,
  FlatList,
  Pressable,
  useColorScheme,
  View,
} from "react-native";
import useSWR from "swr";

import PaymentCard from "../components/PaymentCard";
import { CardsStackParamList } from "../lib/NavigatorParamList";
import Card from "../lib/types/Card";
import GrantCard from "../lib/types/GrantCard";
import { palette } from "../theme";
import Organization from "../lib/types/Organization";

type Props = NativeStackScreenProps<CardsStackParamList, "CardList">;

export default function CardsPage({ navigation }: Props) {
  const { data: cards, mutate: reloadCards } =
    useSWR<(Card & Required<Pick<Card, "last4">>)[]>("user/cards");
  const { data: grantCards, mutate: reloadGrantCards } = useSWR<GrantCard[]>(
    "user/card_grants"
  );
  const { data: user } = useSWR("user");
  const tabBarHeight = useBottomTabBarHeight();
  const scheme = useColorScheme();

  useFocusEffect(() => {
    reloadCards();
    reloadGrantCards();
  });

  const [frozenCardsShown, setFrozenCardsShown] = useState(true);
  const [allCards, setAllCards] = useState<((Card & Required<Pick<Card, "last4">>) | GrantCard)[]>();

  useEffect(() => {
    navigation.setOptions({
      headerRight: () => (
        <View style={{ flexDirection: "row" }}>
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
                setFrozenCardsShown(!frozenCardsShown);
                AsyncStorage.setItem("frozenCardsShown", (!frozenCardsShown).toString());
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
          <Ionicons.Button
            name="add-circle-outline"
            backgroundColor="transparent"
            size={24}
            color={palette.primary}
            iconStyle={{ marginRight: 0 }}
            onPress={() => navigation.navigate("OrderCard", { user, organizations: organizations?.filter((org: Organization) => org.playground_mode === false) })}
            underlayColor={"transparent"}
          />
        </View>
      ),
    });
  }, [navigation, frozenCardsShown, scheme, user]);

  useEffect(() => {
    const fetchFrozenCardsShown = async () => {
      const isFrozenCardsShown = await AsyncStorage.getItem("frozenCardsShown");
      if (isFrozenCardsShown) {
        setFrozenCardsShown(isFrozenCardsShown === "true");
        await AsyncStorage.setItem("frozenCardsShown", (isFrozenCardsShown === "true").toString());
      }
    };

    fetchFrozenCardsShown();

    if (cards && grantCards) {
      // Transform grantCards
      const transformedGrantCards = grantCards.map((grantCard) => ({
        ...grantCard,
        grant_id: grantCard.id, // Move original id to grant_id
        id: grantCard.card_id, // Replace id with card_id
      }));

      // Filter out cards that are also grantCards
      const filteredCards = cards.filter(
        (card) => !transformedGrantCards.some((grantCard) => grantCard.id === card.id)
      );

      // Combine filtered cards and transformed grantCards
      const combinedCards = [...filteredCards, ...transformedGrantCards];

      // Sort cards by status
      combinedCards.sort((a, b) => {
        if (a.status == "active" && b.status != "active") {
          return -1;
        } else if (a.status != "active" && b.status == "active") {
          return 1;
        } else {
          return 0;
        }
      });

      // Update state
      setAllCards(combinedCards);
    }
  }, [cards, grantCards]);

  if (allCards) {
    return (
      <View>
        <FlatList
          data={
            frozenCardsShown ? allCards : allCards.filter((c) => c.status == "active")
          }
          contentContainerStyle={{
            paddingBottom: tabBarHeight + 20,
            paddingTop: 20,
            alignItems: "center",
          }}
          scrollIndicatorInsets={{ bottom: tabBarHeight }}
          overScrollMode="never"
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
      </View>
    );
  } else {
    return (
      <View style={{ flex: 1, justifyContent: "center", alignItems: "center" }}>
        <ActivityIndicator size="large" color={palette.primary} />
      </View>
    );
  }
}
