import { useBottomTabBarHeight } from "@react-navigation/bottom-tabs";
import { NativeStackScreenProps } from "@react-navigation/native-stack";
import { generate } from "hcb-geo-pattern";
import { useEffect, useState, useCallback, useRef, cloneElement } from "react";
import {
  ScrollView,
  View,
  RefreshControl,
  Animated,
  Alert,
} from "react-native";
import { useSWRConfig } from "swr";

import Button from "../../components/Button";
import CardDetails from "../../components/cards/CardDetails";
import CardDisplay from "../../components/cards/CardDisplay";
import CardError from "../../components/cards/CardError";
import CardSkeleton from "../../components/cards/CardSkeleton";
import CardTransactions from "../../components/cards/CardTransactions";
import SetPurposeModal from "../../components/cards/modals/SetPurposeModal";
import TopupModal from "../../components/cards/modals/TopupModal";
import GrantWithoutCard from "../../components/grants/grantWithoutCard";
import useClient from "../../lib/client";
import {
  CardsStackParamList,
  StackParamList,
} from "../../lib/NavigatorParamList";
import useTransactions from "../../lib/organization/useTransactions";
import Card from "../../lib/types/Card";
import GrantCardType from "../../lib/types/GrantCard";
import { OrganizationExpanded } from "../../lib/types/Organization";
import User from "../../lib/types/User";
import { useOfflineSWR } from "../../lib/useOfflineSWR";
import useStripeCardDetails from "../../lib/useStripeCardDetails";
import { palette } from "../../styles/theme";
import {
  handleOneTimeUse,
  handleSetPurpose,
  handleTopup,
  returnGrant,
  toggleCardDetails,
  toggleCardFrozen,
} from "../../utils/cardActions";
import * as Haptics from "../../utils/haptics";
import { maybeRequestReview } from "../../utils/storeReview";
import { normalizeSvg } from "../../utils/util";

type Props = NativeStackScreenProps<
  CardsStackParamList | StackParamList,
  "GrantCard"
>;

export default function GrantCardPage({ route, navigation }: Props) {
  const { grantId, cardId } = route.params;
  const fullGrantId = grantId.startsWith("cdg_") ? grantId : `cdg_${grantId}`;

  const { data: grantCard, mutate: reloadGrant } = useOfflineSWR<GrantCardType>(
    `card_grants/${fullGrantId}?expand=balance_cents`,
  );
  const { data: user } = useOfflineSWR<User>(`user`);
  const hcb = useClient();

  const {
    data: card,
    error: cardFetchError,
    mutate: mutateCard,
  } = useOfflineSWR<Card>(
    cardId || grantCard?.card_id
      ? `cards/${cardId || grantCard?.card_id}?expand=last_frozen_by`
      : null,
    {
      onError: (err) => {
        console.error("Error fetching card", err, {
          context: { cardId: cardId || grantCard?.card_id },
        });
        setCardError("Unable to load card details. Please try again later.");
      },
    },
  );

  const { data: organization } = useOfflineSWR<OrganizationExpanded>(
    card?.organization.id ? `organizations/${card.organization.id}` : null,
  );

  const {
    details,
    toggle: toggleDetailsRevealed,
    revealed: detailsRevealed,
    loading: detailsLoading,
  } = useStripeCardDetails(card?.id || "");

  const isCardholder = user?.id === card?.user?.id;
  const isManagerOrAdmin =
    organization?.users.some(
      (orgUser) => orgUser.id === user?.id && orgUser.role === "manager",
    ) || user?.admin;
  const isVirtualCard = card?.type === "virtual";

  const [isActivating, setIsActivating] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [cardError, setCardError] = useState<string | null>(null);
  const [transactionError, setTransactionError] = useState<string | null>(null);
  const [cardExpanded, setCardExpanded] = useState(false);
  const fadeAnim = useState(new Animated.Value(0))[0];
  const [isUpdatingStatus, setIsUpdatingStatus] = useState(false);
  const skeletonAnim = useRef(new Animated.Value(0)).current;
  const [errorDisplayReady, setErrorDisplayReady] = useState(false);
  const [showTopupModal, setShowTopupModal] = useState(false);
  const [showPurposeModal, setShowPurposeModal] = useState(false);
  const [purposeText, setPurposeText] = useState("");
  const [isSettingPurpose, setIsSettingPurpose] = useState(false);
  const [isOneTimeUse, setIsOneTimeUse] = useState(false);
  const [topupAmount, setTopupAmount] = useState("");
  const [isToppingUp, setIsToppingUp] = useState(false);
  const [pattern, setPattern] = useState<string>();
  const [patternDimensions, setPatternDimensions] = useState<{
    width: number;
    height: number;
  }>();
  const [cardName, setCardName] = useState("");
  const [cardLoaded, setCardLoaded] = useState(false);
  const [cardDetailsLoading, setCardDetailsLoading] = useState(false);
  const [isReturningGrant, setIsReturningGrant] = useState(false);

  const tabBarHeight = useBottomTabBarHeight();
  const { mutate } = useSWRConfig();

  const {
    transactions,
    isLoading: transactionsLoading,
    isLoadingMore,
    isReachingEnd,
    loadMore,
    error: transactionsError,
    mutate: mutateTransactions,
  } = useTransactions(cardId || card?.id || grantCard?.card_id || "", "cards");

  useEffect(() => {
    const timer = setTimeout(() => {
      setErrorDisplayReady(true);
    }, 2000);
    return () => clearTimeout(timer);
  }, []);

  useEffect(() => {
    if (
      (cardFetchError || (!card && grantCard?.card_id)) &&
      errorDisplayReady
    ) {
      setCardError("Unable to load card details. Please try again later.");
    } else if (!cardFetchError) {
      setCardError(null);
    }
  }, [cardFetchError, errorDisplayReady, card, grantCard?.card_id]);

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
      setCardName(
        lastInitial
          ? `${firstName} ${lastInitial}'s Card`
          : `${firstName}'s Card`,
      );
    } else {
      setCardName("Grant Card");
    }
  }, [card]);

  useEffect(() => {
    navigation.setOptions({ title: cardName || "Grant Card" });
  }, [cardName, navigation]);

  useEffect(() => {
    if (transactionsError && errorDisplayReady) {
      setTransactionError(
        "Unable to load transaction history. Pull down to retry.",
      );
    } else if (!transactionsError) {
      setTransactionError(null);
    }
  }, [transactionsError, errorDisplayReady]);

  useEffect(() => {
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

  useEffect(() => {
    const generateCardPattern = async () => {
      if (!card || !isVirtualCard) return;

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
        console.error("Error generating pattern for card", error, {
          context: { cardId: card.id },
        });
      }
    };

    generateCardPattern();
  }, [card, isVirtualCard]);

  const skeletonBackground = skeletonAnim.interpolate({
    inputRange: [0, 1],
    outputRange: ["rgba(0, 0, 0, 0.03)", "rgba(0, 0, 0, 0.12)"],
  });

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

  // Handlers
  const handleActivateGrant = async () => {
    setIsActivating(true);
    try {
      const response = await hcb.post(`card_grants/${fullGrantId}/activate`);

      if (response.ok) {
        await reloadGrant();
        Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
        Alert.alert("Success", "Grant activated successfully!");
        maybeRequestReview();
      } else {
        const data = (await response.json()) as { error?: string };
        Alert.alert("Error", data.error || "Failed to activate grant");
        Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
      }
    } catch (err) {
      console.error("Error activating grant", err, { grantId: fullGrantId });
      Alert.alert("Error", "Failed to activate grant. Please try again later.");
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
    } finally {
      setIsActivating(false);
    }
  };

  const onSuccessfulStatusChange = (updatedStatus: string) => {
    setIsUpdatingStatus(false);

    const updatedCard = {
      ...card,
      status: updatedStatus,
    } as Card;

    // Use bound mutate for card - optimistically update then revalidate
    mutateCard(updatedCard, { revalidate: true });

    // Update user/cards list
    mutate(
      "user/cards",
      (list: Card[] | undefined) =>
        list?.map((c) => (c.id === updatedCard.id ? updatedCard : c)),
      { revalidate: true },
    );

    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
  };

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    try {
      await reloadGrant();
      await mutateCard();
      await mutateTransactions();
      setCardError(null);
      setTransactionError(null);
    } catch (err) {
      console.error("Refresh error", err, {
        context: { grantId: fullGrantId },
      });
    } finally {
      setRefreshing(false);
    }
  }, [reloadGrant, mutateCard, mutateTransactions, fullGrantId]);

  const canTopupCard = (card: Card | undefined) => {
    if (!card || !card.status) return false;
    return card.status !== "canceled" && card.status !== "expired";
  };

  if (!grantCard) {
    return <CardSkeleton />;
  }

  if (!grantCard.card_id) {
    return (
      <GrantWithoutCard
        grantCard={grantCard}
        user={user as User}
        isActivating={isActivating}
        handleActivateGrant={handleActivateGrant}
      />
    );
  }

  if (!card && !cardLoaded && !cardError) {
    return <CardSkeleton />;
  }

  function getGrantCardActionButtons() {
    const buttons = [];

    if (isManagerOrAdmin && card?.status !== "inactive") {
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
          onPress={() =>
            toggleCardFrozen(
              card as Card,
              setIsUpdatingStatus,
              onSuccessfulStatusChange,
              hcb,
            )
          }
          loading={!!isUpdatingStatus}
        >
          {card?.status === "active" ? "Freeze Card" : "Defrost Card"}
        </Button>,
      );
    }

    if (
      isVirtualCard &&
      (card?.status as Card["status"]) !== "canceled" &&
      isCardholder
    ) {
      buttons.push(
        <Button
          key={`details-${detailsRevealed}`}
          style={{
            borderRadius: 12,
            backgroundColor: palette.primary,
          }}
          color="white"
          iconColor="white"
          icon={detailsRevealed ? "private-fill" : "view"}
          onPress={() =>
            toggleCardDetails(
              detailsRevealed,
              setCardDetailsLoading,
              toggleDetailsRevealed,
            )
          }
          loading={!!detailsLoading || !!cardDetailsLoading}
        >
          {detailsRevealed ? "Hide Details" : "Reveal Details"}
        </Button>,
      );
    }

    if (isManagerOrAdmin && canTopupCard(card)) {
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

    if (isManagerOrAdmin) {
      buttons.push(
        <Button
          icon="private"
          key="one-time"
          style={{
            backgroundColor: "#415E84",
          }}
          onPress={() =>
            handleOneTimeUse(
              card as Card,
              setIsOneTimeUse,
              mutate,
              hcb,
              fullGrantId,
              grantCard as GrantCardType,
            )
          }
          loading={isOneTimeUse}
        >
          One Time Use
        </Button>,
      );
    }

    if (isManagerOrAdmin) {
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
          Set Purpose
        </Button>,
      );
    }

    if (card?.status !== "canceled" && (isCardholder || isManagerOrAdmin)) {
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
          onPress={() =>
            returnGrant(
              card as Card,
              isCardholder,
              grantCard as GrantCardType,
              setIsReturningGrant,
              mutate,
              hcb,
              fullGrantId,
              navigation,
            )
          }
          loading={!!isReturningGrant}
        >
          {!isCardholder ? "Cancel Grant" : "Return Grant"}
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
        onScroll={({ nativeEvent }) => {
          const { layoutMeasurement, contentOffset, contentSize } = nativeEvent;
          const paddingToBottom = 20;
          if (
            layoutMeasurement.height + contentOffset.y >=
            contentSize.height - paddingToBottom
          ) {
            if (!isReachingEnd && !isLoadingMore) {
              loadMore();
            }
          }
        }}
        scrollEventThrottle={400}
      >
        {cardError && <CardError error={cardError} onRetry={onRefresh} />}

        {card && (
          <CardDisplay
            card={card}
            grantCard={grantCard}
            isGrantCard={true}
            cardExpanded={cardExpanded}
            setCardExpanded={setCardExpanded}
            details={details}
            onCardLoad={() => setCardLoaded(true)}
            pattern={pattern}
            patternDimensions={patternDimensions}
            cardName={cardName}
          />
        )}

        {card?.status !== "canceled" && getGrantCardActionButtons()}

        {card && (
          <CardDetails
            card={card}
            grantCard={grantCard}
            isGrantCard={true}
            isCardholder={isCardholder}
            cardName={cardName}
            details={details}
            detailsRevealed={detailsRevealed}
            detailsLoading={detailsLoading}
            cardDetailsLoading={cardDetailsLoading}
            createSkeletonStyle={createSkeletonStyle}
          />
        )}

        {!transactionError && !transactionsLoading && (
          <CardTransactions
            transactions={transactions}
            transactionsLoading={transactionsLoading}
            transactionError={transactionError}
            isLoadingMore={isLoadingMore || false}
            card={card as Card}
            _card={card as Card}
            navigation={navigation}
          />
        )}
      </ScrollView>

      <TopupModal
        visible={showTopupModal}
        onClose={() => {
          setShowTopupModal(false);
          setTopupAmount("");
        }}
        onTopup={() =>
          handleTopup(
            topupAmount,
            card as Card,
            fullGrantId,
            setIsToppingUp,
            setTopupAmount,
            setShowTopupModal,
            mutate,
            hcb,
          )
        }
        topupAmount={topupAmount}
        setTopupAmount={setTopupAmount}
        isToppingUp={isToppingUp}
      />

      <SetPurposeModal
        visible={showPurposeModal}
        onClose={() => {
          setShowPurposeModal(false);
          setPurposeText("");
        }}
        onSetPurpose={() =>
          handleSetPurpose(
            card as Card,
            setIsSettingPurpose,
            setPurposeText,
            setShowPurposeModal,
            mutate,
            hcb,
            fullGrantId,
            purposeText,
          )
        }
        purposeText={purposeText}
        setPurposeText={setPurposeText}
        isSettingPurpose={isSettingPurpose}
      />
    </Animated.View>
  );
}
