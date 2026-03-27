import { Ionicons } from "@expo/vector-icons";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { MenuView } from "@react-native-menu/menu";
import { useFocusEffect, useTheme } from "@react-navigation/native";
import { Text } from "components/Text";
import { router, useLocalSearchParams, useNavigation } from "expo-router";
import { generate } from "hcb-geo-pattern";
import { useCallback, useEffect, useMemo, useState } from "react";
import {
  Pressable,
  RefreshControl,
  ScrollView,
  useColorScheme,
  View,
} from "react-native";
import { Gesture } from "react-native-gesture-handler";
import ReorderableList, {
  useReorderableDrag,
} from "react-native-reorderable-list";

import CardListSkeleton from "@/../src/components/cards/CardListSkeleton";
import { NoCardsEmptyState } from "@/../src/components/cards/NoCardsEmptyState";
import PaymentCard from "@/../src/components/PaymentCard";
import Card from "@/../src/lib/types/Card";
import { useOfflineSWR } from "@/../src/lib/useOfflineSWR";
import { palette } from "@/../src/styles/theme";
import * as Haptics from "@/../src/utils/haptics";
import { normalizeSvg } from "@/../src/utils/util";

type CardWithGrant = Card & Required<Pick<Card, "last4">> & { grant_id?: string };

type CardItemProps = {
  item: CardWithGrant;
  isActive: boolean;
  onPress: (card: CardWithGrant) => void;
  pattern?: string;
  patternDimensions?: { width: number; height: number };
};

const CardItem = ({
  item,
  isActive,
  onPress,
  pattern,
  patternDimensions,
}: CardItemProps) => {
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
};

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
  const scheme = useColorScheme();

  const { data: cards, mutate: reloadCards } = useOfflineSWR<
    (Card & Required<Pick<Card, "last4">>)[]
  >(`organizations/${params.id}/cards`);

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
  const [patternCache, setPatternCache] = useState<
    Record<string, { pattern: string; dimensions: { width: number; height: number } }>
  >({});

  useFocusEffect(
    useCallback(() => {
      reloadCards();
    }, [reloadCards]),
  );

  // Derive sorted cards from API data; reset manual order when cards refresh
  const sortedCards = useMemo<CardWithGrant[] | undefined>(() => {
    if (!cards) return undefined;
    if (reorderedCards) return reorderedCards;
    return [...cards]
      .filter((card): card is CardWithGrant => !!card.last4)
      .sort((a, b) => (STATUS_ORDER[a.status] ?? 5) - (STATUS_ORDER[b.status] ?? 5));
  }, [cards, reorderedCards]);

  const filteredCards = useMemo(() => {
    if (!sortedCards) return [];
    return sortedCards.filter((c) => {
      if (!canceledCardsShown && (c.status === "canceled" || c.status === "expired"))
        return false;
      if (!frozenCardsShown && c.status === "frozen") return false;
      return true;
    });
  }, [sortedCards, canceledCardsShown, frozenCardsShown]);

  // Generate patterns in parallel
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
              card.status !== "active" ? (card.status === "frozen" ? 0.23 : 1) : 0,
          });
          return {
            id: card.id,
            pattern: normalizeSvg(patternData.toSVG(), patternData.width, patternData.height),
            dimensions: { width: patternData.width, height: patternData.height },
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

  useEffect(() => {
    navigation.setOptions({
      headerRight: () => (
        <View style={{ flexDirection: "row" }}>
          <MenuView
            isAnchoredToRight={true}
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
            themeVariant={scheme || undefined}
          >
            <Ionicons.Button
              name="ellipsis-horizontal-circle-outline"
              backgroundColor="transparent"
              size={24}
              color={themeColors.text}
              iconStyle={{ marginRight: 0 }}
            />
          </MenuView>
          <Ionicons.Button
            name="add-circle-outline"
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
  }, [themeColors, navigation, canceledCardsShown, frozenCardsShown, scheme, params.id]);

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
      <ScrollView
        contentInsetAdjustmentBehavior="automatic"
        contentContainerStyle={{ flex: 1, justifyContent: "center", alignItems: "center" }}
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
      keyExtractor={(item) => item.id}
      onReorder={({ from, to }) => {
        Haptics.selectionAsync();
        const next = [...(reorderedCards ?? sortedCards)];
        const [removed] = next.splice(from, 1);
        next.splice(to, 0, removed);
        setReorderedCards(next);
      }}
      showsVerticalScrollIndicator={false}
      contentInsetAdjustmentBehavior="automatic"
      refreshControl={
        <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
      }
      contentContainerStyle={{ paddingHorizontal: 20 }}
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
