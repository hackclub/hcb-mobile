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
import useSWR, { useSWRConfig } from "swr";

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

  const {
    details,
    toggle: toggleDetailsRevealed,
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
  }>(`cards/${_card.id}/transactions`);

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

  const toggleCardFrozen = () => {
    if (!card || !card.id) {
      Alert.alert("Error", "Cannot update card status. Please try again.");
      return;
    }

    setIsUpdatingStatus(true);
    const newStatus = card.status === "active" ? "frozen" : "active";

    hcb
      .patch(`cards/${card.id}`, {
        json: { status: newStatus },
      })
      .then(() => {
        onSuccessfulStatusChange(newStatus);
      })
      .catch((err) => {
        console.error("Error updating card status:", err);
        setIsUpdatingStatus(false);
        Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
        Alert.alert(
          "Error",
          "Failed to update card status. Please try again later.",
          [{ text: "OK" }],
        );
      });
  };

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

  const toggleCardDetails = async () => {
    if (!detailsRevealed) {
      setCardDetailsLoading(true);
    }
    await toggleDetailsRevealed();
    if (!detailsRevealed) {
      setTimeout(() => setCardDetailsLoading(false), 800);
    } else {
      setCardDetailsLoading(false);
    }
  };

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
              <Text
                style={{
                  fontSize: 16,
                  fontWeight: "500",
                  color: themeColors.text,
                }}
              >
                Card number
              </Text>
              <Animated.View style={createSkeletonStyle(140, 22)} />
            </View>

            <View
              style={{
                flexDirection: "row",
                justifyContent: "space-between",
                alignItems: "center",
              }}
            >
              <Text
                style={{
                  fontSize: 16,
                  fontWeight: "500",
                  color: themeColors.text,
                }}
              >
                Expires
              </Text>
              <Animated.View style={createSkeletonStyle(70, 22)} />
            </View>

            <View
              style={{
                flexDirection: "row",
                justifyContent: "space-between",
                alignItems: "center",
              }}
            >
              <Text
                style={{
                  fontSize: 16,
                  fontWeight: "500",
                  color: themeColors.text,
                }}
              >
                CVC
              </Text>
              <Animated.View style={createSkeletonStyle(50, 22)} />
            </View>
          </View>
        </View>

        <View
          style={{
            marginBottom: 28,
            flexDirection: "row",
            justifyContent: "center",
            gap: 16,
          }}
        >
          <Animated.View
            style={{
              flexBasis: 0,
              flexGrow: 1,
              height: 50,
              backgroundColor: skeletonBackground,
              borderRadius: 12,
            }}
          />
          <Animated.View
            style={{
              flexBasis: 0,
              flexGrow: 1,
              height: 50,
              backgroundColor: skeletonBackground,
              borderRadius: 12,
            }}
          />
        </View>

        <View style={{ marginBottom: 20 }}>
          <View
            style={{
              flexDirection: "row",
              justifyContent: "space-between",
              alignItems: "center",
              marginBottom: 16,
            }}
          >
            <Animated.View style={createSkeletonStyle(160, 22)} />
            <Animated.View style={createSkeletonStyle(80, 22)} />
          </View>

          <View style={{ gap: 12 }}>
            {[1, 2, 3].map((_, index) => (
              <View
                key={index}
                style={{
                  flexDirection: "row",
                  backgroundColor: "rgba(0, 0, 0, 0.02)",
                  padding: 16,
                  borderRadius: 12,
                }}
              >
                <Animated.View
                  style={{
                    width: 40,
                    height: 40,
                    borderRadius: 20,
                    backgroundColor: skeletonBackground,
                    marginRight: 16,
                  }}
                />
                <View style={{ flex: 1 }}>
                  <View
                    style={{
                      flexDirection: "row",
                      justifyContent: "space-between",
                      marginBottom: 6,
                    }}
                  >
                    <Animated.View style={createSkeletonStyle(120, 16)} />
                    <Animated.View style={createSkeletonStyle(70, 16)} />
                  </View>
                  <Animated.View style={createSkeletonStyle(100, 12)} />
                </View>
              </View>
            ))}
          </View>
        </View>
      </View>
    );
  }

  const renderCardStatus = () => {
    if (card.status === "active") {
      return (
        <View
          style={{
            position: "absolute",
            top: 15,
            right: 15,
            flexDirection: "row",
            alignItems: "center",
            backgroundColor: "rgba(0, 0, 0, 0.05)",
            borderRadius: 20,
            paddingHorizontal: 10,
            paddingVertical: 5,
          }}
        >
          <Ionicons name="checkmark-circle" size={14} color="#34D399" />
          <Text
            style={{
              marginLeft: 5,
              fontSize: 14,
              fontWeight: "500",
              color: "#34D399",
            }}
          >
            Active
          </Text>
        </View>
      );
    } else if (card.status === "frozen") {
      return (
        <View
          style={{
            position: "absolute",
            top: 15,
            right: 15,
            flexDirection: "row",
            alignItems: "center",
            backgroundColor: "rgba(0, 0, 0, 0.05)",
            borderRadius: 20,
            paddingHorizontal: 10,
            paddingVertical: 5,
          }}
        >
          <Ionicons name="snow" size={14} color="#3B82F6" />
          <Text
            style={{
              marginLeft: 5,
              fontSize: 14,
              fontWeight: "500",
              color: "#3B82F6",
            }}
          >
            Frozen
          </Text>
        </View>
      );
    } else if (card.status === "canceled") {
      return (
        <View
          style={{
            position: "absolute",
            top: 15,
            right: 15,
            flexDirection: "row",
            alignItems: "center",
            backgroundColor: "rgba(0, 0, 0, 0.05)",
            borderRadius: 20,
            paddingHorizontal: 10,
            paddingVertical: 5,
          }}
        >
          <Ionicons name="close-circle" size={14} color="#EF4444" />
          <Text
            style={{
              marginLeft: 5,
              fontSize: 14,
              fontWeight: "500",
              color: "#EF4444",
            }}
          >
            Canceled
          </Text>
        </View>
      );
    } else if (card.status === "expired") {
      return (
        <View
          style={{
            position: "absolute",
            top: 15,
            right: 15,
            flexDirection: "row",
            alignItems: "center",
            backgroundColor: "rgba(0, 0, 0, 0.05)",
            borderRadius: 20,
            paddingHorizontal: 10,
            paddingVertical: 5,
          }}
        >
          <Ionicons name="time" size={14} color="#F59E0B" />
          <Text
            style={{
              marginLeft: 5,
              fontSize: 14,
              fontWeight: "500",
              color: "#F59E0B",
            }}
          >
            Expired
          </Text>
        </View>
      );
    }
    return null;
  };

  return (
    <Animated.View style={{ flex: 1, opacity: fadeAnim }}>
      <ScrollView
        contentContainerStyle={{
          padding: 20,
          paddingBottom: tabBarHeight + 20,
        }}
        scrollIndicatorInsets={{ bottom: tabBarHeight }}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={onRefresh}
            colors={[palette.primary]}
            tintColor={palette.primary}
          />
        }
      >
        {cardError ? (
          <View
            style={{
              padding: 20,
              backgroundColor: "rgba(239, 68, 68, 0.1)",
              borderRadius: 10,
              alignItems: "center",
              marginBottom: 20,
            }}
          >
            <Ionicons name="alert-circle" size={24} color="#EF4444" />
            <Text
              style={{
                color: "#EF4444",
                marginVertical: 10,
                textAlign: "center",
              }}
            >
              {cardError}
            </Text>
            <Button onPress={onRefresh}>Retry</Button>
          </View>
        ) : (
          <>
            <TouchableOpacity
              style={{ alignItems: "center", marginBottom: 20 }}
              activeOpacity={0.9}
              onPress={() => setCardExpanded(!cardExpanded)}
            >
              <PaymentCard
                details={details}
                card={card}
                onCardLoad={() => setCardLoaded(true)}
                style={{ marginBottom: 10 }}
              />

              {isGrantCard && (
                <View style={{ alignItems: "center", marginTop: 10 }}>
                  <Text
                    style={{
                      fontSize: 14,
                      opacity: 0.7,
                      color: themeColors.text,
                    }}
                  >
                    Available Balance
                  </Text>
                  <Text
                    style={{
                      fontSize: 24,
                      fontWeight: "bold",
                      marginTop: 5,
                      color: themeColors.text,
                    }}
                  >
                    {_card?.status == "expired" || _card?.status == "canceled"
                      ? "$0"
                      : renderMoney(
                          (_card as GrantCard).amount_cents -
                            (card?.total_spent_cents ?? 0),
                        )}
                  </Text>
                </View>
              )}
            </TouchableOpacity>

            {card.status != "canceled" && (
              <View
                style={{
                  flexDirection: "row",
                  marginBottom: 20,
                  justifyContent: "center",
                  gap: 20,
                }}
              >
                {card.status !== "expired" && !isGrantCard && (
                  <Button
                    style={{
                      flexBasis: 0,
                      flexGrow: 1,
                      backgroundColor: "#71C5E7",
                      borderTopWidth: 0,
                      borderRadius: 12,
                    }}
                    color="#186177"
                    iconColor="#186177"
                    icon="snow"
                    onPress={() => toggleCardFrozen()}
                    loading={isUpdatingStatus}
                  >
                    {card.status == "active" ? "Freeze card" : "Defrost card"}
                  </Button>
                )}
                {_card.type == "virtual" && _card.status != "canceled" && (
                  <Button
                    style={{
                      flexBasis: 0,
                      flexGrow: 1,
                      borderRadius: 12,
                      backgroundColor: palette.primary,
                    }}
                    color="white"
                    iconColor="white"
                    icon={detailsRevealed ? "eye-off" : "eye"}
                    onPress={toggleCardDetails}
                    loading={detailsLoading}
                  >
                    {detailsRevealed ? "Hide details" : "Reveal details"}
                  </Button>
                )}
              </View>
            )}

            {/* Card Details Section */}
            <View
              style={{
                marginBottom: 24,
                padding: 20,
                borderRadius: 15,
                shadowColor: "#000",
                shadowOffset: { width: 0, height: 1 },
                shadowOpacity: 0.05,
                shadowRadius: 3,
                elevation: 2,
                backgroundColor: themeColors.card,
              }}
            >
              {renderCardStatus()}

              {card?.user?.id ? (
                <View
                  style={{
                    flexDirection: "row",
                    alignItems: "center",
                    marginBottom: 15,
                  }}
                >
                  <UserAvatar
                    user={card.user}
                    size={40}
                    style={{ marginRight: 10 }}
                  />
                  <View>
                    <Text
                      style={{
                        fontSize: 18,
                        fontWeight: "600",
                        color: themeColors.text,
                      }}
                    >
                      {cardName}
                    </Text>
                    <Text
                      style={{
                        fontSize: 14,
                        color: palette.muted,
                        marginTop: 2,
                      }}
                    >
                      {card.type === "virtual"
                        ? "Virtual Card"
                        : "Physical Card"}
                    </Text>
                  </View>
                </View>
              ) : (
                <View
                  style={{
                    flexDirection: "row",
                    alignItems: "center",
                    marginBottom: 15,
                  }}
                >
                  <View
                    style={{
                      width: 40,
                      height: 40,
                      borderRadius: 20,
                      backgroundColor: palette.muted,
                      marginRight: 10,
                    }}
                  />
                  <View>
                    <Text
                      style={{
                        fontSize: 18,
                        fontWeight: "600",
                        color: themeColors.text,
                      }}
                    >
                      {cardName}
                    </Text>
                    <Text
                      style={{
                        fontSize: 14,
                        color: palette.muted,
                        marginTop: 2,
                      }}
                    >
                      {card.type === "virtual"
                        ? "Virtual Card"
                        : "Physical Card"}
                    </Text>
                  </View>
                </View>
              )}

              <Divider />

              <View
                style={{
                  flexDirection: "row",
                  justifyContent: "space-between",
                  marginBottom: 12,
                }}
              >
                <Text
                  style={{
                    fontSize: 16,
                    color: themeColors.text,
                  }}
                >
                  Card number
                </Text>
                <View>
                  {detailsLoading ||
                  cardDetailsLoading ||
                  (detailsRevealed && !details) ? (
                    <Animated.View style={createSkeletonStyle(120, 22)} />
                  ) : (
                    <Text
                      style={{
                        color: palette.muted,
                        fontSize: 16,
                        fontWeight: "500",
                        fontFamily: "JetBrains Mono",
                      }}
                      selectable={detailsRevealed && details ? true : false}
                    >
                      {detailsRevealed && details
                        ? renderCardNumber(details.number)
                        : redactedCardNumber(
                            isGrantCard ? _card.last4 : card?.last4,
                          )}
                    </Text>
                  )}
                </View>
              </View>

              <View
                style={{
                  flexDirection: "row",
                  justifyContent: "space-between",
                  marginBottom: 12,
                }}
              >
                <Text
                  style={{
                    fontSize: 16,
                    color: themeColors.text,
                  }}
                >
                  Expires
                </Text>
                <View>
                  {detailsLoading ||
                  cardDetailsLoading ||
                  (detailsRevealed && !details) ? (
                    <Animated.View style={createSkeletonStyle(70, 22)} />
                  ) : (
                    <Text
                      style={{
                        color: palette.muted,
                        fontSize: 16,
                        fontWeight: "500",
                        fontFamily: "JetBrains Mono",
                      }}
                      selectable={detailsRevealed && details ? true : false}
                    >
                      {detailsRevealed && details
                        ? `${String(details.exp_month).padStart(2, "0")}/${details.exp_year}`
                        : "••/••"}
                    </Text>
                  )}
                </View>
              </View>

              <View
                style={{
                  flexDirection: "row",
                  justifyContent: "space-between",
                  marginBottom: 12,
                }}
              >
                <Text
                  style={{
                    fontSize: 16,
                    color: themeColors.text,
                  }}
                >
                  CVC
                </Text>
                <View>
                  {detailsLoading ||
                  cardDetailsLoading ||
                  (detailsRevealed && !details) ? (
                    <Animated.View style={createSkeletonStyle(50, 22)} />
                  ) : (
                    <Text
                      style={{
                        color: palette.muted,
                        fontSize: 16,
                        fontWeight: "500",
                        fontFamily: "JetBrains Mono",
                      }}
                      selectable={detailsRevealed && details ? true : false}
                    >
                      {detailsRevealed && details ? details.cvc : "•••"}
                    </Text>
                  )}
                </View>
              </View>
            </View>

            {/* Transactions Section */}
            <View
              style={{
                flexDirection: "row",
                justifyContent: "space-between",
                alignItems: "center",
                marginBottom: 15,
              }}
            >
              <Text
                style={{
                  fontSize: 18,
                  fontWeight: "600",
                  color: palette.muted,
                }}
              >
                Transaction History
              </Text>
              {card.total_spent_cents != null && (
                <View style={{ alignItems: "flex-end" }}>
                  <Text
                    style={{
                      fontSize: 12,
                      color: palette.muted,
                      textTransform: "uppercase",
                    }}
                  >
                    Total Spent
                  </Text>
                  <Text
                    style={{
                      fontSize: 16,
                      fontWeight: "600",
                      color: themeColors.text,
                    }}
                  >
                    {renderMoney(card.total_spent_cents)}
                  </Text>
                </View>
              )}
            </View>

            {transactionError ? (
              <View
                style={{
                  padding: 20,
                  backgroundColor: "rgba(239, 68, 68, 0.1)",
                  borderRadius: 10,
                  alignItems: "center",
                  marginBottom: 20,
                }}
              >
                <Ionicons name="alert-circle" size={24} color="#EF4444" />
                <Text
                  style={{
                    color: "#EF4444",
                    marginVertical: 10,
                    textAlign: "center",
                  }}
                >
                  {transactionError}
                </Text>
              </View>
            ) : transactionsLoading ? (
              <View
                style={{
                  alignItems: "center",
                  justifyContent: "center",
                  height: 150,
                  backgroundColor: "rgba(0, 0, 0, 0.02)",
                  borderRadius: 15,
                }}
              >
                <ActivityIndicator color={palette.primary} />
                <Text style={{ color: themeColors.text, marginTop: 10 }}>
                  Loading transactions...
                </Text>
              </View>
            ) : transactions.length === 0 ? (
              <View
                style={{
                  alignItems: "center",
                  justifyContent: "center",
                  paddingVertical: 60,
                  backgroundColor: "rgba(0, 0, 0, 0.02)",
                  borderRadius: 15,
                }}
              >
                <Ionicons
                  name="receipt-outline"
                  size={50}
                  color={palette.muted}
                />
                <Text
                  style={{
                    color: palette.muted,
                    fontSize: 18,
                    fontWeight: "600",
                    marginTop: 15,
                  }}
                >
                  No transactions yet
                </Text>
                <Text
                  style={{
                    color: palette.muted,
                    marginTop: 5,
                    textAlign: "center",
                    paddingHorizontal: 20,
                  }}
                >
                  Transactions will appear here once this card is used
                </Text>
              </View>
            ) : (
              <View style={{ borderRadius: 15, overflow: "hidden" }}>
                {transactions.map((transaction, index) => (
                  <TouchableOpacity
                    key={transaction.id}
                    onPress={() => {
                      navigation.navigate("Transaction", {
                        orgId:
                          card?.organization?.id ||
                          _card?.organization?.id ||
                          "",
                        transaction,
                        transactionId: transaction.id,
                      });
                    }}
                    style={[
                      { backgroundColor: "transparent" },
                      index === 0 && {
                        borderTopLeftRadius: 15,
                        borderTopRightRadius: 15,
                      },
                      index === transactions.length - 1 && {
                        borderBottomLeftRadius: 15,
                        borderBottomRightRadius: 15,
                      },
                    ]}
                  >
                    <Transaction
                      transaction={transaction}
                      top={index == 0}
                      bottom={index == transactions.length - 1}
                      hideAvatar
                      orgId={
                        card?.organization?.id || _card?.organization?.id || ""
                      }
                    />
                  </TouchableOpacity>
                ))}
              </View>
            )}
          </>
        )}
      </ScrollView>
    </Animated.View>
  );
}
