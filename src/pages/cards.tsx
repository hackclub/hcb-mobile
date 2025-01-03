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

type Props = NativeStackScreenProps<CardsStackParamList, "CardList">;

export default function CardsPage({ navigation }: Props) {
  const { data: cards, mutate: reloadCards } =
    useSWR<(Card & Required<Pick<Card, "last4">>)[]>("user/cards");
  const { data: grantCards, mutate: reloadGrantCards } = useSWR<GrantCard[]>(
    "user/card_grants"
  );
  const tabBarHeight = useBottomTabBarHeight();
  const scheme = useColorScheme();

  useFocusEffect(() => {
    reloadCards();
    reloadGrantCards();
  });

  const [frozenCardsShown, setFrozenCardsShown] = useState(true);
  const [allCards, setAllCards] = useState<((Card & Required<Pick<Card, "last4">>) | GrantCard)[]>();
  const [refreshing] = useState(false);

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
      ),
    });
  }, [navigation, frozenCardsShown, scheme]);

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
        combineCards();
      }
    }, [cards, grantCards]);

    const combineCards = () => {
      // Transform grantCards
      const transformedGrantCards = grantCards?.map((grantCard) => ({
        ...grantCard,
        grant_id: grantCard.id, // Move original id to grant_id
        id: grantCard.card_id, // Replace id with card_id
      }));
  
      // Filter out cards that are also grantCards
      const filteredCards = cards?.filter(
        (card) => !transformedGrantCards?.some((grantCard) => grantCard.id === card.id)
      );
  
      // Combine filtered cards and transformed grantCards
      const combinedCards = [...(filteredCards || []), ...(transformedGrantCards || [])];

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

    const onRefresh = async () => {
      await reloadCards();
      await reloadGrantCards();
    }
  
  

  if (allCards) {
    return (
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
        onRefresh={() => onRefresh()}
        refreshing={refreshing}
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
  } else {
    return (
      <View style={{ flex: 1, justifyContent: "center", alignItems: "center" }}>
        <ActivityIndicator size="large" color={palette.primary} />
      </View>
    );
  }
}
