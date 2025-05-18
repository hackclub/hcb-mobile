import { Ionicons } from "@expo/vector-icons";
import { useBottomTabBarHeight } from "@react-navigation/bottom-tabs";
import { useTheme } from "@react-navigation/native";
import { NativeStackScreenProps } from "@react-navigation/native-stack";
import * as Haptics from "expo-haptics";
import { useEffect, useState, useCallback, useRef } from "react";
import {
  ScrollView,
  View,
  Text,
  ActivityIndicator,
  TouchableOpacity,
  RefreshControl,
  Animated,
  Alert,
} from "react-native";
import useSWR, { useSWRConfig, useSWRMutation } from "swr";

import Button from "../components/Button";
import Divider from "../components/Divider";
import PaymentCard from "../components/PaymentCard";
import Transaction from "../components/Transaction";
import UserAvatar from "../components/UserAvatar";
import useClient from "../lib/client";
import { CardsStackParamList } from "../lib/NavigatorParamList";
import Card from "../lib/types/Card";
import GrantCard from "../lib/types/GrantCard";
import ITransaction from "../lib/types/Transaction";
import { useOffline } from "../lib/useOffline";
import useStripeCardDetails from "../lib/useStripeCardDetails";
import { palette } from "../theme";
import { redactedCardNumber, renderCardNumber, renderMoney } from "../util";

type Props = NativeStackScreenProps<CardsStackParamList, "Card">;

export default function CardPage({
  route: {
    params: { card: _card },
  },
  navigation,
}: Props) {
  const { colors: themeColors } = useTheme();
  const hcb = useClient();
  const isGrantCard = (_card as GrantCard).amount_cents != null;
  const [refreshing, setRefreshing] = useState(false);
  const [cardError, setCardError] = useState<string | null>(null);
  const [transactionError, setTransactionError] = useState<string | null>(null);
  const [cardExpanded, setCardExpanded] = useState(false);
  const fadeAnim = useState(new Animated.Value(0))[0];
  const [isUpdatingStatus, setIsUpdatingStatus] = useState(false);
  const skeletonAnim = useRef(new Animated.Value(0)).current;
  const [errorDisplayReady, setErrorDisplayReady] = useState(false);
  const { isOnline, withOfflineCheck } = useOffline();

  const {
    details,
    toggle: toggleDetailsRevealedBase,
    revealed: detailsRevealed,
    loading: detailsLoading,
  } = useStripeCardDetails(_card.id);

  const { data: card = _card, error: cardFetchError } = useSWR<Card>(
    `cards/${_card.id}`,
    {
      fallbackData: _card,
      onError: (err) => {
        console.error("Error fetching card:", err);
        setCardError("Unable to load card details. Please try again later.");
      },
    },
  );

  const [cardName, setCardName] = useState(_card.name);

  useEffect(() => {
    const timer = setTimeout(() => {
      setErrorDisplayReady(true);
    }, 2000);

    return () => clearTimeout(timer);
  }, []);

  useEffect(() => {
    if (cardFetchError && errorDisplayReady) {
      setCardError("Unable to load card details. Please try again later.");
    } else if (!cardFetchError) {
      setCardError(null);
    }
  }, [cardFetchError, errorDisplayReady]);

  useEffect(() => {
    Animated.timing(fadeAnim, {
      toValue: 1,
      duration: 600,
      useNativeDriver: true,
    }).start();
  }, [fadeAnim]);

  useEffect(() => {
    if (card?.name) {
      setCardName(card.name);
    } else if (card?.user?.name) {
      const nameParts = card.user.name.split(" ");
      const firstName = nameParts[0] || "";
      const lastInitial =
        nameParts.length > 1 ? `${nameParts[1]?.charAt(0) || ""}` : "";
      setCardName(`${firstName} ${lastInitial}${lastInitial ? "'" : ""}s Card`);
    } else {
      setCardName("Card");
    }
  }, [card]);

  useEffect(() => {
    navigation.setOptions({
      title: cardName,
    });
  }, [cardName, navigation, themeColors.text]);

  const {
    data: transactionsData,
    isLoading: transactionsLoading,
    error: transactionsError,
  } = useSWR<{
    data: ITransaction[];
  }>(isOnline ? `cards/${_card.id}/transactions` : null, {
    fallbackData: { data: [] },
    revalidateOnFocus: false,
    revalidateOnReconnect: false,
    dedupingInterval: 2000,
    shouldRetryOnError: false,
    keepPreviousData: true,
  });

  const transactions = transactionsData?.data || [];

  useEffect(() => {
    if (transactionsError && errorDisplayReady) {
      setTransactionError(
        "Unable to load transaction history. Pull down to retry.",
      );
    } else if (!transactionsError) {
      setTransactionError(null);
    }
  }, [transactionsError, errorDisplayReady]);

  const { mutate } = useSWRConfig();
  const [cardLoaded, setCardLoaded] = useState(false);

  const { trigger: update, isMutating } = useSWRMutation<
    Card,
    unknown,
    string,
    "frozen" | "active",
    Card
  >(
    `cards/${_card.id}`,
    async (url, { arg: status }) => {
      const result = await hcb.patch(url, {
        json: { status },
      });
      return result.json();
    },
    {
      onSuccess: (data) => {
        onSuccessfulStatusChange(data.status);
      },
      onError: (err) => {
        console.error("Error updating card status:", err);
        setIsUpdatingStatus(false);
        Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
        Alert.alert(
          "Error",
          "Failed to update card status. Please try again later.",
          [{ text: "OK" }]
        );
      },
    }
  );

  const onSuccessfulStatusChange = (updatedStatus: string) => {
    setIsUpdatingStatus(false);

    const updatedCard = {
      ..._card,
      ...card,
      status: updatedStatus,
    };

    mutate(`cards/${_card.id}`, updatedCard, false);

    mutate(
      "user/cards",
      (list: Card[] | undefined) =>
        list?.map((c) => (c.id === updatedCard.id ? updatedCard : c)),
      false,
    );

    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);

    mutate(`cards/${_card.id}`);
    mutate("user/cards");
  };

  const toggleCardFrozen = withOfflineCheck(() => {
    if (!card || !card.id) {
      Alert.alert("Error", "Cannot update card status. Please try again.");
      return;
    }

    setIsUpdatingStatus(true);
    const newStatus = card.status === "active" ? "frozen" : "active";
    update(newStatus);
  });

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    try {
      await mutate(`cards/${_card.id}`);
      await mutate(`cards/${_card.id}/transactions`);
      setCardError(null);
      setTransactionError(null);
    } catch (err) {
      console.error("Refresh error:", err);
    } finally {
      setRefreshing(false);
    }
  }, [mutate, _card.id]);

  const tabBarHeight = useBottomTabBarHeight();

  useEffect(() => {
    // Create skeleton loading animation
    Animated.loop(
      Animated.sequence([
        Animated.timing(skeletonAnim, {
          toValue: 1,
          duration: 1000,
          useNativeDriver: false,
        }),
        Animated.timing(skeletonAnim, {
          toValue: 0,
          duration: 1000,
          useNativeDriver: false,
        }),
      ]),
    ).start();
  }, [skeletonAnim]);

  // Create the interpolated background color for skeleton animation
  const skeletonBackground = skeletonAnim.interpolate({
    inputRange: [0, 1],
    outputRange: ["rgba(0, 0, 0, 0.03)", "rgba(0, 0, 0, 0.12)"],
  });

  // Create a shared skeleton style for reuse
  const createSkeletonStyle = (
    width: number,
    height: number,
    extraStyles = {},
  ) => ({
    width,
    height,
    backgroundColor: skeletonBackground,
    borderRadius: 8,
    overflow: "hidden" as const,
    ...extraStyles,
  });

  const toggleDetailsRevealed = withOfflineCheck(() => {
    toggleDetailsRevealedBase();
  });

  const [cardDetailsLoading, setCardDetailsLoading] = useState(false);

  if (!card && !cardLoaded && !cardError) {
    return (
      <View style={{ flex: 1, padding: 20 }}>
        {/* Card preview skeleton */}
        <Animated.View
          style={{
            height: 200,
            borderRadius: 16,
            marginBottom: 20,
            backgroundColor: skeletonBackground,
            overflow: "hidden",
          }}
        >
          <View
            style={{
              position: "absolute",
              bottom: 20,
              left: 20,
              width: "70%",
            }}
          >
            <Animated.View
              style={createSkeletonStyle(120, 16, { marginBottom: 10 })}
            />
            <Animated.View style={createSkeletonStyle(180, 26)} />
          </View>
        </Animated.View>

        <View
          style={{
            marginBottom: 24,
            padding: 20,
            borderRadius: 15,
            shadowColor: "#000",
            shadowOffset: { width: 0, height: 2 },
            shadowOpacity: 0.07,
            shadowRadius: 8,
            elevation: 4,
            backgroundColor: themeColors.card,
          }}
        >
          <View
            style={{
              flexDirection: "row",
              alignItems: "center",
              marginBottom: 20,
            }}
          >
            <Animated.View
              style={{
                width: 48,
                height: 48,
                borderRadius: 24,
                backgroundColor: skeletonBackground,
                marginRight: 16,
              }}
            />
            <View>
              <Animated.View
                style={createSkeletonStyle(140, 20, { marginBottom: 8 })}
              />
              <Animated.View style={createSkeletonStyle(90, 14)} />
            </View>
          </View>

          <Divider />

          <View style={{ marginTop: 16, gap: 16 }}>
            <View
              style={{
                flexDirection: "row",
                justifyContent: "space-between",
                alignItems: "center",
              }}
            >
              <Animated.View style={createSkeletonStyle(100, 16)} />
              <Animated.View style={createSkeletonStyle(80, 16)} />
            </View>
            <View
              style={{
                flexDirection: "row",
                justifyContent: "space-between",
                alignItems: "center",
              }}
            >
              <Animated.View style={createSkeletonStyle(80, 16)} />
              <Animated.View style={createSkeletonStyle(80, 16)} />
            </View>
            <View
              style={{
                flexDirection: "row",
                justifyContent: "space-between",
                alignItems: "center",
              }}
            >
              <Animated.View style={createSkeletonStyle(60, 16)} />
              <Animated.View style={createSkeletonStyle(40, 16)} />
            </View>
          </View>
        </View>
        
        {/* Button skeleton loading */}
        <View
          style={{
            flexDirection: "row",
            justifyContent: "space-between",
            marginBottom: 20,
          }}
        >
          <Animated.View
            style={{
              ...createSkeletonStyle(0, 48),
              flex: 1,
              marginRight: 10,
            }}
          />
          <Animated.View
            style={{
              ...createSkeletonStyle(0, 48),
              flex: 1,
              marginLeft: 10,
            }}
          />
        </View>

        {/* Transaction skeleton loading */}
        <View style={{ gap: 16 }}>
          <Animated.View style={createSkeletonStyle("100%", 18)} />
          <Animated.View style={createSkeletonStyle("100%", 90)} />
          <Animated.View style={createSkeletonStyle("100%", 90)} />
        </View>
      </View>
    );
  }

  return (
    <ScrollView
      style={{ flex: 1 }}
      contentContainerStyle={{ padding: 20, paddingBottom: tabBarHeight + 20 }}
      refreshControl={
        <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
      }
    >
      <Animated.View style={{ opacity: fadeAnim, marginBottom: 16 }}>
        <PaymentCard
          card={card}
          expanded={cardExpanded}
          details={details}
          detailsRevealed={detailsRevealed}
        />
      </Animated.View>

      {cardError ? (
        <View
          style={{
            padding: 16,
            backgroundColor: "rgba(255, 0, 0, 0.05)",
            borderRadius: 8,
            marginBottom: 16,
          }}
        >
          <Text style={{ color: "red" }}>{cardError}</Text>
        </View>
      ) : null}

      <View
        style={{
          marginBottom: 24,
          padding: 20,
          borderRadius: 15,
          shadowColor: "#000",
          shadowOffset: { width: 0, height: 2 },
          shadowOpacity: 0.07,
          shadowRadius: 8,
          elevation: 4,
          backgroundColor: themeColors.card,
        }}
      >
        {card?.user ? (
          <View
            style={{
              flexDirection: "row",
              alignItems: "center",
              marginBottom: 20,
            }}
          >
            <UserAvatar
              user={card.user}
              size={48}
              style={{ marginRight: 16 }}
            />
            <View>
              <Text
                style={{
                  fontSize: 18,
                  fontWeight: "500",
                  color: themeColors.text,
                  marginBottom: 4,
                }}
              >
                {card.user.name}
              </Text>
              <Text style={{ color: palette.muted }}>{card.user.email}</Text>
            </View>
          </View>
        ) : null}

        {card?.user && <Divider />}

        <View style={{ marginTop: 16, gap: 16 }}>
          {card?.user ? (
            <View
              style={{
                flexDirection: "row",
                justifyContent: "space-between",
                alignItems: "center",
              }}
            >
              <UserAvatar
                user={card.user}
                size={36}
                style={{ marginRight: 5 }}
              />
              <Text style={{ color: themeColors.text, fontSize: 18 }}>
                {cardName}
              </Text>
            </View>
          ) : null}
          <View
            style={{ flexDirection: "row", justifyContent: "space-between" }}
          >
            <Text style={{ color: themeColors.text }}>Card number</Text>
            <Text style={{ color: palette.muted }}>
              {detailsRevealed && details
                ? renderCardNumber(details.number)
                : redactedCardNumber(isGrantCard ? _card.last4 : card?.last4)}
            </Text>
          </View>
          <View
            style={{ flexDirection: "row", justifyContent: "space-between" }}
          >
            <Text style={{ color: themeColors.text }}>Expires</Text>
            <Text style={{ color: palette.muted }}>
              {detailsRevealed && details
                ? `${String(details.exp_month).padStart(2, "0")}/${details.exp_year}`
                : "••/••"}
            </Text>
          </View>
          <View
            style={{ flexDirection: "row", justifyContent: "space-between" }}
          >
            <Text style={{ color: themeColors.text }}>CVC</Text>
            <Text style={{ color: palette.muted }}>
              {detailsRevealed ? details && details.cvc : "•••"}
            </Text>
          </View>
        </View>
      </View>

      {isGrantCard && (
        <View
          style={{
            padding: 10,
            marginBottom: 10,
          }}
        >
          <Text
            style={{
              color: themeColors.text,
              fontSize: 18,
              textAlign: "center",
            }}
          >
            Amount:{" "}
            {_card?.status == "expired" || _card?.status == "canceled"
              ? "$0"
              : renderMoney(
                  (card as GrantCard).amount_cents -
                    (card?.total_spent_cents ?? 0),
                )}
          </Text>
        </View>
      )}

      <View
        style={{
          flexDirection: "row",
          justifyContent: "space-between",
          marginBottom: 16,
        }}
      >
        {(card.status !== "expired" || !isGrantCard) && (
          <Button
            style={{
              flexBasis: 0,
              flexGrow: 1,
              backgroundColor: "#5bc0de",
              borderTopWidth: 0,
              opacity: isOnline ? 1 : 0.7,
              marginRight: 8,
            }}
            color="#186177"
            onPress={toggleCardFrozen}
            loading={isMutating || isUpdatingStatus}
            disabled={!isOnline}
          >
            {isOnline
              ? `${card.status == "active" ? "Freeze" : "Unfreeze"} card`
              : "Offline Mode"}
          </Button>
        )}

        {card.type == "virtual" && card.status != "canceled" && (
          <Button
            style={{
              flexBasis: 0,
              flexGrow: 1,
              opacity: isOnline ? 1 : 0.7,
              marginLeft: 8,
            }}
            onPress={toggleDetailsRevealed}
            loading={detailsLoading || cardDetailsLoading}
            disabled={!isOnline}
          >
            {isOnline
              ? `${detailsRevealed ? "Hide" : "Reveal"} details`
              : "Offline Mode"}
          </Button>
        )}
      </View>

      <Text
        style={{
          fontSize: 18,
          fontWeight: "600",
          marginBottom: 10,
          color: themeColors.text,
        }}
      >
        Recent Transactions
      </Text>

      {transactionError ? (
        <View
          style={{
            padding: 16,
            backgroundColor: "rgba(255, 0, 0, 0.05)",
            borderRadius: 8,
            marginBottom: 16,
          }}
        >
          <Text style={{ color: "red" }}>{transactionError}</Text>
        </View>
      ) : null}

      {transactions.length === 0 ? (
        transactionsLoading ? (
          <View style={{ marginVertical: 20 }}>
            <ActivityIndicator />
          </View>
        ) : (
          <View
            style={{
              padding: 16,
              backgroundColor: themeColors.card,
              borderRadius: 8,
              alignItems: "center",
              marginVertical: 10,
            }}
          >
            <Text style={{ color: palette.muted }}>No transactions yet</Text>
          </View>
        )
      ) : (
        transactions.map((transaction) => (
          <TouchableOpacity
            key={transaction.id}
            onPress={() => {
              navigation.navigate("Transaction", { transaction });
            }}
          >
            <Transaction transaction={transaction} transactionUrl="" />
          </TouchableOpacity>
        ))
      )}
    </ScrollView>
  );
}
