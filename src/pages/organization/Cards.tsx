import { Ionicons } from "@expo/vector-icons";
import { useBottomTabBarHeight } from "@react-navigation/bottom-tabs";
import { useTheme } from "@react-navigation/native";
import { NativeStackScreenProps } from "@react-navigation/native-stack";
import { generate } from "hcb-geo-pattern";
import { memo, useCallback, useEffect, useState } from "react";
import { Pressable, Text, View, FlatList, RefreshControl } from "react-native";
import useSWR from "swr";

import CardListSkeleton from "../../components/CardListSkeleton";
import PaymentCard from "../../components/PaymentCard";
import { logError } from "../../lib/errorUtils";
import { StackParamList } from "../../lib/NavigatorParamList";
import Card from "../../lib/types/Card";
import GrantCard from "../../lib/types/GrantCard";
import { palette } from "../../theme";
import { normalizeSvg } from "../../util";

type Props = NativeStackScreenProps<StackParamList, "OrganizationCards">;

type CardItemProps = {
  item: (Card & Required<Pick<Card, "last4">>) | GrantCard;
  onPress: (card: (Card & Required<Pick<Card, "last4">>) | GrantCard) => void;
  pattern?: string;
  patternDimensions?: { width: number; height: number };
};

const CardItem = memo(
  ({ item, onPress, pattern, patternDimensions }: CardItemProps) => {
    return (
      <Pressable onPress={() => onPress(item)}>
        <PaymentCard
          card={item}
          style={{ marginHorizontal: 20, marginVertical: 8 }}
          pattern={pattern}
          patternDimensions={patternDimensions}
        />
      </Pressable>
    );
  },
  (prevProps, nextProps) =>
    prevProps.item.id === nextProps.item.id &&
    prevProps.pattern === nextProps.pattern,
);

CardItem.displayName = "CardItem";

export default function OrganizationCardsPage({ route, navigation }: Props) {
  const { orgId } = route.params;
  const { data: cards, mutate: reloadCards } =
    useSWR<(Card & Required<Pick<Card, "last4">>)[]>(`organizations/${orgId}/cards`);
  const { data: grantCards, mutate: reloadGrantCards } =
    useSWR<GrantCard[]>(`organizations/${orgId}/card_grants`);
  const tabBarHeight = useBottomTabBarHeight();
  const { colors: themeColors } = useTheme();

  // Cache for card patterns
  const [patternCache, setPatternCache] = useState<
    Record<
      string,
      { pattern: string; dimensions: { width: number; height: number } }
    >
  >({});

  const [refreshing, setRefreshing] = useState(false);

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
            dimensions: { width: patternData.width, height: patternData.height },
          };
        } catch (error) {
          logError("Error generating pattern for card", error, {
            context: { cardId: card.id },
          });
        }
      }

      setPatternCache(newPatternCache);
    };

    generatePatterns();
  }, [cards, grantCards]);

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    try {
      await Promise.all([reloadCards(), reloadGrantCards()]);
    } catch (error) {
      logError("Error refreshing organization cards", error);
    } finally {
      setRefreshing(false);
    }
  }, [reloadCards, reloadGrantCards]);

  const handleCardPress = useCallback(
    (card: (Card & Required<Pick<Card, "last4">>) | GrantCard) => {
      if ("amount_cents" in card) {
        // Grant card
        navigation.navigate("GrantCard", { grantId: card.id });
      } else {
        // Regular card
        navigation.navigate("Card", { card });
      }
    },
    [navigation],
  );

  const allCards = [...(cards || []), ...(grantCards || [])];

  const renderCard = ({ item }: { item: (Card & Required<Pick<Card, "last4">>) | GrantCard }) => (
    <CardItem
      item={item}
      onPress={handleCardPress}
      pattern={patternCache[item.id]?.pattern}
      patternDimensions={patternCache[item.id]?.dimensions}
    />
  );

  const renderEmptyState = () => (
    <View
      style={{
        flex: 1,
        alignItems: "center",
        justifyContent: "center",
        paddingHorizontal: 40,
      }}
    >
      <Ionicons
        name="card-outline"
        size={80}
        color={themeColors.text}
        style={{ opacity: 0.3 }}
      />
      <Text
        style={{
          fontSize: 18,
          fontWeight: "600",
          color: themeColors.text,
          textAlign: "center",
          marginTop: 20,
        }}
      >
        No Cards Found
      </Text>
      <Text
        style={{
          fontSize: 16,
          color: themeColors.text,
          opacity: 0.7,
          textAlign: "center",
          marginTop: 8,
        }}
      >
        This organization doesn't have any cards yet.
      </Text>
    </View>
  );

  if (!cards && !grantCards) {
    return <CardListSkeleton />;
  }

  return (
    <FlatList
      data={allCards}
      renderItem={renderCard}
      keyExtractor={(item) => item.id}
      contentContainerStyle={{
        paddingTop: 20,
        paddingBottom: tabBarHeight + 40,
      }}
      refreshControl={
        <RefreshControl
          refreshing={refreshing}
          onRefresh={onRefresh}
          tintColor={palette.primary}
          colors={[palette.primary]}
        />
      }
      ListEmptyComponent={renderEmptyState}
    />
  );
}