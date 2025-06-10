import { Ionicons } from "@expo/vector-icons";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { MenuView } from "@react-native-menu/menu";
import { useBottomTabBarHeight } from "@react-navigation/bottom-tabs";
import { useFocusEffect } from "@react-navigation/native";
import { NativeStackScreenProps } from "@react-navigation/native-stack";
import * as Haptics from "expo-haptics";
import { useCallback, useEffect, useState } from "react";
import { Pressable, Text, useColorScheme, View } from "react-native";
import DraggableFlatList, {
  RenderItemParams,
  ScaleDecorator,
} from "react-native-draggable-flatlist";
import useSWR from "swr";

import CardListSkeleton from "../components/CardListSkeleton";
import PaymentCard from "../components/PaymentCard";
import { CardsStackParamList } from "../lib/NavigatorParamList";
import Card from "../lib/types/Card";
import GrantCard from "../lib/types/GrantCard";
import { palette } from "../theme";

type Props = NativeStackScreenProps<CardsStackParamList, "CardList">;

export default function CardsPage({ navigation }: Props) {
  const { data: cards, mutate: reloadCards } =
    useSWR<(Card & Required<Pick<Card, "last4">>)[]>("user/cards");
  const { data: grantCards, mutate: reloadGrantCards } =
    useSWR<GrantCard[]>("user/card_grants");
  const tabBarHeight = useBottomTabBarHeight();
  const scheme = useColorScheme();

  useFocusEffect(() => {
    reloadCards();
    reloadGrantCards();
  });

  const [canceledCardsShown, setCanceledCardsShown] = useState(true);
  const [allCards, setAllCards] =
    useState<((Card & Required<Pick<Card, "last4">>) | GrantCard)[]>();
  const [sortedCards, setSortedCards] =
    useState<((Card & Required<Pick<Card, "last4">>) | GrantCard)[]>();
  const [refreshing] = useState(false);

  useEffect(() => {
    navigation.setOptions({
      headerRight: () => (
        <MenuView
          actions={[
            {
              id: "showFrozenCards",
              title: "Show canceled cards",
              state: canceledCardsShown ? "on" : "off",
            },
          ]}
          onPressAction={({ nativeEvent: { event } }) => {
            if (event == "showFrozenCards") {
              setCanceledCardsShown(!canceledCardsShown);
              AsyncStorage.setItem(
                "canceledCardsShown",
                (!canceledCardsShown).toString(),
              );
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
  }, [navigation, canceledCardsShown, scheme]);

  const combineCards = useCallback(() => {
    // Transform grantCards
    const transformedGrantCards = grantCards
      ?.map((grantCard) => ({
        ...grantCard,
        grant_id: grantCard.id, // Move original id to grant_id
        id: grantCard.card_id, // Replace id with card_id
      }))
      .filter(
        (grantCard) => grantCard.card_id !== null, // Filter out the card grants that haven't been assigned a card yet
      );

    // Filter out cards that are also grantCards
    const filteredCards = cards?.filter(
      (card) =>
        !transformedGrantCards?.some((grantCard) => grantCard.id === card.id),
    );

    // Combine filtered cards and transformed grantCards
    const combinedCards = [
      ...(filteredCards || []),
      ...(transformedGrantCards || []),
    ];

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
    // @ts-expect-error both types have the same properties that are used
    setAllCards(combinedCards);
  }, [cards, grantCards]);

  useEffect(() => {
    const fetchFrozenCardsShown = async () => {
      const isCanceledCardsShown =
        await AsyncStorage.getItem("canceledCardsShown");
      if (isCanceledCardsShown) {
        setCanceledCardsShown(isCanceledCardsShown === "true");
        await AsyncStorage.setItem(
          "canceledCardsShown",
          (isCanceledCardsShown === "true").toString(),
        );
      }
    };

    fetchFrozenCardsShown();

    if (cards && grantCards) {
      combineCards();
    }
  }, [cards, grantCards, combineCards]);

  // Load and apply saved order when allCards changes
  useEffect(() => {
    const loadSavedOrder = async () => {
      if (!allCards) return;

      const savedOrder = await AsyncStorage.getItem("cardOrder");
      if (savedOrder) {
        const orderMap = JSON.parse(savedOrder);
        const sorted = [...allCards].sort((a, b) => {
          const orderA = orderMap[a.id] ?? Number.MAX_SAFE_INTEGER;
          const orderB = orderMap[b.id] ?? Number.MAX_SAFE_INTEGER;
          return orderA - orderB;
        });
        setSortedCards(sorted);
      } else {
        setSortedCards(allCards);
      }
    };

    loadSavedOrder();
  }, [allCards]);

  const onRefresh = async () => {
    await reloadCards();
    await reloadGrantCards();
  };

  const saveCardOrder = async (
    newOrder: ((Card & Required<Pick<Card, "last4">>) | GrantCard)[],
  ) => {
    const orderMap = newOrder.reduce(
      (acc, card, index) => {
        acc[card.id] = index;
        return acc;
      },
      {} as Record<string, number>,
    );
    await AsyncStorage.setItem("cardOrder", JSON.stringify(orderMap));
  };

  if (sortedCards) {
    return (
      <DraggableFlatList
        data={
          canceledCardsShown
            ? sortedCards
            : sortedCards.filter((c) => c.status == "active")
        }
        keyExtractor={(item) => item.id}
        onDragBegin={() => {
          Haptics.selectionAsync();
        }}
        onDragEnd={({ data }) => {
          setSortedCards(data);
          saveCardOrder(data);
        }}
        contentContainerStyle={{
          paddingBottom: tabBarHeight + 20,
          paddingTop: 20,
          alignItems: "center",
        }}
        scrollIndicatorInsets={{ bottom: tabBarHeight }}
        onRefresh={onRefresh}
        refreshing={refreshing}
        renderItem={({
          item,
          drag,
          isActive,
        }: RenderItemParams<
          (Card & Required<Pick<Card, "last4">>) | GrantCard
        >) => (
          <ScaleDecorator activeScale={0.95}>
            <Pressable
              onPress={() =>
                navigation.navigate("Card", {
                  card: item,
                })
              }
              onLongPress={drag}
              disabled={isActive}
            >
              <PaymentCard
                card={item}
                style={{ marginHorizontal: 20, marginVertical: 8 }}
              />
            </Pressable>
          </ScaleDecorator>
        )}
        ListFooterComponent={() =>
          sortedCards.length > 2 && (
            <Text
              style={{
                color: palette.muted,
                textAlign: "center",
                marginTop: 10,
                marginBottom: 10,
              }}
            >
              Drag to reorder cards
            </Text>
          )
        }
      />
    );
  } else {
    return (
      <View style={{ flex: 1, justifyContent: "center", alignItems: "center" }}>
        <CardListSkeleton />
      </View>
    );
  }
}
