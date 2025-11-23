import { Ionicons } from "@expo/vector-icons";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { MenuView } from "@react-native-menu/menu";
import { useBottomTabBarHeight } from "@react-navigation/bottom-tabs";
import { useFocusEffect, useTheme } from "@react-navigation/native";
import { NativeStackScreenProps } from "@react-navigation/native-stack";
import { generate } from "hcb-geo-pattern";
import { useCallback, useEffect, useMemo, useState } from "react";
import {
  Pressable,
  RefreshControl,
  Text,
  useColorScheme,
  View,
} from "react-native";
import { Gesture } from "react-native-gesture-handler";
import ReorderableList, {
  useReorderableDrag,
} from "react-native-reorderable-list";

import CardListSkeleton from "../../components/cards/CardListSkeleton";
import PaymentCard from "../../components/PaymentCard";
import { CardsStackParamList } from "../../lib/NavigatorParamList";
import Card from "../../lib/types/Card";
import GrantCard from "../../lib/types/GrantCard";
import Organization from "../../lib/types/Organization";
import User from "../../lib/types/User";
import { useOfflineSWR } from "../../lib/useOfflineSWR";
import { palette } from "../../styles/theme";
import * as Haptics from "../../utils/haptics";
import { normalizeSvg } from "../../utils/util";

type Props = NativeStackScreenProps<CardsStackParamList, "CardList">;

type CardItemProps = {
  item: (Card & Required<Pick<Card, "last4">>) | GrantCard;
  isActive: boolean;
  onPress: (card: (Card & Required<Pick<Card, "last4">>) | GrantCard) => void;
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
        style={{ marginHorizontal: 20, marginVertical: 8 }}
        pattern={pattern}
        patternDimensions={patternDimensions}
      />
    </Pressable>
  );
};

export default function CardsPage({ navigation }: Props) {
  const { data: cards, mutate: reloadCards } =
    useOfflineSWR<(Card & Required<Pick<Card, "last4">>)[]>("user/cards");
  const { data: grantCards, mutate: reloadGrantCards } =
    useOfflineSWR<GrantCard[]>("user/card_grants");
  const { data: user } = useOfflineSWR<User>("user");
  const { data: organizations } =
    useOfflineSWR<Organization[]>("user/organizations");
  const tabBarHeight = useBottomTabBarHeight();
  const scheme = useColorScheme();
  const { colors: themeColors } = useTheme();
  // Cache for card patterns
  const [patternCache, setPatternCache] = useState<
    Record<
      string,
      { pattern: string; dimensions: { width: number; height: number } }
    >
  >({});

  useEffect(() => {
    const generatePatterns = async () => {
      if (!cards && !grantCards) return;

      const allCards = [...(cards || []), ...(grantCards || [])];
      const newPatternCache: Record<
        string,
        { pattern: string; dimensions: { width: number; height: number } }
      > = {};

      for (const card of allCards) {
        if (card.type !== "virtual") continue;

        try {
          const patternData = await generate({
            input: card.id,
            grayScale:
              card.status !== "active"
                ? card.status == "frozen"
                  ? 0.23
                  : 1
                : 0,
          });
          const normalizedPattern = normalizeSvg(
            patternData.toSVG(),
            patternData.width,
            patternData.height,
          );
          newPatternCache[card.id] = {
            pattern: normalizedPattern,
            dimensions: {
              width: patternData.width,
              height: patternData.height,
            },
          };
        } catch (error) {
          console.error("Error generating pattern for card", error, {
            context: { cardId: card.id },
          });
        }
      }

      setPatternCache(newPatternCache);
    };

    generatePatterns();
  }, [cards, grantCards]);

  useFocusEffect(
    useCallback(() => {
      // Reload data when screen comes into focus
      const refreshData = async () => {
        await reloadCards();
        await reloadGrantCards();
      };
      refreshData();
    }, [reloadCards, reloadGrantCards]),
  );

  const [canceledCardsShown, setCanceledCardsShown] = useState(true);
  const [frozenCardsShown, setFrozenCardsShown] = useState(true);
  const [allCards, setAllCards] =
    useState<((Card & Required<Pick<Card, "last4">>) | GrantCard)[]>();
  const [sortedCards, setSortedCards] =
    useState<((Card & Required<Pick<Card, "last4">>) | GrantCard)[]>();
  const [refreshing] = useState(false);
  const usePanGesture = () =>
    useMemo(() => Gesture.Pan().activateAfterLongPress(520), []);
  const panGesture = usePanGesture();

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
                const newValue = !canceledCardsShown;
                setCanceledCardsShown(newValue);
                AsyncStorage.setItem("canceledCardsShown", newValue.toString());
              }
              if (event === "toggleFrozenCards") {
                const newValue = !frozenCardsShown;
                setFrozenCardsShown(newValue);
                AsyncStorage.setItem("frozenCardsShown", newValue.toString());
              }
            }}
            themeVariant={scheme || undefined}
          >
            <Ionicons.Button
              name="ellipsis-horizontal-circle-outline"
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
            color={themeColors.text}
            iconStyle={{ marginRight: 0 }}
            onPress={() => {
              if (user && organizations) {
                navigation.navigate("OrderCard");
              }
            }}
            underlayColor={"transparent"}
          />
        </View>
      ),
    });
  }, [
    navigation,
    canceledCardsShown,
    frozenCardsShown,
    scheme,
    user,
    organizations,
  ]);

  const combineCards = useCallback(() => {
    // Transform grantCards
    const transformedGrantCards = grantCards
      ?.map((grantCard) => ({
        ...grantCard,
        grant_id: grantCard.id, // Move original id to grant_id
        id: grantCard.card_id, // Replace id with card_id
        last4: cards?.find((card) => card.id === grantCard.card_id)?.last4, // add last4 from card as doesn't show in grantCard
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
    const fetchCardsShown = async () => {
      try {
        const isCanceledCardsShown =
          await AsyncStorage.getItem("canceledCardsShown");
        if (isCanceledCardsShown) {
          setCanceledCardsShown(isCanceledCardsShown === "true");
          await AsyncStorage.setItem(
            "canceledCardsShown",
            (isCanceledCardsShown === "true").toString(),
          );
        }

        const isFrozenCardsShown =
          await AsyncStorage.getItem("frozenCardsShown");
        if (isFrozenCardsShown) {
          setFrozenCardsShown(isFrozenCardsShown === "true");
          await AsyncStorage.setItem(
            "frozenCardsShown",
            (isFrozenCardsShown === "true").toString(),
          );
        }
      } catch (error) {
        console.error("Error fetching cards shown status", error, {
          context: { action: "fetch_cards_status" },
        });
      }
    };

    fetchCardsShown();

    if (cards && grantCards) {
      combineCards();
    }
  }, [cards, grantCards, combineCards]);

  // Load and apply saved order when allCards changes
  useEffect(() => {
    const loadSavedOrder = async () => {
      if (!allCards) return;

      try {
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
      } catch (error) {
        console.error("Error loading saved card order", error, {
          context: { action: "load_card_order" },
        });
        setSortedCards(allCards);
      }
    };

    loadSavedOrder();
  }, [allCards]);

  const onRefresh = async () => {
    try {
      await reloadCards();
      await reloadGrantCards();
    } catch (error) {
      console.error("Error refreshing cards", error, {
        context: { action: "refresh_cards" },
      });
    }
  };

  const saveCardOrder = async (
    newOrder: ((Card & Required<Pick<Card, "last4">>) | GrantCard)[],
  ) => {
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
  };

  if (sortedCards) {
    return (
      <ReorderableList
        data={sortedCards.filter((c) => {
          if (
            !canceledCardsShown &&
            (c.status == "canceled" || c.status == "expired")
          ) {
            return false;
          }
          if (!frozenCardsShown && c.status == "frozen") {
            return false;
          }
          return true;
        })}
        keyExtractor={(item) => item.id}
        onReorder={({ from, to }) => {
          Haptics.selectionAsync();
          const newCards = [...sortedCards];
          const [removed] = newCards.splice(from, 1);
          newCards.splice(to, 0, removed);
          setSortedCards(newCards);
          saveCardOrder(newCards);
        }}
        contentContainerStyle={{
          paddingBottom: tabBarHeight + 20,
          paddingTop: 20,
          alignItems: "center",
        }}
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
        }
        panGesture={panGesture}
        renderItem={({ item }) => (
          <CardItem
            item={item}
            isActive={false}
            onPress={(card) =>
              navigation.navigate("Card", {
                card,
                grantId: "grant_id" in card ? card.grant_id : undefined,
              })
            }
            pattern={patternCache[item.id]?.pattern}
            patternDimensions={patternCache[item.id]?.dimensions}
          />
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
