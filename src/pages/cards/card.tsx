import { Ionicons } from "@expo/vector-icons";
import { useBottomTabBarHeight } from "@react-navigation/bottom-tabs";
import { useTheme, useFocusEffect } from "@react-navigation/native";
import {
  NativeStackNavigationProp,
  NativeStackScreenProps,
} from "@react-navigation/native-stack";
import { AddToWalletButton } from "@stripe/stripe-react-native";
import * as Haptics from "expo-haptics";
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
import CardDetails from "../../components/cards/CardDetails";
import CardDisplay from "../../components/cards/CardDisplay";
import CardError from "../../components/cards/CardError";
import CardSkeleton from "../../components/cards/CardSkeleton";
import CardTransactions from "../../components/cards/CardTransactions";
import ActivateCardModal from "../../components/cards/modals/ActivateCardModal";
import SetPurposeModal from "../../components/cards/modals/SetPurposeModal";
import TopupModal from "../../components/cards/modals/TopupModal";
import WalletModal from "../../components/cards/modals/WalletModal";
import useClient from "../../lib/client";
import { CardsStackParamList } from "../../lib/NavigatorParamList";
import useTransactions from "../../lib/organization/useTransactions";
import Card from "../../lib/types/Card";
import GrantCard from "../../lib/types/GrantCard";
import { OrganizationExpanded } from "../../lib/types/Organization";
import User from "../../lib/types/User";
import { useIsDark } from "../../lib/useColorScheme";
import useDigitalWallet from "../../lib/useDigitalWallet";
import { useOfflineSWR } from "../../lib/useOfflineSWR";
import useStripeCardDetails from "../../lib/useStripeCardDetails";
import { palette } from "../../styles/theme";
import {
  handleActivate,
  handleBurnCard,
  handleOneTimeUse,
  handleSetPurpose,
  handleTopup,
  returnGrant,
  toggleCardDetails,
  toggleCardFrozen,
} from "../../utils/cardActions";
import { normalizeSvg } from "../../utils/util";

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

  const { data: grantCard = _card as GrantCard } = useOfflineSWR<GrantCard>(
    grantId ? `card_grants/${grantId}` : null,
    { fallbackData: _card as GrantCard },
  );
  const id = _card?.id ?? grantCard?.card_id ?? `crd_${cardId}`;
  const { data: card, error: cardFetchError } = useOfflineSWR<Card>(
    `cards/${id}`,
    {
      onError: (err) => {
        console.error("Error fetching card", err, { context: { cardId: id } });
        setCardError("Unable to load card details. Please try again later.");
      },
    },
  );
  const { data: user } = useOfflineSWR<User>(`user`);
  const { data: organization } = useOfflineSWR<OrganizationExpanded>(
    `organizations/${_card?.organization.id || card?.organization.id}`,
  );

  const {
    details,
    toggle: toggleDetailsRevealed,
    revealed: detailsRevealed,
    loading: detailsLoading,
  } = useStripeCardDetails(_card?.id || card?.id || "");

  const isGrantCard =
    grantCard?.amount_cents != null ||
    (props as CardPageProps)?.grantId != null;
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
  const [showTopupModal, setShowTopupModal] = useState(false);
  const [showPurposeModal, setShowPurposeModal] = useState(false);
  const [showWalletModal, setShowWalletModal] = useState(false);
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
  const [cardAddedToWallet, setCardAddedToWallet] = useState(false);
  const [cardStatus, setCardStatus] = useState<string | null>(null);
  const isDark = useIsDark();
  const {
    canAddToWallet,
    ephemeralKey,
    card: walletCard,
    androidCardToken,
    status: walletStatus,
    refresh: refreshDigitalWallet,
  } = useDigitalWallet(
    _card?.id || card?.id || "",
    !isVirtualCard || !isCardholder,
  );
  const [ableToAddToWallet, setAbleToAddToWallet] = useState(canAddToWallet);
  const tabBarHeight = useBottomTabBarHeight();

  useEffect(() => {
    const timer = setTimeout(() => {
      setErrorDisplayReady(true);
    }, 2000);

    return () => clearTimeout(timer);
  }, []);

  useEffect(() => {
    setCardStatus(walletStatus);
    if ((cardFetchError || !card) && errorDisplayReady) {
      setCardError("Unable to load card details. Please try again later.");
    } else if (!cardFetchError) {
      setCardError(null);
      setAbleToAddToWallet(canAddToWallet);
    }
  }, [
    cardFetchError,
    errorDisplayReady,
    card,
    canAddToWallet,
    walletCard,
    walletStatus,
  ]);

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
    ableToAddToWallet,
    cardAddedToWallet,
    isDark,
    themeColors.text,
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

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    try {
      await mutate(`cards/${card?.id}`);
      await mutate(`cards/${id}/transactions`);
      await mutate(`card_grants/${grantId}`);
      setCardError(null);
      setTransactionError(null);
    } catch (err) {
      console.error("Refresh error", err, { context: { cardId: card?.id } });
    } finally {
      setRefreshing(false);
    }
  }, [mutate, card?.id, id, grantId]);

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
  const [isReturningGrant, setisReturningGrant] = useState(false);

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

  const canTopupCard = (card: Card | undefined) => {
    if (!card || !card.status) return false;
    return card.status !== "canceled" && card.status !== "expired";
  };

  function getCardActionButtons() {
    const buttons = [];

    // Add activate/freeze button
    if (!isGrantCard || isManagerOrAdmin) {
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

    // Add one time button
    if (isGrantCard && isManagerOrAdmin) {
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
              () => mutate(`card_grants/${grantId}`),
              hcb,
              grantId as string,
              grantCard as GrantCard,
            )
          }
          loading={isOneTimeUse}
        >
          One Time Use
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
          Set Purpose
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
          onPress={() =>
            returnGrant(
              card as Card,
              isCardholder,
              grantCard as GrantCard,
              setisReturningGrant,
              () => mutate(`card_grants/${grantId}`),
              hcb,
              grantId as string,
              navigation,
            )
          }
          loading={!!isReturningGrant}
        >
          {!isCardholder ? "Cancel Grant" : "Return Grant"}
        </Button>,
      );
    }

    if ((isManagerOrAdmin || isCardholder) && !isGrantCard) {
      buttons.push(
        <Button
          icon="fire"
          key="fire"
          style={{ backgroundColor: "#D0152D" }}
          onPress={() =>
            handleBurnCard(
              card as Card,
              setIsBurningCard,
              () => mutate(`cards/${card?.id}`),
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
            grantCard={grantCard}
            isGrantCard={isGrantCard}
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

        {ableToAddToWallet &&
          ephemeralKey &&
          Platform.OS === "ios" &&
          !isVirtualCard &&
          card?.status != "canceled" && (
            <AddToWalletButton
              token={androidCardToken}
              androidAssetSource={require("../../../assets/google-wallet.png")}
              style={{
                height: 48,
                width: "100%",
                marginBottom: 20,
              }}
              iOSButtonStyle={isDark ? "onDarkBackground" : "onLightBackground"}
              cardDetails={{
                name: walletCard?.cardholder?.name || user?.name || "",
                primaryAccountIdentifier:
                  walletCard?.wallets?.primary_account_identifier || null,
                lastFour: walletCard?.last4,
                description: "HCB Card",
              }}
              ephemeralKey={ephemeralKey}
              onComplete={({ error }) => {
                if (error) {
                  console.error("Error adding card to wallet", error);
                } else {
                  setAbleToAddToWallet(false);
                }
              }}
            />
          )}

        {card && (
          <CardDetails
            card={card}
            grantCard={grantCard}
            isGrantCard={isGrantCard}
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
            setIsToppingUp,
            setTopupAmount,
            setShowTopupModal,
            () => mutate(`cards/${card?.id}`),
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
            () => mutate(`cards/${card?.id}`),
            hcb,
            grantId || "",
            purposeText,
          )
        }
        purposeText={purposeText}
        setPurposeText={setPurposeText}
        isSettingPurpose={isSettingPurpose}
      />

      <WalletModal
        visible={showWalletModal}
        onClose={() => setShowWalletModal(false)}
        ableToAddToWallet={ableToAddToWallet}
        cardAddedToWallet={cardAddedToWallet}
        androidCardToken={androidCardToken}
        ephemeralKey={ephemeralKey}
        walletCard={walletCard}
        user={user || null}
        cardStatus={cardStatus}
        onComplete={({ error }) => {
          if (error) {
            console.error("Error adding card to wallet", error);
          } else {
            setCardStatus("CARD_ALREADY_EXISTS");
            setCardAddedToWallet(true);
            setAbleToAddToWallet(false);
            setShowWalletModal(false);
          }
        }}
      />
    </Animated.View>
  );
}
