import { Ionicons } from "@expo/vector-icons";
import { useBottomTabBarHeight } from "@react-navigation/bottom-tabs";
import { useTheme } from "@react-navigation/native";
import {
  NativeStackNavigationProp,
  NativeStackScreenProps,
} from "@react-navigation/native-stack";
import * as Haptics from "expo-haptics";
import * as Linking from "expo-linking";
import { generate } from "hcb-geo-pattern";
import { useEffect, useState, useCallback, useRef, cloneElement } from "react";
import {
  ScrollView,
  View,
  Text,
  ActivityIndicator,
  TouchableOpacity,
  RefreshControl,
  Animated,
  Modal,
  TextInput,
} from "react-native";
import { ALERT_TYPE, Toast } from "react-native-alert-notification";
import useSWR, { useSWRConfig } from "swr";

import Button from "../components/Button";
import CardSkeleton from "../components/cards/CardSkeleton";
import Divider from "../components/Divider";
import PaymentCard from "../components/PaymentCard";
import Transaction from "../components/transaction/Transaction";
import UserAvatar from "../components/UserAvatar";
import { showAlert } from "../lib/alertUtils";
import useClient from "../lib/client";
import { logError, logCriticalError } from "../lib/errorUtils";
import { CardsStackParamList } from "../lib/NavigatorParamList";
import { getTransactionTitle } from "../lib/transactionTitle";
import Card from "../lib/types/Card";
import GrantCard from "../lib/types/GrantCard";
import { OrganizationExpanded } from "../lib/types/Organization";
import ITransaction from "../lib/types/Transaction";
import User from "../lib/types/User";
import useStripeCardDetails from "../lib/useStripeCardDetails";
import { palette } from "../theme";
import {
  formatCategoryNames,
  formatMerchantNames,
  normalizeSvg,
  redactedCardNumber,
  renderCardNumber,
  renderMoney,
} from "../util";

type CardPageProps = {
  cardId?: string;
  grantId?: string;
  card?: Card;
  navigation: NativeStackNavigationProp<CardsStackParamList>;
};

export default function CardPage(
  props: CardPageProps | NativeStackScreenProps<CardsStackParamList, "Card">,
) {
  const cardId = "route" in props ? props.route.params.cardId : props.cardId;
  const _card = "route" in props ? props.route.params.card : props.card;
  const navigation = "route" in props ? props.navigation : props.navigation;
  const { colors: themeColors } = useTheme();
  const hcb = useClient();
  const grantId = (props as CardPageProps)?.grantId;

  const { data: grantCard = _card as GrantCard } = useSWR<GrantCard>(
    grantId ? `card_grants/${grantId}` : null,
  );
  const id = _card?.id ?? grantCard?.card_id ?? `crd_${cardId}`;
  const { data: card, error: cardFetchError } = useSWR<Card>(`cards/${id}`, {
    onError: (err) => {
      logError("Error fetching card", err, { context: { cardId: id } });
      setCardError("Unable to load card details. Please try again later.");
    },
  });
  const { data: user } = useSWR<User>(`user`);
  const { data: organization } = useSWR<OrganizationExpanded>(
    `organizations/${card?.organization.id}`,
  );

  const {
    details,
    toggle: toggleDetailsRevealed,
    revealed: detailsRevealed,
    loading: detailsLoading,
  } = useStripeCardDetails(id);

  const isGrantCard =
    grantCard?.amount_cents != null ||
    (props as CardPageProps)?.grantId != null;
  const isCardholder = user?.id == card?.user?.id;
  const isManagerOrAdmin =
    organization?.users.some(
      (orgUser) => orgUser.id === user?.id && orgUser.role === "manager",
    ) || user?.admin;
  const [refreshing, setRefreshing] = useState(false);
  const [cardError, setCardError] = useState<string | null>(null);
  const [transactionError, setTransactionError] = useState<string | null>(null);
  const [cardExpanded, setCardExpanded] = useState(false);
  const fadeAnim = useState(new Animated.Value(0))[0];
  const [isUpdatingStatus, setIsUpdatingStatus] = useState(false);
  const skeletonAnim = useRef(new Animated.Value(0)).current;
  const [errorDisplayReady, setErrorDisplayReady] = useState(false);
  const [showActivateModal, setShowActivateModal] = useState(false);
  const [showTopupModal, setShowTopupModal] = useState(false);
  const [showPurposeModal, setShowPurposeModal] = useState(false);
  const [purposeText, setPurposeText] = useState("");
  const [isSettingPurpose, setIsSettingPurpose] = useState(false);
  const [isOneTimeUse, setIsOneTimeUse] = useState(false);
  const [topupAmount, setTopupAmount] = useState("");
  const [isToppingUp, setIsToppingUp] = useState(false);
  const [last4, setLast4] = useState("");
  const [activating, setActivating] = useState(false);
  const [pattern, setPattern] = useState<string>();
  const [patternDimensions, setPatternDimensions] = useState<{
    width: number;
    height: number;
  }>();
  const [cardName, setCardName] = useState("");
  const [isBurningCard, setIsBurningCard] = useState(false);

  useEffect(() => {
    const timer = setTimeout(() => {
      setErrorDisplayReady(true);
    }, 2000);

    return () => clearTimeout(timer);
  }, []);

  useEffect(() => {
    if ((cardFetchError || !card) && errorDisplayReady) {
      setCardError("Unable to load card details. Please try again later.");
    } else if (!cardFetchError) {
      setCardError(null);
    }
  }, [cardFetchError, errorDisplayReady, card]);

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
      const nameParts = card?.user?.name.split(" ");
      const firstName = nameParts[0] || "";
      const lastInitial =
        nameParts.length > 1 ? `${nameParts[1]?.charAt(0) || ""}` : "";
      setCardName(
        lastInitial
          ? `${firstName} ${lastInitial}'s card`
          : `${firstName}'s card`,
      );
    }
  }, [card]);

  useEffect(() => {
    navigation.setOptions({ title: cardName });
  }, [cardName, navigation, themeColors.text]);

  const {
    data: transactionsData,
    isLoading: transactionsLoading,
    error: transactionsError,
  } = useSWR<{ data: ITransaction[] }>(`cards/${id}/transactions`);

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
      ...card,
      status: updatedStatus,
    };

    mutate(`cards/${card?.id}`, updatedCard, false);

    mutate(
      "user/cards",
      (list: Card[] | undefined) =>
        list?.map((c) => (c.id === updatedCard.id ? updatedCard : c)),
      false,
    );

    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);

    mutate(`cards/${card?.id}`);
    mutate("user/cards");
  };

  const toggleCardFrozen = () => {
    if (!card || !card.id) {
      showAlert("Error", "Cannot update card status. Please try again.");
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
        logCriticalError("Error updating card status", err, {
          cardId: card.id,
          newStatus,
        });
        setIsUpdatingStatus(false);
        Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
        showAlert(
          "Error",
          "Failed to update card status. Please try again later.",
          [{ text: "OK" }],
        );
      });
  };

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    try {
      await mutate(`cards/${card?.id}`);
      await mutate(`cards/${id}/transactions`);
      await mutate(`card_grants/${grantId}`);
      setCardError(null);
      setTransactionError(null);
    } catch (err) {
      logError("Refresh error", err, { context: { cardId: card?.id } });
    } finally {
      setRefreshing(false);
    }
  }, [mutate, card?.id, id, grantId]);

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
  const [isReturningGrant, setisReturningGrant] = useState(false);
  const returnGrant = async () => {
    if (!card || !card.id) {
      showAlert("Error", "Cannot update card status. Please try again.");
      return;
    }
    showAlert(
      `${!isCardholder ? "Cancel and return" : "Return"} ${renderMoney(
        grantCard.amount_cents - (card?.total_spent_cents ?? 0),
      )} to ${card.organization.name}?`,
      "Caution, returning this grant will render it unusable.",
      [
        {
          text: "Cancel",
          style: "cancel",
        },
        {
          text: "I understand",
          style: "destructive",
          onPress: async () => {
            try {
              setisReturningGrant(true);
              await hcb.post(`card_grants/${grantCard.grant_id}/cancel`);
              Haptics.notificationAsync(
                Haptics.NotificationFeedbackType.Success,
              );
              await mutate("user/cards");
              navigation.goBack();
            } catch (err) {
              logCriticalError("Error returning grant", err, {
                cardId: card.id,
              });
              Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
              showAlert(
                "Error",
                "Failed to return grant. Please try again later.",
                [{ text: "OK" }],
              );
            } finally {
              setisReturningGrant(false);
            }
          },
        },
      ],
    );
  };
  const handleActivate = async () => {
    if (!last4 || last4.length !== 4) {
      showAlert("Error", "Please enter the last 4 digits of your card");
      return;
    }

    setActivating(true);
    try {
      const response = await hcb.patch(`cards/${card?.id}`, {
        json: { status: "active", last4 },
      });

      if (response.ok) {
        onSuccessfulStatusChange("active");
        setShowActivateModal(false);
        setLast4("");
        Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      } else {
        const data = (await response.json()) as { error?: string };
        showAlert("Error", data.error || "Failed to activate card");
        Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
      }
    } catch (err) {
      logCriticalError("Error activating card", err, { cardId: card?.id });
      showAlert("Error", "Failed to activate card. Please try again later.");
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
    } finally {
      setActivating(false);
    }
  };

  useEffect(() => {
    const generateCardPattern = async () => {
      if (!card || card.type !== "virtual") return;

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
        const normalizedPattern = normalizeSvg(
          patternData.toSVG(),
          patternData.width,
          patternData.height,
        );
        setPattern(normalizedPattern);
        setPatternDimensions({
          width: patternData.width,
          height: patternData.height,
        });
      } catch (error) {
        logError("Error generating pattern for card", error, {
          context: { cardId: card.id },
        });
      }
    };

    generateCardPattern();
  }, [card]);

  const handleTopup = async () => {
    if (!topupAmount || !card) return;

    const amount = parseFloat(topupAmount);
    if (isNaN(amount) || amount <= 0) {
      showAlert(
        "Invalid Amount",
        "Please enter a valid amount greater than 0.",
      );
      return;
    }

    setIsToppingUp(true);
    try {
      await hcb.post(`cards/${card.id}/topup`, {
        json: { amount_cents: Math.round(amount * 100) },
      });

      setTopupAmount("");
      setShowTopupModal(false);
      mutate(`cards/${card.id}`);
      mutate("user/cards");
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    } catch (error) {
      logCriticalError("Topup error", error, {
        cardId: card.id,
        amount: topupAmount,
      });
      showAlert("Error", "Failed to top up card. Please try again.");
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
    } finally {
      setIsToppingUp(false);
    }
  };

  const handleSetPurpose = async () => {
    if (!card) return;

    setIsSettingPurpose(true);
    try {
      await hcb.patch(`card_grants/${grantId}`, {
        json: { purpose: purposeText },
      });

      setPurposeText("");
      setShowPurposeModal(false);
      mutate(`cards/${card.id}`);
      mutate(`grant_cards/${grantId}`);
      mutate("user/cards");
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    } catch (error) {
      logCriticalError("Set purpose error", error, {
        cardId: card.id,
        purpose: purposeText,
      });
      showAlert("Error", "Failed to set purpose. Please try again.");
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
    } finally {
      setIsSettingPurpose(false);
    }
  };

  const handleOneTimeUse = async () => {
    if (!card) return;
    setIsOneTimeUse(true);
    try {
      await hcb.patch(`card_grants/${grantId}`, {
        json: { one_time_use: !grantCard.one_time_use },
      });
      mutate(`card_grants/${grantId}`);
      mutate("user/cards");
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      Toast.show({
        title: grantCard.one_time_use
          ? "One time use disabled"
          : "One time use enabled",
        type: ALERT_TYPE.SUCCESS,
      });
    } catch (error) {
      logCriticalError("One time use error", error, {
        cardId: card?.id || grantCard?.card_id,
      });
      showAlert("Error", "Failed to set one time use. Please try again.");
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
    } finally {
      setIsOneTimeUse(false);
    }
  };

  const handleBurnCard = async () => {
    if (!card) return;

    showAlert(
      "Are you sure you want to do this?",
      "Unlike freezing a card, this can't be reversed.",
      [
        {
          text: "Cancel",
          style: "cancel",
        },
        {
          text: "Burn Card",
          style: "destructive",
          onPress: async () => {
            setIsBurningCard(true);
            try {
              await hcb.post(`cards/${card.id}/cancel`);
              mutate(`cards/${card.id}`);
              mutate("user/cards");
              Haptics.notificationAsync(
                Haptics.NotificationFeedbackType.Success,
              );
              Toast.show({
                title: "Card burned",
                type: ALERT_TYPE.SUCCESS,
              });
            } catch (error) {
              logCriticalError("Burn card error", error, { cardId: card.id });
              showAlert("Error", "Failed to burn card. Please try again.");
              Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
            } finally {
              setIsBurningCard(false);
            }
          },
        },
      ],
    );
  };

  const isValidCardStatus = (
    status: string | undefined,
  ): status is Card["status"] => {
    return (
      status === "inactive" ||
      status === "frozen" ||
      status === "active" ||
      status === "canceled" ||
      status === "expired"
    );
  };

  const canTopupCard = (card: Card | undefined) => {
    if (!card || !card.status) return false;
    return (
      isValidCardStatus(card.status) &&
      card.status !== "canceled" &&
      card.status !== "expired"
    );
  };

  function getCardActionButtons() {
    const buttons = [];

    // Add activate/freeze button
    if (!isGrantCard || isManagerOrAdmin) {
      if (card?.type === "physical" && card?.status === "inactive") {
        buttons.push(
          <Button
            key="activate"
            style={{
              backgroundColor: palette.primary,
              borderTopWidth: 0,
              borderRadius: 12,
            }}
            color="white"
            iconColor="white"
            iconSize={32}
            icon="rep"
            onPress={() => setShowActivateModal(true)}
          >
            Activate card
          </Button>,
        );
      } else if (isCardholder || isManagerOrAdmin) {
        buttons.push(
          <Button
            key="freeze"
            style={{
              backgroundColor: "#71C5E7",
              borderTopWidth: 0,
              borderRadius: 12,
            }}
            color="#186177"
            iconColor="#186177"
            icon="freeze"
            onPress={() => toggleCardFrozen()}
            loading={!!isUpdatingStatus}
          >
            {card?.status == "active" ? "Freeze card" : "Defrost card"}
          </Button>,
        );
      }
    }

    // Add top up button
    if (isGrantCard && isManagerOrAdmin && canTopupCard(card)) {
      buttons.push(
        <Button
          key="topup"
          style={{
            backgroundColor: "#3499EE",
            borderTopWidth: 0,
            borderRadius: 12,
          }}
          color="white"
          iconColor="white"
          icon="plus"
          onPress={() => setShowTopupModal(true)}
        >
          Topup
        </Button>,
      );
    }

    // Add reveal details button
    if (
      card?.type == "virtual" &&
      (card?.status as Card["status"]) !== "canceled" &&
      isCardholder
    ) {
      buttons.push(
        <Button
          key="details"
          style={{
            borderRadius: 12,
            backgroundColor: palette.primary,
          }}
          color="white"
          iconColor="white"
          icon={detailsRevealed ? "private-fill" : "view"}
          onPress={toggleCardDetails}
          loading={!!detailsLoading}
        >
          {detailsRevealed ? "Hide details" : "Reveal details"}
        </Button>,
      );
    }

    // Add one time button
    if (isGrantCard && isManagerOrAdmin) {
      buttons.push(
        <Button
          icon="private"
          key="one-time"
          style={{
            backgroundColor: "#415E84",
          }}
          onPress={handleOneTimeUse}
          loading={isOneTimeUse}
        >
          One time use
        </Button>,
      );
    }

    if (isGrantCard && isManagerOrAdmin) {
      buttons.push(
        <Button
          icon="edit"
          key="edit-purpose"
          color="#114F3D"
          style={{
            backgroundColor: "#50ECC0",
          }}
          onPress={() => {
            setPurposeText("");
            setShowPurposeModal(true);
          }}
        >
          Set purpose
        </Button>,
      );
    }

    // Add grant button
    if (
      isGrantCard &&
      _card?.status != "canceled" &&
      (isCardholder || isManagerOrAdmin)
    ) {
      buttons.push(
        <Button
          key="grant"
          style={{
            backgroundColor: !isCardholder ? "#db1530" : "#3097ed",
            borderTopWidth: 0,
            borderRadius: 12,
          }}
          color="white"
          iconColor="white"
          icon={!isCardholder ? "reply" : "support"}
          onPress={returnGrant}
          loading={!!isReturningGrant}
        >
          {!isCardholder ? "Cancel grant" : "Return grant"}
        </Button>,
      );
    }

    if ((isManagerOrAdmin || isCardholder) && !isGrantCard) {
      buttons.push(
        <Button
          icon="fire"
          key="fire"
          style={{ backgroundColor: "#D0152D" }}
          onPress={handleBurnCard}
          loading={isBurningCard}
        >
          Burn card
        </Button>,
      );
    }

    if (buttons.length === 0) return null;

    const rows = [];
    for (let i = 0; i < buttons.length; i += 2) {
      const rowButtons = buttons.slice(i, i + 2);
      rows.push(rowButtons);
    }

    return (
      <View style={{ marginBottom: 20, gap: 15 }}>
        {rows.map((row, rowIndex) => (
          <View key={rowIndex} style={{ flexDirection: "row", gap: 15 }}>
            {row.map((button) =>
              cloneElement(button, {
                style: { ...button.props.style, flex: 1 },
              }),
            )}
          </View>
        ))}
      </View>
    );
  }

  if (!card && !cardLoaded && !cardError) {
    return <CardSkeleton />;
  }

  const renderCardStatus = () => {
    if (card?.status === "active") {
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
    } else if (card?.status === "frozen") {
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
    } else if (card?.status === "canceled") {
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
    } else if (card?.status === "expired") {
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

  console.log(grantCard);

  return (
    <Animated.View style={{ flex: 1, opacity: fadeAnim }}>
      <ScrollView
        contentContainerStyle={{
          padding: 20,
          paddingBottom: tabBarHeight + 20,
        }}
        showsVerticalScrollIndicator={false}
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
                card={card as Card}
                onCardLoad={() => setCardLoaded(true)}
                style={{ marginBottom: 10 }}
                pattern={pattern}
                patternDimensions={patternDimensions}
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
                    {card?.status == "expired" || card?.status == "canceled"
                      ? "$0"
                      : renderMoney(
                          grantCard?.amount_cents -
                            (card?.total_spent_cents ?? 0),
                        )}
                  </Text>
                </View>
              )}
            </TouchableOpacity>

            {card?.status != "canceled" && getCardActionButtons()}
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
                    paddingRight: 90,
                  }}
                >
                  <UserAvatar
                    user={card.user}
                    size={40}
                    style={{ marginRight: 10 }}
                  />
                  <View style={{ flex: 1, flexShrink: 1 }}>
                    <Text
                      style={{
                        fontSize: 18,
                        fontWeight: "600",
                        color: themeColors.text,
                      }}
                      numberOfLines={2}
                      ellipsizeMode="tail"
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
                      {card?.type === "virtual"
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
                    paddingRight: 90,
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
                      {card?.type === "virtual"
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
                    flexShrink: 1,
                  }}
                >
                  Card number
                </Text>
                <View style={{ flex: 1, alignItems: "flex-end" }}>
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
                        fontFamily: "JetBrainsMono-Regular",
                      }}
                      selectable={detailsRevealed && details ? true : false}
                    >
                      {detailsRevealed && details
                        ? renderCardNumber(details.number)
                        : redactedCardNumber(card?.last4 ?? grantCard?.last4)}
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
                    flexShrink: 1,
                  }}
                >
                  Expires
                </Text>
                <View style={{ flex: 1, alignItems: "flex-end" }}>
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
                        fontFamily: "JetBrainsMono-Regular",
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
                    flexShrink: 1,
                  }}
                >
                  CVC
                </Text>
                <View style={{ flex: 1, alignItems: "flex-end" }}>
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
                        fontFamily: "JetBrainsMono-Regular",
                      }}
                      selectable={detailsRevealed && details ? true : false}
                    >
                      {detailsRevealed && details ? details.cvc : "•••"}
                    </Text>
                  )}
                </View>
              </View>
              {isGrantCard && (
                <>
                  <Divider />

                  <View>
                    {grantCard?.user?.email && !isCardholder && (
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
                            flexShrink: 1,
                          }}
                        >
                          Grant sent to
                        </Text>
                        <Text
                          style={{
                            color: palette.muted,
                            fontSize: 16,
                            fontWeight: "500",
                            fontFamily: "JetBrainsMono-Regular",
                          }}
                          onPress={() =>
                            Linking.openURL(`mailto:${grantCard?.user?.email}`)
                          }
                        >
                          {grantCard?.user?.email}
                        </Text>
                      </View>
                    )}
                    <View
                      style={{
                        flexDirection: "row",
                        justifyContent: "space-between",
                        marginBottom: 12,
                        flexWrap: "wrap",
                      }}
                    >
                      <Text
                        style={{
                          fontSize: 16,
                          color: themeColors.text,
                        }}
                      >
                        Allowed Merchants
                      </Text>
                      <Text
                        style={{
                          color: palette.muted,
                          fontSize: 16,
                          fontWeight: "500",
                          fontFamily: "JetBrainsMono-Regular",
                        }}
                      >
                        {formatMerchantNames(grantCard?.allowed_merchants)}
                      </Text>
                    </View>
                    <View
                      style={{
                        flexDirection: "row",
                        justifyContent: "space-between",
                        marginBottom: 12,
                        flexWrap: "wrap",
                      }}
                    >
                      <Text
                        style={{
                          fontSize: 16,
                          color: themeColors.text,
                          flexShrink: 1,
                        }}
                      >
                        Allowed Categories
                      </Text>
                      <Text
                        style={{
                          color: palette.muted,
                          fontSize: 16,
                          fontWeight: "500",
                          fontFamily: "JetBrainsMono-Regular",
                        }}
                      >
                        {formatCategoryNames(grantCard?.allowed_categories)}
                      </Text>
                    </View>
                    {grantCard?.purpose && (
                      <>
                        <Text
                          style={{
                            fontSize: 16,
                            color: themeColors.text,
                            flexShrink: 1,
                          }}
                        >
                          Purpose
                        </Text>
                        <Text
                          style={{
                            color: palette.muted,
                            fontSize: 16,
                            fontWeight: "500",
                            fontFamily: "JetBrainsMono-Regular",
                          }}
                        >
                          {grantCard?.purpose}
                        </Text>
                      </>
                    )}
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
                        flexShrink: 1,
                      }}
                    >
                      One time use?
                    </Text>
                    <Text
                      style={{
                        color: palette.muted,
                        fontSize: 16,
                        fontWeight: "500",
                        fontFamily: "JetBrainsMono-Regular",
                      }}
                    >
                      {grantCard?.one_time_use ? "Yes" : "No"}
                    </Text>
                  </View>
                </>
              )}
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
              {card?.total_spent_cents != null && (
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
                    {renderMoney(card?.total_spent_cents)}
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
                          card?.organization?.id || _card?.organization?.id,
                        transaction,
                        transactionId: transaction.id,
                        title: getTransactionTitle(transaction),
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
                      showMerchantIcon={true}
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

      {/* Add the activation modal */}
      <Modal
        visible={showActivateModal}
        transparent
        animationType="fade"
        onRequestClose={() => setShowActivateModal(false)}
      >
        <View
          style={{
            flex: 1,
            backgroundColor: "rgba(0, 0, 0, 0.5)",
            justifyContent: "center",
            alignItems: "center",
            padding: 20,
          }}
        >
          <View
            style={{
              backgroundColor: themeColors.card,
              borderRadius: 15,
              padding: 20,
              width: "100%",
              maxWidth: 400,
            }}
          >
            <Text
              style={{
                fontSize: 20,
                fontWeight: "600",
                color: themeColors.text,
                marginBottom: 10,
              }}
            >
              Activate Physical Card
            </Text>
            <Text
              style={{
                fontSize: 16,
                color: themeColors.text,
                marginBottom: 20,
              }}
            >
              Please enter the last 4 digits of your card to activate it.
            </Text>
            <TextInput
              style={{
                backgroundColor: "rgba(0, 0, 0, 0.05)",
                borderRadius: 8,
                padding: 12,
                fontSize: 16,
                color: themeColors.text,
                marginBottom: 20,
                fontFamily: "JetBrainsMono-Regular",
              }}
              placeholder="Last 4 digits"
              placeholderTextColor={palette.muted}
              keyboardType="number-pad"
              maxLength={4}
              value={last4}
              onChangeText={setLast4}
              autoFocus
            />
            <View style={{ flexDirection: "row", gap: 10 }}>
              <Button
                style={{
                  flex: 1,
                  backgroundColor: "rgba(0, 0, 0, 0.05)",
                }}
                color={themeColors.text}
                onPress={() => {
                  setShowActivateModal(false);
                  setLast4("");
                }}
              >
                Cancel
              </Button>
              <Button
                style={{ flex: 1 }}
                onPress={handleActivate}
                loading={activating}
              >
                Activate
              </Button>
            </View>
          </View>
        </View>
      </Modal>

      {/* Add the top-up modal */}
      <Modal
        visible={showTopupModal}
        transparent
        animationType="fade"
        onRequestClose={() => setShowTopupModal(false)}
      >
        <View
          style={{
            flex: 1,
            backgroundColor: "rgba(0, 0, 0, 0.5)",
            justifyContent: "center",
            alignItems: "center",
            padding: 20,
          }}
        >
          <View
            style={{
              backgroundColor: themeColors.card,
              borderRadius: 15,
              padding: 20,
              width: "100%",
              maxWidth: 400,
            }}
          >
            <Text
              style={{
                fontSize: 20,
                fontWeight: "600",
                color: themeColors.text,
                marginBottom: 10,
              }}
            >
              Topup Grant
            </Text>
            <Text
              style={{
                fontSize: 16,
                color: themeColors.text,
                marginBottom: 8,
                fontWeight: "500",
              }}
            >
              Amount
            </Text>
            <TextInput
              style={{
                backgroundColor: "rgba(0, 0, 0, 0.05)",
                borderRadius: 8,
                padding: 12,
                fontSize: 16,
                color: themeColors.text,
                marginBottom: 20,
                fontFamily: "JetBrainsMono-Regular",
              }}
              placeholder="500.00"
              placeholderTextColor={themeColors.text + "80"}
              keyboardType="decimal-pad"
              value={topupAmount}
              onChangeText={setTopupAmount}
              autoFocus
            />
            <View style={{ flexDirection: "row", gap: 10 }}>
              <Button
                style={{
                  flex: 1,
                  borderRadius: 15,
                  backgroundColor: "rgba(0, 0, 0, 0.05)",
                }}
                color={themeColors.text}
                onPress={() => {
                  setShowTopupModal(false);
                  setTopupAmount("");
                }}
              >
                Cancel
              </Button>
              <Button
                style={{
                  flex: 1,
                  backgroundColor: "#3499EE",
                  borderRadius: 15,
                  paddingVertical: 14,
                }}
                color="white"
                onPress={handleTopup}
                loading={isToppingUp}
                disabled={!topupAmount || parseFloat(topupAmount) <= 0}
              >
                Topup
              </Button>
            </View>
          </View>
        </View>
      </Modal>

      {/* Add the purpose modal */}
      <Modal
        visible={showPurposeModal}
        transparent
        animationType="fade"
        onRequestClose={() => setShowPurposeModal(false)}
      >
        <View
          style={{
            flex: 1,
            backgroundColor: "rgba(0, 0, 0, 0.5)",
            justifyContent: "center",
            alignItems: "center",
            padding: 20,
          }}
        >
          <View
            style={{
              backgroundColor: themeColors.card,
              borderRadius: 15,
              padding: 20,
              width: "100%",
              maxWidth: 400,
            }}
          >
            <Text
              style={{
                fontSize: 20,
                fontWeight: "600",
                color: themeColors.text,
                marginBottom: 10,
              }}
            >
              Set Grant Purpose
            </Text>
            <Text
              style={{
                fontSize: 16,
                color: themeColors.text,
                marginBottom: 8,
                fontWeight: "500",
              }}
            >
              Purpose
            </Text>
            <TextInput
              style={{
                backgroundColor: "rgba(0, 0, 0, 0.05)",
                borderRadius: 8,
                padding: 12,
                fontSize: 16,
                color: themeColors.text,
                marginBottom: 20,
                fontFamily: "JetBrainsMono-Regular",
                minHeight: 80,
                textAlignVertical: "top",
              }}
              placeholder="Describe the purpose of this grant..."
              placeholderTextColor={themeColors.text + "80"}
              multiline
              numberOfLines={4}
              value={purposeText}
              onChangeText={setPurposeText}
              autoFocus
            />
            <View style={{ flexDirection: "row", gap: 10 }}>
              <Button
                style={{
                  flex: 1,
                  borderRadius: 15,
                  backgroundColor: "rgba(0, 0, 0, 0.05)",
                }}
                color={themeColors.text}
                onPress={() => {
                  setShowPurposeModal(false);
                  setPurposeText("");
                }}
              >
                Cancel
              </Button>
              <Button
                style={{
                  flex: 1,
                  backgroundColor: "#50ECC0",
                  borderRadius: 15,
                  paddingVertical: 14,
                }}
                color="#114F3D"
                onPress={handleSetPurpose}
                loading={isSettingPurpose}
              >
                Set Purpose
              </Button>
            </View>
          </View>
        </View>
      </Modal>
    </Animated.View>
  );
}
