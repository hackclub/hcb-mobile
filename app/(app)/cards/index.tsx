import { MenuView } from "@expo/ui/community/menu";
import { Ionicons } from "@expo/vector-icons";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { router, useNavigation } from "expo-router";
import { useFocusEffect, useTheme } from "expo-router/react-navigation";
import { generate } from "hcb-geo-pattern";
import { memo, useCallback, useEffect, useMemo, useState } from "react";
import { Pressable, RefreshControl, View } from "react-native";
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
import { useOfflineSWR } from "@/lib/useOfflineSWR";
import { palette } from "@/styles/theme";
import { normalizeSvg } from "@/utils/format";
import * as Haptics from "@/utils/haptics";

type CardWithGrant = Card &
  Required<Pick<Card, "last4">> & { grant_id?: string };

type CardItemProps = {
  item: CardWithGrant;
  isActive: boolean;
  onPress: (card: CardWithGrant) => void;
  pattern?: string;
  patternDimensions?: { width: number; height: number };
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
  pattern,
  patternDimensions,
}: CardItemProps) {
  const drag = useReorderableDrag();
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
        pattern={pattern}
        patternDimensions={patternDimensions}
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
  const [patternCache, setPatternCache] = useState<
    Record<
      string,
      { pattern: string; dimensions: { width: number; height: number } }
    >
  >({});

  const [canceledCardsShown, setCanceledCardsShown] = useState(true);
  const [frozenCardsShown, setFrozenCardsShown] = useState(true);
  const [sortedCards, setSortedCards] = useState<CardWithGrant[]>();
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
    if (!allCards) return;

    AsyncStorage.getItem("cardOrder")
      .then((savedOrder) => {
        if (savedOrder) {
          const orderMap: Record<string, number> = JSON.parse(savedOrder);
          setSortedCards(
            [...allCards].sort(
              (a, b) =>
                (orderMap[a.id] ?? Number.MAX_SAFE_INTEGER) -
                (orderMap[b.id] ?? Number.MAX_SAFE_INTEGER),
            ),
          );
        } else {
          setSortedCards(allCards);
        }
      })
      .catch((error) => {
        console.error("Error loading saved card order", error, {
          context: { action: "load_card_order" },
        });
        setSortedCards(allCards);
      });
  }, [allCards]);

  useEffect(() => {
    if (!cards) return;

    const virtualCards = cards.filter((c) => c.type === "virtual" && c.last4);
    if (virtualCards.length === 0) return;

    Promise.all(
      virtualCards.map(async (card) => {
        try {
          const patternData = await generate({
            input: card.id,
            grayScale:
              card.status !== "active"
                ? card.status === "frozen"
                  ? 0.23
                  : 1
                : 0,
          });
          return {
            id: card.id,
            pattern: normalizeSvg(
              patternData.toSVG(),
              patternData.width,
              patternData.height,
            ),
            dimensions: {
              width: patternData.width,
              height: patternData.height,
            },
          };
        } catch (error) {
          console.error("Error generating pattern for card", error, {
            context: { cardId: card.id },
          });
          return null;
        }
      }),
    ).then((results) => {
      const cache: typeof patternCache = {};
      for (const r of results) {
        if (r) cache[r.id] = { pattern: r.pattern, dimensions: r.dimensions };
      }
      setPatternCache(cache);
    });
  }, [cards]);

  useFocusEffect(
    useCallback(() => {
      reloadCards();
      reloadGrantCards();
    }, [reloadCards, reloadGrantCards]),
  );

  const handleOrderCard = useCallback(() => {
    const firstOrganizationId = organizations?.[0]?.id;
    if (!firstOrganizationId) return;

    router.push({
      pathname: "/cards/order/[id]",
      params: { id: firstOrganizationId },
    });
  }, [organizations]);

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

  const saveCardOrder = useCallback(async (newOrder: CardWithGrant[]) => {
    try {
      const orderMap = newOrder.reduce(
        (acc, card, index) => {
          acc[card.id] = index;
          return acc;
        },
        {} as Record<string, number>,
      );
      await AsyncStorage.setItem("cardOrder", JSON.stringify(orderMap));
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
      <CardItem
        item={item}
        isActive={false}
        onPress={handleCardPress}
        pattern={patternCache[item.id]?.pattern}
        patternDimensions={patternCache[item.id]?.dimensions}
      />
    ),
    [handleCardPress, patternCache],
  );

  if (!sortedCards) {
    return (
      <View style={{ flex: 1, justifyContent: "center", alignItems: "center" }}>
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
      keyExtractor={(item) => item.id}
      onReorder={({ from, to }) => {
        Haptics.selectionAsync();
        const newCards = [...sortedCards];
        const [removed] = newCards.splice(from, 1);
        newCards.splice(to, 0, removed);
        setSortedCards(newCards);
        saveCardOrder(newCards);
      }}
      showsVerticalScrollIndicator={false}
      refreshControl={
        <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
      }
      contentContainerStyle={{ paddingHorizontal: 20 }}
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
