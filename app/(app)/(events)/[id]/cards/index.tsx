import { MenuView } from "@expo/ui/community/menu";
import { Ionicons } from "@expo/vector-icons";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { router, useLocalSearchParams, useNavigation } from "expo-router";
import { useFocusEffect, useTheme } from "expo-router/react-navigation";
import { memo, useCallback, useEffect, useMemo, useState } from "react";
import {
  Pressable,
  RefreshControl,
  ScrollView,
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

const STATUS_ORDER: Record<string, number> = {
  active: 0,
  inactive: 1,
  frozen: 2,
  canceled: 3,
  expired: 4,
};

const panGesture = Gesture.Pan().activateAfterLongPress(520);

export default function Page() {
  const navigation = useNavigation();
  const params = useLocalSearchParams<{ id: string }>();
  const { colors: themeColors } = useTheme();
  const headerInset = useHeaderInset();
  const { width } = useWindowDimensions();

  const { data: cards, mutate: reloadCards } = useOfflineSWR<
    (Card & Required<Pick<Card, "last4">>)[]
  >(`organizations/${params.id}/cards`);

  const { data: cardGrants } = useOfflineSWR<Pick<GrantCard, "card_id">[]>(
    `organizations/${params.id}/card_grants`,
  );

  const [canceledCardsShown, setCanceledCardsShown] = useState(true);
  const [frozenCardsShown, setFrozenCardsShown] = useState(true);

  useEffect(() => {
    AsyncStorage.multiGet(["canceledCardsShown", "frozenCardsShown"]).then(
      ([[, canceled], [, frozen]]) => {
        if (canceled !== null) setCanceledCardsShown(canceled === "true");
        if (frozen !== null) setFrozenCardsShown(frozen === "true");
      },
    );
  }, []);
  const [reorderedCards, setReorderedCards] = useState<CardWithGrant[]>();
  const [refreshing, setRefreshing] = useState(false);

  useFocusEffect(
    useCallback(() => {
      reloadCards();
    }, [reloadCards]),
  );

  const grantCardIds = useMemo(
    () => new Set((cardGrants ?? []).map((g) => g.card_id).filter(Boolean)),
    [cardGrants],
  );

  // Derive sorted cards from API data; reset manual order when cards refresh
  const sortedCards = useMemo<CardWithGrant[] | undefined>(() => {
    if (!cards) return undefined;
    if (reorderedCards) return reorderedCards;
    return [...cards]
      .filter(
        (card): card is CardWithGrant =>
          !!card.last4 && !grantCardIds.has(card.id),
      )
      .sort(
        (a, b) => (STATUS_ORDER[a.status] ?? 5) - (STATUS_ORDER[b.status] ?? 5),
      );
  }, [cards, reorderedCards, grantCardIds]);

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
            onPress={() =>
              router.push({
                pathname: "/(events)/[id]/cards/order",
                params: { id: params.id },
              })
            }
            underlayColor="transparent"
          />
        </View>
      ),
    });
  }, [
    themeColors,
    navigation,
    canceledCardsShown,
    frozenCardsShown,
    params.id,
  ]);

  const onRefresh = useCallback(async () => {
    try {
      setRefreshing(true);
      setReorderedCards(undefined);
      await reloadCards();
    } finally {
      setRefreshing(false);
    }
  }, [reloadCards]);

  const handleOrderCard = useCallback(() => {
    router.push({
      pathname: "/(events)/[id]/cards/order",
      params: { id: params.id },
    });
  }, [params.id]);

  const handleCardPress = useCallback(
    (card: CardWithGrant) => {
      router.push({
        pathname: "/(events)/[id]/cards/[cardId]",
        params: { id: params.id, cardId: card.id, card: JSON.stringify(card) },
      });
    },
    [params.id],
  );

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
      const current = reorderedCards ?? sortedCards;
      if (!current || from === to) return;
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
      Haptics.selectionAsync();
      setReorderedCards(
        current.map((card) =>
          visibleIds.has(card.id) ? moved[cursor++] : card,
        ),
      );
    },
    [filteredCards, reorderedCards, sortedCards],
  );

  if (!sortedCards) {
    return (
      <ScrollView
        contentInsetAdjustmentBehavior="automatic"
        contentContainerStyle={{
          flex: 1,
          paddingTop: headerInset,
          justifyContent: "center",
          alignItems: "center",
        }}
      >
        <CardListSkeleton />
      </ScrollView>
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
      contentInsetAdjustmentBehavior="automatic"
      refreshControl={
        <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
      }
      contentContainerStyle={{ paddingHorizontal: 20, paddingTop: headerInset }}
      panGesture={panGesture}
      renderItem={renderItem}
      ListFooterComponent={
        (reorderedCards ?? sortedCards).length > 2 ? (
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
