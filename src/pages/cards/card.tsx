import { Ionicons } from "@expo/vector-icons";
import { useBottomTabBarHeight } from "@react-navigation/bottom-tabs";
import { useTheme, useFocusEffect } from "@react-navigation/native";
import {
  NativeStackNavigationProp,
  NativeStackScreenProps,
} from "@react-navigation/native-stack";
import { generate } from "hcb-geo-pattern";
import { useEffect, useState, useCallback, useRef, cloneElement } from "react";
import {
  ScrollView,
  View,
  TouchableOpacity,
  RefreshControl,
  Animated,
  Platform,
} from "react-native";
import { useSWRConfig } from "swr";

import Button from "../../components/Button";
import AddToWalletSection from "../../components/cards/AddToWalletSection";
import CardDetails from "../../components/cards/CardDetails";
import CardDisplay from "../../components/cards/CardDisplay";
import CardError from "../../components/cards/CardError";
import CardSkeleton from "../../components/cards/CardSkeleton";
import CardTransactions from "../../components/cards/CardTransactions";
import ActivateCardModal from "../../components/cards/modals/ActivateCardModal";
import useClient from "../../lib/client";
import { CardsStackParamList } from "../../lib/NavigatorParamList";
import useTransactions from "../../lib/organization/useTransactions";
import Card from "../../lib/types/Card";
import { OrganizationExpanded } from "../../lib/types/Organization";
import User from "../../lib/types/User";
import useAddToWallet from "../../lib/useAddToWallet";
import { useIsDark } from "../../lib/useColorScheme";
import { useOfflineSWR } from "../../lib/useOfflineSWR";
import useStripeCardDetails from "../../lib/useStripeCardDetails";
import { palette } from "../../styles/theme";
import {
  handleActivate,
  handleBurnCard,
  toggleCardDetails,
  toggleCardFrozen,
} from "../../utils/cardActions";
import * as Haptics from "../../utils/haptics";
import { normalizeSvg } from "../../utils/util";

type CardPageProps = {
  cardId?: string;
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

  const id = _card?.id ?? `crd_${cardId}`;
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
    `organizations/${_card?.organization.id || card?.organization.id}`,
  );

  const {
    details,
    toggle: toggleDetailsRevealed,
    revealed: detailsRevealed,
    loading: detailsLoading,
  } = useStripeCardDetails(_card?.id || card?.id || "");

  const isCardholder = user?.id == card?.user?.id;
  const isManagerOrAdmin =
    organization?.users.some(
      (orgUser) => orgUser.id === user?.id && orgUser.role === "manager",
    ) || user?.admin;
  const isVirtualCard = card?.type === "virtual";
  const [refreshing, setRefreshing] = useState(false);
  const [cardError, setCardError] = useState<string | null>(null);
  const [transactionError, setTransactionError] = useState<string | null>(null);
  const [cardExpanded, setCardExpanded] = useState(false);
  const fadeAnim = useState(new Animated.Value(0))[0];
  const [isUpdatingStatus, setIsUpdatingStatus] = useState(false);
  const skeletonAnim = useRef(new Animated.Value(0)).current;
  const [errorDisplayReady, setErrorDisplayReady] = useState(false);
  const [showActivateModal, setShowActivateModal] = useState(false);
  const [last4, setLast4] = useState("");
  const [activating, setActivating] = useState(false);
  const [pattern, setPattern] = useState<string>();
  const [patternDimensions, setPatternDimensions] = useState<{
    width: number;
    height: number;
  }>();
  const [cardName, setCardName] = useState("");
  const [isBurningCard, setIsBurningCard] = useState(false);
  const isDark = useIsDark();
  const wallet = useAddToWallet(_card?.id || card?.id || "", {
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
  const tabBarHeight = useBottomTabBarHeight();

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
          ? `${firstName} ${lastInitial}'s Card`
          : `${firstName}'s Card`,
      );
    }
  }, [card]);

  useEffect(() => {
    navigation.setOptions({ title: cardName });
  }, [cardName, navigation, themeColors.text]);

  // Set up wallet icon in header for Android
  useEffect(() => {
    if (
      Platform.OS === "android" &&
      (card?.status == "active" || card?.status == "frozen")
    ) {
      navigation.setOptions({
        headerRight: () => (
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
        ),
      });
    } else {
      navigation.setOptions({
        headerRight: undefined,
      });
    }
  }, [
    navigation,
    setShowWalletModal,
    ableToAddToWallet,
    cardAddedToWallet,
    isDark,
    themeColors.text,
    card?.status,
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

  const [cardDetailsLoading, setCardDetailsLoading] = useState(false);

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

  function getCardActionButtons() {
    const buttons = [];

    // Add activate/freeze button
    if (!isVirtualCard && card?.status === "inactive") {
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
          Activate Card
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
          {card?.status == "active" ? "Freeze Card" : "Defrost Card"}
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

    if (isManagerOrAdmin || isCardholder) {
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
            _card={_card as Card}
            navigation={navigation}
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
