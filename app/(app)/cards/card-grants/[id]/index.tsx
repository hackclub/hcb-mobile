import { Ionicons } from "@expo/vector-icons";
import { router, useLocalSearchParams, useNavigation } from "expo-router";
import { useFocusEffect, useTheme } from "expo-router/react-navigation";
import { generate } from "hcb-geo-pattern";
import { useCallback, useEffect, useState } from "react";
import {
  Alert,
  Animated,
  Platform,
  RefreshControl,
  ScrollView,
  TouchableOpacity,
  View,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useSWRConfig } from "swr";

import AddToWalletSection from "@/components/cards/AddToWalletSection";
import CardActionButton from "@/components/cards/CardActionButton";
import CardDetails from "@/components/cards/CardDetails";
import CardDisplay from "@/components/cards/CardDisplay";
import CardError from "@/components/cards/CardError";
import CardSkeleton from "@/components/cards/CardSkeleton";
import CardTransactions from "@/components/cards/CardTransactions";
import GrantWithoutCard from "@/components/grants/grantWithoutCard";
import { ShareHeaderButton } from "@/components/ShareHeaderButton";
import { parseApiError } from "@/lib/alertUtils";
import useClient from "@/lib/client";
import useTransactions from "@/lib/organization/useTransactions";
import { CardGrantPolicy, CardPolicy } from "@/lib/policies";
import Card from "@/lib/types/Card";
import GrantCardType from "@/lib/types/GrantCard";
import { OrganizationExpanded } from "@/lib/types/Organization";
import User from "@/lib/types/User";
import useAddToWallet from "@/lib/useAddToWallet";
import { useOfflineSWR } from "@/lib/useOfflineSWR";
import useSkeletonAnimation from "@/lib/useSkeletonAnimation";
import useStripeCardDetails from "@/lib/useStripeCardDetails";
import { palette } from "@/styles/theme";
import {
  returnGrant,
  toggleCardDetails,
  toggleCardFrozen,
} from "@/utils/cardActions";
import { getCardName } from "@/utils/cardHelpers";
import { normalizeSvg } from "@/utils/format";
import * as Haptics from "@/utils/haptics";
import { shareUrl } from "@/utils/shareUrl";
import { maybeRequestReview } from "@/utils/storeReview";

export default function Page() {
  const navigation = useNavigation();
  const { id: grantId, cardId } = useLocalSearchParams<{
    id: string;
    cardId?: string;
  }>();
  const fullGrantId = grantId.startsWith("cdg_") ? grantId : `cdg_${grantId}`;
  const { colors: themeColors } = useTheme();

  const { data: grantCard, mutate: reloadGrant } = useOfflineSWR<GrantCardType>(
    `card_grants/${fullGrantId}?expand=balance_cents`,
  );
  const { data: user } = useOfflineSWR<User>(`user?expand=billing_address`);
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

  const cardName = getCardName(card, "Grant Card");
  const isCardholder = user?.id === card?.user?.id;
  const grantPolicy =
    grantCard && organization
      ? new CardGrantPolicy(user ?? null, grantCard, organization)
      : null;
  const cardPolicy =
    card && organization
      ? new CardPolicy(user ?? null, card, organization)
      : null;
  const isVirtualCard = card?.type === "virtual";

  const [isActivating, setIsActivating] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [cardError, setCardError] = useState<string | null>(null);
  const [transactionError, setTransactionError] = useState<string | null>(null);
  const [cardExpanded, setCardExpanded] = useState(false);
  const fadeAnim = useState(new Animated.Value(0))[0];
  const [isUpdatingStatus, setIsUpdatingStatus] = useState(false);
  const createSkeletonStyle = useSkeletonAnimation();
  const [errorDisplayReady, setErrorDisplayReady] = useState(false);
  const [pattern, setPattern] = useState<string>();
  const [patternDimensions, setPatternDimensions] = useState<{
    width: number;
    height: number;
  }>();
  const [cardLoaded, setCardLoaded] = useState(false);
  const [cardDetailsLoading, setCardDetailsLoading] = useState(false);
  const [isReturningGrant, setIsReturningGrant] = useState(false);

  const wallet = useAddToWallet(card?.id || "", {
    isVirtualCard: !!isVirtualCard,
    isCardholder: !!isCardholder,
  });
  const {
    setShowWalletModal,
    ableToAddToWallet,
    cardAddedToWallet,
    showWalletModal,
    refreshDigitalWallet,
  } = wallet;

  const { bottom: tabBarHeight } = useSafeAreaInsets();
  const { mutate } = useSWRConfig();

  useEffect(() => {
    if (!grantCard) return;
    if (
      Platform.OS === "android" &&
      card &&
      (card.status === "active" || card.status === "frozen") &&
      isVirtualCard &&
      isCardholder
    ) {
      navigation.setOptions({
        headerRight: () => (
          <View style={{ flexDirection: "row" }}>
            <ShareHeaderButton url={shareUrl.cardGrant(fullGrantId)} />
            <TouchableOpacity
              onPress={() => setShowWalletModal(true)}
              style={{ padding: 8 }}
            >
              <Ionicons
                name="wallet-outline"
                size={24}
                color={themeColors.text}
              />
            </TouchableOpacity>
          </View>
        ),
      });
    } else {
      navigation.setOptions({
        headerRight: () => (
          <ShareHeaderButton url={shareUrl.cardGrant(fullGrantId)} />
        ),
      });
    }
  }, [
    navigation,
    setShowWalletModal,
    ableToAddToWallet,
    cardAddedToWallet,
    themeColors.text,
    card,
    card?.status,
    isVirtualCard,
    isCardholder,
    grantCard,
    fullGrantId,
  ]);

  useEffect(() => {
    refreshDigitalWallet();
  }, [showWalletModal, refreshDigitalWallet]);

  useFocusEffect(
    useCallback(() => {
      if (!showWalletModal) {
        refreshDigitalWallet();
      }
    }, [refreshDigitalWallet, showWalletModal]),
  );

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
        const data = (await response.json()) as {
          messages?: string[];
          error?: string;
        };
        Alert.alert(
          "Error",
          data.messages?.[0] || data.error || "Failed to activate grant",
        );
        Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
      }
    } catch (err) {
      console.error("Error activating grant", err, { grantId: fullGrantId });
      Alert.alert(
        "Error",
        await parseApiError(
          err,
          "Failed to activate grant. Please try again later.",
        ),
      );
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

    mutateCard(updatedCard, { revalidate: true });

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

  const canToggleDetails =
    isVirtualCard &&
    (card?.status as Card["status"]) !== "canceled" &&
    cardPolicy?.ephemeralKeys();

  const canFreeze =
    (cardPolicy?.freeze() || cardPolicy?.defrost()) &&
    card?.status !== "inactive";
  const canCancelGrant = card?.status !== "canceled" && grantPolicy?.cancel();

  const canManageGrant =
    grantPolicy?.topup() ||
    grantPolicy?.withdraw() ||
    grantPolicy?.toggleOneTimeUse() ||
    grantPolicy?.editPurpose();

  return (
    <Animated.View style={{ flex: 1, opacity: fadeAnim }}>
      <ScrollView
        contentInsetAdjustmentBehavior="automatic"
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

        {card?.status !== "canceled" && (
          <View style={{ marginBottom: 20, gap: 12 }}>
            {(canFreeze || canCancelGrant) && (
              <View style={{ flexDirection: "row", gap: 12 }}>
                {canFreeze && (
                  <CardActionButton
                    icon="freeze"
                    label={card?.status === "active" ? "Freeze" : "Defrost"}
                    loading={!!isUpdatingStatus}
                    style={{ flex: 1 }}
                    onPress={() =>
                      toggleCardFrozen(
                        card as Card,
                        setIsUpdatingStatus,
                        onSuccessfulStatusChange,
                        hcb,
                      )
                    }
                  />
                )}
                {canCancelGrant && (
                  <CardActionButton
                    icon={!isCardholder ? "reply" : "support"}
                    label={!isCardholder ? "Cancel Grant" : "Return Grant"}
                    destructive
                    loading={!!isReturningGrant}
                    style={{ flex: 1 }}
                    onPress={() =>
                      returnGrant(
                        card as Card,
                        isCardholder,
                        grantCard as GrantCardType,
                        setIsReturningGrant,
                        mutate,
                        hcb,
                        fullGrantId,
                      )
                    }
                  />
                )}
              </View>
            )}
            {canManageGrant && (
              <CardActionButton
                icon="settings"
                label="Manage Grant"
                onPress={() =>
                  router.push({
                    pathname: "/cards/card-grants/[id]/manage",
                    params: { id: fullGrantId },
                  })
                }
              />
            )}
          </View>
        )}

        {isVirtualCard && isCardholder && (
          <AddToWalletSection
            {...wallet}
            user={user}
            cardNotCanceled={card?.status !== "canceled"}
            description="HCB Grant Card"
          />
        )}

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
            user={user}
            onToggleDetails={
              canToggleDetails
                ? () =>
                    toggleCardDetails(
                      detailsRevealed,
                      setCardDetailsLoading,
                      toggleDetailsRevealed,
                    )
                : undefined
            }
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
          />
        )}
      </ScrollView>
    </Animated.View>
  );
}
