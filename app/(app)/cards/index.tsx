import { MenuView } from "@expo/ui/community/menu";
import { Ionicons } from "@expo/vector-icons";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { router, useNavigation } from "expo-router";
import { useFocusEffect, useTheme } from "expo-router/react-navigation";
import { memo, useCallback, useEffect, useMemo, useState } from "react";
import {
  Pressable,
  RefreshControl,
  useWindowDimensions,
  View,
} from "react-native";
import { Gesture } from "react-native-gesture-handler";
import ReorderableList, {
  useReorderableDrag,
} from "react-native-reorderable-list";

import CardListSkeleton from "@/components/cards/CardListSkeleton";
import { NoCardsEmptyState } from "@/components/cards/NoCardsEmptyState";
import PaymentCard from "@/components/PaymentCard";
import { Text } from "@/components/Text";
import Card from "@/lib/types/Card";
import GrantCard from "@/lib/types/GrantCard";
import Organization from "@/lib/types/Organization";
import User from "@/lib/types/User";
import { useHeaderInset } from "@/lib/useHeaderInset";
import { useOfflineSWR } from "@/lib/useOfflineSWR";
import { palette } from "@/styles/theme";
import { useCardPattern } from "@/utils/cardPattern";
import * as Haptics from "@/utils/haptics";

type CardWithGrant = Card &
  Required<Pick<Card, "last4">> & { grant_id?: string };

type CardItemProps = {
  item: CardWithGrant;
  isActive: boolean;
  onPress: (card: CardWithGrant) => void;
};

const STATUS_ORDER: Record<string, number> = {
  active: 0,
  inactive: 1,
  frozen: 2,
  canceled: 3,
  expired: 4,
};

const panGesture = Gesture.Pan().activateAfterLongPress(520);

const CardItem = memo(function CardItem({
  item,
  isActive,
  onPress,
}: CardItemProps) {
  const drag = useReorderableDrag();
  const cardPattern = useCardPattern(item, item.type === "virtual");
  return (
    <Pressable
      onPress={() => onPress(item)}
      onLongPress={() => {
        Haptics.dragStartAsync();
        drag();
      }}
      disabled={isActive}
      style={{ borderRadius: 15, overflow: "hidden" }}
    >
      <PaymentCard
        card={item}
        style={{ marginBottom: 10 }}
        pattern={cardPattern?.pattern}
        patternDimensions={cardPattern?.dimensions}
      />
    </Pressable>
  );
});

export default function Page() {
  const navigation = useNavigation();
  const { data: cards, mutate: reloadCards } =
    useOfflineSWR<(Card & Required<Pick<Card, "last4">>)[]>("user/cards");
  const { data: grantCards, mutate: reloadGrantCards } =
    useOfflineSWR<GrantCard[]>("user/card_grants");
  const { data: user } = useOfflineSWR<User>("user");
  const { data: organizations } =
    useOfflineSWR<Organization[]>("user/organizations");
  const { colors: themeColors } = useTheme();
  const headerInset = useHeaderInset();
  const { width } = useWindowDimensions();

  const [canceledCardsShown, setCanceledCardsShown] = useState(true);
  const [frozenCardsShown, setFrozenCardsShown] = useState(true);
  const [orderMap, setOrderMap] = useState<Record<string, number>>({});
  const [refreshing, setRefreshing] = useState(false);

  useEffect(() => {
    AsyncStorage.multiGet(["canceledCardsShown", "frozenCardsShown"]).then(
      ([[, canceled], [, frozen]]) => {
        if (canceled !== null) setCanceledCardsShown(canceled === "true");
        if (frozen !== null) setFrozenCardsShown(frozen === "true");
      },
    );
  }, []);

  const allCards = useMemo<CardWithGrant[] | undefined>(() => {
    if (!cards) return undefined;

    const grantCardMap = new Map<string, string>();
    (grantCards ?? []).forEach((g) => {
      if (g.card_id) grantCardMap.set(g.card_id, g.id);
    });

    return cards
      .filter(
        (card): card is Card & Required<Pick<Card, "last4">> => !!card.last4,
      )
      .map((card) => ({ ...card, grant_id: grantCardMap.get(card.id) }))
      .sort(
        (a, b) => (STATUS_ORDER[a.status] ?? 5) - (STATUS_ORDER[b.status] ?? 5),
      );
  }, [cards, grantCards]);

  useEffect(() => {
    AsyncStorage.getItem("cardOrder")
      .then((savedOrder) => {
        if (savedOrder) setOrderMap(JSON.parse(savedOrder));
      })
      .catch((error) => {
        console.error("Error loading saved card order", error, {
          context: { action: "load_card_order" },
        });
      });
  }, []);

  const sortedCards = useMemo<CardWithGrant[] | undefined>(() => {
    if (!allCards) return undefined;
    return [...allCards].sort(
      (a, b) =>
        (orderMap[a.id] ?? Number.MAX_SAFE_INTEGER) -
        (orderMap[b.id] ?? Number.MAX_SAFE_INTEGER),
    );
  }, [allCards, orderMap]);

  useFocusEffect(
    useCallback(() => {
      reloadCards();
      reloadGrantCards();
    }, [reloadCards, reloadGrantCards]),
  );

  const handleOrderCard = useCallback(() => {
    router.push("/cards/order");
  }, []);

  useEffect(() => {
    navigation.setOptions({
      headerRight: () => (
        <View style={{ flexDirection: "row" }}>
          <MenuView
            actions={[
              {
                id: "toggleCanceledCards",
                title: "Hide Canceled Cards",
                state: canceledCardsShown ? "off" : "on",
              },
              {
                id: "toggleFrozenCards",
                title: "Hide Frozen Cards",
                state: frozenCardsShown ? "off" : "on",
              },
            ]}
            onPressAction={({ nativeEvent: { event } }) => {
              if (event === "toggleCanceledCards") {
                setCanceledCardsShown((v) => {
                  AsyncStorage.setItem("canceledCardsShown", String(!v));
                  return !v;
                });
              }
              if (event === "toggleFrozenCards") {
                setFrozenCardsShown((v) => {
                  AsyncStorage.setItem("frozenCardsShown", String(!v));
                  return !v;
                });
              }
            }}
          >
            <Ionicons.Button
              name="ellipsis-horizontal"
              backgroundColor="transparent"
              size={24}
              color={themeColors.text}
              iconStyle={{ marginRight: 0 }}
            />
          </MenuView>
          <Ionicons.Button
            name="add"
            backgroundColor="transparent"
            size={24}
            color={themeColors.text}
            iconStyle={{ marginRight: 0 }}
            onPress={() => {
              if (user && organizations) {
                handleOrderCard();
              }
            }}
            underlayColor={"transparent"}
          />
        </View>
      ),
    });
  }, [
    themeColors,
    navigation,
    canceledCardsShown,
    frozenCardsShown,
    user,
    organizations,
    handleOrderCard,
  ]);

  const filteredCards = useMemo(() => {
    if (!sortedCards) return [];
    return sortedCards.filter((c) => {
      if (
        !canceledCardsShown &&
        (c.status === "canceled" || c.status === "expired")
      )
        return false;
      if (!frozenCardsShown && c.status === "frozen") return false;
      return true;
    });
  }, [sortedCards, canceledCardsShown, frozenCardsShown]);

  const onRefresh = useCallback(async () => {
    try {
      setRefreshing(true);
      await Promise.all([reloadCards(), reloadGrantCards()]);
    } catch (error) {
      console.error("Error refreshing cards", error, {
        context: { action: "refresh_cards" },
      });
    } finally {
      setRefreshing(false);
    }
  }, [reloadCards, reloadGrantCards]);

  const saveCardOrder = useCallback(async (order: Record<string, number>) => {
    try {
      await AsyncStorage.setItem("cardOrder", JSON.stringify(order));
    } catch (error) {
      console.error("Error saving card order", error, {
        context: { action: "save_card_order" },
      });
    }
  }, []);

  const handleCardPress = useCallback((card: CardWithGrant) => {
    if (card.grant_id) {
      router.push({
        pathname: "/cards/card-grants/[id]",
        params: {
          card: JSON.stringify(card),
          id: card.grant_id,
          cardId: card.id,
        },
      });
    } else {
      router.push({
        pathname: "/cards/[id]",
        params: { id: card.id, card: JSON.stringify(card) },
      });
    }
  }, []);

  const renderItem = useCallback(
    ({ item }: { item: CardWithGrant }) => (
      <CardItem item={item} isActive={false} onPress={handleCardPress} />
    ),
    [handleCardPress],
  );

  const itemHeight = (width - 40) / 1.588 + 10;

  const getItemLayout = useCallback(
    (_: ArrayLike<CardWithGrant> | null | undefined, index: number) => ({
      length: itemHeight,
      offset: itemHeight * index,
      index,
    }),
    [itemHeight],
  );

  const handleReorder = useCallback(
    ({ from, to }: { from: number; to: number }) => {
      if (!sortedCards || from === to) return;
      if (
        from < 0 ||
        to < 0 ||
        from >= filteredCards.length ||
        to >= filteredCards.length
      ) {
        return;
      }

      const moved = [...filteredCards];
      const [removed] = moved.splice(from, 1);
      moved.splice(to, 0, removed);

      const visibleIds = new Set(filteredCards.map((c) => c.id));
      let cursor = 0;
      const merged = sortedCards.map((card) =>
        visibleIds.has(card.id) ? moved[cursor++] : card,
      );

      Haptics.selectionAsync();

      const nextOrder: Record<string, number> = {};
      merged.forEach((card, index) => {
        nextOrder[card.id] = index;
      });
      setOrderMap(nextOrder);
      saveCardOrder(nextOrder);
    },
    [filteredCards, sortedCards, saveCardOrder],
  );

  if (!sortedCards) {
    return (
      <View style={{ flex: 1, paddingTop: headerInset }}>
        <CardListSkeleton />
      </View>
    );
  }

  if (filteredCards.length === 0) {
    return <NoCardsEmptyState onOrderCard={handleOrderCard} />;
  }

  return (
    <ReorderableList
      data={filteredCards}
      keyExtractor={(item, index) => item?.id ?? `card-${index}`}
      onReorder={handleReorder}
      getItemLayout={getItemLayout}
      initialNumToRender={3}
      maxToRenderPerBatch={4}
      showsVerticalScrollIndicator={false}
      refreshControl={
        <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
      }
      contentInsetAdjustmentBehavior="automatic"
      contentContainerStyle={{
        paddingHorizontal: 20,
        paddingTop: headerInset,
      }}
      panGesture={panGesture}
      renderItem={renderItem}
      ListFooterComponent={
        sortedCards.length > 2 ? (
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
        ) : null
      }
    />
  );
}
