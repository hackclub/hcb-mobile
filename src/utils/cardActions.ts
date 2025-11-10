import { NativeStackNavigationProp } from "@react-navigation/native-stack";
import * as Haptics from "expo-haptics";
import { KyInstance } from "ky";
import { Alert } from "react-native";
import { ALERT_TYPE, Toast } from "react-native-alert-notification";

import { showAlert } from "../lib/alertUtils";
import { CardsStackParamList } from "../lib/NavigatorParamList";
import Card from "../lib/types/Card";
import GrantCard from "../lib/types/GrantCard";
import User from "../lib/types/User";

import { validateFields } from "./cardHelpers";
import { renderMoney } from "./util";

export const toggleCardFrozen = (
  card: Card,
  setIsUpdatingStatus: (isUpdatingStatus: boolean) => void,
  onSuccessfulStatusChange: (newStatus: string) => void,
  hcb: KyInstance,
) => {
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
      console.error("Error updating card status", err, {
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

export const toggleCardDetails = async (
  detailsRevealed: boolean,
  setCardDetailsLoading: (isLoading: boolean) => void,
  toggleDetailsRevealed: () => void,
) => {
  const willReveal = !detailsRevealed;
  if (willReveal) {
    setCardDetailsLoading(true);
  }
  await toggleDetailsRevealed();
  if (willReveal) {
    setTimeout(() => setCardDetailsLoading(false), 800);
  } else {
    setCardDetailsLoading(false);
  }
};

export const handleTopup = async (
  topupAmount: string,
  card: Card,
  setIsToppingUp: (isToppingUp: boolean) => void,
  setTopupAmount: (topupAmount: string) => void,
  setShowTopupModal: (showTopupModal: boolean) => void,
  mutate: (key: string) => Promise<void>,
  hcb: KyInstance,
) => {
  if (!topupAmount || !card) return;

  const amount = parseFloat(topupAmount);
  if (isNaN(amount) || amount <= 0) {
    showAlert("Invalid Amount", "Please enter a valid amount greater than 0.");
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
    console.error("Topup error", error, {
      cardId: card.id,
      amount: topupAmount,
    });
    showAlert("Error", "Failed to top up card. Please try again.");
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
  } finally {
    setIsToppingUp(false);
  }
};

export const handleSetPurpose = async (
  card: Card,
  setIsSettingPurpose: (isSettingPurpose: boolean) => void,
  setPurposeText: (purposeText: string) => void,
  setShowPurposeModal: (showPurposeModal: boolean) => void,
  mutate: (key: string) => Promise<void>,
  hcb: KyInstance,
  grantId: string,
  purposeText: string,
) => {
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
    console.error("Set purpose error", error, {
      cardId: card.id,
      purpose: purposeText,
    });
    showAlert("Error", "Failed to set purpose. Please try again.");
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
  } finally {
    setIsSettingPurpose(false);
  }
};

export const handleOneTimeUse = async (
  card: Card,
  setIsOneTimeUse: (isOneTimeUse: boolean) => void,
  mutate: (key: string) => Promise<void>,
  hcb: KyInstance,
  grantId: string,
  grantCard: GrantCard,
) => {
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
    console.error("One time use error", error, {
      cardId: card?.id || grantCard?.card_id,
    });
    showAlert("Error", "Failed to set one time use. Please try again.");
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
  } finally {
    setIsOneTimeUse(false);
  }
};

export const returnGrant = async (
  card: Card,
  isCardholder: boolean,
  grantCard: GrantCard,
  setisReturningGrant: (isReturningGrant: boolean) => void,
  mutate: (key: string) => Promise<void>,
  hcb: KyInstance,
  grantId: string,
  navigation: NativeStackNavigationProp<CardsStackParamList>,
) => {
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
            await hcb.post(
              `card_grants/${grantId || grantCard.grant_id}/cancel`,
            );
            Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
            await mutate("user/cards");
            navigation.goBack();
          } catch (err) {
            console.error("Error returning grant", err, {
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

export const handleBurnCard = async (
  card: Card,
  setIsBurningCard: (isBurningCard: boolean) => void,
  mutate: (key: string) => Promise<void>,
  hcb: KyInstance,
) => {
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
            Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
            Toast.show({
              title: "Card burned",
              type: ALERT_TYPE.SUCCESS,
            });
          } catch (error) {
            console.error("Burn card error", error, { cardId: card.id });
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

export const handleActivate = async (
  last4: string,
  setActivating: (activating: boolean) => void,
  card: Card,
  setShowActivateModal: (showActivateModal: boolean) => void,
  setLast4: (last4: string) => void,
  hcb: KyInstance,
  onSuccessfulStatusChange: (status: string) => void,
) => {
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
    console.error("Error activating card", err, { cardId: card?.id });
    showAlert("Error", "Failed to activate card. Please try again later.");
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
  } finally {
    setActivating(false);
  }
};

export const handleCreateCard = async (
  organizationId: string,
  cardType: string,
  shippingName: string,
  city: string,
  addressLine1: string,
  addressLine2: string,
  zipCode: string,
  stateProvince: string,
  cardDesignId: string,
  hcb: KyInstance,
  user: User,
  setIsLoading: (isLoading: boolean) => void,
  navigation: NativeStackNavigationProp<CardsStackParamList>,
) => {
  if (
    !validateFields(
      organizationId,
      cardType,
      shippingName,
      city,
      addressLine1,
      stateProvince,
      zipCode,
    )
  )
    return;

  setIsLoading(true);
  try {
    const response = await hcb.post("cards", {
      json: {
        card: {
          organization_id: organizationId,
          card_type: cardType === "plastic" ? "physical" : "virtual",
          shipping_name: shippingName,
          shipping_address_city: city,
          shipping_address_line1: addressLine1,
          shipping_address_line2: addressLine2,
          shipping_address_postal_code: zipCode,
          shipping_address_state: stateProvince,
          shipping_address_country: "US",
          card_personalization_design_id: cardDesignId,
        },
      },
    });

    if (response.ok) {
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      Toast.show({
        type: ALERT_TYPE.SUCCESS,
        title: "Card created!",
        textBody: "Your card has been created successfully.",
      });
      navigation.goBack();
    } else {
      const data = (await response.json()) as { error?: string };
      Alert.alert("Error", data.error || "Failed to create card");
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
    }
  } catch (err) {
    console.error("Error creating card:", err);
    Alert.alert("Error", "Failed to create card. Please try again later.");
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
  } finally {
    setIsLoading(false);
  }
};
