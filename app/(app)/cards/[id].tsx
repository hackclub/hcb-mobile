import { Ionicons } from "@expo/vector-icons";
import { useFocusEffect, useTheme } from "expo-router/react-navigation";
import { useLocalSearchParams, useNavigation } from "expo-router";
import { generate } from "hcb-geo-pattern";
import { ReactElement, useCallback, useEffect, useState } from "react";
import {
  Animated,
  Platform,
  RefreshControl,
  ScrollView,
  TouchableOpacity,
  View,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useSWRConfig } from "swr";

import Button from "@/components/Button";
import AddToWalletSection from "@/components/cards/AddToWalletSection";
import ButtonGrid from "@/components/cards/ButtonGrid";
import CardDetails from "@/components/cards/CardDetails";
import CardDisplay from "@/components/cards/CardDisplay";
import CardError from "@/components/cards/CardError";
import CardSkeleton from "@/components/cards/CardSkeleton";
import CardTransactions from "@/components/cards/CardTransactions";
import ActivateCardModal from "@/components/cards/modals/ActivateCardModal";
import useClient from "@/lib/client";
import useTransactions from "@/lib/organization/useTransactions";
import { CardPolicy } from "@/lib/policies";
import Card from "@/lib/types/Card";
import { OrganizationExpanded } from "@/lib/types/Organization";
import User from "@/lib/types/User";
import useAddToWallet from "@/lib/useAddToWallet";
import { useIsDark } from "@/lib/useColorScheme";
import { useOfflineSWR } from "@/lib/useOfflineSWR";
import useSkeletonAnimation from "@/lib/useSkeletonAnimation";
import useStripeCardDetails from "@/lib/useStripeCardDetails";
import { palette } from "@/styles/theme";
import {
  handleActivate,
  handleBurnCard,
  toggleCardDetails,
  toggleCardFrozen,
} from "@/utils/cardActions";
import { getCardName } from "@/utils/cardHelpers";
import * as Haptics from "@/utils/haptics";
import { normalizeSvg } from "@/utils/format";
import { ShareHeaderButton } from "@/components/ShareHeaderButton";
import { shareUrl } from "@/utils/shareUrl";

export default function CardPage() {
  const { card: _card } = useLocalSearchParams();
  const navigation = useNavigation();

  const paramCard = _card
    ? typeof _card === "string"
      ? JSON.parse(_card)
      : _card
    : undefined;

  const { colors: themeColors } = useTheme();
  const hcb = useClient();

  const id = paramCard?.id ?? `crd_${paramCard.id}`;
  const {
    data: card,
    error: cardFetchError,
    mutate: mutateCard,
  } = useOfflineSWR<Card>(`cards/${id}?expand=last_frozen_by`, {
    onError: (err) => {
      console.error("Error fetching card", err, { context: { cardId: id } });
      setCardError("Unable to load card details. Please try again later.");
    },
  });
  const { data: user } = useOfflineSWR<User>(`user?expand=billing_address`);
  const { data: organization } = useOfflineSWR<OrganizationExpanded>(
    `organizations/${paramCard?.organization?.id || card?.organization?.id}`,
  );

  const {
    details,
    toggle: toggleDetailsRevealed,
    revealed: detailsRevealed,
    loading: detailsLoading,
  } = useStripeCardDetails(card?.id || "");

  const cardName = getCardName(card);
  const isCardholder = user?.id === card?.user?.id;
  const cardPolicy =
    card && organization
      ? new CardPolicy(user ?? null, card, organization)
      : null;
  const isVirtualCard = card?.type === "virtual";
  const [refreshing, setRefreshing] = useState(false);
  const [cardError, setCardError] = useState<string | null>(null);
  const [transactionError, setTransactionError] = useState<string | null>(null);
  const [cardExpanded, setCardExpanded] = useState(false);
  const fadeAnim = useState(new Animated.Value(0))[0];
  const [isUpdatingStatus, setIsUpdatingStatus] = useState(false);
  const createSkeletonStyle = useSkeletonAnimation();
  const [errorDisplayReady, setErrorDisplayReady] = useState(false);
  const [showActivateModal, setShowActivateModal] = useState(false);
  const [last4, setLast4] = useState("");
  const [activating, setActivating] = useState(false);
  const [pattern, setPattern] = useState<string>();
  const [patternDimensions, setPatternDimensions] = useState<{
    width: number;
    height: number;
  }>();
  const [isBurningCard, setIsBurningCard] = useState(false);
  const isDark = useIsDark();
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
    navigation.setOptions({ title: cardName });
  }, [cardName, navigation]);

  useEffect(() => {
    if (!card) return;
    if (
      Platform.OS === "android" &&
      (card.status === "active" || card.status === "frozen")
    ) {
      navigation.setOptions({
        headerRight: () => (
          <View style={{ flexDirection: "row" }}>
            <ShareHeaderButton url={shareUrl.card(id)} />
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
        headerRight: () => <ShareHeaderButton url={shareUrl.card(id)} />,
      });
    }
  }, [
    navigation,
    setShowWalletModal,
    ableToAddToWallet,
    cardAddedToWallet,
    isDark,
    themeColors.text,
    card,
    card?.status,
    id,
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
  } = useTransactions(id, "cards");

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
      await mutateCard();
      await mutateTransactions();
      setCardError(null);
      setTransactionError(null);
    } catch (err) {
      console.error("Refresh error", err, { context: { cardId: card?.id } });
    } finally {
      setRefreshing(false);
    }
  }, [mutateCard, card?.id, mutateTransactions]);

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

  const [cardDetailsLoading, setCardDetailsLoading] = useState(false);

  function getCardActionButtons() {
    const buttons: ReactElement[] = [];

    if (!isVirtualCard && card?.status === "inactive") {
      buttons.push(
        <Button
          key="activate"
          icon="rep"
          iconSize={32}
          onPress={() => setShowActivateModal(true)}
        >
          Activate Card
        </Button>,
      );
    } else if (cardPolicy?.freeze() || cardPolicy?.defrost()) {
      buttons.push(
        <Button
          key="freeze"
          style={{
            backgroundColor: "#71C5E7",
            borderColor: "#5ab0d4",
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
      cardPolicy?.ephemeralKeys()
    ) {
      buttons.push(
        <Button
          key={`details-${detailsRevealed}`}
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

    if (cardPolicy?.cancel()) {
      buttons.push(
        <Button
          icon="fire"
          key="fire"
          style={{ backgroundColor: "#D0152D" }}
          onPress={() =>
            handleBurnCard(
              card as Card,
              setIsBurningCard,
              () => mutateCard(),
              hcb,
            )
          }
          loading={isBurningCard}
        >
          Burn Card
        </Button>,
      );
    }

    return <ButtonGrid buttons={buttons} />;
  }

  if (!card && !cardLoaded && !cardError) {
    return <CardSkeleton />;
  }

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
            isGrantCard={false}
            cardExpanded={cardExpanded}
            setCardExpanded={setCardExpanded}
            details={details}
            onCardLoad={() => setCardLoaded(true)}
            pattern={pattern}
            patternDimensions={patternDimensions}
            cardName={cardName}
          />
        )}

        {card?.status != "canceled" && getCardActionButtons()}

        {isVirtualCard && (
          <AddToWalletSection
            {...wallet}
            user={user}
            cardNotCanceled={card?.status != "canceled"}
          />
        )}

        {card && (
          <CardDetails
            card={card}
            isGrantCard={false}
            isCardholder={isCardholder}
            cardName={cardName}
            details={details}
            detailsRevealed={detailsRevealed}
            detailsLoading={detailsLoading}
            cardDetailsLoading={cardDetailsLoading}
            createSkeletonStyle={createSkeletonStyle}
            user={user}
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

      <ActivateCardModal
        visible={showActivateModal}
        onClose={() => {
          setShowActivateModal(false);
          setLast4("");
        }}
        onActivate={() =>
          handleActivate(
            last4,
            setActivating,
            card as Card,
            setShowActivateModal,
            setLast4,
            hcb,
            onSuccessfulStatusChange,
          )
        }
        last4={last4}
        setLast4={setLast4}
        activating={activating}
      />
    </Animated.View>
  );
}
